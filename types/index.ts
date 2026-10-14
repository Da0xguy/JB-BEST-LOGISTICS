/**
 * JB & Best Logistics LLC - Core Domain Types
 * Location: Georgia, USA
 * Technical Stack: Next.js 14+ (App Router), Firebase Firestore & Auth, Mapbox GL, Paystack & Stripe
 */

export type UserRole = 'customer' | 'associate' | 'admin';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  role: UserRole;
  mailboxNumber?: string;
  companyName?: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
}

export type Carrier = 'fedex' | 'ups' | 'usps' | 'dhl' | 'jb_freight';

export type ShipmentStatus =
  | 'order_created'
  | 'assigned'
  | 'picked_up'
  | 'at_warehouse'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'exception'
  | 'returned';

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  facilityName?: string;
}

export interface TrackingLog {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  title: string;
  description: string;
  location: GeoCoordinate;
  timestamp: string; // ISO 8601 string or Firestore Timestamp ISO
  carrierUpdateCode?: string;
}

export interface ShipmentAddress {
  name: string;
  company?: string;
  street: string;
  suite?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  email?: string;
}

export interface PackageDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'in' | 'cm';
}

export interface PackageDetails {
  weightLbs: number;
  dimensions: PackageDimensions;
  packageType: 'box' | 'envelope' | 'pallet' | 'custom_crate';
  isFragile?: boolean;
  requiresSignature?: boolean;
  declaredValue?: number;
}

export interface Shipment {
  id: string; // Document ID / tracking number
  trackingNumber: string;
  qrCode?: string;
  qrPayload?: string;
  carrier: Carrier;
  serviceLevel: string; // e.g. "FedEx Ground", "UPS Next Day Air", "USPS Priority Express"
  sender: ShipmentAddress;
  recipient: ShipmentAddress;
  packageDetails: PackageDetails;
  currentStatus: ShipmentStatus;
  currentLocation: GeoCoordinate;
  originLocation: GeoCoordinate;
  destinationLocation: GeoCoordinate;
  estimatedDelivery: string;
  actualDelivery?: string;
  trackingLogs: TrackingLog[];
  customerId?: string;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentServiceType =
  | 'notary_public'
  | 'custom_packing'
  | 'mailbox_rental'
  | 'freight_consultation'
  | 'shredding_services'
  | 'fingerprinting'
  | 'livescan_fingerprinting'
  | 'shipping_consultation'
  | 'passport_photos'
  | 'secure_document_shredding'
  | 'packing_supplies'
  | 'fax_copies';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceType: AppointmentServiceType;
  appointmentDate: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "10:30 AM - 11:00 AM"
  notes?: string;
  status: AppointmentStatus;
  assignedAssociateId?: string;
  createdAt: string;
  updatedAt: string;
}

export type PickupRequestStatus =
  | 'scheduled'
  | 'assigned'
  | 'in_route'
  | 'completed'
  | 'cancelled';

export interface PickupRequest {
  id: string;
  trackingNumber?: string;
  qrCode?: string;
  qrPayload?: string;
  customerId: string;
  businessName?: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  pickupAddress: {
    street: string;
    suite?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  pickupDate: string;
  readyTime: string;
  closeTime: string;
  preferredCarrier: Carrier;
  estimatedPackagesCount: number;
  totalWeightLbs: number;
  packageDimensions?: PackageDimensions;
  specialInstructions?: string;
  deliveryAddress?: {
    name: string;
    phone: string;
    street: string;
    suite?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  destinationType?: 'local' | 'out_of_state' | 'international';
  directCarrierTransfer?: boolean;
  carrierHubName?: string;
  mileageMiles?: number;
  packageSizeCategory?: 'small' | 'medium' | 'large' | 'freight';
  totalEstimatedCost?: number;
  depositAmount?: number;
  remainingBalance?: number;
  depositPaid?: boolean;
  paymentMethod?: 'card' | 'paystack' | 'cash_onsite';
  paidAtRegister?: boolean;
  status: PickupRequestStatus;
  assignedDriverId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category?: 'shipping' | 'packing_supplies' | 'mailbox_rental' | 'notary' | 'freight';
}

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'voided';
export type PaymentGateway = 'paystack' | 'stripe' | 'cash' | 'pos';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerCompany?: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount?: number;
  totalAmount: number;
  currency: 'USD' | 'NGN' | string;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string;
  paymentGateway?: PaymentGateway;
  paymentReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MailboxRental {
  boxNumber: string;
  renterName: string;
  companyName?: string;
  email: string;
  phone: string;
  tier: 'Personal' | 'Business' | 'Corporate 24/7';
  status: 'active' | 'renewal_due' | 'available';
  renewalDate: string;
  keyFobId: string;
  packagesHeld: number;
}

export type StaffRole = 'admin' | 'rider' | 'warehouse' | 'warehouse_staff' | 'associate';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  status: 'active' | 'suspended';
  vehicleType?: 'bike' | 'van' | 'truck';
  weightCapacityKg?: number;
  operatingZone?: string;
  activeOrdersCount?: number;
  lastActive?: string;
}

export interface StaffActivity {
  id: string;
  staffId: string;
  staffName: string;
  staffRole: StaffRole;
  action:
    | 'pickup_assigned'
    | 'shipment_intake'
    | 'cash_collected'
    | 'status_update'
    | 'account_created'
    | 'carrier_tendered';
  details: string;
  targetTrackingId?: string;
  timestamp: string;
}
