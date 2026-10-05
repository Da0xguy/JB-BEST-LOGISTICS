import type { Appointment } from '../types';

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

type ApiOptions = RequestInit & { auth?: boolean };

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiRequest = async <T>(path: string, options: ApiOptions = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (options.auth !== false) {
    const token = localStorage.getItem('jb_best_token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
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
  pickupLocation: { type: 'Point'; coordinates: [number, number] };
  deliveryLocation: { type: 'Point'; coordinates: [number, number] };
  appointmentWindow: { start: string; end: string; slot: string };
}) =>
  apiRequest<{ trackingNumber: string; shipment: { customerId: string } }>('/api/v1/shipments/book', {
    method: 'POST',
    body: JSON.stringify(booking),
  });

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