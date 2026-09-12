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
} from "lucide-react";
import {
  Shipment,
  PickupRequest,
  Appointment,
  Carrier,
  ShipmentStatus,
} from "../../types";

interface StaffDashboardProps {
  shipments: Shipment[];
  pickups: PickupRequest[];
  appointments: Appointment[];
  onAddShipment: (shipment: Shipment) => void;
  onUpdateShipment: (shipment: Shipment) => void;
  onUpdatePickup: (pickup: PickupRequest) => void;
  onUpdateAppointment?: (appointment: Appointment) => void;
  onSwitchToConsumer: () => void;
  onSwitchToAdmin: () => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  shipments,
  pickups,
  appointments,
  onAddShipment,
  onUpdateShipment,
  onUpdatePickup,
  onSwitchToConsumer,
  onSwitchToAdmin,
}) => {
  const [activeStaffTab, setActiveStaffTab] = useState<
    "intake" | "pickups" | "scanner" | "appointments" | "manifest"
  >("intake");

  // Intake state
  const [newTrackingNum, setNewTrackingNum] = useState("");
  const [carrier, setCarrier] = useState<Carrier>("fedex");
  const [service, setService] = useState("FedEx 2Day Air");
  const [recipientName, setRecipientName] = useState(
    "Georgia Client Recipient",
  );
  const [recipientCity, setRecipientCity] = useState("Savannah");
  const [weight, setWeight] = useState(5.5);
  const [declaredValue, setDeclaredValue] = useState(200);
  const [intakeSuccess, setIntakeSuccess] = useState<string | null>(null);

  // Scanner state
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>(
    shipments[0]?.id || "",
  );
  const [selectedPickupId, setSelectedPickupId] = useState<string>(
    pickups[0]?.id || "",
  );
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>(
    appointments[0]?.id || "",
  );
  const [staffModal, setStaffModal] = useState<null | {
    kind: "intake" | "pickup" | "appointment";
    pickupId?: string;
    appointmentId?: string;
  }>(null);
  const [milestoneStatus, setMilestoneStatus] =
    useState<ShipmentStatus>("in_transit");
  const [milestoneTitle, setMilestoneTitle] = useState(
    "Linehaul Transit Departure",
  );
  const [milestoneCity, setMilestoneCity] = useState("Atlanta, GA");
  const [milestoneDesc, setMilestoneDesc] = useState(
    "Departed sort facility en route to destination.",
  );

  const printShipmentLabel = (shipment: Shipment | null | undefined) => {
    if (!shipment) return;

    const printWindow = window.open("", "_blank", "width=440,height=700");
    if (!printWindow) return;

    const formatAddress = (addr: Shipment["sender"] | Shipment["recipient"]) =>
      `${addr.name}\n${addr.street}${addr.suite ? `, ${addr.suite}` : ""}\n${addr.city}, ${addr.state} ${addr.zip}\n${addr.country}`;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>JB & Best Logistics Label</title>
          <style>
            body {
              margin: 0;
              font-family: Arial, sans-serif;
              background: #f8fafc;
              color: #0f172a;
            }
            .label {
              width: 100%;
              max-width: 360px;
              margin: 18px auto;
              background: white;
              border: 2px solid #0f172a;
              border-radius: 16px;
              padding: 18px 16px;
              box-sizing: border-box;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 12px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
            }
            .brand {
              font-size: 14px;
              font-weight: 700;
              letter-spacing: 0.06em;
            }
            .tracking {
              font-size: 12px;
              font-weight: 700;
              color: #334155;
            }
            .qr-box {
              display: flex;
              justify-content: center;
              margin: 12px 0 18px;
            }
            .qr-box img {
              width: 164px;
              height: 164px;
              border: 2px solid #e2e8f0;
              border-radius: 10px;
              background: white;
              padding: 8px;
            }
            .section {
              margin-bottom: 12px;
            }
            .section-label {
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              color: #64748b;
              margin-bottom: 4px;
            }
            .address {
              font-size: 12px;
              line-height: 1.5;
              white-space: pre-line;
            }
            .meta {
              font-size: 11px;
              color: #1e293b;
              font-weight: 600;
            }
            @media print {
              body { background: white; }
              .label {
                margin: 0;
                box-shadow: none;
                border-width: 1.5px;
              }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">
              <div class="brand">JB & BEST</div>
              <div class="tracking">${shipment.trackingNumber}</div>
            </div>

            <div class="qr-box">
              ${shipment.qrCode ? `<img src="${shipment.qrCode}" alt="Tracking QR code" />` : "<div>No QR code</div>"}
            </div>

            <div class="section">
              <div class="section-label">From</div>
              <div class="address">${formatAddress(shipment.sender)}</div>
            </div>

            <div class="section">
              <div class="section-label">To</div>
              <div class="address">${formatAddress(shipment.recipient)}</div>
            </div>

            <div class="meta">Carrier: ${shipment.carrier.toUpperCase()} • Service: ${shipment.serviceLevel}</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 250);
  };

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
  const modalPickup =
    staffModal?.kind === "pickup"
      ? pickups.find(
          (p) => p.id === (staffModal.pickupId || selectedPickupId),
        ) || pickups[0]
      : null;
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

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    const shipment = shipments.find((s) => s.id === selectedShipmentId);
    if (!shipment) return;

    const newLog = {
      id: `log-${Date.now()}`,
      shipmentId: shipment.id,
      status: milestoneStatus,
      title: milestoneTitle,
      description: milestoneDesc,
      location: {
        city: milestoneCity.split(",")[0]?.trim() || "Atlanta",
        state: milestoneCity.split(",")[1]?.trim() || "GA",
        country: "USA",
        latitude: shipment.currentLocation.latitude,
        longitude: shipment.currentLocation.longitude,
        facilityName: "Carrier Checkpoint",
      },
      timestamp: new Date().toISOString(),
    };

    const updatedShipment: Shipment = {
      ...shipment,
      currentStatus: milestoneStatus,
      updatedAt: new Date().toISOString(),
      trackingLogs: [newLog, ...shipment.trackingLogs],
    };

    onUpdateShipment(updatedShipment);
    alert(
      `Added milestone update to ${shipment.trackingNumber}! Check customer tracking view to see the live update.`,
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Staff Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 text-xs font-semibold border border-amber-400/20">
            <Truck className="w-3.5 h-3.5" />
            <span>Store Counter & Dispatch Console</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            Staff Operations Terminal
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl">
            Counter package intake, thermal label printing, driver dispatch
            assignments, and live tracking milestone updates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onSwitchToAdmin}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Switch to Admin Console</span>
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

      {/* Staff Operational Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-px">
        {[
          { id: "intake", label: "Counter Intake & Labels", icon: Box },
          {
            id: "pickups",
            label: `Doorstep Pickups (${pickups.length})`,
            icon: Truck,
          },
          { id: "scanner", label: "Milestone Scanner", icon: QrCode },
          {
            id: "appointments",
            label: `Appointments (${appointments.length})`,
            icon: Calendar,
          },
          { id: "manifest", label: "5:30 PM Carrier Manifest", icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeStaffTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveStaffTab(tab.id as any)}
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
                    onChange={(e) => setCarrier(e.target.value as Carrier)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50 focus:bg-white focus:outline-none"
                  >
                    <option value="fedex">FedEx Express / Ground</option>
                    <option value="ups">UPS Ground / Air</option>
                    <option value="usps">USPS Priority / Express</option>
                    <option value="jb_freight">JB Local Courier Van</option>
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
                Assign pickup requests to courier vans and update pickup
                completion.
              </p>
            </div>
            <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              {pickups.filter((p) => p.status !== "completed").length} Pending
              Dispatch
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
                      📍 {p.pickupAddress.street},{" "}
                      {p.pickupAddress.suite
                        ? `${p.pickupAddress.suite}, `
                        : ""}
                      {p.pickupAddress.city} {p.pickupAddress.zip}
                    </p>
                    <p className="text-gray-500">
                      📞 {p.contactPhone} • Ready: {p.pickupDate} ({p.readyTime}{" "}
                      - {p.closeTime}) • {p.estimatedPackagesCount} boxes (
                      {p.totalWeightLbs} lbs)
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
                      onClick={() => {
                        setSelectedPickupId(p.id);
                        setStaffModal({ kind: "pickup", pickupId: p.id });
                      }}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      Dispatch Modal
                    </button>
                    {p.status === "scheduled" && (
                      <button
                        onClick={() =>
                          onUpdatePickup({
                            ...p,
                            status: "in_route",
                            assignedDriverId: "Driver-Van-01",
                          })
                        }
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                      >
                        Assign Van & Dispatch
                      </button>
                    )}
                    {p.status === "in_route" && (
                      <button
                        onClick={() =>
                          onUpdatePickup({ ...p, status: "completed" })
                        }
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                      >
                        Mark Collected
                      </button>
                    )}
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
                      Pickup QR Sync
                    </p>
                    <h4 className="text-lg font-bold mt-1">
                      {selectedPickup.trackingNumber || selectedPickup.id}
                    </h4>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
                    Live
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 p-4">
                  {selectedPickup.qrCode ? (
                    <img
                      src={selectedPickup.qrCode}
                      alt={`QR code for pickup ${selectedPickup.trackingNumber || selectedPickup.id}`}
                      className="h-28 w-28 rounded-xl border border-slate-700 bg-white p-2"
                    />
                  ) : (
                    <div className="text-center text-slate-300 text-xs">
                      QR code unavailable for this pickup.
                    </div>
                  )}
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

                  {selectedPickup.qrPayload && (
                    <div className="pt-3 border-t border-slate-700 text-slate-300">
                      <p className="text-slate-400 mb-1">Scanned order data</p>
                      <pre className="max-h-28 overflow-auto rounded-xl border border-slate-700 bg-slate-800 p-2 text-[10px] leading-relaxed whitespace-pre-wrap text-slate-100">
                        {selectedPickup.qrPayload}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Milestone Scanner */}
      {activeStaffTab === "scanner" && (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Waypoint & Milestone Scanner
            </h3>
            <p className="text-xs text-gray-500">
              Update package status milestones. Changes appear instantaneously
              in the customer&apos;s live tracking view.
            </p>
          </div>

          <form
            onSubmit={handleAddMilestone}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm"
          >
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Select Package
              </label>
              <select
                value={selectedShipmentId}
                onChange={(e) => setSelectedShipmentId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
              >
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.trackingNumber} ({s.carrier.toUpperCase()} to{" "}
                    {s.recipient.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Milestone Status
              </label>
              <select
                value={milestoneStatus}
                onChange={(e) =>
                  setMilestoneStatus(e.target.value as ShipmentStatus)
                }
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
              >
                <option value="picked_up">Picked Up by Carrier</option>
                <option value="in_transit">
                  In Transit / Intermediate Sort
                </option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered to Recipient</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Milestone Headline
              </label>
              <input
                type="text"
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Checkpoint Location
              </label>
              <input
                type="text"
                value={milestoneCity}
                onChange={(e) => setMilestoneCity(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-gray-700 font-semibold mb-1">
                Status Description
              </label>
              <input
                type="text"
                value={milestoneDesc}
                onChange={(e) => setMilestoneDesc(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Publish Tracking Update to Customer View</span>
              </button>
            </div>
          </form>
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
                        onChange={(e) => setCarrier(e.target.value as Carrier)}
                        className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
                      >
                        <option value="fedex">FedEx</option>
                        <option value="ups">UPS</option>
                        <option value="usps">USPS</option>
                        <option value="jb_freight">JB Freight</option>
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

            {staffModal.kind === "pickup" && modalPickup && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                      Dispatch Queue
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-gray-900">
                      {modalPickup.contactName}
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
                    <strong>Address:</strong> {modalPickup.pickupAddress.street}
                    , {modalPickup.pickupAddress.city}
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-3">
                    <strong>Phone:</strong> {modalPickup.contactPhone}
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-3">
                    <strong>Carrier:</strong> {modalPickup.preferredCarrier}
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-3">
                    <strong>Pickup:</strong> {modalPickup.pickupDate}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  {modalPickup.status === "scheduled" && (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdatePickup({
                          ...modalPickup,
                          status: "in_route",
                          assignedDriverId: "Driver-Van-01",
                        });
                        setStaffModal(null);
                      }}
                      className="w-1/2 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition cursor-pointer"
                    >
                      Assign Van
                    </button>
                  )}
                  {modalPickup.status === "in_route" && (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdatePickup({ ...modalPickup, status: "completed" });
                        setStaffModal(null);
                      }}
                      className="w-1/2 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition cursor-pointer"
                    >
                      Mark Collected
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
              <span className="font-bold text-gray-900">UPS Staging Dock</span>
              <p className="text-amber-800 font-medium">
                3 Parcels Ready • Driver Arrival: 5:15 PM
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1">
              <span className="font-bold text-gray-900">
                FedEx Express Air Bin
              </span>
              <p className="text-blue-800 font-medium">
                2 Parcels Ready • Driver Arrival: 5:30 PM
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-1">
              <span className="font-bold text-gray-900">USPS Mail Sacks</span>
              <p className="text-sky-800 font-medium">
                1 Sack Ready • Shuttle Arrival: 4:45 PM
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
