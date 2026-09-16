import React, { useState } from "react";
import {
  Truck,
  MapPin,
  Clock,
  Box,
  Scale,
  CheckCircle2,
  Calendar,
  Building,
  Phone,
  User,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import { PickupRequest, Carrier } from "../types";

interface PickupSchedulerViewProps {
  pickups: PickupRequest[];
  onAddPickup: (pickup: PickupRequest) => void;
  onNotify?: (
    title: string,
    message: string,
    variant?: "success" | "error" | "info" | "processing",
  ) => void;
}

export const PickupSchedulerView: React.FC<PickupSchedulerViewProps> = ({
  pickups,
  onAddPickup,
  onNotify,
}) => {
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [street, setStreet] = useState("3500 Lenox Rd NE");
  const [suite, setSuite] = useState("Suite 400");
  const [city, setCity] = useState("Atlanta");
  const [state, setState] = useState("GA");
  const [zip, setZip] = useState("30326");
  const [pickupDate, setPickupDate] = useState("2026-09-08");
  const [readyTime, setReadyTime] = useState("13:00");
  const [closeTime, setCloseTime] = useState("17:00");
  const [preferredCarrier, setPreferredCarrier] = useState<Carrier>("ups");
  const [packagesCount, setPackagesCount] = useState(2);
  const [totalWeight, setTotalWeight] = useState(15);
  const [showSpecialNotes, setShowSpecialNotes] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [confirmedPickup, setConfirmedPickup] = useState<PickupRequest | null>(
    null,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactPhone || !street || !zip) {
      onNotify?.(
        "Missing details",
        "Please complete the required pickup information before submitting.",
        "error",
      );
      return;
    }

    const pickupId = `PICK-${String(Date.now()).slice(-6)}`;
    const newPickup: PickupRequest = {
      id: pickupId,
      trackingNumber: pickupId,
      customerId: `cust-${Math.floor(100 + Math.random() * 900)}`,
      businessName: businessName || undefined,
      contactName,
      contactPhone,
      contactEmail: contactEmail || "customer@example.com",
      pickupAddress: {
        street,
        suite: suite || undefined,
        city,
        state,
        zip,
        country: "USA",
      },
      pickupDate,
      readyTime,
      closeTime,
      preferredCarrier,
      estimatedPackagesCount: Number(packagesCount),
      totalWeightLbs: Number(totalWeight),
      specialInstructions: instructions || "Front door / porch pickup",
      status: "scheduled",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAddPickup(newPickup);
    setConfirmedPickup(newPickup);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="pickup-shell space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60 inline-flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" /> Doorstep Collection Service
          </span>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 mt-2">
            Schedule a Package Pickup
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            A driver will pick up your pre-labeled or ready-to-ship packages
            directly from your home, apartment, or business, wherever you are.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Pickup Request Form (7 Cols) */}
        <form
          onSubmit={handleSubmit}
          className="pickup-step lg:col-span-7 bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
        >
          {/* Step 1: Address & Contact */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span>Pickup Location & Contact</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-600 focus:bg-white bg-gray-50 focus:outline-none transition-all duration-200 hover:border-gray-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(404) 555-0123"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-600 focus:bg-white bg-gray-50 focus:outline-none transition-all duration-200 hover:border-gray-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3500 Lenox Rd NE"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-600 focus:bg-white bg-gray-50 focus:outline-none transition-all duration-200 hover:border-gray-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Apt, Suite or Floor
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apt 4B or Suite 200"
                  value={suite}
                  onChange={(e) => setSuite(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-600 focus:bg-white bg-gray-50 focus:outline-none transition-all duration-200 hover:border-gray-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  required
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Preferred Carrier */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                2
              </span>
              <span>Which carrier are you shipping with?</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: "ups", label: "UPS", tag: "Brown Truck" },
                { id: "fedex", label: "FedEx", tag: "Express/Ground" },
                { id: "usps", label: "USPS", tag: "Postal Mail" },
                { id: "jb_freight", label: "Courier", tag: "Local Van" },
              ].map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setPreferredCarrier(c.id as Carrier)}
                  className={`form-floating-card p-3 rounded-2xl border text-center transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${
                    preferredCarrier === c.id
                      ? "border-blue-600 bg-blue-50/70 shadow-xs ring-2 ring-blue-100"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <p className="text-sm font-bold text-gray-900">{c.label}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{c.tag}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Date & Packages */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                3
              </span>
              <span>Pickup Date & Package Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Pickup Date
                </label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Number of Boxes
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={packagesCount}
                  onChange={(e) => setPackagesCount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Approx. Total Weight
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={totalWeight}
                    onChange={(e) => setTotalWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50 focus:bg-white focus:border-blue-600 focus:outline-none pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    lbs
                  </span>
                </div>
              </div>
            </div>

            {/* Optional Gate Code / Notes Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowSpecialNotes(!showSpecialNotes)}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <span>
                  {showSpecialNotes
                    ? "Hide driver notes"
                    : "+ Add gate code or instructions (Optional)"}
                </span>
                {showSpecialNotes ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showSpecialNotes && (
                <div className="mt-2 animate-in fade-in duration-150">
                  <textarea
                    rows={2}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. Gate code is #1234, packages are on the covered front porch..."
                    className="w-full p-3 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50 focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-2xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            <Truck className="w-4 h-4" />
            <span>Confirm Pickup Request</span>
          </button>
        </form>

        {confirmedPickup && confirmedPickup.qrCode && (
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                    Pickup QR
                  </p>
                  <h4 className="text-base font-bold text-gray-900 mt-1">
                    {confirmedPickup.trackingNumber || confirmedPickup.id}
                  </h4>
                </div>
                <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                  Ready
                </div>
              </div>

              <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <img
                  src={confirmedPickup.qrCode}
                  alt={`QR code for pickup ${confirmedPickup.trackingNumber || confirmedPickup.id}`}
                  className="h-28 w-28 rounded-xl border border-gray-200 bg-white p-2 shadow-sm"
                />
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Show this QR code to the driver or keep it saved for quick scan
                checks on arrival.
              </p>
            </div>
          </div>
        )}

        {/* Right Info Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
            <h4 className="font-bold text-base text-gray-900">
              How Pickup Works
            </h4>
            <ul className="space-y-3.5 text-xs text-gray-600">
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <strong className="text-gray-900 block">
                    Package your items
                  </strong>
                  <span>
                    Seal your box and attach the shipping label (or leave them
                    ready for our courier driver).
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <strong className="text-gray-900 block">
                    Driver picks up at your door
                  </strong>
                  <span>
                    Our driver scans the packages, provides a digital receipt,
                    and loads them safely.
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <strong className="text-gray-900 block">
                    Evening Carrier Dispatch
                  </strong>
                  <span>
                    Packages leave on the 5:30 PM carrier linehauls for
                    uninterrupted transit.
                  </span>
                </div>
              </li>
            </ul>
          </div>

          {/* Active Pickups List */}
          <div className="form-floating-card bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h4 className="font-bold text-sm text-gray-900">
                Recently Scheduled Pickups
              </h4>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                {pickups.length} scheduled
              </span>
            </div>

            <div className="space-y-3">
              {pickups.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/60 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-bold text-gray-900">
                    <span>{p.contactName}</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] uppercase font-bold">
                      {p.status}
                    </span>
                  </div>
                  <p className="text-gray-500">
                    {p.pickupAddress.street}, {p.pickupAddress.city}
                  </p>
                  <div className="flex items-center justify-between text-gray-400 text-[11px] pt-1">
                    <span>
                      {p.pickupDate} • {p.readyTime}
                    </span>
                    <span className="font-semibold text-gray-700 uppercase">
                      {p.preferredCarrier}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
