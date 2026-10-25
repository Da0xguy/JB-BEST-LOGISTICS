import React, { useState, useEffect } from "react";
import {
  Search,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  Building2,
  ArrowRight,
  RefreshCw,
  Box,
  Scale,
  DollarSign,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Phone,
  Package,
} from "lucide-react";
import { Shipment, ShipmentStatus } from "../types";
import { getShipmentByTrackingNumber } from "../lib/api";

interface TrackingViewProps {
  shipments: Shipment[];
  initialTrackingId?: string;
}

const MILESTONES: {
  status: ShipmentStatus;
  label: string;
  description: string;
}[] = [
  {
    status: "order_created",
    label: "Order Placed",
    description: "Label printed & verified",
  },
  {
    status: "assigned",
    label: "Rider Assigned",
    description: "Pickup accepted by rider",
  },
  {
    status: "picked_up",
    label: "Picked Up",
    description: "Loaded at origin facility",
  },
  {
    status: "at_warehouse",
    label: "At Warehouse",
    description: "Received and awaiting outbound shipping",
  },
  {
    status: "in_transit",
    label: "In Transit",
    description: "On the way to destination",
  },
  {
    status: "out_for_delivery",
    label: "Out for Delivery",
    description: "With local courier",
  },
  {
    status: "delivered",
    label: "Delivered",
    description: "Signed & safely dropped",
  },
];

