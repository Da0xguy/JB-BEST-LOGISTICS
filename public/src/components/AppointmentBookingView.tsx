import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  Phone,
  CheckCircle2,
  FileCheck,
  Box,
  Key,
  Truck,
  HelpCircle,
} from "lucide-react";
import { Appointment, AppointmentServiceType } from "../types";

interface AppointmentBookingViewProps {
  appointments: Appointment[];
  onAddAppointment: (apt: Appointment) => void;
  onNotify?: (
    title: string,
    message: string,
    variant?: "success" | "error" | "info" | "processing",
  ) => void;
}

const SERVICES = [
  {
    id: "notary_public" as AppointmentServiceType,
    title: "Georgia Notary Public",
    duration: "15 mins",
    price: "$10 / signature",
    icon: FileCheck,
    desc: "Document signing, notarization, and certification for legal and personal paperwork.",
    checklist:
      "Bring a valid government-issued photo ID and leave documents unsigned until you arrive.",
    detailLabel: "Document Type",
    detailPlaceholder: "Affidavit, deed, POA, vehicle title...",
  },
  {
    id: "mailbox_rental" as AppointmentServiceType,
    title: "Private Mailbox Rentals",
    duration: "15 mins",
    price: "$25+/month",
    icon: Key,
    desc: "Set up a real street address, secure mail intake, and package alerts for home or business use.",
    checklist:
      "Bring a photo ID and any business registration or lease documents if you are setting up a business mailbox.",
    detailLabel: "Mailbox Plan",
    detailPlaceholder: "Personal, Business, or Corporate plan",
  },
  {
    id: "livescan_fingerprinting" as AppointmentServiceType,
    title: "Livescan Fingerprinting",
    duration: "20 mins",
    price: "By quote",
    icon: User,
    desc: "Digital fingerprinting for employment, licensing, background checks, and state or agency requests.",
    checklist:
      "Bring a valid government-issued ID and any agency request form, code, or appointment number.",
    detailLabel: "Agency / Purpose",
    detailPlaceholder: "Employment, licensing, adoption, or background check",
  },
  {
    id: "shipping_consultation" as AppointmentServiceType,
    title: "Shipping",
    duration: "20 mins",
    price: "Rates vary",
    icon: Truck,
    desc: "Compare carrier options, schedule pickups, and get packing or shipping recommendations.",
    checklist:
      "Bring package dimensions, destination ZIP, and any special handling or fragile item notes.",
    detailLabel: "Shipment Details",
    detailPlaceholder: "Package type, weight, destination, pickup needs...",
  },
  {
    id: "passport_photos" as AppointmentServiceType,
    title: "Passport Photos",
    duration: "10 mins",
    price: "$15 / 2 prints",
    icon: Box,
    desc: "Quick passport, visa, and ID photo service with compliant standards and same-day options.",
    checklist:
      "Bring a valid photo ID and any required document or application information if available.",
    detailLabel: "Photo Type",
    detailPlaceholder: "Passport, visa, permit, or ID photo",
  },
  {
    id: "secure_document_shredding" as AppointmentServiceType,
    title: "Secure Document Shredding",
    duration: "15 mins",
    price: "$1.49 / lb",
    icon: FileCheck,
    desc: "Confidential paper disposal for taxes, legal files, bank statements, and personal records.",
    checklist:
      "Bring files in bags or boxes and note whether you need a receipt or a drop-off confirmation.",
    detailLabel: "Shredding Details",
    detailPlaceholder: "Tax files, legal papers, folders, or boxes",
  },
  {
    id: "packing_supplies" as AppointmentServiceType,
    title: "Packing Supplies",
    duration: "10 mins",
    price: "From $2.50",
    icon: Box,
    desc: "Pickup essential moving, shipping, and protective supplies for fragile or heavy items.",
    checklist:
      "Tell us what you are packing and whether you need boxes, tape, wrap, or cushioning materials.",
    detailLabel: "Packing Need",
    detailPlaceholder: "Books, fragile items, electronics, or moving boxes",
  },
  {
    id: "fax_copies" as AppointmentServiceType,
    title: "Fax Copies",
    duration: "10 mins",
    price: "Per page",
    icon: Key,
    desc: "Quick copying, scanning, and faxing for legal, business, and personal document needs.",
    checklist:
      "Have your documents ready and note whether you need faxing, copying, or both.",
    detailLabel: "Copy / Fax Request",
    detailPlaceholder: "Fax one page, copy 10 pages, or scan documents",
  },
];

const TIME_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:30 AM",
  "01:30 PM",
  "03:00 PM",
  "04:30 PM",
  "05:30 PM",
];

