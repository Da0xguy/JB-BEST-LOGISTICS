import { PickupRequest, StaffActivity, StaffMember } from '../types';
import { AdminUser } from './api';

export type RiderCandidate = AdminUser | StaffMember;

export interface AutoDispatchResult {
  pickup: PickupRequest;
  assignedRider: RiderCandidate | null;
  activity: StaffActivity | null;
  message: string;
}

export const isRiderCapableOfPickup = (
  rider: RiderCandidate,
  pickup: PickupRequest
): boolean => {
  if (rider.role !== 'rider' || rider.status !== 'active') return false;

  const weightLbs = Number(pickup.totalWeightLbs) || 10;
  const weightKg = weightLbs * 0.453592;

  const vehicleType =
    ('vehicleType' in rider && rider.vehicleType) || 'van';
  const weightCapacityKg =
    ('weightCapacityKg' in rider && Number(rider.weightCapacityKg)) || 100;

  if (weightCapacityKg < weightKg) return false;

  // Bikes cannot take oversize or heavy freight
  if (vehicleType === 'bike') {
    if (pickup.packageSizeCategory === 'large' || pickup.packageSizeCategory === 'freight') {
      return false;
    }
    if (weightKg > 15) return false;
  }

  return true;
};

export const findBestAvailableRider = (
  pickup: PickupRequest,
  availableRiders: RiderCandidate[],
  currentPickups: PickupRequest[] = []
): RiderCandidate | null => {
  const eligible = availableRiders.filter((r) => isRiderCapableOfPickup(r, pickup));
  if (eligible.length === 0) return null;

  // Count active load per rider
  const riderLoadMap: Record<string, number> = {};
  for (const rider of eligible) {
    riderLoadMap[rider.id] = 0;
  }

  for (const p of currentPickups) {
    if (p.assignedDriverId && riderLoadMap[p.assignedDriverId] !== undefined) {
      if (p.status !== 'completed' && p.status !== 'cancelled') {
        riderLoadMap[p.assignedDriverId] += 1;
      }
    }
  }

  // Sort by lowest current workload
  eligible.sort((a, b) => (riderLoadMap[a.id] || 0) - (riderLoadMap[b.id] || 0));

  return eligible[0];
};

export const autoAssignPickup = (
  pickup: PickupRequest,
  availableRiders: RiderCandidate[],
  currentPickups: PickupRequest[] = []
): AutoDispatchResult => {
  if (pickup.status === 'completed' || pickup.status === 'cancelled') {
    return {
      pickup,
      assignedRider: null,
      activity: null,
      message: `Pickup ${pickup.id} is already ${pickup.status}.`,
    };
  }

  const bestRider = findBestAvailableRider(pickup, availableRiders, currentPickups);

  if (!bestRider) {
    return {
      pickup,
      assignedRider: null,
      activity: null,
      message: `No active riders with suitable vehicle capacity found for ${pickup.contactName}'s order.`,
    };
  }

  const updatedPickup: PickupRequest = {
    ...pickup,
    status: 'assigned',
    assignedDriverId: bestRider.name,
    updatedAt: new Date().toISOString(),
  };

  const activity: StaffActivity = {
    id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    staffId: bestRider.id,
    staffName: bestRider.name,
    staffRole: 'rider',
    action: 'pickup_assigned',
    details: `Auto-assigned pickup ${pickup.trackingNumber || pickup.id} (${pickup.pickupAddress.city} -> ${pickup.deliveryAddress?.city || 'Carrier Hub'}) to rider ${bestRider.name}.`,
    targetTrackingId: pickup.trackingNumber || pickup.id,
    timestamp: new Date().toISOString(),
  };

  return {
    pickup: updatedPickup,
    assignedRider: bestRider,
    activity,
    message: `Assigned to rider ${bestRider.name} successfully.`,
  };
};

export const autoAssignAllPendingPickups = (
  pickups: PickupRequest[],
  availableRiders: RiderCandidate[]
): {
  updatedPickups: PickupRequest[];
  assignedCount: number;
  activities: StaffActivity[];
} => {
  const pending = pickups.filter(
    (p) => (!p.assignedDriverId || p.status === 'scheduled') && p.status !== 'completed' && p.status !== 'cancelled'
  );

  let assignedCount = 0;
  const activities: StaffActivity[] = [];
  let currentList = [...pickups];

  for (const item of pending) {
    const result = autoAssignPickup(item, availableRiders, currentList);
    if (result.assignedRider) {
      assignedCount++;
      if (result.activity) activities.push(result.activity);
      currentList = currentList.map((p) => (p.id === item.id ? result.pickup : p));
    }
  }

  return {
    updatedPickups: currentList,
    assignedCount,
    activities,
  };
};

