import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type Role = 'customer' | 'rider' | 'warehouse' | 'warehouse_staff' | 'admin';
export type VehicleType = 'bike' | 'van' | 'truck';
export type ShipmentStatus = 'booked' | 'assigned' | 'picked_up' | 'at_warehouse' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'cancelled';
export type DeliveryOption = 'standard' | 'express' | 'same_day' | 'premium_overnight';

const geoPointSchema = new Schema({
  type: { type: String, enum: ['Point'], required: true, default: 'Point' },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: (coordinates: number[]) => coordinates.length === 2
        && coordinates[0] >= -180 && coordinates[0] <= 180
        && coordinates[1] >= -90 && coordinates[1] <= 90,
      message: 'Coordinates must be [longitude, latitude]',
    },
  },
}, { _id: false });

const addressSchema = new Schema({
  name: { type: String, required: true, trim: true },
  company: String,
  street: { type: String, required: true, trim: true },
  suite: String,
  city: { type: String, required: true, trim: true },
  state: String,
  postalCode: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: String,
  location: { type: geoPointSchema },
}, { _id: false });

const packageSchema = new Schema({
  length: { type: Number, required: true, min: 0.1 },
  width: { type: Number, required: true, min: 0.1 },
  height: { type: Number, required: true, min: 0.1 },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  weight: { type: Number, required: true, min: 0.1 },
  volume: { type: Number, min: 0.001 },
  vehicleRequired: { type: String, enum: ['bike', 'van', 'truck'] },
  unit: { type: String, enum: ['cm', 'in'], default: 'in' },
  suggestedPackaging: { type: String, enum: ['envelope', 'box', 'pallet', 'custom_crate'], required: true },
  fragile: { type: Boolean, default: false },
  declaredValue: { type: Number, min: 0 },
}, { _id: false });

