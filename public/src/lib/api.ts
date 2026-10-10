import type { Appointment, Carrier, PickupRequest, Shipment, ShipmentStatus } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export type AuthRole = 'customer' | 'rider' | 'warehouse' | 'warehouse_staff' | 'admin';
export type ProvisionableRole = Extract<AuthRole, 'admin' | 'rider' | 'warehouse'>;

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: AuthRole;
  status: 'active' | 'suspended';
  mustChangePassword: boolean;
  branchId?: string;
}

export interface CustomerProfile {
  name: string;
  email: string;
  phone: string;
  address: {
    name?: string;
    phone?: string;
    street: string;
    suite?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    location?: { type: 'Point'; coordinates: [number, number] };
  };
  mailboxes?: CustomerMailboxProfile[];
}

export interface CustomerMailboxProfile {
  id: string;
  mailboxNumber: string;
  plan: 'personal' | 'business' | 'corporate';
  companyName?: string;
  keyFobId?: string;
  renewalDate: string;
  status: 'active' | 'suspended';
  packagesHeld: number;
}

export interface WarehouseMailboxProfile extends CustomerMailboxProfile {
  customer: { name: string; email: string; phone?: string };
}

export interface RiderDispatchOffer {
  _id: string;
  expiresAt: string;
  shipmentId: {
    _id: string;
    trackingId: string;
    package: { weight: number; quantity?: number; vehicleRequired?: string };
    sender: { name: string; street: string; city: string };
    receiver: { name: string; street: string; city: string };
  } | null;
}

export interface WarehouseShipmentHistory {
  _id: string;
  trackingId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  sender: { name: string; street: string; city: string };
  receiver: { name: string; street: string; city: string };
  package: { quantity?: number; weight: number; vehicleRequired?: string };
  assignedRiderId?: { name: string; email: string; phone?: string } | string | null;
}

interface StoredShipment {
  _id: string;
  trackingId: string;
  customerId: string;
  sender: Record<string, any>;
  receiver: Record<string, any>;
  package: Record<string, any>;
  carrier?: Carrier;
  deliveryOption: string;
  transport: string;
  status: string;
  pickupLocation?: { coordinates: [number, number] };
  deliveryLocation?: { coordinates: [number, number] };
  appointmentWindow?: { start: string; end: string; slot?: string };
  tracking_history?: Array<Record<string, any>>;
  events?: Array<Record<string, any>>;
  assignedRiderId?: { name?: string; email?: string; phone?: string } | string | null;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
}

type ApiOptions = RequestInit & { auth?: boolean };

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const getAuthToken = () => {
  const sessionToken = sessionStorage.getItem('jb_best_token');
  if (sessionToken) return sessionToken;
  const legacyToken = localStorage.getItem('jb_best_token');
  if (legacyToken) {
    sessionStorage.setItem('jb_best_token', legacyToken);
    localStorage.removeItem('jb_best_token');
  }
  return legacyToken;
};

export const setAuthToken = (token: string) => {
  sessionStorage.setItem('jb_best_token', token);
  localStorage.removeItem('jb_best_token');
};

export const clearAuthToken = () => {
  sessionStorage.removeItem('jb_best_token');
  localStorage.removeItem('jb_best_token');
};

export const apiRequest = async <T>(path: string, options: ApiOptions = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (options.auth !== false) {
    const token = getAuthToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 && options.auth !== false) {
    clearAuthToken();
    window.dispatchEvent(new Event('jb:auth-expired'));
  }
  if (!response.ok) throw new ApiError(body.error || 'Request failed', response.status, body.code);
  return body as T;
};

export const login = (email: string, password: string) =>
  apiRequest<{ token: string; user: { role: AuthRole; mustChangePassword: boolean } }>('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password }),
  });

export const register = (name: string, email: string, password: string) =>
  apiRequest<{ token: string; user: { role: AuthRole; mustChangePassword: boolean } }>('/api/auth/register', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ name, email, password }),
  });

export const getCurrentUser = () =>
  apiRequest<{ user: { role: AuthRole } }>('/api/auth/me');

export const changePassword = (newPassword: string) =>
  apiRequest<{ user: { mustChangePassword: boolean } }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  });

export const listAdminUsers = () =>
  apiRequest<{ users: AdminUser[] }>('/api/v1/admin/users');

export const provisionAdminUser = (account: {
  name: string;
  email: string;
  phone?: string;
  role: ProvisionableRole;
  vehicleType?: 'bike' | 'van' | 'truck';
  weightCapacityKg?: number;
}) =>
  apiRequest<{ user: AdminUser; temporaryPassword?: string }>('/api/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify(account),
  });

export const updateAdminUserStatus = (userId: string, status: 'active' | 'suspended') =>
  apiRequest<{ user: AdminUser }>(`/api/v1/admin/users/${encodeURIComponent(userId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const deleteStaffAccount = (userId: string) =>
  apiRequest<{ success: boolean; userId: string }>(`/api/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });

