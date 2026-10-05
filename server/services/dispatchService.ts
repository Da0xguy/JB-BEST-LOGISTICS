import mongoose from 'mongoose';
import { DispatchOffer, Notification, RiderProfile, Shipment, User, type VehicleType } from '../models';
import { emitToUser } from '../realtime';

const OFFER_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 1_000;
const MAX_CANDIDATES = 25;

type GeoPoint = { type: 'Point'; coordinates: [number, number] };
type OfferNotification = (input: { riderId: mongoose.Types.ObjectId; shipmentId: mongoose.Types.ObjectId; offerId: mongoose.Types.ObjectId; trackingId: string; expiresAt: Date }) => Promise<void>;

export const eligibleVehiclesForPackage = (weightKg: number, dimensions: { length: number; width: number; height: number; unit?: 'cm' | 'in' }): VehicleType[] => {
  const unitMultiplier = dimensions.unit === 'in' ? 2.54 : 1;
  const longestSideCm = Math.max(dimensions.length, dimensions.width, dimensions.height) * unitMultiplier;
  if (weightKg < 15 && longestSideCm <= 60) return ['bike', 'van', 'truck'];
  if (weightKg <= 150 && longestSideCm <= 300) return ['van', 'truck'];
  return ['truck'];
};

const persistOfferNotification: OfferNotification = async ({ riderId, shipmentId, offerId, trackingId, expiresAt }) => {
  await Notification.create({
    userId: riderId,
    shipmentId,
    channel: 'in_app',
    title: 'New pickup request',
    body: `Offer ${offerId.toString()} for shipment ${trackingId} expires in 30 seconds.`,
  });
  emitToUser(riderId.toString(), 'dispatch:offer', {
    offerId: offerId.toString(),
    shipmentId: shipmentId.toString(),
    trackingNumber: trackingId,
    expiresAt: expiresAt.toISOString(),
  });
};

const waitForOfferResponse = async (offerId: mongoose.Types.ObjectId, expiresAt: Date) => {
  while (Date.now() < expiresAt.getTime()) {
    const offer = await DispatchOffer.findById(offerId).select('status').lean();
    if (!offer || offer.status !== 'offered') return offer?.status ?? 'expired';
    await new Promise((resolve) => setTimeout(resolve, Math.min(POLL_INTERVAL_MS, expiresAt.getTime() - Date.now())));
  }

  await DispatchOffer.updateOne(
    { _id: offerId, status: 'offered', expiresAt: { $lte: new Date() } },
    { $set: { status: 'expired', respondedAt: new Date() } },
  );
  const finalOffer = await DispatchOffer.findById(offerId).select('status').lean();
  return finalOffer?.status ?? 'expired';
};

/**
 * Offer a pickup to nearby eligible riders one at a time. A rejection or a
 * 30-second timeout advances the queue; assignment is committed only by the
 * rider acceptance transaction, which also prevents double assignment.
 */
export const dispatchShipment = async (shipmentId: string, notify: OfferNotification = persistOfferNotification) => {
  if (!mongoose.isValidObjectId(shipmentId)) throw new Error('Invalid shipment ID');
  const shipment = await Shipment.findById(shipmentId);
  if (!shipment) throw new Error('Shipment not found');
  if (!shipment.pickupLocation) throw new Error('Shipment has no pickup location');
  if (shipment.assignedRiderId) return { status: 'already_assigned' as const };

  const weightKg = Number((shipment.package as { weight?: number }).weight);
  if (!Number.isFinite(weightKg) || weightKg <= 0) throw new Error('Shipment weight is invalid');
  const packageDimensions = shipment.package as { length: number; width: number; height: number; unit?: 'cm' | 'in' };
  const vehicles = eligibleVehiclesForPackage(weightKg, packageDimensions);
  const pickupLocation = shipment.pickupLocation as GeoPoint;
  const candidates = await RiderProfile.find({
    is_active: true,
    is_assigned: false,
    vehicleType: { $in: vehicles },
    weightCapacityKg: { $gte: weightKg },
    currentLocation: {
      $near: {
        $geometry: pickupLocation,
        $maxDistance: 10_000,
      },
    },
  }).limit(MAX_CANDIDATES).select('userId vehicleType weightCapacityKg').lean();

  for (const candidate of candidates) {
    const activeRider = await User.exists({ _id: candidate.userId, role: 'rider', status: 'active' });
    if (!activeRider) continue;

    const expiresAt = new Date(Date.now() + OFFER_TIMEOUT_MS);
    const offer = await DispatchOffer.create({ shipmentId: shipment._id, riderId: candidate.userId, expiresAt });
    try {
      await notify({ riderId: candidate.userId, shipmentId: shipment._id, offerId: offer._id, trackingId: shipment.trackingId, expiresAt });
    } catch (error) {
      await DispatchOffer.updateOne({ _id: offer._id, status: 'offered' }, { $set: { status: 'expired', respondedAt: new Date() } });
      continue;
    }

    if (await waitForOfferResponse(offer._id, expiresAt) === 'accepted') {
      return { status: 'accepted' as const, riderId: candidate.userId.toString(), offerId: offer.id };
    }
  }

  return { status: 'no_available_rider' as const };
};
