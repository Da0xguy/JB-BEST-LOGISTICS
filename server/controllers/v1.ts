import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import type { RequestHandler } from 'express';
import { allowRoles, publicUser, type AuthRequest } from '../auth';
import { calculateQuote } from '../pricing';
import { ActivityLog, DispatchOffer, MailboxProfile, Notification, PickupJob, RiderProfile, Shipment, User, type DeliveryOption, type MailboxPlan, type MailboxProfileDocument, type Role, type ShipmentDocument, type ShipmentStatus, type UserDocument, type VehicleType } from '../models';
import { dispatchQueuedShipments, dispatchShipment, eligibleVehiclesForPackage } from '../services/dispatchService';
import { emitToShipment, emitToUser } from '../realtime';
import { ApiError } from './apiError';
import { sendMail } from '../lib/email';

interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

interface BookingBody {
  customerId?: string;
  warehouseId?: string;
  sender: Record<string, unknown>;
  receiver: Record<string, unknown>;
  package: { length: number; width: number; height: number; quantity?: number; weight: number; unit?: 'cm' | 'in'; fragile?: boolean; declaredValue?: number };
  deliveryOption: DeliveryOption;
  transport: 'road' | 'air' | 'sea';
  carrier?: 'fedex' | 'ups' | 'usps' | 'dhl' | 'jb_freight';
  international?: boolean;
  pickupLocation: GeoPoint;
  deliveryLocation: GeoPoint;
  appointmentWindow: { start: string; end: string; slot?: string };
}

const isGeoPoint = (value: unknown): value is GeoPoint => {
  if (!value || typeof value !== 'object') return false;
  const point = value as Partial<GeoPoint>;
  const coordinates = point.coordinates;
  return point.type === 'Point'
    && Array.isArray(coordinates)
    && coordinates.length === 2
    && Number.isFinite(coordinates[0])
    && Number.isFinite(coordinates[1])
    && coordinates[0] >= -180 && coordinates[0] <= 180
    && coordinates[1] >= -90 && coordinates[1] <= 90;
};

