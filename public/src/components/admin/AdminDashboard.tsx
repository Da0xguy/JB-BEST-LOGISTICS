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
} from "lucide-react";
import {
  Shipment,
  Invoice,
  Appointment,
  PickupRequest,
  PaymentGateway,
} from "../../types";
import {
  AdminUser,
  listAdminUsers,
  provisionAdminUser,
  ProvisionableRole,
  updateAdminUserStatus,
  deleteStaffAccount,
} from "../../lib/api";
import { AdminShipmentAssignmentsView } from "./AdminShipmentAssignmentsView";

interface AdminDashboardProps {
  shipments: Shipment[];
  invoices: Invoice[];
  appointments: Appointment[];
  pickups: PickupRequest[];
  onUpdateInvoice: (invoice: Invoice) => void;
  onOpenArchitecture: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  shipments,
  invoices,
  appointments,
  pickups,
  onUpdateInvoice,
  onOpenArchitecture,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<
    "kpis" | "shipments" | "invoices" | "staff"
  >("kpis");

  const [invoiceFilter, setInvoiceFilter] = useState<
    "all" | "paid" | "pending"
  >("all");
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newItemDesc, setNewItemDesc] = useState(
    "Commercial Freight & Custom Packaging",
  );
  const [newItemAmount, setNewItemAmount] = useState("150.00");
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
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

  useEffect(() => {
    if (activeAdminTab !== "staff") return;
    let isCurrent = true;
    setIsLoadingUsers(true);
    setUsersError("");
    listAdminUsers()
      .then(({ users }) => {
        if (isCurrent) setAdminUsers(users);
      })
      .catch((error: unknown) => {
        if (isCurrent)
          setUsersError(
            error instanceof Error ? error.message : "Unable to load accounts",
          );
      })
      .finally(() => {
        if (isCurrent) setIsLoadingUsers(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [activeAdminTab]);

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateUserError("");
    setCreatedTemporaryPassword(null);
    setIsCreatingUser(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const role = String(form.get("role")) as ProvisionableRole;
    try {
      const result = await provisionAdminUser({
        name: String(form.get("name") || "").trim(),
        email: String(form.get("email") || "").trim(),
        phone: String(form.get("phone") || "").trim() || undefined,
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
      setShowCreateUserModal(false);
      formElement.reset();
    } catch (error) {
      setCreateUserError(
        error instanceof Error ? error.message : "Unable to create account",
      );
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
          account.id === result.user.id ? result.user : account,
        ),
      );
    } catch (error) {
      setUsersError(
        error instanceof Error ? error.message : "Unable to update account",
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteStaff = async (user: AdminUser) => {
    if (
      user.role === "admin" ||
      !window.confirm(
        `Permanently delete ${user.name}'s ${user.role.replaceAll("_", " ")} account? This cannot be undone.`,
      )
    )
      return;
    setUsersError("");
    setDeletingUserId(user.id);
    try {
      await deleteStaffAccount(user.id);
      setAdminUsers((current) =>
        current.filter((account) => account.id !== user.id),
      );
    } catch (error) {
      setUsersError(
        error instanceof Error ? error.message : "Unable to delete account",
      );
    } finally {
      setDeletingUserId(null);
    }
  };

  // KPI Calculations
  const totalBilled = invoices.reduce(
    (acc, inv) => acc + (inv.totalAmount || 0),
    0,
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
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top 4 KPI Executive Metric Cards */}
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
            <span className="text-amber-600">
              ${totalPending.toFixed(2)} due
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">
              Parcels Processed
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
            {totalParcels} Active
          </div>
          <p className="text-xs text-gray-500">
            Across FedEx, UPS, USPS & JB Freight
          </p>
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
            {pickups.length} Pickups
          </div>
          <p className="text-xs text-gray-500">
            {appointments.length} In-store appointments scheduled
          </p>
        </div>
      </div>

      {/* Admin Module Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-px">
        {[
          { id: "kpis", label: "Executive Analytics", icon: BarChart3 },
          { id: "shipments", label: "Shipments", icon: Package },
          { id: "invoices", label: "Billing & Invoices", icon: Receipt },
          { id: "staff", label: "Team & Accounts", icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* MODULE 1: Executive Analytics */}
      {activeAdminTab === "kpis" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Carrier Share Breakdown */}
            <div className="lg:col-span-6 bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center justify-between">
                <span>Carrier Volume Distribution</span>
                <span className="text-xs font-normal text-gray-500">
                  This Month
                </span>
              </h3>

              <div className="space-y-4 pt-2">
                {[
                  {
                    carrier: "UPS Ground & Air",
                    share: 44,
                    color: "bg-amber-500",
                    count: "62 pkgs",
                  },
                  {
                    carrier: "FedEx Express & Home",
                    share: 36,
                    color: "bg-blue-600",
                    count: "51 pkgs",
                  },
                  {
                    carrier: "USPS Priority & Media",
                    share: 15,
                    color: "bg-sky-500",
                    count: "21 pkgs",
                  },
                  {
                    carrier: "JB Freight & Local Van",
                    share: 5,
                    color: "bg-emerald-500",
                    count: "8 pkgs",
                  },
                ].map((item) => (
                  <div key={item.carrier} className="space-y-1.5">
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

            {/* Carrier SLA & Daily Cutoffs */}
            <div className="lg:col-span-6 bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center justify-between">
                <span>Evening Carrier Linehaul Cutoffs</span>
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
                        UPS Evening Linehaul Vehicle
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
                        FedEx Express Air Linehaul
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

                <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-sky-600" />
                    <div>
                      <p className="font-bold text-gray-900">
                        USPS Buckhead Post Office Shuttle
                      </p>
                      <p className="text-gray-500">
                        Cutoff: 5:00 PM • Driver ETA: 4:45 PM
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    Manifest Ready
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === "shipments" && <AdminShipmentAssignmentsView />}

      {/* MODULE 2: Billing & Invoices Management */}
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

          {/* Invoices Table */}
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
                        {inv.items[0]?.description ||
                          "Shipping & Store Services"}
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

      {/* MODULE 4: Staff & Driver Roster */}
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
              <p className="font-semibold">Temporary password, shown once</p>
              <p className="mt-1 font-mono select-all">
                {createdTemporaryPassword}
              </p>
              <p className="mt-1 text-xs text-amber-800">
                The new account must change this password at first sign-in.
              </p>
              <button
                type="button"
                onClick={() => setCreatedTemporaryPassword(null)}
                className="mt-2 text-xs font-semibold underline"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {usersError && (
              <div className="p-4 text-sm text-red-700" role="alert">
                {usersError}
              </div>
            )}
            {isLoadingUsers ? (
              <div className="flex items-center gap-2 p-6 text-sm text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin" /> Loading
                accounts...
              </div>
            ) : adminUsers.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-155 text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">
                        Account status
                      </th>
                      <th className="px-4 py-3 font-semibold">First sign-in</th>
                      <th className="px-4 py-3 font-semibold">Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {adminUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {user.name}
                        </td>
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3 capitalize">
                          {user.role.replaceAll("_", " ")}
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
                        <td className="px-4 py-3 text-gray-500">
                          {user.mustChangePassword
                            ? "Password change required"
                            : "Ready"}
                        </td>
                        <td className="px-4 py-3">
                          {user.role === "admin" ? (
                            <span className="text-xs text-gray-400">
                              Protected
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleStaffStatusChange(user)}
                              disabled={
                                updatingUserId !== null ||
                                deletingUserId !== null
                              }
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:cursor-wait disabled:opacity-50 ${
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
                              {updatingUserId === user.id
                                ? "Updating..."
                                : user.status === "active"
                                  ? "Restrict"
                                  : "Restore access"}
                            </button>
                          )}
                          {user.role !== "admin" && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteStaff(user)}
                              disabled={
                                updatingUserId !== null ||
                                deletingUserId !== null
                              }
                              aria-label={`Delete ${user.name}'s account`}
                              title="Delete staff account"
                              className="ml-1 inline-flex items-center rounded-lg p-1.5 text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
                            >
                              {deletingUserId === user.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              !usersError && (
                <p className="p-6 text-sm text-gray-500">
                  No team accounts yet.
                </p>
              )
            )}
          </div>

          {showCreateUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
              <div className="max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Create team account
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      A generated temporary password is shown once after
                      creation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateUserModal(false)}
                    aria-label="Close account form"
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
                      autoComplete="name"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Work email
                    <input
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone{" "}
                    <span className="font-normal text-gray-400">
                      (optional)
                    </span>
                    <input
                      name="phone"
                      type="tel"
                      autoComplete="tel"
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
                          event.target.value as ProvisionableRole,
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="admin">Administrator</option>
                      <option value="rider">Rider</option>
                      <option value="warehouse">Warehouse</option>
                    </select>
                  </label>
                  {newAccountRole === "rider" && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Rider vehicle
                        <select
                          name="vehicleType"
                          defaultValue="van"
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="bike">Bike</option>
                          <option value="van">Van</option>
                          <option value="truck">Truck</option>
                        </select>
                      </label>
                      <label className="block text-sm font-medium text-gray-700">
                        Capacity (kg)
                        <input
                          name="weightCapacityKg"
                          type="number"
                          min="0.1"
                          step="0.1"
                          defaultValue="100"
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
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
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
  );
};
