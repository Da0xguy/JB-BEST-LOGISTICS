import React, { useState } from "react";
import {
  Truck,
  PlusCircle,
  CheckCircle2,
  Clock,
  MapPin,
  Shield,
  Box,
  Send,
  AlertCircle,
  QrCode,
  Printer,
  Calendar,
  User,
  Search,
  ExternalLink,
  History,
} from "lucide-react";
import { DashboardSidebar } from "../DashboardSidebar";
import { apiRequest, getShipmentByTrackingNumber } from "../../lib/api";
import {
  Shipment,
  PickupRequest,
  Appointment,
  Carrier,
  ShipmentStatus,
} from "../../types";
import { WarehouseMailboxView } from "./WarehouseMailboxView";
import { WarehouseHistoryView } from "./WarehouseHistoryView";
import { extractTrackingId, QrCameraScanner } from "../QrCameraScanner";
import { printShipmentLabel } from "../../lib/printShipmentLabel";

interface StaffDashboardProps {
  shipments: Shipment[];
  pickups: PickupRequest[];
  appointments: Appointment[];
  onAddShipment: (shipment: Shipment) => void;
  onUpdateShipment: (shipment: Shipment) => void;
  onUpdateAppointment?: (appointment: Appointment) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  shipments,
  pickups,
  appointments,
  onAddShipment,
  onUpdateShipment,
  onUpdateAppointment,
}) => {
  const [activeStaffTab, setActiveStaffTab] = useState<
    | "intake"
    | "pickups"
    | "scanner"
    | "appointments"
    | "manifest"
    | "mailboxes"
    | "history"
  >("intake");

  // Intake state
  const [newTrackingNum, setNewTrackingNum] = useState("");
  const carrier: Carrier = "jb_freight";
  const [service, setService] = useState("JB Local Courier");
  const [recipientName, setRecipientName] = useState(
    "Georgia Client Recipient",
  );
  const [recipientCity, setRecipientCity] = useState("Savannah");
  const [weight, setWeight] = useState(5.5);
  const [declaredValue, setDeclaredValue] = useState(200);
  const [intakeSuccess, setIntakeSuccess] = useState<string | null>(null);

  // Scanner state
  const [selectedPickupId, setSelectedPickupId] = useState<string>(
    pickups[0]?.id || "",
  );
  const [trackingIdInput, setTrackingIdInput] = useState("");
  const [scannedShipment, setScannedShipment] = useState<Shipment | null>(null);
  const [warehouseScannerOpen, setWarehouseScannerOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanNotice, setScanNotice] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>(
    appointments[0]?.id || "",
  );
  const [staffModal, setStaffModal] = useState<null | {
    kind: "intake" | "appointment";
    appointmentId?: string;
  }>(null);

  const handleCreateShipment = (e: React.FormEvent) => {
    e.preventDefault();
    const trackingId =
      newTrackingNum.trim() ||
      `JB-${Math.floor(1000 + Math.random() * 9000)}-US`;

    const newShipment: Shipment = {
      id: trackingId,
      trackingNumber: trackingId,
      carrier,
      serviceLevel: service,
      sender: {
        name: "JB & Best Logistics Counter",
        street: "2450 Piedmont Rd NE",
        city: "Atlanta",
        state: "GA",
        zip: "30324",
        country: "USA",
        phone: "+1 (404) 555-0199",
      },
      recipient: {
        name: recipientName,
        street: "100 Main St",
        city: recipientCity,
        state: "GA",
        zip: "31401",
        country: "USA",
        phone: "+1 (404) 555-9000",
      },
      packageDetails: {
        weightLbs: Number(weight),
        dimensions: { length: 12, width: 8, height: 6, unit: "in" },
        packageType: "box",
        isFragile: false,
        requiresSignature: true,
        declaredValue: Number(declaredValue),
      },
      currentStatus: "order_created",
      currentLocation: {
        city: "Atlanta",
        state: "GA",
        country: "USA",
        latitude: 33.749,
        longitude: -84.388,
        facilityName: "Atlanta Counter Intake Register #1",
      },
      originLocation: {
        city: "Atlanta",
        state: "GA",
        country: "USA",
        latitude: 33.749,
        longitude: -84.388,
      },
      destinationLocation: {
        city: recipientCity,
        state: "GA",
        country: "USA",
        latitude: 32.0809,
        longitude: -81.0912,
      },
      estimatedDelivery: "2 Business Days",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trackingLogs: [
        {
          id: `log-${Date.now()}`,
          shipmentId: trackingId,
          status: "order_created",
          title: "Registered at Retail Terminal",
          description: "Package accepted, weighed, and barcoded by associate.",
          location: {
            city: "Atlanta",
            state: "GA",
            country: "USA",
            latitude: 33.749,
            longitude: -84.388,
            facilityName: "JB & Best Logistics Main Hub",
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    onAddShipment(newShipment);
    setIntakeSuccess(trackingId);
    setNewTrackingNum("");
    setStaffModal(null);
  };

  const selectedPickup =
    pickups.find((p) => p.id === selectedPickupId) || pickups[0];
  const selectedAppointment =
    appointments.find((a) => a.id === selectedAppointmentId) || appointments[0];
  const modalAppointment =
    staffModal?.kind === "appointment"
      ? appointments.find(
          (a) => a.id === (staffModal.appointmentId || selectedAppointmentId),
        ) || appointments[0]
      : null;

  const handleAppointmentStatusUpdate = (
    appointment: Appointment,
    nextStatus: Appointment["status"],
  ) => {
    const updatedAppointment: Appointment = {
      ...appointment,
      status: nextStatus,
      assignedAssociateId:
        nextStatus === "confirmed" || nextStatus === "in_progress"
          ? "assoc-front-desk-01"
          : appointment.assignedAssociateId,
      updatedAt: new Date().toISOString(),
    };
    onUpdateAppointment?.(updatedAppointment);
    if (nextStatus === "confirmed") {
      setSelectedAppointmentId(updatedAppointment.id);
    }
  };

  const getShipmentRoute = (shipment: Shipment) => {
    if (
      shipment.sender.country.trim() &&
      shipment.recipient.country.trim() &&
      shipment.sender.country.trim().toLowerCase() !==
        shipment.recipient.country.trim().toLowerCase()
    )
      return "International";
    return "Domestic";
  };

  const handleWarehouseScan = async (payload: string) => {
    setWarehouseScannerOpen(false);
    setScanError("");
    setScanNotice("");
    setScanBusy(true);
    try {
      const trackingId = extractTrackingId(payload);
      const shipment = await getShipmentByTrackingNumber(trackingId);
      const route = getShipmentRoute(shipment);
      setScannedShipment(shipment);
      if (
        route !== "International" &&
        shipment.currentStatus !== "at_warehouse"
      ) {
        throw new Error(
          "Domestic shipments stay with the rider for final delivery and cannot be received at the warehouse.",
        );
      }
      if (
        shipment.currentStatus !== "assigned" &&
        shipment.currentStatus !== "picked_up" &&
        shipment.currentStatus !== "at_warehouse"
      ) {
        throw new Error(
          `Shipment is ${shipment.currentStatus.replaceAll("_", " ")}; warehouse intake is not available at this stage.`,
        );
      }
      if (shipment.currentStatus !== "at_warehouse") {
        const note = `Received at warehouse and waiting for ${route.toLowerCase()} outbound shipping.`;
        await apiRequest(
          `/api/shipments/${encodeURIComponent(shipment.id)}/status`,
          {
            method: "PATCH",
            body: JSON.stringify({ status: "at_warehouse", note }),
          },
        );
        const receivedShipment = {
          ...shipment,
          currentStatus: "at_warehouse" as const,
          updatedAt: new Date().toISOString(),
        };
        setScannedShipment(receivedShipment);
        onUpdateShipment(receivedShipment);
        setScanNotice(
          `${trackingId} received. The customer was notified that it is at the warehouse awaiting ${route.toLowerCase()} shipping.`,
        );
      } else {
        setScanNotice(
          `${trackingId} is already received and awaiting ${route.toLowerCase()} shipping.`,
        );
      }
      setTrackingIdInput("");
    } catch (scanFailure) {
      setScanError(
        scanFailure instanceof Error
          ? scanFailure.message
          : "Unable to receive this shipment.",
      );
    } finally {
      setScanBusy(false);
    }
  };

  const markScannedShipmentOutbound = async () => {
    if (!scannedShipment || scannedShipment.currentStatus !== "at_warehouse")
      return;
    setScanBusy(true);
    setScanError("");
    try {
      const route = getShipmentRoute(scannedShipment);
      await apiRequest(
        `/api/shipments/${encodeURIComponent(scannedShipment.id)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "in_transit",
            note: `Dispatched from warehouse for ${route.toLowerCase()} shipping.`,
          }),
        },
      );
      const dispatchedShipment = {
        ...scannedShipment,
        currentStatus: "in_transit" as const,
        updatedAt: new Date().toISOString(),
      };
      setScannedShipment(dispatchedShipment);
      onUpdateShipment(dispatchedShipment);
      setScanNotice(
        `${scannedShipment.trackingNumber} marked in transit for ${route.toLowerCase()} shipping.`,
      );
    } catch (dispatchError) {
      setScanError(
        dispatchError instanceof Error
          ? dispatchError.message
          : "Unable to mark shipment outbound.",
      );
    } finally {
      setScanBusy(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col items-stretch gap-0 animate-in fade-in duration-200 md:flex-row">
      <DashboardSidebar
        title="Staff Workspace"
        activeItem={activeStaffTab}
        onSelect={(tab) => setActiveStaffTab(tab as typeof activeStaffTab)}
        items={[
          { id: "intake", label: "Counter Intake & Labels", icon: Box },
          { id: "pickups", label: `Doorstep Pickups (${pickups.length})`, icon: Truck },
          { id: "scanner", label: "Milestone Scanner", icon: QrCode },
          { id: "appointments", label: `Appointments (${appointments.length})`, icon: Calendar },
          { id: "manifest", label: "5:30 PM Carrier Manifest", icon: Clock },
          { id: "mailboxes", label: "Mailbox Profiles", icon: User },
          { id: "history", label: "History", icon: History },
        ]}
      />
      <div className="min-w-0 flex-1 space-y-6 p-3 sm:space-y-8 sm:p-6 lg:p-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
          Warehouse workspace
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          Warehouse operations
        </h1>
      </header>
      {activeStaffTab === "mailboxes" && <WarehouseMailboxView />}
      {activeStaffTab === "history" && <WarehouseHistoryView />}

      {/* TAB 1: Counter Intake */}
      {activeStaffTab === "intake" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  New Package Intake
                </h3>
                <p className="text-xs text-gray-500">
                  Weigh package, generate tracking barcode, and assign carrier.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStaffModal({ kind: "intake" })}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Open Intake Modal
              </button>
            </div>

            <form onSubmit={handleCreateShipment} className="space-y-5">
              {intakeSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      Created shipment <strong>{intakeSuccess}</strong>{" "}
                      successfully!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      printShipmentLabel(
                        shipments.find(
                          (shipment) =>
                            shipment.trackingNumber === intakeSuccess,
                        ) || shipments[0],
                      )
                    }
                    className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3 h-3" /> Print Label
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Carrier
                  </label>
                  <select
                    value={carrier}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50 focus:bg-white focus:outline-none"
                  >
                    <option value="jb_freight">JB Local Courier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Service Level
                  </label>
                  <input
                    type="text"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Weight (lbs)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Declared Value ($)
                  </label>
                  <input
                    type="number"
                    value={declaredValue}
                    onChange={(e) => setDeclaredValue(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Destination City
                  </label>
                  <input
                    type="text"
                    value={recipientCity}
                    onChange={(e) => setRecipientCity(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Custom Barcode ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to auto-generate (e.g. JB-8890-US)"
                  value={newTrackingNum}
                  onChange={(e) => setNewTrackingNum(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50 focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register Intake & Generate Barcode</span>
              </button>
            </form>
          </div>

          {/* Active Store Shipments List */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-gray-900 flex items-center justify-between">
              <span>Recently Registered Parcels</span>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                {shipments.length} total
              </span>
            </h3>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {shipments.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-gray-900">
                      {s.trackingNumber}
                    </span>
                    <span className="font-bold text-[10px] uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {s.carrier}
                    </span>
                  </div>
                  <p className="text-gray-500">
                    To: {s.recipient.name} ({s.recipient.city},{" "}
                    {s.recipient.state})
                  </p>
                  <p className="text-[11px] text-gray-400 capitalize">
                    {s.serviceLevel} • {s.packageDetails.weightLbs} lbs
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Doorstep Pickups & Drivers */}
      {activeStaffTab === "pickups" && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Doorstep Collection Dispatch Queue
              </h3>
              <p className="text-xs text-gray-500">
                New requests are offered automatically to available riders.
              </p>
            </div>
            <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              {
                pickups.filter(
                  (p) => !["completed", "cancelled"].includes(p.status),
                ).length
              }{" "}
              Open
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_0.9fr] gap-5">
            <div className="space-y-4">
              {pickups.map((p) => (
                <div
                  key={p.id}
                  className="p-5 rounded-2xl border border-gray-200/80 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">
                        {p.contactName}
                      </span>
                      {p.businessName && (
                        <span className="text-gray-500 font-medium">
                          ({p.businessName})
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                        {p.status}
                      </span>
                    </div>
                    <p className="text-gray-600">
                      📍 <strong>Pickup:</strong> {p.pickupAddress.street},{" "}
                      {p.pickupAddress.suite
                        ? `${p.pickupAddress.suite}, `
                        : ""}
                      {p.pickupAddress.city} {p.pickupAddress.zip}
                    </p>
                    {p.deliveryAddress && (
                      <p className="text-gray-800 font-medium">
                        🎯 <strong>Destination:</strong> {p.deliveryAddress.street},{" "}
                        {p.deliveryAddress.city}, {p.deliveryAddress.state} {p.deliveryAddress.zip} ({p.deliveryAddress.country})
                      </p>
                    )}
                    {p.directCarrierTransfer && (
                      <div className="p-2 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 font-medium">
                        ✈️ <strong>Direct Carrier Tender:</strong> Out-of-State / International parcel. Rider tenders directly to{" "}
                        <span className="font-bold underline">{p.carrierHubName || `${p.preferredCarrier.toUpperCase()} Hub`}</span>.
                      </div>
                    )}
                    <div className="flex items-center gap-3 flex-wrap pt-0.5 text-[11px]">
                      <span className="font-semibold text-gray-700">
                        Total: ${(p.totalEstimatedCost ?? 0).toFixed(2)}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-blue-700 font-semibold">
                        50% Deposit: ${(p.depositAmount ?? 0).toFixed(2)}
                      </span>
                      <span className="text-gray-400">•</span>
                      {p.paymentMethod === "cash_onsite" ? (
                        <span className={`px-2 py-0.5 rounded-full font-bold ${p.paidAtRegister ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {p.paidAtRegister ? '✓ Cash Received at Counter' : '💵 Cash Payment Due Onsite'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                          ✓ 50% Deposit Paid Online
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500">
                      📞 {p.contactPhone} • Ready: {p.pickupDate} ({p.readyTime}{" "}
                      - {p.closeTime}) • {p.estimatedPackagesCount} boxes (
                      {p.totalWeightLbs} lbs)
                    </p>
                    <p className="text-gray-600">
                      Rider: {p.assignedDriverId || "Automatic offer pending"}
                    </p>
                    {p.specialInstructions && (
                      <p className="text-amber-800 font-medium bg-amber-50 p-2 rounded-xl mt-1 border border-amber-200/60">
                        ⚠️ Note / Gate Code: {p.specialInstructions}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedPickupId(p.id)}
                      className="px-3 py-2 border border-gray-300 bg-white text-gray-700 text-xs font-semibold rounded-xl transition hover:bg-gray-50"
                    >
                      View details
                    </button>
                    {p.status === "completed" && (
                      <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Picked Up
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {selectedPickup && (
              <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-sm border border-slate-800">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-700">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      Automatic rider dispatch
                    </p>
                    <h4 className="text-lg font-bold mt-1">
                      {selectedPickup.trackingNumber || selectedPickup.id}
                    </h4>
                  </div>
                  <span className="rounded-full bg-slate-700 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-200">
                    {selectedPickup.status.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="mt-5 space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400">Customer</span>
                    <span className="font-semibold text-white">
                      {selectedPickup.contactName}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400">Phone</span>
                    <span className="font-semibold text-white">
                      {selectedPickup.contactPhone}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400">Carrier</span>
                    <span className="font-semibold uppercase text-white">
                      {selectedPickup.preferredCarrier}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400">Pickup</span>
                    <span className="font-semibold text-white">
                      {selectedPickup.pickupDate}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-700 text-slate-300">
                    <p className="text-slate-400 mb-1">Address</p>
                    <p className="font-medium text-white leading-relaxed">
                      {selectedPickup.pickupAddress.street},{" "}
                      {selectedPickup.pickupAddress.city},{" "}
                      {selectedPickup.pickupAddress.state}{" "}
                      {selectedPickup.pickupAddress.zip}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Milestone Scanner */}
      {activeStaffTab === "scanner" && (
        <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
          <header>
            <h3 className="text-lg font-bold text-gray-900">
              Warehouse intake scanner
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Scan a rider handoff to record warehouse receipt. The customer is
              notified while the parcel waits for outbound shipping.
            </p>
          </header>

          {scanError && (
            <p
              role="alert"
              className="border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {scanError}
            </p>
          )}
          {scanNotice && (
            <p
              role="status"
              className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              {scanNotice}
            </p>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="space-y-3">
              <button
                type="button"
                onClick={() => setWarehouseScannerOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <QrCode className="h-4 w-4" />{" "}
                {warehouseScannerOpen ? "Close camera" : "Open camera scanner"}
              </button>
              {warehouseScannerOpen && (
                <QrCameraScanner
                  onScan={(value) => void handleWarehouseScan(value)}
                  onClose={() => setWarehouseScannerOpen(false)}
                />
              )}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleWarehouseScan(trackingIdInput);
                }}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <input
                  value={trackingIdInput}
                  onChange={(event) => setTrackingIdInput(event.target.value)}
                  placeholder="Or enter tracking ID"
                  aria-label="Shipment tracking ID"
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={scanBusy}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {scanBusy ? "Checking..." : "Receive parcel"}
                </button>
              </form>
            </section>

            {scannedShipment ? (
              <section className="space-y-3 border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-mono text-sm font-bold text-gray-900">
                    {scannedShipment.trackingNumber}
                  </h4>
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold capitalize text-blue-800">
                    {scannedShipment.currentStatus.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {getShipmentRoute(scannedShipment)} route · To{" "}
                  {scannedShipment.recipient.city},{" "}
                  {scannedShipment.recipient.state},{" "}
                  {scannedShipment.recipient.country}
                </p>
                <p className="text-sm text-gray-600">
                  {scannedShipment.recipient.name} ·{" "}
                  {scannedShipment.recipient.street}
                </p>
                {scannedShipment.currentStatus === "at_warehouse" && (
                  <button
                    type="button"
                    onClick={() => void markScannedShipmentOutbound()}
                    disabled={scanBusy}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" /> Mark outbound shipment
                  </button>
                )}
              </section>
            ) : (
              <div className="flex min-h-32 items-center justify-center border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500">
                Scan a parcel to view its route and warehouse status.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Appointments Queue */}
      {activeStaffTab === "appointments" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.8fr] gap-5">
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Today&apos;s Store Appointment Check-Ins
            </h3>
            <div className="space-y-3">
              {appointments.map((a) => {
                const actionLabel =
                  a.status === "pending"
                    ? "Accept Appointment"
                    : a.status === "confirmed"
                      ? "Sign In Customer"
                      : a.status === "in_progress"
                        ? "Mark Visit Complete"
                        : "Completed";

                return (
                  <div
                    key={a.id}
                    className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAppointmentId(a.id);
                        setStaffModal({
                          kind: "appointment",
                          appointmentId: a.id,
                        });
                      }}
                      className="text-left flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">
                          {a.customerName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          {a.status}
                        </span>
                      </div>
                      <p className="text-gray-600 capitalize">
                        {a.serviceType.replace(/_/g, " ")}
                      </p>
                      <p className="text-gray-400">
                        {a.appointmentDate} at {a.timeSlot} • {a.customerPhone}
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        if (a.status === "pending") {
                          handleAppointmentStatusUpdate(a, "confirmed");
                          return;
                        }
                        if (a.status === "confirmed") {
                          handleAppointmentStatusUpdate(a, "in_progress");
                          return;
                        }
                        if (a.status === "in_progress") {
                          handleAppointmentStatusUpdate(a, "completed");
                        }
                      }}
                      disabled={a.status === "completed"}
                      className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                        a.status === "completed"
                          ? "bg-emerald-100 text-emerald-700 cursor-default"
                          : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                      }`}
                    >
                      {actionLabel}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedAppointment && (
            <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-sm border border-slate-800">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-700">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    Appointment details
                  </p>
                  <h4 className="text-lg font-bold mt-1">
                    {selectedAppointment.customerName}
                  </h4>
                </div>
                <span className="rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
                  {selectedAppointment.status}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-300">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Service</span>
                  <span className="font-semibold text-white capitalize">
                    {selectedAppointment.serviceType.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Date</span>
                  <span className="font-semibold text-white">
                    {selectedAppointment.appointmentDate}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Time</span>
                  <span className="font-semibold text-white">
                    {selectedAppointment.timeSlot}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Phone</span>
                  <span className="font-semibold text-white">
                    {selectedAppointment.customerPhone}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Assigned</span>
                  <span className="font-semibold text-white">
                    {selectedAppointment.assignedAssociateId || "Unassigned"}
                  </span>
                </div>
                {selectedAppointment.notes && (
                  <div className="pt-2 border-t border-slate-700 text-slate-300">
                    <p className="text-slate-400 mb-1">Notes</p>
                    <p className="font-medium text-white leading-relaxed">
                      {selectedAppointment.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {staffModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95">
            {staffModal.kind === "intake" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                      Counter Intake
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-gray-900">
                      Register New Parcel
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStaffModal(null)}
                    className="rounded-full bg-gray-100 px-2 py-1 text-gray-600 hover:bg-gray-200 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form
                  onSubmit={handleCreateShipment}
                  className="space-y-4 text-xs sm:text-sm"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-gray-700 font-semibold">
                        Carrier
                      </label>
                      <select
                        value={carrier}
                        className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
                      >
                        <option value="jb_freight">JB Local Courier</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-gray-700 font-semibold">
                        Service Level
                      </label>
                      <input
                        type="text"
                        value={service}
                        onChange={(e) => setService(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-gray-700 font-semibold">
                        Weight (lbs)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={weight}
                        onChange={(e) => setWeight(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-gray-700 font-semibold">
                        Declared Value ($)
                      </label>
                      <input
                        type="number"
                        value={declaredValue}
                        onChange={(e) =>
                          setDeclaredValue(Number(e.target.value))
                        }
                        className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-gray-700 font-semibold">
                        Recipient Name
                      </label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-gray-700 font-semibold">
                        Destination City
                      </label>
                      <input
                        type="text"
                        value={recipientCity}
                        onChange={(e) => setRecipientCity(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-gray-700 font-semibold">
                      Custom Barcode ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={newTrackingNum}
                      onChange={(e) => setNewTrackingNum(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setStaffModal(null)}
                      className="w-1/2 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition cursor-pointer"
                    >
                      Register Package
                    </button>
                  </div>
                </form>
              </div>
            )}

            {staffModal.kind === "appointment" && modalAppointment && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-600">
                      Appointment
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-gray-900">
                      {modalAppointment.customerName}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStaffModal(null)}
                    className="rounded-full bg-gray-100 px-2 py-1 text-gray-600 hover:bg-gray-200 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700">
                  <div className="rounded-2xl bg-gray-50 p-3">
                    <strong>Service:</strong>{" "}
                    {modalAppointment.serviceType.replace(/_/g, " ")}
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-3">
                    <strong>Status:</strong> {modalAppointment.status}
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-3">
                    <strong>Date:</strong> {modalAppointment.appointmentDate}
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-3">
                    <strong>Time:</strong> {modalAppointment.timeSlot}
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-3 sm:col-span-2">
                    <strong>Phone:</strong> {modalAppointment.customerPhone}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  {modalAppointment.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => {
                        handleAppointmentStatusUpdate(
                          modalAppointment,
                          "confirmed",
                        );
                        setStaffModal(null);
                      }}
                      className="w-1/2 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition cursor-pointer"
                    >
                      Accept
                    </button>
                  )}
                  {modalAppointment.status === "confirmed" && (
                    <button
                      type="button"
                      onClick={() => {
                        handleAppointmentStatusUpdate(
                          modalAppointment,
                          "in_progress",
                        );
                        setStaffModal(null);
                      }}
                      className="w-1/2 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition cursor-pointer"
                    >
                      Sign In
                    </button>
                  )}
                  {modalAppointment.status === "in_progress" && (
                    <button
                      type="button"
                      onClick={() => {
                        handleAppointmentStatusUpdate(
                          modalAppointment,
                          "completed",
                        );
                        setStaffModal(null);
                      }}
                      className="w-1/2 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition cursor-pointer"
                    >
                      Complete Visit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setStaffModal(null)}
                    className="w-1/2 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Evening Linehaul Manifest */}
      {activeStaffTab === "manifest" && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Daily Carrier Manifest Summary
              </h3>
              <p className="text-xs text-gray-500">
                Packages staged for 5:30 PM carrier pickup.
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Daily Manifest
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1">
              <span className="font-bold text-gray-900">Courier Dispatch Area</span>
              <p className="text-amber-800 font-medium">
                3 Parcels Ready • Driver Arrival: 5:15 PM
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1">
              <span className="font-bold text-gray-900">
                Local Courier Parcels
              </span>
              <p className="text-blue-800 font-medium">
                2 Parcels Ready • Driver Arrival: 5:30 PM
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-1">
              <span className="font-bold text-gray-900">Courier Delivery Queue</span>
              <p className="text-sky-800 font-medium">
                1 Sack Ready • Shuttle Arrival: 4:45 PM
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
