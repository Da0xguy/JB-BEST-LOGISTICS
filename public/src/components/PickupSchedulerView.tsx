import React, { useEffect, useMemo, useState } from "react";
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
  CreditCard,
  DollarSign,
  AlertTriangle,
  Send,
  Info,
  Banknote,
} from "lucide-react";
import { PickupRequest, Carrier } from "../types";
import { bookPickupShipment, CustomerProfile } from "../lib/api";
import { calculatePickupPricing, classifyDestination } from "../lib/pricingEngine";

interface PickupSchedulerViewProps {
  pickups: PickupRequest[];
  onAddPickup: (pickup: PickupRequest) => void;
  onNotify?: (
    title: string,
    message: string,
    variant?: "success" | "error" | "info" | "processing",
  ) => void;
  profile?: CustomerProfile | null;
}

export const PickupSchedulerView: React.FC<PickupSchedulerViewProps> = ({
  pickups,
  onAddPickup,
  onNotify,
  profile,
}) => {
  // Step 1: Pickup Location & Contact
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [street, setStreet] = useState("");
  const [suite, setSuite] = useState("");
  const [city, setCity] = useState("Atlanta");
  const [state, setState] = useState("GA");
  const [zip, setZip] = useState("30324");

  // Step 2: Delivery Destination
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliverySuite, setDeliverySuite] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("Savannah");
  const [deliveryState, setDeliveryState] = useState("GA");
  const [deliveryZip, setDeliveryZip] = useState("31401");
  const [deliveryCountry, setDeliveryCountry] = useState("USA");

  // Step 3: Carrier & Service
  const [preferredCarrier, setPreferredCarrier] = useState<Carrier>("ups");

  // Step 4: Schedule, Dimensions, Weight & Mileage
  const [pickupDate, setPickupDate] = useState("2026-09-08");
  const [readyTime, setReadyTime] = useState("13:00");
  const [closeTime, setCloseTime] = useState("17:00");
  const [packagesCount, setPackagesCount] = useState(1);
  const [totalWeight, setTotalWeight] = useState(12);
  const [lengthInches, setLengthInches] = useState(14);
  const [widthInches, setWidthInches] = useState(10);
  const [heightInches, setHeightInches] = useState(8);
  const [mileageMiles, setMileageMiles] = useState(15);
  const [showSpecialNotes, setShowSpecialNotes] = useState(false);
  const [instructions, setInstructions] = useState("");

  // Step 5: Payment method (online deposit vs onsite cash)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paystack" | "cash_onsite">("card");

  const [confirmedPickup, setConfirmedPickup] = useState<PickupRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setPickupDate(tomorrow.toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    if (!profile) return;
    setContactName(profile.name || "");
    setContactPhone(profile.phone || "");
    setContactEmail(profile.email || "");
    setStreet(profile.address.street || "");
    setSuite(profile.address.suite || "");
    setCity(profile.address.city || "Atlanta");
    setState(profile.address.state || "GA");
    setZip(profile.address.postalCode || "30324");
  }, [profile]);

  // Dynamic live pricing by size, mileage and carrier routing
  const pricing = useMemo(() => {
    return calculatePickupPricing({
      lengthInches,
      widthInches,
      heightInches,
      weightLbs: totalWeight,
      mileageMiles,
      deliveryState,
      deliveryCountry,
      preferredCarrier,
    });
  }, [
    lengthInches,
    widthInches,
    heightInches,
    totalWeight,
    mileageMiles,
    deliveryState,
    deliveryCountry,
    preferredCarrier,
  ]);

  const destinationClassification = useMemo(() => {
    return classifyDestination(deliveryState, deliveryCountry);
  }, [deliveryState, deliveryCountry]);

  const getPickupCoordinates = async (): Promise<[number, number]> => {
    const sameAsProfile =
      profile?.address.location &&
      street === profile.address.street &&
      city === profile.address.city &&
      state === profile.address.state &&
      zip === profile.address.postalCode;
    if (sameAsProfile) return profile.address.location!.coordinates;
    if (!navigator.geolocation) {
      return [-84.388, 33.749]; // Atlanta center fallback
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve([coords.longitude, coords.latitude]),
        () => resolve([-84.388, 33.749]),
        { enableHighAccuracy: true, timeout: 6000 }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactPhone || !street || !zip) {
      onNotify?.(
        "Missing pickup details",
        "Please provide your contact name, phone, street address, and ZIP code.",
        "error"
      );
      return;
    }

    if (!deliveryStreet || !deliveryCity || !deliveryZip) {
      onNotify?.(
        "Missing delivery destination",
        "Please specify the recipient delivery address, city, and postal code.",
        "error"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const pickupCoordinates = await getPickupCoordinates();
      const windowStart = new Date(`${pickupDate}T${readyTime}:00`);
      const windowEnd = new Date(`${pickupDate}T${closeTime}:00`);
      if (windowStart <= new Date() || windowEnd <= windowStart) {
        throw new Error(
          "Choose a future pickup date and a closing time after the ready time."
        );
      }

      let bookingId = `PKP-${Date.now().toString().slice(-6)}`;
      let customerIdVal = `cust-${Math.floor(100 + Math.random() * 900)}`;
      let emailNotificationFailed = false;

      try {
        const booking = await bookPickupShipment({
          sender: {
            name: contactName,
            phone: contactPhone,
            email: contactEmail || profile?.email,
            street,
            suite: suite || undefined,
            city,
            state,
            postalCode: zip,
            country: "USA",
          },
          receiver: {
            name: deliveryName || "Recipient",
            phone: deliveryPhone || contactPhone,
            street: deliveryStreet,
            suite: deliverySuite || undefined,
            city: deliveryCity,
            state: deliveryState,
            postalCode: deliveryZip,
            country: deliveryCountry || "USA",
          },
          package: {
            length: Number(lengthInches),
            width: Number(widthInches),
            height: Number(heightInches),
            quantity: Number(packagesCount),
            weight: Number(totalWeight) * 0.453592,
            unit: "in",
            fragile: false,
          },
          deliveryOption: "standard",
          transport: "road",
          carrier: preferredCarrier,
          pickupLocation: { type: "Point", coordinates: pickupCoordinates },
          deliveryLocation: { type: "Point", coordinates: [-84.3674, 33.8224] },
          appointmentWindow: {
            start: windowStart.toISOString(),
            end: windowEnd.toISOString(),
            slot: `${readyTime} - ${closeTime}`,
          },
        });
        bookingId = booking.trackingNumber;
        customerIdVal = booking.shipment.customerId;
        emailNotificationFailed = booking.emailNotifications?.some(
          ({ status }) => status === "failed",
        ) ?? false;
      } catch (error) {
        throw new Error(
          error instanceof Error
            ? `The shipment could not be booked on the server: ${error.message}`
            : "The shipment could not be booked on the server.",
        );
      }
      if (emailNotificationFailed) {
        onNotify?.(
          "Shipment booked, but email could not be sent",
          "The shipment was saved, but an email notification failed. Please contact support.",
          "error",
        );
      }

      const isCashOnsite = paymentMethod === "cash_onsite";

      const newPickup: PickupRequest = {
        id: bookingId,
        trackingNumber: bookingId,
        customerId: customerIdVal,
        businessName: businessName || undefined,
        contactName,
        contactPhone,
        contactEmail: contactEmail || "",
        pickupAddress: {
          street,
          suite: suite || undefined,
          city,
          state,
          zip,
          country: "USA",
        },
        deliveryAddress: {
          name: deliveryName || contactName,
          phone: deliveryPhone || contactPhone,
          street: deliveryStreet,
          suite: deliverySuite || undefined,
          city: deliveryCity,
          state: deliveryState,
          zip: deliveryZip,
          country: deliveryCountry || "USA",
        },
        destinationType: pricing.destinationType,
        directCarrierTransfer: pricing.directCarrierTransfer,
        carrierHubName: pricing.carrierHubName,
        mileageMiles: Number(mileageMiles),
        packageSizeCategory: pricing.sizeCategory,
        totalEstimatedCost: pricing.totalEstimatedCost,
        depositAmount: pricing.depositAmount,
        remainingBalance: pricing.remainingBalance,
        depositPaid: !isCashOnsite,
        paymentMethod,
        paidAtRegister: false,
        pickupDate,
        readyTime,
        closeTime,
        preferredCarrier,
        estimatedPackagesCount: Number(packagesCount),
        totalWeightLbs: Number(totalWeight),
        packageDimensions: {
          length: Number(lengthInches),
          width: Number(widthInches),
          height: Number(heightInches),
          unit: "in",
        },
        specialInstructions: instructions || undefined,
        status: "scheduled",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onAddPickup(newPickup);
      setConfirmedPickup(newPickup);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      onNotify?.(
        "Pickup could not be booked",
        error instanceof Error ? error.message : "Unable to schedule pickup request.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pickup-shell space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs">
        <div className="max-w-3xl space-y-2">
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60 inline-flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" /> Doorstep Collection & Carrier Tender
          </span>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
            Schedule a Package Pickup & Delivery
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            A rider picks up directly from your doorstep. In-state orders are delivered
            locally; out-of-state & international parcels are tendered directly to the
            carrier hub (DHL, FedEx, UPS, USPS).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column (7 Cols) */}
        <form
          onSubmit={handleSubmit}
          className="pickup-step lg:col-span-7 bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6"
        >
          {/* STEP 1: Pickup Location & Sender */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span>Pickup Location (Where We Collect)</span>
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-600 focus:bg-white bg-gray-50 focus:outline-none"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-600 focus:bg-white bg-gray-50 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Pickup Street Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3500 Lenox Rd NE"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-600 focus:bg-white bg-gray-50 focus:outline-none"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-600 focus:bg-white bg-gray-50 focus:outline-none"
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

          {/* STEP 2: Delivery Destination Location */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <span>Delivery Destination Location</span>
              </h3>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${
                  destinationClassification === "local"
                    ? "bg-emerald-100 text-emerald-800"
                    : destinationClassification === "out_of_state"
                    ? "bg-amber-100 text-amber-900"
                    : "bg-purple-100 text-purple-900"
                }`}
              >
                {destinationClassification === "local"
                  ? "Local Georgia"
                  : destinationClassification === "out_of_state"
                  ? "Out of State"
                  : "Out of Country (International)"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Recipient Name / Business *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Corp or Jane Doe"
                  value={deliveryName}
                  onChange={(e) => setDeliveryName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-600 focus:bg-white bg-gray-50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Recipient Phone
                </label>
                <input
                  type="tel"
                  placeholder="(912) 555-8822"
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-600 focus:bg-white bg-gray-50 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Delivery Street Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100 River St"
                  value={deliveryStreet}
                  onChange={(e) => setDeliveryStreet(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-600 focus:bg-white bg-gray-50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Suite / Floor
                </label>
                <input
                  type="text"
                  placeholder="e.g. Suite 500"
                  value={deliverySuite}
                  onChange={(e) => setDeliverySuite(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-600 focus:bg-white bg-gray-50 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  placeholder="City"
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  State / Region *
                </label>
                <input
                  type="text"
                  required
                  placeholder="GA, FL, NY..."
                  value={deliveryState}
                  onChange={(e) => setDeliveryState(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  ZIP / Postal Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ZIP"
                  value={deliveryZip}
                  onChange={(e) => setDeliveryZip(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Country *
                </label>
                <input
                  type="text"
                  required
                  placeholder="USA, Canada..."
                  value={deliveryCountry}
                  onChange={(e) => setDeliveryCountry(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50"
                />
              </div>
            </div>

            {/* Direct Carrier Routing Alert for Out of State / International */}
            {destinationClassification !== "local" ? (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <Send className="w-4 h-4 text-amber-600" />
                  <span>Direct Carrier Tender Activated</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Destination is <strong>{destinationClassification === "international" ? "International" : "Out of State"}</strong> ({deliveryState}, {deliveryCountry}).
                  Our driver will pick up from your doorstep and tender this parcel directly to the <strong>{pricing.carrierHubName}</strong> for high-speed long-haul linehaul.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Local Georgia direct courier delivery via JB & Best dispatch fleet.</span>
              </div>
            )}
          </div>

          {/* STEP 3: Carrier Selection */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                3
              </span>
              <span>Carrier Linehaul Tender</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { id: "ups", label: "UPS", desc: "Air & Ground" },
                { id: "fedex", label: "FedEx", desc: "Express Hub" },
                { id: "dhl", label: "DHL", desc: "Worldwide Air" },
                { id: "usps", label: "USPS", desc: "Postal Hub" },
                { id: "jb_freight", label: "JB Van", desc: "Local Courier" },
              ].map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setPreferredCarrier(c.id as Carrier)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    preferredCarrier === c.id
                      ? "border-blue-600 bg-blue-50/70 shadow-xs ring-2 ring-blue-100"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <p className="text-xs font-bold text-gray-900 uppercase">{c.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{c.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 4: Package Size, Weight & Delivery Mileage */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                4
              </span>
              <span>Package Size, Weight & Delivery Mileage</span>
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
                  Ready Time
                </label>
                <input
                  type="time"
                  value={readyTime}
                  onChange={(e) => setReadyTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Latest Close Time
                </label>
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Length (in)
                </label>
                <input
                  type="number"
                  min="1"
                  value={lengthInches}
                  onChange={(e) => setLengthInches(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Width (in)
                </label>
                <input
                  type="number"
                  min="1"
                  value={widthInches}
                  onChange={(e) => setWidthInches(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Height (in)
                </label>
                <input
                  type="number"
                  min="1"
                  value={heightInches}
                  onChange={(e) => setHeightInches(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Total Weight (lbs)
                </label>
                <input
                  type="number"
                  min="1"
                  value={totalWeight}
                  onChange={(e) => setTotalWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Delivery Distance / Mileage (Miles)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={mileageMiles}
                    onChange={(e) => setMileageMiles(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50"
                  />
                  <div className="flex gap-1 shrink-0">
                    {[10, 20, 35].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMileageMiles(m)}
                        className="px-2 py-1 text-[11px] rounded-lg border border-gray-200 hover:bg-gray-100"
                      >
                        {m}mi
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Special notes */}
            <div className="pt-1">
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
                {showSpecialNotes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showSpecialNotes && (
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Gate code #1234, packages on porch..."
                  className="w-full mt-2 p-3 rounded-xl border border-gray-200 text-xs sm:text-sm bg-gray-50"
                />
              )}
            </div>
          </div>

          {/* STEP 5: 50% Deposit & Payment Options (Including Onsite Cash) */}
          <div className="space-y-4 pt-3 border-t border-gray-100">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                5
              </span>
              <span>Deposit Payment & Onsite Counter Cash</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer space-y-1 ${
                  paymentMethod === "card"
                    ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-100"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-gray-900">Card Online</span>
                </div>
                <p className="text-[11px] text-gray-500">Pay 50% deposit now via Card</p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("paystack")}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer space-y-1 ${
                  paymentMethod === "paystack"
                    ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-100"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-gray-900">Paystack</span>
                </div>
                <p className="text-[11px] text-gray-500">Pay 50% deposit with Paystack</p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("cash_onsite")}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer space-y-1 ${
                  paymentMethod === "cash_onsite"
                    ? "border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-100"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold text-gray-900">Cash Onsite</span>
                </div>
                <p className="text-[11px] text-gray-500">Pay at Store Counter</p>
              </button>
            </div>

            {paymentMethod === "cash_onsite" && (
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-emerald-700" />
                  Onsite Cash Payment at Store Location
                </p>
                <p className="text-emerald-800 leading-relaxed">
                  You are welcome to pay cash in person at our physical retail counter:
                  <br />
                  <strong className="text-emerald-950">2450 Piedmont Rd NE, Atlanta, GA 30324</strong>.
                  <br />
                  A 50% deposit cash voucher is created upon booking, and our counter associate will stamp your receipt upon payment.
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-2xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-4 disabled:opacity-60"
          >
            <Truck className="w-4 h-4" />
            <span>
              {isSubmitting
                ? "Processing Booking..."
                : paymentMethod === "cash_onsite"
                ? `Confirm Pickup (Pay $${pricing.depositAmount.toFixed(2)} Cash Onsite)`
                : `Pay 50% Deposit ($${pricing.depositAmount.toFixed(2)}) & Schedule`}
            </span>
          </button>
        </form>

        {/* Right Pricing Breakdown & Status Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Real-time Dynamic Pricing Breakdown Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-800 space-y-5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                Live Pricing Breakdown
              </span>
              <h4 className="text-xl font-bold font-display mt-0.5">
                Size & Mileage Quotation
              </h4>
            </div>

            <div className="space-y-3 text-xs border-y border-slate-800 py-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">
                  Size Tier ({pricing.sizeCategory.toUpperCase()})
                </span>
                <span className="font-semibold text-slate-200">
                  ${pricing.baseSizeRate.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">
                  Delivery Mileage ({mileageMiles} mi × $1.75/mi)
                </span>
                <span className="font-semibold text-slate-200">
                  ${pricing.mileageCost.toFixed(2)}
                </span>
              </div>
              {pricing.directCarrierTransfer && (
                <div className="flex items-center justify-between text-amber-300">
                  <span>Carrier Hub Gateway Tender Fee</span>
                  <span className="font-semibold">+${pricing.tenderFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-sm font-bold">
                <span>Total Estimated Cost</span>
                <span className="text-white text-base">
                  ${pricing.totalEstimatedCost.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Mandatory 50% Deposit Callout */}
            <div className="p-4 rounded-2xl bg-blue-950/70 border border-blue-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block">
                    50% Upfront Deposit
                  </span>
                  <span className="text-2xl font-bold text-blue-400">
                    ${pricing.depositAmount.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Remaining Balance
                  </span>
                  <span className="text-base font-semibold text-slate-300">
                    ${pricing.remainingBalance.toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-blue-200 leading-relaxed pt-1">
                A 50% deposit confirms your driver reservation. The remaining 50% balance
                is collected upon collection or arrival.
              </p>
            </div>

            {pricing.directCarrierTransfer && (
              <div className="text-[11px] text-slate-400 space-y-1">
                <span className="text-slate-300 font-bold block">Assigned Carrier Gateway:</span>
                <p className="text-blue-300">{pricing.carrierHubName}</p>
              </div>
            )}
          </div>

          {/* Confirmed Pickup Success Card */}
          {confirmedPickup && (
            <div className="bg-white rounded-3xl border border-emerald-200 p-6 shadow-sm space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Pickup Scheduled
                </span>
                <span className="font-mono text-xs font-bold text-gray-900">
                  {confirmedPickup.trackingNumber || confirmedPickup.id}
                </span>
              </div>

              {confirmedPickup.qrCode && (
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <img
                    src={confirmedPickup.qrCode}
                    alt="Pickup QR Code"
                    className="h-28 w-28 rounded-lg"
                  />
                  <span className="text-[11px] text-gray-500 mt-1">
                    Show QR to courier driver
                  </span>
                </div>
              )}

              <div className="text-xs space-y-1.5 text-gray-600">
                <p>
                  <strong>Destination:</strong> {confirmedPickup.deliveryAddress?.city},{" "}
                  {confirmedPickup.deliveryAddress?.state} ({confirmedPickup.destinationType})
                </p>
                <p>
                  <strong>Total:</strong> ${confirmedPickup.totalEstimatedCost?.toFixed(2)} |{" "}
                  <strong>Deposit:</strong> ${confirmedPickup.depositAmount?.toFixed(2)} (
                  {confirmedPickup.paymentMethod === "cash_onsite"
                    ? "Cash Onsite at Counter"
                    : "Paid Online"}
                  )
                </p>
                {confirmedPickup.directCarrierTransfer && (
                  <p className="text-amber-800 font-medium">
                    ✈️ Transferring directly to {confirmedPickup.carrierHubName}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Store Location Card for Cash & Drops */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-3">
            <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              <span>Visit Our Retail Logistics Hub</span>
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Prefer to drop off or pay cash in person? Visit our store counter anytime
              during normal business hours.
            </p>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-700 space-y-1">
              <p className="font-bold text-gray-900">JB & Best Logistics LLC</p>
              <p>2450 Piedmont Rd NE, Atlanta, GA 30324</p>
              <p className="text-gray-500">Mon - Fri: 8:30 AM - 6:30 PM • Sat: 9:00 AM - 3:00 PM</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