const createTrackingNumber = async () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (;;) {
    const trackingNumber = Array.from({ length: 20 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
    if (!(await Shipment.exists({ trackingId: trackingNumber }))) return trackingNumber;
  }
};

const appendTrackingEvent = (status: ShipmentStatus, note: string, actorId: string) => ({
  status,
  note,
  actorId,
  createdAt: new Date(),
});

export const bookShipment: RequestHandler = async (request, response) => {
  const req = request as AuthRequest;
  const body = req.body as BookingBody;
  const { package: packageDetails, deliveryOption, transport, appointmentWindow } = body;

  if (!body.sender || !body.receiver || !packageDetails || !appointmentWindow) throw new ApiError(400, 'Sender, receiver, package, and appointment window are required');
  if (!isGeoPoint(body.pickupLocation) || !isGeoPoint(body.deliveryLocation)) throw new ApiError(400, 'Pickup and delivery must be GeoJSON Point locations');
  if (!['standard', 'express', 'same_day', 'premium_overnight'].includes(deliveryOption) || transport !== 'road' || (body.carrier && body.carrier !== 'jb_freight')) throw new ApiError(400, 'Only JB & Best local courier bookings are currently available');
  const receiverState = String(body.receiver.state || '').trim().toUpperCase();
  const receiverCountry = String(body.receiver.country || 'USA').trim().toUpperCase();
  const senderState = String(body.sender.state || '').trim().toUpperCase();
  const senderCountry = String(body.sender.country || 'USA').trim().toUpperCase();
  const supportedCountries = ['US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA'];
  if (!['GA', 'GEORGIA'].includes(receiverState) || !supportedCountries.includes(receiverCountry) || !['GA', 'GEORGIA'].includes(senderState) || !supportedCountries.includes(senderCountry)) {
    throw new ApiError(400, 'JB & Best currently accepts courier pickups and deliveries within Georgia, USA');
  }

  const dimensions = [packageDetails.length, packageDetails.width, packageDetails.height, packageDetails.weight].map(Number);
  if (!dimensions.every((value) => Number.isFinite(value) && value > 0)) throw new ApiError(400, 'Package dimensions and weight must be positive numbers');
  const appointmentStart = new Date(appointmentWindow.start);
  const appointmentEnd = new Date(appointmentWindow.end);
  if (!Number.isFinite(appointmentStart.getTime()) || !Number.isFinite(appointmentEnd.getTime()) || appointmentStart < new Date() || appointmentEnd <= appointmentStart) {
    throw new ApiError(400, 'Appointment window must have a future start and a later end');
  }

  const user = req.user!;
  let customerId = user._id;
  if (user.role !== 'customer') {
    if (!body.customerId || !mongoose.isValidObjectId(body.customerId)) throw new ApiError(400, 'A valid customerId is required for staff bookings');
    const customer = await User.findOne({ _id: body.customerId, role: 'customer', status: 'active' }).select('_id');
    if (!customer) throw new ApiError(404, 'Customer account not found');
    customerId = customer._id;
  }
  let warehouseId: mongoose.Types.ObjectId | undefined;
  if (body.warehouseId) {
    if (!mongoose.isValidObjectId(body.warehouseId)) throw new ApiError(400, 'Invalid warehouseId');
    const warehouse = await User.exists({ _id: body.warehouseId, role: { $in: ['warehouse', 'warehouse_staff'] }, status: 'active' });
    if (!warehouse) throw new ApiError(404, 'Active warehouse account not found');
    warehouseId = new mongoose.Types.ObjectId(body.warehouseId);
  } else if (user.role === 'warehouse' || user.role === 'warehouse_staff') {
    warehouseId = user._id;
  }

  const quote = calculateQuote({
    length: dimensions[0], width: dimensions[1], height: dimensions[2], weight: dimensions[3],
    deliveryOption, transport, international: Boolean(body.international),
  });
  const eligibleVehicles: VehicleType[] = eligibleVehiclesForPackage(dimensions[3], packageDetails);
  const vehicleRequired = eligibleVehicles[0];
  const initialEvent = appendTrackingEvent('booked', 'Shipment booking created', user._id.toString());
  const session = await mongoose.startSession();
  let shipment: ShipmentDocument | undefined;
  let customerEmail: string | undefined;

  try {
    await session.withTransaction(async () => {
      const [created] = await Shipment.create([{
        trackingId: await createTrackingNumber(),
        customerId,
        sender: body.sender,
        receiver: body.receiver,
        package: { ...packageDetails, ...Object.fromEntries(['length', 'width', 'height', 'weight'].map((key, index) => [key, dimensions[index]])), quantity: Number(packageDetails.quantity || 1), volume: dimensions[0] * dimensions[1] * dimensions[2], vehicleRequired, suggestedPackaging: quote.suggestedPackaging },
        deliveryOption,
        transport,
        carrier: body.carrier || 'jb_freight',
        status: 'booked',
        total: quote.total,
        currency: quote.currency,
        pickupLocation: body.pickupLocation,
        deliveryLocation: body.deliveryLocation,
        appointmentWindow: { start: appointmentStart, end: appointmentEnd, slot: appointmentWindow.slot },
        vehicleRequired,
        warehouseId,
        events: [initialEvent],
        tracking_history: [initialEvent],
      }], { session });
      shipment = created;
      await PickupJob.create([{
        shipmentId: created._id,
        scheduledAt: appointmentStart,
        status: 'queued',
      }], { session });
      await Notification.create([{
        userId: customerId,
        shipmentId: created._id,
        channel: 'in_app',
        title: 'Shipment booked',
        body: `Tracking number ${created.trackingId} is ready.`,
      }], { session });

      const customer = await User.findById(customerId).select('email');
      customerEmail = customer?.email;
      await ActivityLog.create([{
        actorId: user._id,
        action: 'create',
        resource: 'shipment',
        resourceId: created.id,
        metadata: { trackingId: created.trackingId },
      }], { session });
    });
  } finally {
    await session.endSession();
  }
  if (!shipment) throw new ApiError(500, 'Shipment booking did not complete');

  emitToShipment(shipment._id.toString(), 'tracking:status', { trackingNumber: shipment.trackingId, status: shipment.status, history: shipment.tracking_history });
  void dispatchShipment(shipment._id.toString()).catch((error: unknown) => console.error('Automatic dispatch failed', error));

  const emailNotifications = await Promise.all([
    ...(process.env.ADMIN_EMAIL?.trim()
      ? [{
          recipient: 'admin' as const,
          email: process.env.ADMIN_EMAIL.trim(),
          subject: `New shipment booked: ${shipment.trackingId}`,
          html: `<p>A new shipment has been booked.</p><p>Tracking ID: ${shipment.trackingId}</p>`,
        }]
      : []),
    ...(customerEmail
      ? [{
          recipient: 'customer' as const,
          email: customerEmail,
          subject: `Your shipment ${shipment.trackingId} is booked`,
          html: `<p>Dear customer,</p><p>Your shipment has been successfully booked. Tracking ID: ${shipment.trackingId}</p>`,
        }]
      : []),
  ].map(async ({ recipient, email, subject, html }) => {
    try {
      await sendMail(email, subject, html);
      return { recipient, status: 'sent' as const };
    } catch (error) {
      console.error(`Shipment booking email failed for ${recipient}:`, error);
      return { recipient, status: 'failed' as const };
    }
  }));

  return response.status(201).json({ shipment, trackingNumber: shipment.trackingId, quote, emailNotifications });
};

export const trackShipment: RequestHandler = async (req, res) => {
  const shipment = await Shipment.findOne({ trackingId: req.params.trackingNumber }).select('trackingId status tracking_history events appointmentWindow createdAt updatedAt deliveredAt');
  if (!shipment) throw new ApiError(404, 'Tracking number not found');
  return res.json({
    trackingNumber: shipment.trackingId,
    status: shipment.status,
    trackingHistory: shipment.tracking_history.length ? shipment.tracking_history : shipment.events,
    appointmentWindow: shipment.appointmentWindow,
    createdAt: shipment.createdAt,
    updatedAt: shipment.updatedAt,
    deliveredAt: shipment.deliveredAt,
  });
};

export const updateRiderLocation: RequestHandler = async (request, response) => {
  const req = request as AuthRequest;
  const location = req.body?.location;
  if (!isGeoPoint(location)) throw new ApiError(400, 'location must be a GeoJSON Point with [longitude, latitude] coordinates');
  const profile = await RiderProfile.findOneAndUpdate(
    { userId: req.user!._id },
    { $set: { currentLocation: location } },
    { new: true, runValidators: true },
  ).select('userId currentLocation is_active is_assigned updatedAt');
  if (!profile) throw new ApiError(404, 'Rider profile not found');
  const assignedShipments = await Shipment.find({ assignedRiderId: req.user!._id, status: { $nin: ['delivered', 'cancelled'] } }).select('_id trackingId').lean();
  for (const shipment of assignedShipments) {
    emitToShipment(shipment._id.toString(), 'tracking:location', {
      trackingNumber: shipment.trackingId,
      location,
      updatedAt: new Date().toISOString(),
    });
  }
  if (profile.is_active) {
    void dispatchQueuedShipments().catch((error: unknown) => console.error('Queued dispatch retry failed', error));
  }
  return response.json({ riderProfile: profile });
};

export const setRiderActiveStatus: RequestHandler = async (request, response) => {
  const req = request as AuthRequest;
  const { is_active: isActive } = req.body as { is_active?: boolean };
  if (typeof isActive !== 'boolean') throw new ApiError(400, 'is_active must be a boolean');
  const profile = await RiderProfile.findOneAndUpdate(
    { userId: req.user!._id },
    { $set: { is_active: isActive } },
    { new: true, runValidators: true },
  ).select('userId vehicleType weightCapacityKg is_active is_assigned updatedAt');
  if (!profile) throw new ApiError(404, 'Rider profile not found');
  emitToUser(req.user!._id.toString(), 'rider:status', { is_active: profile.is_active, is_assigned: profile.is_assigned });
  if (profile.is_active) {
    void dispatchQueuedShipments().catch((error: unknown) => console.error('Queued dispatch retry failed', error));
  }
  return response.json({ riderProfile: profile });
};

export const getRiderProfile: RequestHandler = async (request, response) => {
  const req = request as AuthRequest;
  const profile = await RiderProfile.findOne({ userId: req.user!._id })
    .select('vehicleType weightCapacityKg is_active is_assigned currentLocation updatedAt');
  if (!profile) throw new ApiError(404, 'Rider profile not found');
  return response.json({ riderProfile: profile });
};

export const listRiderOffers: RequestHandler = async (request, response) => {
  const req = request as AuthRequest;
  const offers = await DispatchOffer.find({
    riderId: req.user!._id,
    status: 'offered',
    expiresAt: { $gt: new Date() },
  })
    .populate({ path: 'shipmentId', select: 'trackingId status sender receiver package appointmentWindow' })
    .sort({ expiresAt: 1 });
  return response.json({ offers });
};

export const acceptRiderJob: RequestHandler = async (request, response) => {
  const req = request as AuthRequest;
  const { offerId } = req.body as { offerId?: string };
  if (!offerId || !mongoose.isValidObjectId(offerId)) throw new ApiError(400, 'A valid offerId is required');

  const session = await mongoose.startSession();
  let shipment: ShipmentDocument | null = null;
  let acceptedShipmentId: mongoose.Types.ObjectId | undefined;
  try {
    await session.withTransaction(async () => {
      const offer = await DispatchOffer.findOne({
        _id: offerId,
        riderId: req.user!._id,
        status: 'offered',
        expiresAt: { $gt: new Date() },
      }).session(session);
      if (!offer) throw new ApiError(409, 'Offer is unavailable or has expired');

      const profile = await RiderProfile.findOneAndUpdate(
        { userId: req.user!._id, is_active: true, is_assigned: false },
        { $set: { is_assigned: true } },
        { new: true, session },
      );
      if (!profile) throw new ApiError(409, 'Rider is no longer available for assignments');

      shipment = await Shipment.findOneAndUpdate(
        { _id: offer.shipmentId, status: 'booked', assignedRiderId: { $exists: false } },
        {
          $set: { assignedRiderId: req.user!._id, status: 'assigned' },
          $push: {
            events: appendTrackingEvent('assigned', 'Pickup accepted by rider', req.user!._id.toString()),
            tracking_history: appendTrackingEvent('assigned', 'Pickup accepted by rider', req.user!._id.toString()),
          },
        },
        { new: true, session },
      );
      if (!shipment) throw new ApiError(409, 'Shipment has already been assigned');
      acceptedShipmentId = shipment._id;

      offer.status = 'accepted';
      offer.respondedAt = new Date();
      await offer.save({ session });
      await DispatchOffer.updateMany(
        { shipmentId: offer.shipmentId, status: 'offered', _id: { $ne: offer._id } },
        { $set: { status: 'expired', respondedAt: new Date() } },
        { session },
      );

      const pickupJob = await PickupJob.findOneAndUpdate(
        { shipmentId: offer.shipmentId, status: 'queued' },
        { $set: { riderId: req.user!._id, status: 'assigned' } },
        { new: true, session },
      );
      if (!pickupJob) {
        await PickupJob.create([{
          shipmentId: offer.shipmentId,
          riderId: req.user!._id,
          scheduledAt: shipment.appointmentWindow?.start ?? new Date(),
          status: 'assigned',
        }], { session });
      }
      await Notification.create([{
        userId: shipment.customerId,
        shipmentId: shipment._id,
        channel: 'in_app',
        title: 'Rider assigned',
        body: `A rider has accepted pickup ${shipment.trackingId}.`,
      }], { session });
    });
  } finally {
    await session.endSession();
  }
  if (!acceptedShipmentId) throw new ApiError(409, 'Unable to accept this offer');
  const committedShipment = await Shipment.findById(acceptedShipmentId);
  if (!committedShipment) throw new ApiError(404, 'Accepted shipment could not be loaded');
  emitToShipment(committedShipment._id.toString(), 'tracking:status', { trackingNumber: committedShipment.trackingId, status: committedShipment.status, history: committedShipment.tracking_history });
  emitToUser(committedShipment.customerId.toString(), 'shipment:assigned', { trackingNumber: committedShipment.trackingId, status: committedShipment.status });
  void dispatchQueuedShipments().catch((error: unknown) => console.error('Queued dispatch retry failed', error));
  return response.json({ shipment: committedShipment });
};

export const rejectRiderJob: RequestHandler = async (request, response) => {
  const req = request as AuthRequest;
  const { offerId } = req.body as { offerId?: string };
  if (!offerId || !mongoose.isValidObjectId(offerId)) throw new ApiError(400, 'A valid offerId is required');
  const offer = await DispatchOffer.findOneAndUpdate(
    { _id: offerId, riderId: req.user!._id, status: 'offered', expiresAt: { $gt: new Date() } },
    { $set: { status: 'rejected', respondedAt: new Date() } },
    { new: true },
  );
  if (!offer) throw new ApiError(409, 'Offer is unavailable or has expired');
  return response.json({ offerId: offer.id, status: offer.status });
};

export const listAdminUsers: RequestHandler = async (_request, response) => {
  const users = await User.find({ role: { $in: ['admin', 'rider', 'warehouse', 'warehouse_staff'] } })
    .sort({ createdAt: -1 });
  return response.json({ users: users.map(publicUser) });
};

const mailboxResponse = (profile: MailboxProfileDocument, customer: UserDocument) => ({
  id: profile._id.toString(),
  mailboxNumber: profile.mailboxNumber,
  customer: { name: customer.name, email: customer.email, phone: customer.phone },
  companyName: profile.companyName,
  plan: profile.plan,
  keyFobId: profile.keyFobId,
  renewalDate: profile.renewalDate.toISOString().slice(0, 10),
  status: profile.status,
  packagesHeld: profile.packagesHeld,
});

export const listWarehouseMailboxes: RequestHandler = async (_request, response) => {
  const profiles = await MailboxProfile.find()
    .populate({ path: 'customerId', select: 'name email phone' })
    .sort({ createdAt: -1 });
  const mailboxes = profiles.map((profile) =>
    mailboxResponse(profile, profile.customerId as unknown as UserDocument),
  );
  return response.json({ mailboxes });
};

export const createWarehouseMailbox: RequestHandler = async (request, response) => {
  const req = request as AuthRequest;
  const body = req.body as {
    customerEmail?: string;
    mailboxNumber?: string;
    plan?: MailboxPlan;
    companyName?: string;
    keyFobId?: string;
    renewalDate?: string;
  };
  if (!body.customerEmail?.trim() || !body.mailboxNumber?.trim() || !['personal', 'business', 'corporate'].includes(body.plan || '')) {
    throw new ApiError(400, 'Customer email, mailbox number, and a valid mailbox plan are required');
  }
  const renewalDate = new Date(body.renewalDate || '');
  if (!Number.isFinite(renewalDate.getTime())) throw new ApiError(400, 'A valid renewal date is required');
  const customer = await User.findOne({ email: body.customerEmail.trim().toLowerCase(), role: 'customer', status: 'active' });
  if (!customer) throw new ApiError(404, 'An active customer with this email was not found');

  const session = await mongoose.startSession();
  let createdProfile: MailboxProfileDocument | undefined;
  try {
    await session.withTransaction(async () => {
      const [profile] = await MailboxProfile.create([{
        mailboxNumber: body.mailboxNumber!.trim(),
        customerId: customer._id,
        createdBy: req.user!._id,
        plan: body.plan,
        companyName: body.companyName?.trim() || undefined,
        keyFobId: body.keyFobId?.trim() || undefined,
        renewalDate,
      }], { session });
      createdProfile = profile;
      await ActivityLog.create([{
        actorId: req.user!._id,
        action: 'create',
        resource: 'mailbox_profile',
        resourceId: profile._id.toString(),
        metadata: { mailboxNumber: profile.mailboxNumber, customerId: customer._id.toString() },
      }], { session });
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      throw new ApiError(409, 'That mailbox number is already assigned');
    }
    throw error;
  } finally {
    await session.endSession();
  }
  if (!createdProfile) throw new ApiError(500, 'Mailbox profile creation did not complete');
  return response.status(201).json({ mailbox: mailboxResponse(createdProfile, customer) });
};

export const updateStaffAccountStatus: RequestHandler = async (request, response) => {
  const req = request as AuthRequest;
  const { userId } = req.params;
  const { status } = req.body as { status?: 'active' | 'suspended' };
  if (!mongoose.isValidObjectId(userId)) throw new ApiError(400, 'A valid userId is required');
  if (!['active', 'suspended'].includes(status || '')) throw new ApiError(400, 'Status must be active or suspended');

  const session = await mongoose.startSession();
  let updatedUser: UserDocument | null = null;
  try {
    await session.withTransaction(async () => {
      const target = await User.findById(userId).select('role').session(session);
      if (!target) throw new ApiError(404, 'Staff account not found');
      if (target.role === 'admin') throw new ApiError(403, 'Administrator accounts cannot be restricted here');
      if (!['rider', 'warehouse', 'warehouse_staff'].includes(target.role)) {
        throw new ApiError(404, 'Staff account not found');
      }

      updatedUser = await User.findOneAndUpdate(
        { _id: userId, role: { $in: ['rider', 'warehouse', 'warehouse_staff'] } },
        { $set: { status } },
        { new: true, runValidators: true, session },
      );
      if (!updatedUser) throw new ApiError(409, 'Account changed; refresh and try again');
      await ActivityLog.create([{
        actorId: req.user!._id,
        action: status === 'suspended' ? 'suspend' : 'reactivate',
        resource: 'user',
        resourceId: updatedUser._id.toString(),
        metadata: { role: updatedUser.role, status },
      }], { session });
    });
  } finally {
    await session.endSession();
  }
  if (!updatedUser) throw new ApiError(500, 'Account status update did not complete');
  return response.json({ user: publicUser(updatedUser) });
};

export const deleteStaffAccount: RequestHandler = async (request, response) => {
  const req = request as AuthRequest;
  const { userId } = req.params;
  if (!mongoose.isValidObjectId(userId)) throw new ApiError(400, 'A valid userId is required');

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const target = await User.findById(userId).select('role email name').session(session);
      if (!target || !['rider', 'warehouse', 'warehouse_staff'].includes(target.role)) {
        if (target?.role === 'admin') throw new ApiError(403, 'Administrator accounts cannot be deleted here');
        throw new ApiError(404, 'Staff account not found');
      }

      const ownershipFilter = target.role === 'rider'
        ? { assignedRiderId: target._id }
        : { warehouseId: target._id };
      const hasActiveShipments = await Shipment.exists({
        ...ownershipFilter,
        status: { $nin: ['delivered', 'cancelled'] },
      }).session(session);
      if (hasActiveShipments) {
        throw new ApiError(409, 'Reassign this staff member’s active shipments before deleting the account');
      }

      await ActivityLog.create([{
        actorId: req.user!._id,
        action: 'delete',
        resource: 'user',
        resourceId: target._id.toString(),
        metadata: { email: target.email, name: target.name, role: target.role },
      }], { session });
      if (target.role === 'rider') {
        await RiderProfile.deleteOne({ userId: target._id }, { session });
        await DispatchOffer.deleteMany({ riderId: target._id }, { session });
        await PickupJob.updateMany({ riderId: target._id }, { $unset: { riderId: 1 } }, { session });
      }
      const result = await User.deleteOne({ _id: target._id, role: target.role }, { session });
      if (result.deletedCount !== 1) throw new ApiError(409, 'Account changed; refresh and try again');
    });
  } finally {
    await session.endSession();
  }
  return response.json({ success: true, userId });
};

