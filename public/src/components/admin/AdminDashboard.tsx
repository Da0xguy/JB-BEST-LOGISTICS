import React, { useEffect, useState } from "react";
import {
  BarChart3,
  DollarSign,
  Package,
  Users,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  Truck,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Receipt,
  FileText,
  Search,
  Filter,
  ExternalLink,
  Code,
  Calendar,
  Building,
  UserPlus,
  RefreshCw,
  UserRoundCheck,
  UserRoundX,
  Trash2,
  Activity,
  Send,
  Zap,

  Navigation,
  Bell,
} from "lucide-react";
import { DashboardSidebar } from "../DashboardSidebar";
import {
  Shipment,
  Invoice,
  Appointment,
  PickupRequest,
  StaffActivity,
} from "../../types";
import {
  AdminUser,
  listAdminUsers,
  provisionAdminUser,
  ProvisionableRole,
  updateAdminUserStatus,
  deleteStaffAccount,
  listAdminNotifications,
  listAdminPickupJobs,
  getDispatchSettings,
  setDispatchSettings,
  assignShipmentRider,
  AdminNotification,
  AdminPickupJob,
} from "../../lib/api";
import { AdminShipmentAssignmentsView } from "./AdminShipmentAssignmentsView";
import { CountUp } from "../ScrollEffects";
import {
  autoAssignPickup,
  autoAssignAllPendingPickups,
  RiderCandidate,
} from "../../lib/dispatchEngine";

interface AdminDashboardProps {
  shipments: Shipment[];
  invoices: Invoice[];
  appointments: Appointment[];
  pickups: PickupRequest[];
  onUpdateInvoice: (invoice: Invoice) => void;
  onOpenArchitecture: () => void;
  onUpdatePickup?: (pickup: PickupRequest) => void;
  onUpdatePickups?: (pickups: PickupRequest[]) => void;
}

const DEFAULT_STAFF: AdminUser[] = [
  {
    id: "usr-r1",
    name: "Marcus Vance",
    email: "m.vance@jbbestlogistics.com",
    phone: "(404) 555-0144",
    role: "rider",
    status: "active",
    mustChangePassword: false,
  },
  {
    id: "usr-r2",
    name: "Carlos Rodriguez",
    email: "c.rodriguez@jbbestlogistics.com",
    phone: "(404) 555-0182",
    role: "rider",
    status: "active",
    mustChangePassword: false,
  },
  {
    id: "usr-r3",
    name: "Devon Lee",
    email: "d.lee@jbbestlogistics.com",
    phone: "(404) 555-0193",
    role: "rider",
    status: "active",
    mustChangePassword: false,
  },
  {
    id: "usr-w1",
    name: "Elena Rostova",
    email: "e.rostova@jbbestlogistics.com",
    phone: "(404) 555-0119",
    role: "warehouse",
    status: "active",
    mustChangePassword: false,
  },
  {
    id: "usr-a1",
    name: "Administrator Desk",
    email: "admin@jbbestlogistics.com",
    phone: "(404) 555-0100",
    role: "admin",
    status: "active",
    mustChangePassword: false,
  },
];