const eventSchema = new Schema({
  status: { type: String, required: true },
  note: { type: String, required: true },
  location: String,
  actorId: String,
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const appointmentSchema = new Schema({
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  slot: { type: String, trim: true },
}, { _id: false });

export type AppointmentService = 'notary_public' | 'custom_packing' | 'mailbox_rental' | 'freight_consultation' | 'shredding_services' | 'fingerprinting' | 'livescan_fingerprinting' | 'shipping_consultation' | 'passport_photos' | 'secure_document_shredding' | 'packing_supplies' | 'fax_copies';

export interface AppointmentBookingDocument extends Document {
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceType: AppointmentService;
  appointmentDate: string;
  timeSlot: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const appointmentBookingSchema = new Schema<AppointmentBookingDocument>({
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  customerName: { type: String, required: true, trim: true },
  customerEmail: { type: String, required: true, lowercase: true, trim: true },
  customerPhone: { type: String, required: true, trim: true },
  serviceType: { type: String, enum: ['notary_public', 'custom_packing', 'mailbox_rental', 'freight_consultation', 'shredding_services', 'fingerprinting', 'livescan_fingerprinting', 'shipping_consultation', 'passport_photos', 'secure_document_shredding', 'packing_supplies', 'fax_copies'], required: true },
  appointmentDate: { type: String, required: true, index: true },
  timeSlot: { type: String, required: true },
  notes: String,
  status: { type: String, enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'], default: 'confirmed', index: true },
}, { timestamps: true });

export interface UserDocument extends Document {
  email: string;
  passwordHash: string;
  name: string;
  phone?: string;
  role: Role;
  status: 'active' | 'suspended';
  mustChangePassword: boolean;
  branchId?: string;
  savedAddresses: Array<Record<string, unknown>>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>({
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  name: { type: String, required: true, trim: true },
  phone: String,
  role: { type: String, enum: ['customer', 'rider', 'warehouse', 'warehouse_staff', 'admin'], default: 'customer', index: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
  mustChangePassword: { type: Boolean, default: false, index: true },
  branchId: String,
  savedAddresses: { type: [addressSchema], default: [] },
}, { timestamps: true });

export interface RiderProfileDocument extends Document {
  userId: mongoose.Types.ObjectId;
  vehicleType: VehicleType;
  weightCapacityKg: number;
  is_active: boolean;
  is_assigned: boolean;
  currentLocation?: { type: 'Point'; coordinates: [number, number] };
  updatedAt: Date;
}

export type MailboxPlan = 'personal' | 'business' | 'corporate';

export interface MailboxProfileDocument extends Document {
  mailboxNumber: string;
  customerId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  plan: MailboxPlan;
  companyName?: string;
  keyFobId?: string;
  renewalDate: Date;
  status: 'active' | 'suspended';
  packagesHeld: number;
  createdAt: Date;
  updatedAt: Date;
}

const mailboxProfileSchema = new Schema<MailboxProfileDocument>({
  mailboxNumber: { type: String, required: true, trim: true, unique: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: String, enum: ['personal', 'business', 'corporate'], required: true },
  companyName: { type: String, trim: true },
  keyFobId: { type: String, trim: true },
  renewalDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  packagesHeld: { type: Number, min: 0, default: 0 },
}, { timestamps: true });

mailboxProfileSchema.index({ customerId: 1, status: 1 });

const riderProfileSchema = new Schema<RiderProfileDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  vehicleType: { type: String, enum: ['bike', 'van', 'truck'], required: true },
  weightCapacityKg: { type: Number, required: true, min: 0.1 },
  is_active: { type: Boolean, default: false, index: true },
  is_assigned: { type: Boolean, default: false, index: true },
  currentLocation: { type: geoPointSchema },
}, { timestamps: true });

riderProfileSchema.index({ currentLocation: '2dsphere' });

export interface ShipmentDocument extends Document {
  trackingId: string;
  customerId: mongoose.Types.ObjectId;
  sender: Record<string, unknown>;
  receiver: Record<string, unknown>;
  package: Record<string, unknown>;
  vehicleRequired?: VehicleType;
  deliveryOption: DeliveryOption;
  transport: 'road' | 'air' | 'sea';
  carrier?: string;
  status: ShipmentStatus;
  total: number;
  currency: string;
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'partial';
  assignedRiderId?: mongoose.Types.ObjectId;
  warehouseId?: mongoose.Types.ObjectId;
  pickupLocation?: { type: 'Point'; coordinates: [number, number] };
  deliveryLocation?: { type: 'Point'; coordinates: [number, number] };
  appointmentWindow?: { start: Date; end: Date; slot?: string };
  tracking_history: Array<Record<string, unknown>>;
  branchId?: string;
  pickupAt?: Date;
  deliveredAt?: Date;
  events: Array<Record<string, unknown>>;
  createdAt: Date;
  updatedAt: Date;
}

const shipmentSchema = new Schema<ShipmentDocument>({
  trackingId: { type: String, required: true, unique: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sender: { type: addressSchema, required: true },
  receiver: { type: addressSchema, required: true },
  package: { type: packageSchema, required: true },
  pickupLocation: { type: geoPointSchema },
  deliveryLocation: { type: geoPointSchema },
  warehouseId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  appointmentWindow: { type: appointmentSchema },
  vehicleRequired: { type: String, enum: ['bike', 'van', 'truck'] },
  deliveryOption: { type: String, enum: ['standard', 'express', 'same_day', 'premium_overnight'], required: true },
  transport: { type: String, enum: ['road', 'air', 'sea'], required: true },
  carrier: String,
  status: { type: String, enum: ['booked', 'assigned', 'picked_up', 'at_warehouse', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'cancelled'], default: 'booked', index: true },
  total: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'USD' },
  paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'partial'], default: 'unpaid' },
  assignedRiderId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  branchId: String,
  pickupAt: Date,
  deliveredAt: Date,
  events: { type: [eventSchema], default: [] },
  tracking_history: { type: [eventSchema], default: [] },
}, { timestamps: true });

shipmentSchema.index({ pickupLocation: '2dsphere' });

export interface PickupJobDocument extends Document {
  shipmentId: mongoose.Types.ObjectId;
  riderId?: mongoose.Types.ObjectId;
  status: 'queued' | 'assigned' | 'in_route' | 'completed' | 'failed';
  scheduledAt: Date;
  proofOfPickupUrl?: string;
  qrScannedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const pickupJobSchema = new Schema<PickupJobDocument>({
  shipmentId: { type: Schema.Types.ObjectId, ref: 'Shipment', required: true, index: true },
  riderId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  status: { type: String, enum: ['queued', 'assigned', 'in_route', 'completed', 'failed'], default: 'queued' },
  scheduledAt: { type: Date, required: true },
  proofOfPickupUrl: String,
  qrScannedAt: Date,
}, { timestamps: true });

const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  shipmentId: { type: Schema.Types.ObjectId, ref: 'Shipment' },
  channel: { type: String, enum: ['email', 'sms', 'in_app'], required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  readAt: Date,
}, { timestamps: true });

const activityLogSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  resourceId: String,
  ip: String,
  metadata: Schema.Types.Mixed,
}, { timestamps: true });