export const provisionStaffAccount: RequestHandler = async (request, response) => {
  const req = request as AuthRequest;
  const body = req.body as { name?: string; email?: string; password?: string; phone?: string; role?: Role; vehicleType?: VehicleType; weightCapacityKg?: number; branchId?: string };
  const { name, email, password, role } = body;
  if (!name?.trim() || !email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || (password && password.length < 12) || !['admin', 'rider', 'warehouse', 'warehouse_staff'].includes(role || '')) {
    throw new ApiError(400, 'Name, valid email, and role admin, rider, or warehouse are required; supplied passwords must be at least 12 characters');
  }
  if (role === 'rider' && (!body.vehicleType || !['bike', 'van', 'truck'].includes(body.vehicleType) || !Number.isFinite(body.weightCapacityKg) || Number(body.weightCapacityKg) <= 0)) {
    throw new ApiError(400, 'Rider accounts require a valid vehicleType and positive weightCapacityKg');
  }

  const generatedPassword = password ? undefined : crypto.randomBytes(18).toString('base64url');
  const temporaryPassword = password || generatedPassword!;
  const session = await mongoose.startSession();
  let createdUser: UserDocument | undefined;
  try {
    await session.withTransaction(async () => {
      const [user] = await User.create([{
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash: await bcrypt.hash(temporaryPassword, 12),
        phone: body.phone,
        role: role as Role,
        mustChangePassword: true,
        branchId: body.branchId,
      }], { session });
      createdUser = user;
      if (role === 'rider') {
        await RiderProfile.create([{
          userId: user._id,
          vehicleType: body.vehicleType,
          weightCapacityKg: Number(body.weightCapacityKg),
          is_active: false,
          is_assigned: false,
        }], { session });
      }
      await ActivityLog.create([{
        actorId: req.user!._id,
        action: 'provision',
        resource: 'user',
        resourceId: user.id,
        metadata: { role },
      }], { session });
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      throw new ApiError(409, 'An account with this email already exists');
    }
    throw error;
  } finally {
    await session.endSession();
  }
  if (!createdUser) throw new ApiError(500, 'Account provisioning did not complete');
  return response.status(201).json({
    user: publicUser(createdUser),
    ...(generatedPassword ? { temporaryPassword: generatedPassword } : {}),
  });
};

export const customerOrWarehouse = allowRoles('customer', 'warehouse', 'warehouse_staff', 'admin');
export const warehouseOnly = allowRoles('warehouse', 'warehouse_staff');
export const adminOnly = allowRoles('admin');
export const riderOnly = allowRoles('rider');