const DEFAULT_ACTIVITIES: StaffActivity[] = [
  {
    id: "act-1",
    staffId: "usr-r1",
    staffName: "Marcus Vance",
    staffRole: "rider",
    action: "pickup_assigned",
    details:
      "Auto-assigned local courier pickup PKP-9821 for doorstep collection at Lenox Rd NE.",
    targetTrackingId: "PKP-9821",
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
  },
  {
    id: "act-2",
    staffId: "usr-w1",
    staffName: "Elena Rostova",
    staffRole: "warehouse",
    action: "cash_collected",
    details:
      "Collected $47.50 cash deposit at store front register (2450 Piedmont Rd NE counter).",
    targetTrackingId: "PKP-9824",
    timestamp: new Date(Date.now() - 34 * 60000).toISOString(),
  },
  {
    id: "act-3",
    staffId: "usr-r2",
    staffName: "Carlos Rodriguez",
    staffRole: "rider",
    action: "carrier_tendered",
    details:
      "Completed local courier deliveries for the day's dispatch route.",
    targetTrackingId: "JB-LOCAL-DELIVERY",
    timestamp: new Date(Date.now() - 65 * 60000).toISOString(),
  },
  {
    id: "act-4",
    staffId: "usr-w1",
    staffName: "Elena Rostova",
    staffRole: "warehouse",
    action: "shipment_intake",
    details:
      "Processed customer intake and issued a local courier tracking label.",
    targetTrackingId: "JB-8821-US",
    timestamp: new Date(Date.now() - 110 * 60000).toISOString(),
  },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  shipments,
  invoices,
  appointments,
  pickups,
  onUpdateInvoice,
  onOpenArchitecture,
  onUpdatePickup,
  onUpdatePickups,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<
    "kpis" | "dispatch" | "staff" | "activities" | "shipments" | "invoices"
  >("kpis");

  const [localPickups, setLocalPickups] = useState<PickupRequest[]>(pickups);
  const [serverPickupJobs, setServerPickupJobs] = useState<AdminPickupJob[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dispatchLoadError, setDispatchLoadError] = useState("");
  const [staffActivities, setStaffActivities] = useState<StaffActivity[]>(
    DEFAULT_ACTIVITIES
  );

  // Filters
  const [dispatchFilter, setDispatchFilter] = useState<
    "all" | "pending" | "assigned" | "carrier_tender" | "cash_onsite"
  >("all");
  const [activityStaffFilter, setActivityStaffFilter] = useState<string>("all");
  const [activityCategoryFilter, setActivityCategoryFilter] =
    useState<string>("all");
  const [dispatchNotice, setDispatchNotice] = useState<string>("");
  const [autoDispatchEnabled, setAutoDispatchEnabled] = useState(true);
  const [isSavingDispatchSetting, setIsSavingDispatchSetting] = useState(false);
  const [selectedRiderByPickup, setSelectedRiderByPickup] = useState<Record<string, string>>({});

  const [invoiceFilter, setInvoiceFilter] = useState<
    "all" | "paid" | "pending"
  >("all");
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newItemDesc, setNewItemDesc] = useState(
    "Commercial Freight & Custom Packaging"
  );
  const [newItemAmount, setNewItemAmount] = useState("150.00");

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(DEFAULT_STAFF);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newAccountRole, setNewAccountRole] =
    useState<ProvisionableRole>("rider");
  const [createUserError, setCreateUserError] = useState("");
  const [createdTemporaryPassword, setCreatedTemporaryPassword] = useState<
    string | null
  >(null);
  const [temporaryPasswordEmailSent, setTemporaryPasswordEmailSent] = useState(false);
  const [temporaryPasswordEmail, setTemporaryPasswordEmail] = useState("");

  useEffect(() => {
    setLocalPickups(pickups);
  }, [pickups]);

  const refreshServerPickups = async () => {
    try {
      const [{ jobs }, { notifications }] = await Promise.all([
        listAdminPickupJobs(),
        listAdminNotifications(),
      ]);
      setServerPickupJobs(jobs.filter((job) => job.shipmentId));
      setAdminNotifications(notifications);
      setDispatchLoadError("");
    } catch (error) {
      setDispatchLoadError(error instanceof Error ? error.message : "Unable to load saved pickup orders");
    }
  };

  useEffect(() => {
    void refreshServerPickups();
    getDispatchSettings().then(({ autoDispatchEnabled: enabled }) => setAutoDispatchEnabled(enabled)).catch(() => {});
    const timer = window.setInterval(() => void refreshServerPickups(), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const pendingServerPickups = serverPickupJobs.filter((job) =>
    job.status === "queued" && job.shipmentId && !job.shipmentId.assignedRiderId
  );

  useEffect(() => {
    if (activeAdminTab !== "staff" && activeAdminTab !== "dispatch") return;
    let isCurrent = true;
    setIsLoadingUsers(true);
    setUsersError("");
    listAdminUsers()
      .then(({ users }) => {
        if (isCurrent && users.length > 0) {
          setAdminUsers(users);
        }
      })
      .catch((error: unknown) => {
        if (isCurrent)
          setUsersError(
            error instanceof Error ? error.message : "Unable to load accounts"
          );
      })
      .finally(() => {
        if (isCurrent) setIsLoadingUsers(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [activeAdminTab]);

  const assignQueuedServerPickup = async (job: AdminPickupJob, riderId = selectedRiderByPickup[job._id] || "") => {
    const shipment = job.shipmentId;
    const rider = activeRiders.find((candidate) => candidate.id === riderId);
    if (!shipment || !rider) {
      setDispatchNotice("Choose an active rider who is open for delivery before assigning this pickup.");
      return;
    }
    try {
      await assignShipmentRider(shipment._id, rider.id, job.scheduledAt);
      setDispatchNotice(`Assigned ${shipment.trackingId} to ${rider.name}.`);
      await refreshServerPickups();
    } catch (error) {
      setDispatchNotice(error instanceof Error ? error.message : "Unable to assign pickup.");
    }
  };

  const activeRiders: RiderCandidate[] = adminUsers.filter(
    (u) => u.role === "rider" && u.status === "active" && u.riderAvailability?.isActive === true && u.riderAvailability.isAssigned === false
  );

  const toggleAutoDispatch = async () => {
    setIsSavingDispatchSetting(true);
    try {
      const result = await setDispatchSettings(!autoDispatchEnabled);
      setAutoDispatchEnabled(result.autoDispatchEnabled);
      setDispatchNotice(result.autoDispatchEnabled ? "Auto-dispatch is on. New pickups will be offered to available riders." : "Auto-dispatch is off. Assign pickups manually from the queue.");
    } catch (error) {
      setDispatchNotice(error instanceof Error ? error.message : "Unable to update auto-dispatch setting.");
    } finally {
      setIsSavingDispatchSetting(false);
    }
  };

  // Auto-Assign Single Pickup
  const handleAutoAssignSingle = (pickup: PickupRequest, riderId?: string) => {
    const result = autoAssignPickup(pickup, activeRiders, localPickups, riderId);
    if (!result.assignedRider) {
      setDispatchNotice(result.message);
      return;
    }

    const updatedList = localPickups.map((p) =>
      p.id === pickup.id ? result.pickup : p
    );
    setLocalPickups(updatedList);
    onUpdatePickups?.(updatedList);
    onUpdatePickup?.(result.pickup);

    if (result.activity) {
      setStaffActivities((prev) => [result.activity!, ...prev]);
    }
    setDispatchNotice(
      `✓ Assigned ${pickup.contactName}'s order to rider ${result.assignedRider.name}.`
    );
  };

  // Auto-Assign All Pending Pickups
  const handleAutoAssignAll = () => {
    const result = autoAssignAllPendingPickups(localPickups, activeRiders);
    if (result.assignedCount === 0) {
      setDispatchNotice("All current pickups are already assigned to riders.");
      return;
    }

    setLocalPickups(result.updatedPickups);
    onUpdatePickups?.(result.updatedPickups);
    if (result.activities.length > 0) {
      setStaffActivities((prev) => [...result.activities, ...prev]);
    }
    setDispatchNotice(
      `✓ Successfully auto-assigned ${result.assignedCount} pending pickup(s) across active riders!`
    );
  };

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateUserError("");
    setCreatedTemporaryPassword(null);
    setTemporaryPasswordEmailSent(false);
    setIsCreatingUser(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const role = String(form.get("role")) as ProvisionableRole;
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim() || undefined;

    try {
      const result = await provisionAdminUser({
        name,
        email,
        phone,
        role,
        ...(role === "rider"
          ? {
              vehicleType: String(form.get("vehicleType")) as
                | "bike"
                | "van"
                | "truck",
              weightCapacityKg: Number(form.get("weightCapacityKg")),
            }
          : {}),
      });
      setAdminUsers((current) => [result.user, ...current]);
      setCreatedTemporaryPassword(result.temporaryPassword || null);
      setTemporaryPasswordEmailSent(result.temporaryPasswordEmailSent === true);
      setTemporaryPasswordEmail(email);
      setShowCreateUserModal(false);

      const activity: StaffActivity = {
        id: `act-${Date.now()}`,
        staffId: "usr-a1",
        staffName: "Administrator Desk",
        staffRole: "admin",
        action: "account_created",
        details: `Provisioned new ${role.toUpperCase()} account for ${name} (${email}).`,
        timestamp: new Date().toISOString(),
      };
      setStaffActivities((prev) => [activity, ...prev]);
      formElement.reset();
    } catch (error) {
      setCreateUserError(error instanceof Error ? error.message : "Could not create the account. Please try again.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleStaffStatusChange = async (user: AdminUser) => {
    const status = user.status === "active" ? "suspended" : "active";
    setUsersError("");
    setUpdatingUserId(user.id);
    try {
      const result = await updateAdminUserStatus(user.id, status);
      setAdminUsers((current) =>
        current.map((account) =>
          account.id === result.user.id ? result.user : account
        )
      );
    } catch {
      // Local toggle fallback
      setAdminUsers((current) =>
        current.map((account) =>
          account.id === user.id ? { ...account, status } : account
        )
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteStaff = async (user: AdminUser) => {
    if (
      user.role === "admin" ||
      !window.confirm(
        `Permanently delete ${user.name}'s ${user.role.replaceAll(
          "_",
          " "
        )} account? This cannot be undone.`
      )
    )
      return;
    setUsersError("");
    setDeletingUserId(user.id);
    try {
      await deleteStaffAccount(user.id);
      setAdminUsers((current) =>
        current.filter((account) => account.id !== user.id)
      );
    } catch {
      setAdminUsers((current) =>
        current.filter((account) => account.id !== user.id)
      );
    } finally {
      setDeletingUserId(null);
    }
  };

  // KPI Calculations
  const totalBilled = invoices.reduce(
    (acc, inv) => acc + (inv.totalAmount || 0),
    0
  );
  const totalCollected = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const totalPending = totalBilled - totalCollected;
  const totalParcels = shipments.length;

  const filteredInvoices = invoices.filter((inv) => {
    if (invoiceFilter === "paid") return inv.status === "paid";
    if (invoiceFilter === "pending") return inv.status !== "paid";
    return true;
  });

  const filteredPickups = localPickups.filter((p) => {
    if (dispatchFilter === "pending") return !p.assignedDriverId;
    if (dispatchFilter === "assigned") return !!p.assignedDriverId;
    if (dispatchFilter === "carrier_tender") return p.directCarrierTransfer;
    if (dispatchFilter === "cash_onsite") return p.paymentMethod === "cash_onsite";
    return true;
  });
  const filteredServerPickups = serverPickupJobs.filter((job) => {
    if (dispatchFilter === "pending") return job.status === "queued";
    if (dispatchFilter === "assigned") return job.status === "assigned";
    if (dispatchFilter === "carrier_tender" || dispatchFilter === "cash_onsite") return false;
    return job.status === "queued" || job.status === "assigned";
  });

  const filteredActivities = staffActivities.filter((act) => {
    if (activityStaffFilter !== "all" && act.staffId !== activityStaffFilter) {
      return false;
    }
    if (
      activityCategoryFilter !== "all" &&
      act.action !== activityCategoryFilter
    ) {
      return false;
    }
    return true;
  });

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newCustomerEmail) return;

    const amount = parseFloat(newItemAmount) || 100;
    const tax = amount * 0.089;
    const newInv: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-2026-${Math.floor(8900 + Math.random() * 1000)}`,
      customerId: `cust-${Math.floor(100 + Math.random() * 900)}`,
      customerName: newCustomerName,
      customerEmail: newCustomerEmail,
      items: [
        {
          id: `item-${Date.now()}`,
          description: newItemDesc,
          quantity: 1,
          unitPrice: amount,
          total: amount,
          category: "shipping",
        },
      ],
      subtotal: amount,
      tax: Number(tax.toFixed(2)),
      totalAmount: Number((amount + tax).toFixed(2)),
      currency: "USD",
      status: "pending",
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: "Generated via Executive Admin Console. JB & Best Logistics LLC.",
    };

    onUpdateInvoice(newInv);
    setShowCreateInvoiceModal(false);
    setNewCustomerName("");
    setNewCustomerEmail("");
  };

  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col items-stretch gap-0 animate-in fade-in duration-200 md:flex-row">
      <DashboardSidebar
        title="Admin Console"
        activeItem={activeAdminTab}
        onSelect={(tab) => setActiveAdminTab(tab as typeof activeAdminTab)}
        items={[
          { id: "kpis", label: "Executive Analytics", icon: BarChart3 },
          { id: "dispatch", label: `Dispatch pickups (${localPickups.filter((p) => !p.assignedDriverId).length} waiting)`, icon: Zap },
          { id: "activities", label: `Staff Activity Monitor (${staffActivities.length})`, icon: Activity },
          { id: "staff", label: "Team & Accounts", icon: Users },
          { id: "shipments", label: "Shipments & Manifests", icon: Package },
          { id: "invoices", label: "Billing & Invoices", icon: Receipt },
        ]}
      />
      <div className="min-w-0 flex-1 space-y-6 p-3 sm:space-y-8 sm:p-6 lg:p-8">
      <div className="flex justify-end">
        <div className="relative">
          <button type="button" onClick={() => setShowNotifications((visible) => !visible)} aria-label={`${adminNotifications.length} admin notifications`} className="relative rounded-xl border border-gray-200 bg-white p-2.5 text-gray-700 shadow-xs hover:bg-gray-50">
            <Bell className="h-5 w-5" />
            {adminNotifications.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{adminNotifications.length}</span>}
          </button>
          {showNotifications && <div className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between"><h3 className="font-bold text-gray-900">Order notifications</h3><button type="button" onClick={() => setShowNotifications(false)} className="text-xs text-blue-700">Close</button></div>
            {adminNotifications.length ? <ul className="max-h-80 space-y-2 overflow-y-auto">{adminNotifications.map((notification) => <li key={notification._id} className="rounded-xl bg-blue-50 p-3"><p className="text-sm font-semibold text-gray-900">{notification.title}</p><p className="mt-1 text-xs text-gray-600">{notification.body}</p><p className="mt-1 text-[10px] text-gray-400">{new Date(notification.createdAt).toLocaleString()}</p></li>)}</ul> : <p className="py-4 text-sm text-gray-500">No notifications yet.</p>}
          </div>}
        </div>
      </div>
      {dispatchLoadError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{dispatchLoadError}</p>}
      {/* Top Executive KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">
              Total Billed Volume
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
            ${totalBilled.toFixed(2)}
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>${totalCollected.toFixed(2)} settled</span>
            <span className="text-gray-400">•</span>
            <span className="text-amber-600">${totalPending.toFixed(2)} due</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">
              Active Shipments
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
            <CountUp value={totalParcels} ariaLabel={`${totalParcels} active parcels`} /> Parcels
          </div>
          <p className="text-xs text-gray-500">JB & Best courier deliveries</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">
              Doorstep Dispatches
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
            <CountUp value={localPickups.length} ariaLabel={`${localPickups.length} pickups`} /> Pickups
          </div>
          <p className="text-xs text-amber-700 font-medium">Local courier bookings</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">
              Rider Fleet & Associates
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
            <CountUp value={activeRiders.length} ariaLabel={`${activeRiders.length} active riders`} /> Active Riders
          </div>
          <p className="text-xs text-gray-500">
            {adminUsers.length} total staff accounts provisioned
          </p>
        </div>
      </div>

      {/* MODULE: Automated Pickup Dispatch Hub */}
      {activeAdminTab === "dispatch" && (
        <div className="space-y-6 animate-in fade-in">
          {dispatchNotice && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-900 flex items-center justify-between">
              <span>{dispatchNotice}</span>
              <button
                type="button"
                onClick={() => setDispatchNotice("")}
                className="text-blue-500 hover:text-blue-700"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <span>Automated Pickup Dispatch Hub</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Automatically assign local Georgia courier pickups to available
                riders and track deposits and counter cash.
              </p>
            </div>

            <button type="button" role="switch" aria-checked={autoDispatchEnabled} disabled={isSavingDispatchSetting} onClick={() => void toggleAutoDispatch()} className={`inline-flex items-center gap-3 rounded-xl border px-4 py-2.5 text-xs font-bold transition disabled:opacity-60 ${autoDispatchEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-gray-200 bg-gray-100 text-gray-700"}`}>
              <span className={`relative h-5 w-9 rounded-full transition ${autoDispatchEnabled ? "bg-emerald-600" : "bg-gray-400"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${autoDispatchEnabled ? "left-[18px]" : "left-0.5"}`} /></span>
              <span>Auto-dispatch {autoDispatchEnabled ? "On" : "Off"}</span>
            </button>
          </div>

          {/* Dispatch Queue Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {[
              { id: "all", label: `All Orders (${localPickups.length + serverPickupJobs.filter((job) => job.status === "queued" || job.status === "assigned").length})` },
              {
                id: "pending",
                label: `Awaiting Rider (${
                  localPickups.filter((p) => !p.assignedDriverId).length + pendingServerPickups.length
                })`,
              },
              {
                id: "assigned",
                label: `Assigned (${
                  localPickups.filter((p) => !!p.assignedDriverId).length + serverPickupJobs.filter((job) => job.status === "assigned").length
                })`,
              },
              {
                id: "cash_onsite",
                label: `Onsite Cash Payments (${
                  localPickups.filter((p) => p.paymentMethod === "cash_onsite")
                    .length
                })`,
              },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDispatchFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap border ${
                  dispatchFilter === f.id
                    ? "bg-gray-900 border-gray-900 text-white shadow-xs"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Pickups Matrix */}
          <div className="space-y-4">
            {filteredPickups.length > 0 || filteredServerPickups.length > 0 ? (
              <>
              {filteredServerPickups.map((job) => {
                const shipment = job.shipmentId;
                if (!shipment) return null;
                const isServerAssigned = job.status === "assigned" || Boolean(shipment.assignedRiderId);
                return (
                  <div key={job._id} className="p-5 rounded-3xl border border-amber-200 bg-amber-50/40 shadow-xs space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-amber-200">
                      <div>
                        <span className="font-mono text-xs font-bold text-gray-900 bg-white px-2.5 py-1 rounded-lg">{shipment.trackingId}</span>
                        <p className="mt-2 font-bold text-gray-900">{shipment.sender?.name || "Customer pickup"}</p>
                        <p className="mt-1 text-xs text-gray-500">{shipment.sender?.street}, {shipment.sender?.city} · Scheduled {new Date(job.scheduledAt).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${isServerAssigned ? "bg-purple-100 text-purple-900" : "bg-amber-100 text-amber-900"}`}>{isServerAssigned ? "Assigned" : "Waiting for rider"}</span>
                        {isServerAssigned ? (
                          <span className="text-xs font-bold text-purple-700">{typeof shipment.assignedRiderId === "string" ? shipment.assignedRiderId : shipment.assignedRiderId?.name || "Rider assigned"}</span>
                        ) : (
                          <>
                            <select aria-label={`Select rider for ${shipment.trackingId}`} value={selectedRiderByPickup[job._id] || ""} onChange={(event) => setSelectedRiderByPickup((current) => ({ ...current, [job._id]: event.target.value }))} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs">
                              <option value="">Choose available rider</option>
                              {activeRiders.map((rider) => <option key={rider.id} value={rider.id}>{rider.name}</option>)}
                            </select>
                            <button type="button" onClick={() => void assignQueuedServerPickup(job)} disabled={!selectedRiderByPickup[job._id]} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Assign pickup</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredPickups.map((p) => {
                const isAssigned = Boolean(p.assignedDriverId);

                return (
                  <div
                    key={p.id}
                    className="p-5 rounded-3xl border border-gray-200/80 bg-white shadow-xs space-y-4 transition hover:border-gray-300"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">
                          {p.trackingNumber || p.id}
                        </span>
                        <span className="font-bold text-gray-900 text-sm">
                          {p.contactName}
                        </span>
                        {p.businessName && (
                          <span className="text-xs text-gray-500">
                            ({p.businessName})
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          📞 {p.contactPhone}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                            p.destinationType === "local"
                              ? "bg-emerald-100 text-emerald-800"
                              : p.destinationType === "out_of_state"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-purple-100 text-purple-900"
                          }`}
                        >
                          {p.destinationType === "local"
                            ? "Local Georgia"
                            : p.destinationType === "out_of_state"
                            ? "Out of State"
                            : "International"}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-blue-100 text-blue-800">
                          Carrier: {p.preferredCarrier}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                      {/* Pickup Address */}
                      <div className="space-y-1">
                        <span className="font-semibold text-gray-400 block uppercase tracking-wider text-[10px]">
                          Pickup Origin
                        </span>
                        <p className="font-medium text-gray-800">
                          {p.pickupAddress.street},{" "}
                          {p.pickupAddress.suite ? `${p.pickupAddress.suite}, ` : ""}
                          {p.pickupAddress.city}, {p.pickupAddress.state}{" "}
                          {p.pickupAddress.zip}
                        </p>
                        <p className="text-gray-500">
                          Date: {p.pickupDate} ({p.readyTime} - {p.closeTime})
                        </p>
                      </div>

                      {/* Delivery Destination */}
                      <div className="space-y-1">
                        <span className="font-semibold text-gray-400 block uppercase tracking-wider text-[10px]">
                          Delivery Destination Location
                        </span>
                        <p className="font-medium text-gray-900">
                          {p.deliveryAddress?.name}
                        </p>
                        <p className="text-gray-700">
                          {p.deliveryAddress?.street},{" "}
                          {p.deliveryAddress?.city}, {p.deliveryAddress?.state}{" "}
                          {p.deliveryAddress?.zip} ({p.deliveryAddress?.country || "USA"})
                        </p>
                      </div>

                      {/* Size, Mileage, Pricing & 50% Deposit */}
                      <div className="space-y-1 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                        <span className="font-semibold text-gray-400 block uppercase tracking-wider text-[10px]">
                          Pricing & 50% Deposit
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Total Estimated:</span>
                          <span className="font-bold text-gray-900">
                            ${(p.totalEstimatedCost ?? 35).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-blue-700 font-semibold">
                          <span>50% Upfront Deposit:</span>
                          <span>${(p.depositAmount ?? 17.5).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-500 text-[11px]">
                          <span>Remaining Balance:</span>
                          <span>${(p.remainingBalance ?? 17.5).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Direct Carrier Hub Notice */}
                    {p.directCarrierTransfer && (
                      <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            <strong>Direct Carrier Tender:</strong> Destination is
                            out-of-state/country. Rider must tender directly to{" "}
                            <span className="font-bold underline">
                              {p.carrierHubName ||
                                `${p.preferredCarrier.toUpperCase()} Airport Hub`}
                            </span>
                            .
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase">
                          Air Linehaul
                        </span>
                      </div>
                    )}

                    {/* Action Bar: Cash Settlement & Rider Assignment */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold"><CreditCard className="mr-1 inline h-3.5 w-3.5" />Pickup payment status: {p.paymentMethod === "cash_onsite" ? "Cash onsite" : "Online deposit"}</span>



                      {/* Rider assignment */}
                      <div className="flex items-center gap-2">
                        {isAssigned ? (
                          <span className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5" /> Rider: {p.assignedDriverId}
                          </span>
                        ) : (
                          <><select aria-label={`Choose rider for pickup ${p.trackingNumber || p.id}`} value={selectedRiderByPickup[p.id] || ""} onChange={(event) => setSelectedRiderByPickup((current) => ({ ...current, [p.id]: event.target.value }))} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs"><option value="">Choose available rider</option>{activeRiders.map((rider) => <option key={rider.id} value={rider.id}>{rider.name}</option>)}</select><button type="button" onClick={() => handleAutoAssignSingle(p, selectedRiderByPickup[p.id])} disabled={!selectedRiderByPickup[p.id]} className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"><span>Assign pickup</span></button></>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              </>
            ) : (
              <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 text-gray-500">
                <Truck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-semibold text-gray-700">No pickups match filter</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODULE: Live Staff Activity Monitor */}
      {activeAdminTab === "activities" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span>Live Staff Activity & Audit Monitor</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time chronological timeline tracking operations performed by riders,
                warehouse associates, and desk staff.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Personnel filter */}
              <select
                value={activityStaffFilter}
                onChange={(e) => setActivityStaffFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs bg-gray-50 font-medium"
              >
                <option value="all">All Staff Personnel</option>
                {adminUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>

              {/* Category filter */}
              <select
                value={activityCategoryFilter}
                onChange={(e) => setActivityCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs bg-gray-50 font-medium"
              >
                <option value="all">All Action Categories</option>
                <option value="pickup_assigned">Pickups Assigned</option>
                <option value="carrier_tendered">Carrier Hub Tenders</option>
                <option value="cash_collected">Cash Collected</option>
                <option value="shipment_intake">Shipment Intakes</option>
                <option value="account_created">Staff Provisioning</option>
              </select>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="space-y-3">
            {filteredActivities.length > 0 ? (
              filteredActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold uppercase shrink-0 mt-0.5 ${
                        act.staffRole === "rider"
                          ? "bg-purple-100 text-purple-700"
                          : act.staffRole === "warehouse"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {act.staffName.slice(0, 2)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-gray-900">
                          {act.staffName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-700">
                          {act.staffRole}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            act.action === "pickup_assigned"
                              ? "bg-blue-100 text-blue-800"
                              : act.action === "cash_collected"
                              ? "bg-emerald-100 text-emerald-800"
                              : act.action === "carrier_tendered"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {act.action.replaceAll("_", " ")}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 leading-relaxed">
                        {act.details}
                      </p>

                      {act.targetTrackingId && (
                        <span className="inline-block font-mono text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md mt-1">
                          Ref: {act.targetTrackingId}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] text-gray-400 shrink-0 whitespace-nowrap">
                    {new Date(act.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 text-gray-500">
                <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-semibold text-gray-700">
                  No staff activity logs match filter
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODULE: Executive Analytics */}
      {activeAdminTab === "kpis" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Local Courier Volume */}
            <div className="lg:col-span-6 bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center justify-between">
                <span>Local Courier Volume</span>
                <span className="text-xs font-normal text-gray-500">This Month</span>
              </h3>

              <div className="space-y-4 pt-2">
                {[
                  {
                    carrier: "JB & Best Local Courier",
                    share: 100,
                    color: "bg-emerald-500",
                    count: `${localPickups.length} bookings`,
                  },
                  {
                    carrier: "",
                    share: 0,
                    color: "bg-blue-600",
                    count: "51 pkgs",
                  },
                  {
                    carrier: "",
                    share: 0,
                    color: "bg-sky-500",
                    count: "21 pkgs",
                  },
                  {
                    carrier: "",
                    share: 0,
                    color: "bg-red-500",
                    count: "8 pkgs",
                  },
                ].map((item) => (
                  <div key={item.carrier || item.color} className={`space-y-1.5 ${item.carrier ? '' : 'hidden'}`}>
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                      <span>{item.carrier}</span>
                      <span className="text-gray-500">
                        {item.count} ({item.share}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                        style={{ width: `${item.share}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Local Courier Schedule */}
            <div className="lg:col-span-6 bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center justify-between">
                <span>Local Courier Schedule</span>
                <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                  Mon-Fri 5:30 PM
                </span>
              </h3>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-bold text-gray-900">
                        Local Courier North Route
                      </p>
                      <p className="text-gray-500">
                        Cutoff: 5:30 PM • Driver ETA: 5:15 PM
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    On Schedule
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-bold text-gray-900">
                        Local Courier Central Route
                      </p>
                      <p className="text-gray-500">
                        Cutoff: 5:45 PM • Driver ETA: 5:30 PM
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    On Schedule
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-red-50/70 border border-red-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-bold text-gray-900">
                        Local Courier South Route
                      </p>
                      <p className="text-gray-500">
                        Cutoff: 5:00 PM • Driver ETA: 4:45 PM
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    On Schedule
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE: Shipments & Assignments */}
      {activeAdminTab === "shipments" && <AdminShipmentAssignmentsView />}

      {/* MODULE: Invoices */}
      {activeAdminTab === "invoices" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">
                Filter Invoices:
              </span>
              <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-medium">
                {(["all", "paid", "pending"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setInvoiceFilter(filter)}
                    className={`px-3 py-1 rounded-lg capitalize transition cursor-pointer ${
                      invoiceFilter === filter
                        ? "bg-white text-gray-900 font-bold shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowCreateInvoiceModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Customer Invoice</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold">
                  <tr>
                    <th className="p-4">Invoice #</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Description</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/70 transition">
                      <td className="p-4 font-mono font-bold text-gray-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-gray-900">
                          {inv.customerName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {inv.customerEmail}
                        </p>
                      </td>
                      <td className="p-4 text-gray-600 max-w-xs truncate">
                        {inv.items[0]?.description || "Shipping & Store Services"}
                      </td>
                      <td className="p-4 text-right font-bold text-gray-900">
                        ${(inv.totalAmount ?? 0).toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                            inv.status === "paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {inv.status === "paid" ? "Paid" : "Due"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {inv.status !== "paid" ? (
                          <button
                            onClick={() => {
                              onUpdateInvoice({
                                ...inv,
                                status: "paid",
                                paidAt: new Date().toISOString(),
                                paymentGateway: "stripe",
                              });
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-xs transition cursor-pointer"
                          >
                            Mark Paid
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">Settled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODULE: Team & Accounts */}
      {activeAdminTab === "staff" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Team accounts</h3>
              <p className="text-sm text-gray-500">
                Manage administrators, riders, and warehouse access.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCreateUserError("");
                setShowCreateUserModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" />
              Create account
            </button>
          </div>

          {createdTemporaryPassword && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">
                {temporaryPasswordEmailSent
                  ? `Temporary password emailed to ${temporaryPasswordEmail}`
                  : `Email could not be sent to ${temporaryPasswordEmail}. Share this password securely.`}
              </p>
              <p className="mt-1 font-mono select-all">
                {createdTemporaryPassword}
              </p>
            </div>
          )}

          {usersError && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {usersError}
            </p>
          )}

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Active Deliveries</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {adminUsers.map((user) => {
                    const assignedCount = localPickups.filter(
                      (p) => p.assignedDriverId === user.name
                    ).length;

                    return (
                      <tr key={user.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </td>
                        <td className="px-4 py-3 capitalize">
                          <span className="font-medium text-gray-700">
                            {user.role.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              user.status === "active"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {user.role === "rider"
                            ? `${assignedCount} active pickups`
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {user.role === "admin" ? (
                            <span className="text-xs text-gray-400">Protected</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleStaffStatusChange(user)}
                              disabled={
                                updatingUserId !== null || deletingUserId !== null
                              }
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                                user.status === "active"
                                  ? "text-red-700 hover:bg-red-50"
                                  : "text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              {user.status === "active" ? (
                                <UserRoundX className="h-3.5 w-3.5" />
                              ) : (
                                <UserRoundCheck className="h-3.5 w-3.5" />
                              )}
                              {user.status === "active"
                                ? "Suspend"
                                : "Restore access"}
                            </button>
                          )}
                          {user.role !== "admin" && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteStaff(user)}
                              disabled={
                                updatingUserId !== null || deletingUserId !== null
                              }
                              title="Delete staff account"
                              className="ml-1 inline-flex items-center rounded-lg p-1.5 text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal: Create Staff User */}
          {showCreateUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
              <div className="max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Create staff account
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Set up credentials and assignments for new personnel.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateUserModal(false)}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  >
                    ×
                  </button>
                </div>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Full name
                    <input
                      name="name"
                      required
                      placeholder="e.g. Samuel Green"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Work email
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="s.green@jbbestlogistics.com"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone
                    <input
                      name="phone"
                      type="tel"
                      placeholder="(404) 555-0188"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Account role
                    <select
                      name="role"
                      defaultValue="rider"
                      onChange={(event) =>
                        setNewAccountRole(
                          event.target.value as ProvisionableRole
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="rider">Rider / Delivery Courier</option>
                      <option value="warehouse">Warehouse Associate</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </label>
                  {newAccountRole === "rider" && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Vehicle Type
                        <select
                          name="vehicleType"
                          defaultValue="van"
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="van">Van (Standard parcels)</option>
                          <option value="bike">Bike (Express envelopes)</option>
                          <option value="truck">Truck (Heavy freight)</option>
                        </select>
                      </label>
                      <label className="block text-sm font-medium text-gray-700">
                        Capacity (kg)
                        <input
                          name="weightCapacityKg"
                          type="number"
                          min="1"
                          defaultValue="150"
                          required
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none"
                        />
                      </label>
                    </div>
                  )}
                  {createUserError && (
                    <p className="text-sm text-red-700" role="alert">
                      {createUserError}
                    </p>
                  )}
                  <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateUserModal(false)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingUser}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {isCreatingUser ? "Creating..." : "Create account"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Customer Invoice */}
      {showCreateInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900">
              Create New Invoice
            </h3>
            <form
              onSubmit={handleCreateInvoice}
              className="space-y-3 text-xs sm:text-sm"
            >
              <div>
                <label className="block text-gray-600 font-medium mb-1">
                  Customer / Business Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Buckhead Law Firm LLC"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">
                  Customer Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="billing@buckheadlaw.com"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">
                  Service Description
                </label>
                <input
                  type="text"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">
                  Base Amount ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateInvoiceModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition cursor-pointer"
                >
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};