export interface DispatchOfferDocument extends Document {
  shipmentId: mongoose.Types.ObjectId;
  riderId: mongoose.Types.ObjectId;
  status: 'offered' | 'accepted' | 'rejected' | 'expired';
  expiresAt: Date;
  respondedAt?: Date;
  createdAt: Date;
}

const dispatchOfferSchema = new Schema<DispatchOfferDocument>({
  shipmentId: { type: Schema.Types.ObjectId, ref: 'Shipment', required: true, index: true },
  riderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['offered', 'accepted', 'rejected', 'expired'], default: 'offered', index: true },
  expiresAt: { type: Date, required: true, index: true },
  respondedAt: Date,
}, { timestamps: true });

const paymentSchema = new Schema({
  shipmentId: { type: Schema.Types.ObjectId, ref: 'Shipment', required: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  method: { type: String, enum: ['cash', 'installment', 'paystack'], required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'USD' },
  status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending', index: true },
  reference: { type: String, unique: true, sparse: true },
  installmentNumber: Number,
  installmentCount: Number,
  metadata: Schema.Types.Mixed,
}, { timestamps: true });

export const User: Model<UserDocument> = mongoose.models.User || mongoose.model<UserDocument>('User', userSchema);

export interface AuthVerificationDocument extends Document {
  email: string;
  purpose: 'registration' | 'password_reset';
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  name?: string;
  passwordHash?: string;
}

const authVerificationSchema = new Schema<AuthVerificationDocument>({
  email: { type: String, required: true, lowercase: true, trim: true },
  purpose: { type: String, enum: ['registration', 'password_reset'], required: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  attempts: { type: Number, default: 0, min: 0 },
  name: String,
  passwordHash: String,
});
authVerificationSchema.index({ email: 1, purpose: 1 }, { unique: true });

export const AuthVerification: Model<AuthVerificationDocument> = mongoose.models.AuthVerification || mongoose.model<AuthVerificationDocument>('AuthVerification', authVerificationSchema);

export const RiderProfile: Model<RiderProfileDocument> = mongoose.models.RiderProfile || mongoose.model<RiderProfileDocument>('RiderProfile', riderProfileSchema);
export const MailboxProfile: Model<MailboxProfileDocument> = mongoose.models.MailboxProfile || mongoose.model<MailboxProfileDocument>('MailboxProfile', mailboxProfileSchema);
export const AppointmentBooking: Model<AppointmentBookingDocument> = mongoose.models.AppointmentBooking || mongoose.model<AppointmentBookingDocument>('AppointmentBooking', appointmentBookingSchema);
export const Shipment: Model<ShipmentDocument> = mongoose.models.Shipment || mongoose.model<ShipmentDocument>('Shipment', shipmentSchema);
export const PickupJob: Model<PickupJobDocument> = mongoose.models.PickupJob || mongoose.model<PickupJobDocument>('PickupJob', pickupJobSchema);
export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export const ActivityLog = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
export const DispatchOffer: Model<DispatchOfferDocument> = mongoose.models.DispatchOffer || mongoose.model<DispatchOfferDocument>('DispatchOffer', dispatchOfferSchema);
export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