export const TrackingView: React.FC<TrackingViewProps> = ({
  shipments,
  initialTrackingId,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialTrackingId || "");
  const [selectedId, setSelectedId] = useState(initialTrackingId || "");
  const [trackedShipment, setTrackedShipment] = useState<Shipment | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [showOptionalSpecs, setShowOptionalSpecs] = useState(false);

  useEffect(() => {
    if (initialTrackingId) {
      setSelectedId(initialTrackingId);
      setSearchQuery(initialTrackingId);
      void lookupShipment(initialTrackingId);
    }
  }, [initialTrackingId]);

  const currentShipment =
    trackedShipment ||
    shipments.find(
      (s) =>
        s.trackingNumber.toLowerCase() === selectedId.toLowerCase() ||
        s.id === selectedId,
    ) ||
    (!selectedId ? shipments[0] : undefined);

  const lookupShipment = async (trackingNumber: string) => {
    setIsUpdating(true);
    setTrackingError("");
    try {
      const shipment = await getShipmentByTrackingNumber(trackingNumber);
      setTrackedShipment(shipment);
      setSelectedId(shipment.trackingNumber);
      setSearchQuery(shipment.trackingNumber);
    } catch (error) {
      setTrackedShipment(null);
      setTrackingError(
        error instanceof Error ? error.message : "Tracking lookup failed.",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trackingNumber = searchQuery.trim().toUpperCase();
    if (!/^[A-Z0-9]{20}$/.test(trackingNumber)) {
      setTrackingError("Enter a 20-character alphanumeric tracking ID.");
      return;
    }
    setSelectedId(trackingNumber);
    void lookupShipment(trackingNumber);
  };

  const currentMilestones = currentShipment
    ? (() => {
        const senderCountry = currentShipment.sender.country
          .trim()
          .toLowerCase();
        const recipientCountry = currentShipment.recipient.country
          .trim()
          .toLowerCase();
        const hasWarehouseMilestone =
          (senderCountry !== "" &&
            recipientCountry !== "" &&
            senderCountry !== recipientCountry) ||
          currentShipment.currentStatus === "at_warehouse" ||
          currentShipment.trackingLogs.some(
            (event) => event.status === "at_warehouse",
          );

        return hasWarehouseMilestone
          ? MILESTONES
          : MILESTONES.filter(
              (milestone) => milestone.status !== "at_warehouse",
            );
      })()
    : MILESTONES;
  const currentIndex = currentShipment
    ? Math.max(
        0,
        currentMilestones.findIndex(
          (milestone) => milestone.status === currentShipment.currentStatus,
        ),
      )
    : 0;

  const getCarrierBadge = (carrier: string) => {
    switch (carrier) {
      case "fedex":
        return {
          name: "FedEx Express",
          bg: "bg-purple-100 text-purple-800 border-purple-200",
        };
      case "ups":
        return {
          name: "UPS Service",
          bg: "bg-amber-100 text-amber-900 border-amber-200",
        };
      case "usps":
        return {
          name: "USPS Priority",
          bg: "bg-blue-100 text-blue-800 border-blue-200",
        };
      default:
        return {
          name: "JB Freight",
          bg: "bg-emerald-100 text-emerald-800 border-emerald-200",
        };
    }
  };

  const handleRefreshStatus = () => {
    if (currentShipment) void lookupShipment(currentShipment.trackingNumber);
  };

  const carrierInfo = currentShipment
    ? getCarrierBadge(currentShipment.carrier)
    : null;

  return (
    <div className="space-y-6">
      {/* Friendly Search Header */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-100">
          <div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60 inline-flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Live Package Tracking
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 mt-2">
              Where is your package?
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Enter a JB &amp; Best Logistics tracking ID for live status.
            </p>
          </div>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-2 max-w-md w-full"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(
                    e.target.value
                      .replace(/[^a-z0-9]/gi, "")
                      .slice(0, 20)
                      .toUpperCase(),
                  )
                }
                placeholder="20-character tracking ID"
                maxLength={20}
                autoCapitalize="characters"
                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-400 text-sm font-medium focus:bg-white focus:border-blue-600 focus:outline-none transition"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
            >
              <span>Track</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Customer orders */}
        <div className="pt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-500 font-medium">Your orders:</span>
          {shipments.map((s) => (
            <button
              key={s.trackingNumber}
              onClick={() => {
                setSearchQuery(s.trackingNumber);
                setSelectedId(s.trackingNumber);
                setTrackedShipment(null);
                void lookupShipment(s.trackingNumber);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                selectedId === s.trackingNumber
                  ? "bg-blue-600 border-blue-600 text-white shadow-xs font-semibold"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span>{s.trackingNumber}</span>{" "}
              <span className="opacity-75">({s.carrier.toUpperCase()})</span>
            </button>
          ))}
        </div>
      </div>

      {trackingError && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {trackingError}
        </p>
      )}

      {currentShipment && carrierInfo && (
        <div className="space-y-6">
          {/* Main Delivery Status Card */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-100">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${carrierInfo.bg}`}
                  >
                    {carrierInfo.name}
                  </span>
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                    {currentShipment.serviceLevel}
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  {currentShipment.trackingNumber}
                </h3>

                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="font-semibold text-gray-800">
                    {currentShipment.originLocation.city},{" "}
                    {currentShipment.originLocation.state}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-semibold text-gray-800">
                    {currentShipment.destinationLocation.city},{" "}
                    {currentShipment.destinationLocation.state}
                  </span>
                </p>
              </div>

              {/* Delivery ETA & Action */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-4">
                {currentShipment.qrCode && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                    <img
                      src={currentShipment.qrCode}
                      alt={`QR code for ${currentShipment.trackingNumber}`}
                      className="h-20 w-20 rounded-xl border border-gray-200 bg-white p-1.5"
                    />
                  </div>
                )}

                <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-4 min-w-[220px]">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Pickup Window
                  </p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {currentShipment.estimatedDelivery}
                  </p>
                  <p className="text-xs text-blue-800 font-medium mt-1 capitalize flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    <span>
                      Status: {currentShipment.currentStatus.replace(/_/g, " ")}
                    </span>
                  </p>
                </div>

                <button
                  onClick={handleRefreshStatus}
                  disabled={isUpdating}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shrink-0 border border-gray-200"
                  title="Check for live updates"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-blue-600 ${isUpdating ? "animate-spin" : ""}`}
                  />
                  <span>
                    {isUpdating ? "Checking..." : "Check for Updates"}
                  </span>
                </button>
              </div>
            </div>

            {/* Visual Stepper */}
            <div className="pt-8">
              <div className="relative grid grid-cols-3 gap-3 sm:grid-cols-7">
                {/* Background Connecting Line */}
                <div className="absolute top-4 left-[10%] right-[10%] h-1 bg-gray-100 -z-0" />
                <div
                  className="absolute top-4 left-[10%] h-1 bg-blue-600 -z-0 transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.max(0, Math.min(100, (currentIndex / (currentMilestones.length - 1)) * 80))}%`,
                  }}
                />

                {currentMilestones.map((milestone, idx) => {
                  const isPassed = idx <= currentIndex;
                  const isCurrent = idx === currentIndex;

                  return (
                    <div
                      key={milestone.status}
                      className="flex flex-col items-center text-center relative z-10"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          isCurrent
                            ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm"
                            : isPassed
                              ? "bg-blue-600 text-white"
                              : "bg-white border-2 border-gray-200 text-gray-400"
                        }`}
                      >
                        {isPassed ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <p
                        className={`text-xs sm:text-sm font-semibold mt-2.5 ${isPassed ? "text-gray-900" : "text-gray-400"}`}
                      >
                        {milestone.label}
                      </p>
                      <p className="hidden sm:block text-xs text-gray-500 mt-0.5 max-w-[120px]">
                        {milestone.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Route Map & Timeline Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Live Route Map (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
                <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-semibold text-white">
                      Live Route & Transit Progress
                    </span>
                  </div>
                  <span className="text-xs text-slate-300 font-medium">
                    {currentShipment.currentLocation.city},{" "}
                    {currentShipment.currentLocation.state}
                  </span>
                </div>

                <div className="grid min-h-[220px] grid-cols-1 gap-px bg-gray-200 sm:grid-cols-2">
                  <div className="flex flex-col justify-center bg-white p-6 sm:p-8">
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      Pickup location
                    </span>
                    <p className="mt-2 text-lg font-bold text-gray-900">
                      {currentShipment.originLocation.city},{" "}
                      {currentShipment.originLocation.state}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {currentShipment.sender.street}
                    </p>
                  </div>
                  <div className="flex flex-col justify-center bg-white p-6 sm:p-8">
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      Delivery location
                    </span>
                    <p className="mt-2 text-lg font-bold text-gray-900">
                      {currentShipment.destinationLocation.city},{" "}
                      {currentShipment.destinationLocation.state}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {currentShipment.recipient.street}
                    </p>
                  </div>
                </div>

                {/* Sender & Recipient addresses */}
                <div className="p-5 bg-gray-50/60 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px] block mb-1">
                      Shipped From
                    </span>
                    <p className="font-bold text-gray-900 text-sm">
                      {currentShipment.sender.name}
                    </p>
                    <p className="text-gray-500">
                      {currentShipment.sender.street}
                    </p>
                    <p className="text-gray-500">
                      {currentShipment.sender.city},{" "}
                      {currentShipment.sender.state}{" "}
                      {currentShipment.sender.zip}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px] block mb-1">
                      Delivering To
                    </span>
                    <p className="font-bold text-gray-900 text-sm">
                      {currentShipment.recipient.name}
                    </p>
                    <p className="text-gray-500">
                      {currentShipment.recipient.street}
                    </p>
                    <p className="text-gray-500">
                      {currentShipment.recipient.city},{" "}
                      {currentShipment.recipient.state}{" "}
                      {currentShipment.recipient.zip}
                    </p>
                  </div>
                </div>
              </div>

              {/* Optional Package Details (Collapsible so it's not text-bulky!) */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
                <button
                  type="button"
                  onClick={() => setShowOptionalSpecs(!showOptionalSpecs)}
                  className="w-full flex items-center justify-between text-left text-sm font-semibold text-gray-700 hover:text-gray-900 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-gray-500" />
                    <span>Package Weight & Specifications (Optional)</span>
                  </span>
                  {showOptionalSpecs ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showOptionalSpecs && (
                  <div className="pt-4 mt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs animate-in fade-in duration-150">
                    <div>
                      <span className="text-gray-500 flex items-center gap-1 font-medium">
                        <Scale className="w-3.5 h-3.5 text-gray-400" /> Weight
                      </span>
                      <p className="text-sm font-bold text-gray-900 mt-1">
                        {currentShipment.packageDetails.weightLbs} lbs
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 flex items-center gap-1 font-medium">
                        <Box className="w-3.5 h-3.5 text-gray-400" /> Dimensions
                      </span>
                      <p className="text-sm font-bold text-gray-900 mt-1">
                        {currentShipment.packageDetails.dimensions.length}x
                        {currentShipment.packageDetails.dimensions.width}x
                        {currentShipment.packageDetails.dimensions.height} in
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 flex items-center gap-1 font-medium">
                        <DollarSign className="w-3.5 h-3.5 text-gray-400" />{" "}
                        Value Protection
                      </span>
                      <p className="text-sm font-bold text-gray-900 mt-1">
                        ${currentShipment.packageDetails.declaredValue || 100}
                        .00
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 flex items-center gap-1 font-medium">
                        <UserCheck className="w-3.5 h-3.5 text-gray-400" />{" "}
                        Signature
                      </span>
                      <p className="text-sm font-bold text-gray-900 mt-1">
                        {currentShipment.packageDetails.requiresSignature
                          ? "Required"
                          : "Standard Release"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tracking History (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
                  <h4 className="font-bold text-sm text-gray-900">
                    Tracking History
                  </h4>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                    {currentShipment.trackingLogs.length} updates
                  </span>
                </div>

                <div className="relative border-l-2 border-gray-100 ml-2.5 pl-4 space-y-5 text-xs">
                  {currentShipment.trackingLogs
                    .slice()
                    .reverse()
                    .map((log, index) => {
                      const isLatest = index === 0;
                      return (
                        <div key={log.id} className="relative">
                          <div
                            className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-white transition-all ${
                              isLatest
                                ? "bg-blue-600 ring-4 ring-blue-100"
                                : "bg-gray-300"
                            }`}
                          />
                          <div>
                            <div className="flex items-baseline justify-between gap-1">
                              <h5
                                className={`text-xs font-bold ${isLatest ? "text-blue-900 text-sm" : "text-gray-800"}`}
                              >
                                {log.title}
                              </h5>
                              <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                              {log.description}
                            </p>
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span>
                                {log.location.facilityName ||
                                  `${log.location.city}, ${log.location.state}`}
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Need Help Assistance Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                  <Building2 className="w-4 h-4" /> Store Customer Support
                </div>
                <h4 className="text-base font-bold text-white">
                  Questions about this delivery?
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Our Atlanta store team can help hold packages for pickup,
                  schedule redelivery, or confirm signature requirements.
                </p>
                <div className="pt-2 flex items-center justify-between border-t border-slate-700/80 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">
                      Direct Phone
                    </span>
                    <a
                      href="tel:+14045550199"
                      className="text-white text-sm font-bold hover:text-blue-300"
                    >
                      +1 949-844-1280
                    </a>
                  </div>
                  <a
                    href="tel:+14045550199"
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Store</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