export const AppointmentBookingView: React.FC<AppointmentBookingViewProps> = ({
  appointments,
  onAddAppointment,
  onNotify,
}) => {
  const [selectedService, setSelectedService] =
    useState<AppointmentServiceType>("notary_public");
  const [selectedDate, setSelectedDate] = useState("2026-09-08");
  const [selectedSlot, setSelectedSlot] = useState("10:00 AM");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceDetails, setServiceDetails] = useState("");
  const [confirmedTicket, setConfirmedTicket] = useState<Appointment | null>(
    null,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) {
      onNotify?.(
        "Missing details",
        "Please fill in your name, email, and phone number before booking.",
        "error",
      );
      return;
    }

    const detailText = serviceDetails.trim();
    const fullNotes = detailText
      ? `${currentServiceObj.detailLabel}: ${detailText}`
      : "";

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      customerId: `cust-${Math.floor(100 + Math.random() * 900)}`,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      serviceType: selectedService,
      appointmentDate: selectedDate,
      timeSlot: selectedSlot,
      notes: fullNotes,
      status: "confirmed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAddAppointment(newApt);
    setConfirmedTicket(newApt);
    setName("");
    setEmail("");
    setPhone("");
    setServiceDetails("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentServiceObj =
    SERVICES.find((s) => s.id === selectedService) || SERVICES[0];

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60 inline-flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5" /> Fast In-Store Appointments
          </span>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 mt-2">
            Book an appointment
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Share a few details and we’ll reserve a convenient time for your
            visit.
          </p>
        </div>
      </div>

      <div className="rounded-[28px] border border-gray-200/80 bg-white shadow-xs">
        <div className="border-b border-gray-200/80 px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            {[
              { step: "1", label: "Service" },
              { step: "2", label: "Date & time" },
              { step: "3", label: "Request" },
              { step: "4", label: "Contact" },
            ].map((item) => (
              <div
                key={item.step}
                className="flex items-center gap-3 rounded-2xl bg-gray-50 border border-gray-200 px-3 py-2"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                  {item.step}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-8 p-4 sm:p-6 xl:grid-cols-[1.5fr_0.7fr]"
        >
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Choose a service
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SERVICES.map((s) => {
                  const Icon = s.icon;
                  const isSelected = selectedService === s.id;
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setSelectedService(s.id)}
                      className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">
                          {s.price}
                        </span>
                      </div>

                      <h4 className="mt-3 text-base font-bold text-gray-900">
                        {s.title}
                      </h4>
                      <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                        {s.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  When would you like to come in?
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Preferred date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-600">
                    Time slot
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                          selectedSlot === slot
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Tell us about your request
                </h3>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  {currentServiceObj.detailLabel}
                </label>
                <textarea
                  rows={4}
                  value={serviceDetails}
                  onChange={(e) => setServiceDetails(e.target.value)}
                  placeholder={currentServiceObj.detailPlaceholder}
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h3 className="text-lg font-bold text-gray-900">
                  Contact details
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Full name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="David Miller"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(404) 555-0199"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="david@example.com"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <aside className="xl:sticky xl:top-6 h-fit space-y-5">
            <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                  {React.createElement(currentServiceObj.icon, {
                    className: "w-5 h-5",
                  })}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-700">
                    Selected service
                  </p>
                  <h4 className="text-base font-bold text-gray-900">
                    {currentServiceObj.title}
                  </h4>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white p-3 border border-blue-100">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">
                    Duration
                  </p>
                  <p className="mt-1 font-bold text-gray-900">
                    {currentServiceObj.duration}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-3 border border-blue-100">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">
                    Price
                  </p>
                  <p className="mt-1 font-bold text-gray-900">
                    {currentServiceObj.price}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-gray-200 bg-white p-4 space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>What to bring</span>
              </h4>
              <p className="text-xs leading-relaxed text-gray-600">
                {currentServiceObj.checklist}
              </p>
            </div>

            <div className="rounded-[24px] border border-gray-200 bg-white p-4 text-xs text-gray-600 space-y-2">
              <p>
                <strong>Location:</strong> 2450 Piedmont Rd NE, Atlanta, GA
                30324
              </p>
              <p>
                <strong>Parking:</strong> Free customer parking right outside
                the storefront.
              </p>
              <p>
                <strong>Hours:</strong> Monday–Saturday, 9:00 AM–6:00 PM
              </p>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer"
            >
              Confirm appointment
            </button>
          </aside>
        </form>
      </div>
    </div>
  );
};
