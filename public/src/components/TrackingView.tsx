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

interface TrackingViewProps {
  shipments: Shipment[];
  initialTrackingId?: string;
  onUpdateShipment: (updated: Shipment) => void;
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
    status: "picked_up",
    label: "Picked Up",
    description: "Loaded at origin facility",
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
  onUpdateShipment,
}) => {
  const [searchQuery, setSearchQuery] = useState(
    initialTrackingId || "JB-8829-US",
  );
  const [selectedId, setSelectedId] = useState(
    initialTrackingId || "JB-8829-US",
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [showOptionalSpecs, setShowOptionalSpecs] = useState(false);

  useEffect(() => {
    if (initialTrackingId) {
      setSelectedId(initialTrackingId);
      setSearchQuery(initialTrackingId);
    }
  }, [initialTrackingId]);

  const currentShipment =
    shipments.find(
      (s) =>
        s.trackingNumber.toLowerCase() === selectedId.toLowerCase() ||
        s.id === selectedId,
    ) || shipments[0];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const found = shipments.find(
      (s) =>
        s.trackingNumber.toLowerCase() === searchQuery.trim().toLowerCase(),
    );
    if (found) {
      setSelectedId(found.trackingNumber);
    } else {
      setSelectedId(searchQuery.trim().toUpperCase());
    }
  };

  const getStatusIndex = (status: ShipmentStatus) => {
    const order: ShipmentStatus[] = [
      "order_created",
      "picked_up",
      "in_transit",
      "out_for_delivery",
      "delivered",
    ];
    return order.indexOf(status);
  };

  const currentIndex = currentShipment
    ? getStatusIndex(currentShipment.currentStatus)
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
    if (!currentShipment) return;
    setIsUpdating(true);

    setTimeout(() => {
      let nextStatus: ShipmentStatus = "delivered";
      let title = "Delivered to Recipient";
      let desc = "Package signed and released safely at front door.";

      if (currentShipment.currentStatus === "order_created") {
        nextStatus = "picked_up";
        title = "Picked Up by Courier";
        desc = "Sorted at Atlanta Hub.";
      } else if (currentShipment.currentStatus === "picked_up") {
        nextStatus = "in_transit";
        title = "In Transit";
        desc = "Moving smoothly towards destination.";
      } else if (currentShipment.currentStatus === "in_transit") {
        nextStatus = "out_for_delivery";
        title = "Out for Delivery";
        desc = "Package is on the delivery vehicle.";
      } else if (currentShipment.currentStatus === "out_for_delivery") {
        nextStatus = "delivered";
        title = "Delivered & Signed";
        desc = "Package was delivered and signed for.";
      } else {
        nextStatus = "in_transit";
        title = "In Transit Checkpoint";
        desc = "Routine automated scan at regional sorting hub.";
      }

      const newLog = {
        id: `log-${Date.now()}`,
        shipmentId: currentShipment.id,
        status: nextStatus,
        title,
        description: desc,
        location: {
          city:
            nextStatus === "delivered"
              ? currentShipment.destinationLocation.city
              : "Madison",
          state: "GA",
          country: "USA",
          latitude: currentShipment.destinationLocation.latitude,
          longitude: currentShipment.destinationLocation.longitude,
          facilityName:
            nextStatus === "delivered"
              ? "Destination Address"
              : "East Georgia Hub",
        },
        timestamp: new Date().toISOString(),
      };

      const updated: Shipment = {
        ...currentShipment,
        currentStatus: nextStatus,
        estimatedDelivery:
          nextStatus === "delivered"
            ? "Delivered Today"
            : currentShipment.estimatedDelivery,
        trackingLogs: [...currentShipment.trackingLogs, newLog],
        updatedAt: new Date().toISOString(),
      };

      onUpdateShipment(updated);
      setIsUpdating(false);
    }, 450);
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
              Enter any FedEx, UPS, USPS, or JB Freight tracking number for live
              status.
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
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. JB-8829-US"
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

        {/* Quick Demo Tracking Numbers */}
        <div className="pt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-500 font-medium">Quick examples:</span>
          {shipments.map((s) => (
            <button
              key={s.trackingNumber}
              onClick={() => {
                setSearchQuery(s.trackingNumber);
                setSelectedId(s.trackingNumber);
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
                    Estimated Delivery
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
              <div className="grid grid-cols-5 gap-2 relative">
                {/* Background Connecting Line */}
                <div className="absolute top-4 left-[10%] right-[10%] h-1 bg-gray-100 -z-0" />
                <div
                  className="absolute top-4 left-[10%] h-1 bg-blue-600 -z-0 transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.max(0, Math.min(100, (currentIndex / (MILESTONES.length - 1)) * 80))}%`,
                  }}
                />

                {MILESTONES.map((milestone, idx) => {
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

                {/* Map Graphic */}
                <div className="relative w-full h-[320px] bg-slate-100 overflow-hidden">
                  <svg
                    className="absolute inset-0 w-full h-full opacity-50 pointer-events-none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <pattern
                        id="clean-grid"
                        width="36"
                        height="36"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 36 0 L 0 0 0 36"
                          fill="none"
                          stroke="#cbd5e1"
                          strokeWidth="0.8"
                          strokeOpacity="0.5"
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#clean-grid)" />
                    {/* Highway route */}
                    <path
                      d="M 40 260 Q 240 210, 520 120"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 40 260 Q 240 210, 520 120"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 100 230 Q 260 180, 480 135"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="4"
                      strokeDasharray="6 4"
                      className="animate-pulse"
                    />
                  </svg>

                  {/* Origin */}
                  <div className="absolute left-[18%] top-[65%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-sm mb-1.5 whitespace-nowrap">
                      Origin: {currentShipment.originLocation.city},{" "}
                      {currentShipment.originLocation.state}
                    </div>
                    <div className="w-5 h-5 rounded-full bg-slate-900 border-2 border-white shadow-sm flex items-center justify-center text-[10px] text-white font-bold">
                      A
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="absolute left-[78%] top-[35%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="bg-emerald-700 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-sm mb-1.5 whitespace-nowrap">
                      Destination: {currentShipment.destinationLocation.city},{" "}
                      {currentShipment.destinationLocation.state}
                    </div>
                    <div className="w-5 h-5 rounded-full bg-emerald-600 border-2 border-white shadow-sm flex items-center justify-center text-[10px] text-white font-bold">
                      B
                    </div>
                  </div>

                  {/* Moving Courier */}
                  <div className="absolute left-[52%] top-[48%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 animate-ping absolute -inset-1" />
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md border-2 border-white relative z-10">
                        <Truck className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-2.5 mt-2 shadow-sm text-center max-w-[190px]">
                      <p className="text-xs font-bold text-gray-900 leading-tight">
                        {currentShipment.currentLocation.facilityName ||
                          "En Route to Destination"}
                      </p>
                      <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                        {currentShipment.currentLocation.city},{" "}
                        {currentShipment.currentLocation.state}
                      </p>
                    </div>
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
                      (404) 555-0199
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