export const getCustomerProfile = () =>
  apiRequest<{ profile: CustomerProfile; mailboxes: CustomerMailboxProfile[] }>('/api/customer/profile');

export const saveCustomerProfile = (profile: Omit<CustomerProfile, 'email'>) =>
  apiRequest<{ profile: CustomerProfile }>('/api/customer/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });

export const listWarehouseMailboxes = () =>
  apiRequest<{ mailboxes: WarehouseMailboxProfile[] }>('/api/v1/warehouse/mailboxes');

export const createWarehouseMailbox = (mailbox: {
  customerEmail: string;
  mailboxNumber: string;
  plan: WarehouseMailboxProfile['plan'];
  companyName?: string;
  keyFobId?: string;
  renewalDate: string;
}) =>
  apiRequest<{ mailbox: WarehouseMailboxProfile }>('/api/v1/warehouse/mailboxes', {
    method: 'POST',
    body: JSON.stringify(mailbox),
  });

export const bookPickupShipment = (booking: {
  sender: Record<string, unknown>;
  receiver: Record<string, unknown>;
  package: {
    length: number;
    width: number;
    height: number;
    quantity: number;
    weight: number;
    unit: 'in' | 'cm';
    fragile: boolean;
  };
  deliveryOption: 'standard';
  transport: 'road';
  carrier: Carrier;
  pickupLocation: { type: 'Point'; coordinates: [number, number] };
  deliveryLocation: { type: 'Point'; coordinates: [number, number] };
  appointmentWindow: { start: string; end: string; slot: string };
}) =>
  apiRequest<{ trackingNumber: string; shipment: StoredShipment }>('/api/v1/shipments/book', {
    method: 'POST',
    body: JSON.stringify(booking),
  });

const shipmentStatus = (status: string): ShipmentStatus => {
  switch (status) {
    case 'assigned':
      return 'assigned';
    case 'picked_up':
      return 'picked_up';
    case 'at_warehouse':
      return 'at_warehouse';
    case 'in_transit':
      return 'in_transit';
    case 'out_for_delivery':
      return 'out_for_delivery';
    case 'delivered':
      return 'delivered';
    case 'exception':
    case 'cancelled':
      return 'exception';
    default:
      return 'order_created';
  }
};

const shipmentAddress = (address: Record<string, any>) => ({
  name: String(address.name || 'Unknown'),
  company: address.company ? String(address.company) : undefined,
  street: String(address.street || ''),
  suite: address.suite ? String(address.suite) : undefined,
  city: String(address.city || 'Location unavailable'),
  state: String(address.state || ''),
  zip: String(address.postalCode || ''),
  country: String(address.country || ''),
  phone: String(address.phone || ''),
  email: address.email ? String(address.email) : undefined,
});

export const toCustomerShipment = (stored: StoredShipment): Shipment => {
  const sender = shipmentAddress(stored.sender);
  const recipient = shipmentAddress(stored.receiver);
  const status = shipmentStatus(stored.status);
  const pickupCoordinates = stored.pickupLocation?.coordinates;
  const deliveryCoordinates = stored.deliveryLocation?.coordinates;
  const location = (
    address: ReturnType<typeof shipmentAddress>,
    coordinates?: [number, number],
    facilityName?: string,
  ) => ({
    city: address.city,
    state: address.state,
    country: address.country,
    latitude: coordinates?.[1] ?? 0,
    longitude: coordinates?.[0] ?? 0,
    facilityName,
  });
  const originLocation = location(sender, pickupCoordinates, 'Pickup location');
  const destinationLocation = location(recipient, deliveryCoordinates, 'Delivery location');
  const rawLogs = stored.tracking_history?.length ? stored.tracking_history : stored.events || [];
  const trackingLogs = rawLogs.map((event, index) => ({
    id: String(event._id || `${stored.trackingId}-${index}`),
    shipmentId: stored._id,
    status: shipmentStatus(String(event.status || stored.status)),
    title: String(event.note || String(event.status || stored.status).replaceAll('_', ' ')),
    description: String(event.note || ''),
    location: status === 'delivered' ? destinationLocation : originLocation,
    timestamp: new Date(String(event.createdAt || stored.createdAt)).toISOString(),
  }));
  const packageDetails = stored.package;
  const appointment = stored.appointmentWindow;

  return {
    id: stored._id,
    trackingNumber: stored.trackingId,
    carrier: stored.carrier || 'jb_freight',
    serviceLevel: `${stored.deliveryOption.replaceAll('_', ' ')} ${stored.transport}`,
    sender,
    recipient,
    packageDetails: {
      weightLbs: Number(packageDetails.weight || 0) * 2.20462,
      dimensions: {
        length: Number(packageDetails.length || 0),
        width: Number(packageDetails.width || 0),
        height: Number(packageDetails.height || 0),
        unit: packageDetails.unit === 'cm' ? 'cm' : 'in',
      },
      packageType: packageDetails.suggestedPackaging || 'box',
      isFragile: Boolean(packageDetails.fragile),
      requiresSignature: false,
      declaredValue: Number(packageDetails.declaredValue || 0),
    },
    currentStatus: status,
    currentLocation: status === 'delivered' ? destinationLocation : originLocation,
    originLocation,
    destinationLocation,
    estimatedDelivery: appointment
      ? `${new Date(appointment.start).toLocaleDateString()} ${appointment.slot || ''}`.trim()
      : 'Not scheduled',
    actualDelivery: stored.deliveredAt,
    trackingLogs,
    customerId: stored.customerId,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
  };
};

const toPickupRequest = (stored: StoredShipment): PickupRequest => {
  const start = stored.appointmentWindow?.start ? new Date(stored.appointmentWindow.start) : new Date(stored.createdAt);
  const [readyTime = '09:00', closeTime = '17:00'] = (stored.appointmentWindow?.slot || '').split(' - ');
  const packageDetails = stored.package;
  const address = shipmentAddress(stored.sender);
  const status: PickupRequest['status'] = stored.status === 'delivered'
    ? 'completed'
    : stored.status === 'cancelled'
      ? 'cancelled'
      : ['picked_up', 'at_warehouse', 'in_transit', 'out_for_delivery'].includes(stored.status)
        ? 'in_route'
        : stored.status === 'assigned'
          ? 'assigned'
          : 'scheduled';
  return {
    id: stored._id,
    trackingNumber: stored.trackingId,
    customerId: stored.customerId,
    contactName: address.name,
    contactPhone: address.phone,
    contactEmail: address.email || '',
    pickupAddress: {
      street: address.street,
      suite: address.suite,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country,
    },
    pickupDate: start.toISOString().slice(0, 10),
    readyTime,
    closeTime,
    preferredCarrier: stored.carrier || 'jb_freight',
    estimatedPackagesCount: Number(packageDetails.quantity || 1),
    totalWeightLbs: Number(packageDetails.weight || 0) * 2.20462,
    assignedDriverId: typeof stored.assignedRiderId === 'object' && stored.assignedRiderId
      ? stored.assignedRiderId.name || stored.assignedRiderId.email || stored.assignedRiderId.phone
      : typeof stored.assignedRiderId === 'string'
        ? stored.assignedRiderId
        : undefined,
    status,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
  };
};

export const listCustomerShipments = async () => {
  const { shipments } = await apiRequest<{ shipments: StoredShipment[] }>('/api/shipments');
  return {
    shipments: shipments.map(toCustomerShipment),
    pickups: shipments.map(toPickupRequest),
  };
};

export const listOperationalPickups = async () => {
  const { shipments } = await apiRequest<{ shipments: StoredShipment[] }>('/api/shipments');
  return shipments.map(toPickupRequest);
};

export const getShipmentByTrackingNumber = async (trackingNumber: string) => {
  const { shipment } = await apiRequest<{ shipment: StoredShipment }>(
    `/api/shipments/track/${encodeURIComponent(trackingNumber)}`,
    { auth: false },
  );
  return toCustomerShipment(shipment);
};

export const getRiderProfile = () =>
  apiRequest<{ riderProfile: { is_active: boolean; is_assigned: boolean } }>('/api/v1/riders/profile');

export const setRiderAvailability = (isActive: boolean) =>
  apiRequest<{ riderProfile: { is_active: boolean; is_assigned: boolean } }>('/api/v1/riders/status', {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  });

export const updateRiderLocation = (coordinates: [number, number]) =>
  apiRequest<{ riderProfile: { is_active: boolean } }>('/api/v1/riders/location', {
    method: 'PATCH',
    body: JSON.stringify({ location: { type: 'Point', coordinates } }),
  });

export const listRiderOffers = () =>
  apiRequest<{ offers: RiderDispatchOffer[] }>('/api/v1/riders/offers');

export const acceptRiderOffer = (offerId: string) =>
  apiRequest<{ shipment: unknown }>('/api/v1/riders/accept-job', {
    method: 'POST',
    body: JSON.stringify({ offerId }),
  });

export const createAppointmentBooking = (appointment: {
  serviceType: Appointment['serviceType'];
  appointmentDate: string;
  timeSlot: string;
  customerPhone: string;
  notes?: string;
}) =>
  apiRequest<{ appointment: Appointment }>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(appointment),
  });

export const listShipmentHistory = () =>
  apiRequest<{ shipments: WarehouseShipmentHistory[] }>('/api/shipments');

export const listWarehouseShipmentHistory = listShipmentHistory;

export const listWarehouseAppointmentHistory = () =>
  apiRequest<{ appointments: Appointment[] }>('/api/appointments');