import React, { useState } from "react";
import {
  BarChart3,
  DollarSign,
  Package,
  Key,
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
} from "lucide-react";
import {
  Shipment,
  Invoice,
  Appointment,
  PickupRequest,
  MailboxRental,
  PaymentGateway,
} from "../../types";

interface AdminDashboardProps {
  shipments: Shipment[];
  invoices: Invoice[];
  appointments: Appointment[];
  pickups: PickupRequest[];
  onUpdateInvoice: (invoice: Invoice) => void;
  onOpenArchitecture: () => void;
  onSwitchToConsumer: () => void;
  onSwitchToStaff: () => void;
}

const INITIAL_MAILBOX_ROSTER: MailboxRental[] = [
  {
    boxNumber: "#101",
    renterName: "Marcus Sterling",
    companyName: "Savannah Timber Co.",
    email: "marcus@savannahtimber.com",
    phone: "(912) 555-9201",
    tier: "Corporate 24/7",
    status: "active",
    renewalDate: "2027-01-15",
    keyFobId: "FOB-9921",
    packagesHeld: 2,
  },
  {
    boxNumber: "#102",
    renterName: "Elena Rostova",
    companyName: "Piedmont Design Studio",
    email: "elena@piedmontdesign.co",
    phone: "(404) 555-4411",
    tier: "Business",
    status: "active",
    renewalDate: "2026-11-30",
    keyFobId: "FOB-8812",
    packagesHeld: 1,
  },
  {
    boxNumber: "#103",
    renterName: "David Chen",
    companyName: "TechVentures ATL",
    email: "dchen@techventures.io",
    phone: "(404) 555-8833",
    tier: "Corporate 24/7",
    status: "renewal_due",
    renewalDate: "2026-09-12",
    keyFobId: "FOB-7704",
    packagesHeld: 4,
  },
  {
    boxNumber: "#104",
    renterName: "Sarah Jenkins",
    companyName: "",
    email: "sarah.jenkins@gmail.com",
    phone: "(404) 555-0123",
    tier: "Personal",
    status: "active",
    renewalDate: "2027-03-01",
    keyFobId: "FOB-6641",
    packagesHeld: 0,
  },
  {
    boxNumber: "#105",
    renterName: "Vacant",
    companyName: "",
    email: "",
    phone: "",
    tier: "Business",
    status: "available",
    renewalDate: "—",
    keyFobId: "UNASSIGNED",
    packagesHeld: 0,
  },
  {
    boxNumber: "#106",
    renterName: "Vacant",
    companyName: "",
    email: "",
    phone: "",
    tier: "Personal",
    status: "available",
    renewalDate: "—",
    keyFobId: "UNASSIGNED",
    packagesHeld: 0,
  },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  shipments,
  invoices,
  appointments,
  pickups,
  onUpdateInvoice,
  onOpenArchitecture,
  onSwitchToConsumer,
  onSwitchToStaff,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<
    "kpis" | "invoices" | "mailboxes" | "staff" | "settings"
  >("kpis");

  const [mailboxes, setMailboxes] = useState<MailboxRental[]>(
    INITIAL_MAILBOX_ROSTER,
  );
  const [invoiceFilter, setInvoiceFilter] = useState<
    "all" | "paid" | "pending"
  >("all");
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showMailboxModal, setShowMailboxModal] = useState(false);
  const [selectedMailbox, setSelectedMailbox] = useState<MailboxRental | null>(
    null,
  );
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newItemDesc, setNewItemDesc] = useState(
    "Commercial Freight & Custom Packaging",
  );
  const [newItemAmount, setNewItemAmount] = useState("150.00");

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
  const activeMailboxCount = mailboxes.filter(
    (m) => m.status !== "available",
  ).length;
  const mailboxOccupancyRate = (
    (activeMailboxCount / mailboxes.length) *
    100
  ).toFixed(0);

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
      {/* Executive Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Store Executive & Operations Console</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            Store Management Dashboard
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl">
            High-level oversight of retail revenue, multi-carrier logistics,
            customer invoicing, and private mailbox leases for JB & Best
            Logistics.
          </p>
        </div>

        {/* Quick Portal Switchers */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onSwitchToStaff}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
          >
            <Truck className="w-3.5 h-3.5 text-amber-400" />
            <span>Switch to Staff Console</span>
          </button>
          <button
            onClick={onSwitchToConsumer}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Public Storefront</span>
          </button>
        </div>
      </div>

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
              Mailbox Occupancy
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
            {mailboxOccupancyRate}%
          </div>
          <p className="text-xs text-gray-500">
            {activeMailboxCount} of {mailboxes.length} units leased
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
          { id: "invoices", label: "Billing & Invoices", icon: Receipt },
          { id: "mailboxes", label: "Mailbox Center", icon: Key },
          { id: "staff", label: "Staff & Drivers", icon: Users },
          { id: "settings", label: "System & Architecture", icon: Code },
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

      {/* MODULE 3: Mailbox Center Roster */}
      {activeAdminTab === "mailboxes" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Private Mailbox Units (Box #101 – #106)
                </h3>
                <p className="text-xs text-gray-500">
                  Street address rentals, 24/7 key fob assignments, and package
                  hold records.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
                {activeMailboxCount} Occupied / {mailboxes.length} Total
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mailboxes.map((box) => (
                <div
                  key={box.boxNumber}
                  className={`p-4 rounded-2xl border transition ${
                    box.status === "available"
                      ? "bg-gray-50/60 border-dashed border-gray-300"
                      : box.status === "renewal_due"
                        ? "bg-amber-50/60 border-amber-300"
                        : "bg-white border-gray-200/80 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-display font-bold text-gray-900">
                      {box.boxNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        box.status === "available"
                          ? "bg-gray-200 text-gray-700"
                          : box.status === "renewal_due"
                            ? "bg-amber-200 text-amber-900"
                            : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {box.status.replace("_", " ")}
                    </span>
                  </div>

                  {box.status !== "available" ? (
                    <div className="space-y-1 text-xs text-gray-600">
                      <p className="font-bold text-gray-900">
                        {box.renterName}
                      </p>
                      {box.companyName && (
                        <p className="text-gray-500">{box.companyName}</p>
                      )}
                      <p className="text-gray-400">
                        Renewal: {box.renewalDate}
                      </p>
                      <div className="pt-2 flex items-center justify-between text-[11px] border-t border-gray-100">
                        <span className="font-mono text-gray-500">
                          {box.keyFobId}
                        </span>
                        <span className="font-semibold text-blue-600">
                          {box.packagesHeld} pkgs held
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 py-3 text-center">
                      <p>Available for lease</p>
                      <button
                        onClick={() => {
                          setSelectedMailbox(box);
                          setShowMailboxModal(true);
                        }}
                        className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        + Assign Mailbox
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 4: Staff & Driver Roster */}
      {activeAdminTab === "staff" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Today&apos;s Store Roster & Shifts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  name: "Marcus Taylor",
                  role: "Store Associate #1",
                  status: "Register #1 Open",
                  badge: "On Duty",
                },
                {
                  name: "Sarah Jenkins",
                  role: "Georgia Notary Concierge",
                  status: "In Consultation",
                  badge: "Busy",
                },
                {
                  name: "David Ramirez",
                  role: "Van Driver (Midtown/Buckhead)",
                  status: "On Route #2",
                  badge: "In Field",
                },
              ].map((staff) => (
                <div
                  key={staff.name}
                  className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-gray-900">
                      {staff.name}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {staff.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{staff.role}</p>
                  <p className="text-xs text-blue-600 font-medium pt-1">
                    {staff.status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 5: Settings & System Blueprint */}
      {activeAdminTab === "settings" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                System Configuration & Security
              </h3>
              <p className="text-xs text-gray-500">
                JB & Best Logistics operational parameters, Georgia sales tax
                configuration, and multi-tenant cloud setup.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                <span className="font-bold text-gray-700 block">
                  Georgia State Sales Tax Rate
                </span>
                <p className="text-gray-500">
                  Configured: 8.9% (Fulton County / Atlanta Local Option)
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                <span className="font-bold text-gray-700 block">
                  Payment Gateways
                </span>
                <p className="text-gray-500">
                  Stripe (US Card Payments) & Paystack (International Transfers)
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  System Architecture & Blueprint
                </h4>
                <p className="text-xs text-gray-500">
                  Inspect the complete Firestore schema, RBAC permissions, and
                  API workflows.
                </p>
              </div>
              <button
                onClick={onOpenArchitecture}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <Code className="w-3.5 h-3.5" />
                <span>View Architecture Specs</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showMailboxModal && selectedMailbox && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-gray-900">
                Assign Mailbox {selectedMailbox.boxNumber}
              </h3>
              <button
                type="button"
                onClick={() => setShowMailboxModal(false)}
                className="rounded-full bg-gray-100 px-2 py-1 text-gray-600 hover:bg-gray-200 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setMailboxes((prev) =>
                  prev.map((m) =>
                    m.boxNumber === selectedMailbox.boxNumber
                      ? {
                          ...m,
                          renterName: "New Commercial Client",
                          companyName: "JB & Best Logistics Client",
                          email: "newclient@jbbestlogistics.com",
                          phone: "(404) 555-0178",
                          status: "active",
                          renewalDate: "2027-09-01",
                          keyFobId: `FOB-${Math.floor(1000 + Math.random() * 9000)}`,
                          packagesHeld: 1,
                        }
                      : m,
                  ),
                );
                setShowMailboxModal(false);
                setSelectedMailbox(null);
              }}
              className="space-y-3 text-xs sm:text-sm"
            >
              <div>
                <label className="block text-gray-600 font-medium mb-1">
                  Leaseholder Name
                </label>
                <input
                  type="text"
                  defaultValue="New Commercial Client"
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-600 font-medium mb-1">
                  Business / Company
                </label>
                <input
                  type="text"
                  defaultValue="JB & Best Logistics Client"
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowMailboxModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition cursor-pointer"
                >
                  Save Lease
                </button>
              </div>
            </form>
          </div>
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
