import React, { useState } from "react";
import {
  Truck,
  Box,
  Mail,
  FileCheck,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Scissors,
  Camera,
  MapPin,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Fingerprint,
  Copy,
} from "lucide-react";

interface ServicesHubViewProps {
  onSelectService: (service: string) => void;
  onBookAppointment: () => void;
  onSchedulePickup: () => void;
}

export const ServicesHubView: React.FC<ServicesHubViewProps> = ({
  onSelectService,
  onBookAppointment,
  onSchedulePickup,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "Do you accept pre-printed return labels from Amazon, UPS, or FedEx?",
      a: "Yes! You can drop off pre-labeled packages for FedEx, UPS, and USPS at no extra charge. We provide printed or digital drop-off receipts instantly.",
    },
    {
      q: "What is the daily cutoff time for packages to ship out today?",
      a: "Our daily carrier pickups are at 5:30 PM Monday through Friday. Packages dropped off or picked up before 5:30 PM depart on the evening carrier trucks.",
    },
    {
      q: "Can I use your mailbox service as my official business address?",
      a: "Absolutely. Unlike a P.O. Box, our private mailboxes provide a real Georgia physical street address (2450 Piedmont Rd NE, Suite #___) approved for Georgia LLC filings, banking, and commercial licensing.",
    },
    {
      q: "Do I need an appointment for the Notary Public?",
      a: "Walk-ins are always welcome during business hours! You can also book a guaranteed 15-minute appointment online if you are on a tight schedule.",
    },
  ];

  return (
    <div className="space-y-10">
      {/* 1. Multi-Carrier Shipping Services */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              Authorized Shipping
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 mt-1">
              Compare & Ship with Leading Carriers
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              We compare prices across FedEx, UPS, and USPS to find you the best
              rate and fastest route.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 shrink-0">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Daily Pickup Cutoff: 5:30 PM EST</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <article className="group relative h-36 overflow-hidden rounded-2xl animate-fade-up">
            <img
              src="https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=700&q=80"
              alt="Carefully packed shipping boxes"
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
            <div className="absolute inset-x-4 bottom-3 text-white">
              <h3 className="text-sm font-bold">Packed with care</h3>
              <p className="mt-0.5 text-xs text-white/80">
                Fragile, oversized, and everyday items.
              </p>
            </div>
          </article>
          <article className="group relative h-36 overflow-hidden rounded-2xl animate-fade-up animation-delay-100">
            <img
              src="https://images.unsplash.com/photo-1605733160314-4fc7dac4bb16?auto=format&fit=crop&w=700&q=80"
              alt="Cargo containers ready for transport"
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
            <div className="absolute inset-x-4 bottom-3 text-white">
              <h3 className="text-sm font-bold">Ready for the road</h3>
              <p className="mt-0.5 text-xs text-white/80">
                Reliable handoff from counter to carrier.
              </p>
            </div>
          </article>
          <article className="group relative h-36 overflow-hidden rounded-2xl animate-fade-up animation-delay-200">
            <img
              src="https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=700&q=80"
              alt="Shipping boxes prepared for delivery"
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
            <div className="absolute inset-x-4 bottom-3 text-white">
              <h3 className="text-sm font-bold">Delivered worldwide</h3>
              <p className="mt-0.5 text-xs text-white/80">
                Track every step with confidence.
              </p>
            </div>
          </article>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <div className="bg-purple-50/60 rounded-2xl border-2 border-purple-200 p-5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
              FedEx
            </span>
            <div className="text-3xl font-bold text-gray-900">
              $18.99{" "}
              <span className="text-sm font-normal text-gray-500">/ start</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Fast domestic and international shipping with express and ground
              options.
            </p>
            <ul className="text-xs text-gray-600 space-y-2 pt-3 border-t border-purple-200/60">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Next-day available</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Priority document shipping</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50/60 rounded-2xl border-2 border-amber-200 p-5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              UPS
            </span>
            <div className="text-3xl font-bold text-gray-900">
              $19.99{" "}
              <span className="text-sm font-normal text-gray-500">/ start</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Reliable ground and air service for everyday packages and returns.
            </p>
            <ul className="text-xs text-gray-600 space-y-2 pt-3 border-t border-amber-200/60">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Ground delivery options</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Easy return support</span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50/60 rounded-2xl border-2 border-blue-200 p-5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
              USPS
            </span>
            <div className="text-3xl font-bold text-gray-900">
              $9.99{" "}
              <span className="text-sm font-normal text-gray-500">/ start</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Affordable shipping for letters, flats, and small parcel delivery.
            </p>
            <ul className="text-xs text-gray-600 space-y-2 pt-3 border-t border-blue-200/60">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Flat-rate options</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Certified mail available</span>
              </li>
            </ul>
          </div>

          <div className="bg-emerald-50/60 rounded-2xl border-2 border-emerald-200 p-5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Doorstep
            </span>
            <div className="text-3xl font-bold text-gray-900">
              $49.99{" "}
              <span className="text-sm font-normal text-gray-500">/ start</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Same-day pickup, freight handling, and business delivery support.
            </p>
            <ul className="text-xs text-gray-600 space-y-2 pt-3 border-t border-emerald-200/60">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Door-to-door logistics</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Heavy freight coordination</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 2. Private Mailbox Rentals */}
      <section className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
              <Mail className="w-3.5 h-3.5" /> Real Street Address (Not a P.O.
              Box)
            </div>
            <h3 className="text-2xl font-display font-bold text-gray-900 mt-2">
              Private Mailbox Rentals
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Give your business a professional street address. We accept
              deliveries from all carriers and send text alerts when packages
              arrive.
            </p>
          </div>
          <button
            onClick={onBookAppointment}
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer shadow-xs"
          >
            Reserve a Mailbox
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Personal */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200/80 p-5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Personal / Small
            </span>
            <div className="text-3xl font-bold text-gray-900">
              $25{" "}
              <span className="text-sm font-normal text-gray-500">/ month</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Great for personal letters, bank statements, and small package
              deliveries.
            </p>
            <ul className="text-xs text-gray-600 space-y-2 pt-3 border-t border-gray-200/60">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Real street address with Suite #</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Text and email arrival alerts</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Secure hold while you travel</span>
              </li>
            </ul>
          </div>

          {/* Business (Most Popular) */}
          <div className="bg-blue-50/50 rounded-2xl border-2 border-blue-600 p-5 space-y-3 relative shadow-xs">
            <div className="absolute -top-3 right-5 bg-blue-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
              Most Popular
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
              Business / Medium
            </span>
            <div className="text-3xl font-bold text-gray-900">
              $45{" "}
              <span className="text-sm font-normal text-gray-500">/ month</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Designed for Georgia LLCs, remote businesses, and regular package
              deliveries.
            </p>
            <ul className="text-xs text-gray-600 space-y-2 pt-3 border-t border-blue-200/60">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Authorized for Georgia LLC filing</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Unlimited packages from all carriers</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>24/7 key fob lobby access</span>
              </li>
            </ul>
          </div>

          {/* Corporate */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200/80 p-5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Corporate / Large
            </span>
            <div className="text-3xl font-bold text-gray-900">
              $75{" "}
              <span className="text-sm font-normal text-gray-500">/ month</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Ideal for multi-person teams, frequent large boxes, and
              high-volume mail intake.
            </p>
            <ul className="text-xs text-gray-600 space-y-2 pt-3 border-t border-gray-200/60">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Multiple company recipient names</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Large parcel storage room</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Mail forwarding on demand</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 3. In-Store Walk-In Services */}
      <section className="space-y-4">
        <div>
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
            In-Store Services
          </span>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 mt-1">
            Walk-In Services Available Daily
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            No appointment required for quick services, or book online for zero
            wait time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Notary */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-all h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-bold text-gray-900">Notary</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Licensed Georgia notary on duty for affidavits, deeds, powers
                  of attorney, and vehicle titles.
                </p>
              </div>
              <p className="text-xs font-bold text-blue-700 pt-1">
                $10 per signature
              </p>
            </div>
            <button
              onClick={onBookAppointment}
              className="mt-5 w-full py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition cursor-pointer"
            >
              Book Notary
            </button>
          </div>

          {/* Packing Supplies */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-all h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Box className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-bold text-gray-900">
                  Packing Supplies
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Boxes, tape, bubble wrap, and cushioning supplies for moving,
                  mailing, and fragile items.
                </p>
              </div>
              <p className="text-xs font-bold text-amber-800 pt-1">
                Supplies from $2.50
              </p>
            </div>
            <button
              onClick={onBookAppointment}
              className="mt-5 w-full py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition cursor-pointer"
            >
              Shop Supplies
            </button>
          </div>

          {/* Livescan Fingerprinting */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-all h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-bold text-gray-900">
                  Livescan Fingerprinting
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Fast digital fingerprinting for employment, licensing,
                  adoption, and background check applications.
                </p>
              </div>
              <p className="text-xs font-bold text-cyan-800 pt-1">
                By appointment
              </p>
            </div>
            <button
              onClick={onBookAppointment}
              className="mt-5 w-full py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition cursor-pointer"
            >
              Book Fingerprints
            </button>
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-all h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-bold text-gray-900">Shipping</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Fast carrier comparisons for domestic and international
                  shipping, packaging, and scheduled pickups.
                </p>
              </div>
              <p className="text-xs font-bold text-emerald-800 pt-1">
                Same-day options
              </p>
            </div>
            <button
              onClick={onSchedulePickup}
              className="mt-5 w-full py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition cursor-pointer"
            >
              Schedule Pickup
            </button>
          </div>

          {/* Passport Photos */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-all h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-bold text-gray-900">
                  Passport Photos
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  State Department compliant 2x2 photos for passports, visas,
                  permits, and identification needs.
                </p>
              </div>
              <p className="text-xs font-bold text-purple-800 pt-1">
                $15 for 2 prints
              </p>
            </div>
            <button
              onClick={onBookAppointment}
              className="mt-5 w-full py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition cursor-pointer"
            >
              Take Photos
            </button>
          </div>

          {/* Secure Shredding */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-all h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <Scissors className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-bold text-gray-900">
                  Secure Document Shredding
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Locked console disposal for confidential records, statements,
                  and legal files. HIPAA & FACTA compliant.
                </p>
              </div>
              <p className="text-xs font-bold text-rose-800 pt-1">$1.49 / lb</p>
            </div>
            <button
              onClick={onBookAppointment}
              className="mt-5 w-full py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition cursor-pointer"
            >
              Drop Off Paper
            </button>
          </div>

          {/* Fax Copies */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-all h-full flex flex-col justify-between sm:col-span-2 lg:col-span-1">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Copy className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-bold text-gray-900">
                  Fax Copies
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Quick faxing, photocopying, and document duplication for
                  business, legal, and personal records.
                </p>
              </div>
              <p className="text-xs font-bold text-indigo-800 pt-1">
                Affordable per page
              </p>
            </div>
            <button
              onClick={onBookAppointment}
              className="mt-5 w-full py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition cursor-pointer"
            >
              Send Copy
            </button>
          </div>
        </div>
      </section>

      {/* 4. Frequently Asked Questions */}
      <section className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          <h3 className="text-xl font-display font-bold text-gray-900">
            Frequently Asked Questions
          </h3>
        </div>

        <div className="space-y-3 pt-2">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-gray-200/80 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full p-4 text-left font-semibold text-sm text-gray-900 flex items-center justify-between gap-3 hover:bg-gray-50 transition cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3 bg-gray-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
