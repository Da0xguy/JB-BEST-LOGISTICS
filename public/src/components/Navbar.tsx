import React, { useState } from "react";
import {
  Package,
  Search,
  Truck,
  Calendar,
  CreditCard,
  MapPin,
  Phone,
  Menu,
  X,
  User,
  Shield,
  ChevronRight,
  Clock,
  Store,
  Briefcase,
  LayoutDashboard,
  ChevronDown,
} from "lucide-react";
import { UserRole } from "../types";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  portal: "consumer" | "staff" | "admin";
  setPortal: (portal: "consumer" | "staff" | "admin") => void;
  userRole?: UserRole;
  setUserRole?: (role: UserRole) => void;
  onOpenAuth: () => void;
  onOpenArchitecture: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  portal,
  setPortal,
  setUserRole,
  onOpenAuth,
  onOpenArchitecture,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isServicesMenuOpen, setIsServicesMenuOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authRole, setAuthRole] = useState<"customer" | "staff" | "admin">(
    "customer",
  );
  const [authError] = useState("");
  const [isSubmittingAuth] = useState(false);

  const navLinks = [
    {
      id: "services",
      label: "Services",
      icon: Package,
      desc: "Shipping & Mailbox rates",
    },
    {
      id: "track",
      label: "Track",
      icon: Search,
      desc: "Live status & GPS updates",
    },
    {
      id: "pickup",
      label: "Pickup",
      icon: Truck,
      desc: "Doorstep package pickup",
    },
    {
      id: "appointment",
      label: "Appointments",
      icon: Calendar,
      desc: "Notary & store consultations",
    },
    {
      id: "invoices",
      label: "Pay Bill",
      icon: CreditCard,
      desc: "Invoices & digital receipts",
    },
  ];

  const serviceLinks = [
    {
      label: "Private Mailbox Rentals",
      desc: "Real street address and secure mail handling",
      tab: "services",
    },
    {
      label: "Notary",
      desc: "Document signing and legal certifications",
      tab: "appointment",
    },
    {
      label: "Livescan Fingerprinting",
      desc: "Digital fingerprinting for background checks",
      tab: "appointment",
    },
    {
      label: "Shipping",
      desc: "FedEx, UPS, USPS, and doorstep delivery",
      tab: "services",
    },
    {
      label: "Passport Photos",
      desc: "Professional travel and ID photo service",
      tab: "appointment",
    },
    {
      label: "Secure Document Shredding",
      desc: "Confidential paper disposal and destruction",
      tab: "appointment",
    },
    {
      label: "Packing Supplies",
      desc: "Boxes, tape, and protective shipping materials",
      tab: "appointment",
    },
    {
      label: "Fax Copies",
      desc: "Document copies, scans, and fax services",
      tab: "appointment",
    },
  ];

  const handleNavClick = (tabId: string) => {
    setPortal("consumer");
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
    setIsServicesMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSwitchPortal = (target: "consumer" | "staff" | "admin") => {
    setPortal(target);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAuthSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-2xs">
      {/* Light, Minimal Utility Strip & Portal Switcher */}

      {/* Main Clean Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-6">
          {/* Decluttered Brand Logo */}
          <div
            onClick={() => handleNavClick("services")}
            className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0"
            title="JB & Best Logistics"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:bg-blue-700 transition">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-bold text-lg text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                JB & Best
              </span>
              <span className="font-display font-medium text-sm text-slate-500">
                Logistics
              </span>
            </div>

            {portal !== "consumer" && (
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  portal === "staff"
                    ? "bg-amber-100 text-amber-900 border border-amber-200"
                    : "bg-slate-900 text-white border border-slate-700"
                }`}
              >
                {portal === "staff" ? "Staff Portal" : "Admin Console"}
              </span>
            )}
          </div>

          {/* Desktop Navigation Links */}
          {portal === "consumer" ? (
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const isActive = activeTab === item.id;
                if (item.id === "services") {
                  return (
                    <div key={item.id} className="relative">
                      <button
                        onClick={() => setIsServicesMenuOpen((open) => !open)}
                        aria-expanded={isServicesMenuOpen}
                        className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ease-out cursor-pointer flex items-center gap-1.5 hover:-translate-y-0.5 ${
                          isActive || isServicesMenuOpen
                            ? "bg-blue-50 text-blue-700 font-bold shadow-2xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        {item.label}
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${isServicesMenuOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isServicesMenuOpen && (
                        <div className="nav-panel absolute left-1/2 top-full z-50 mt-3 w-[34rem] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                          <div className="grid grid-cols-2 gap-1">
                            {serviceLinks.map((service) => (
                              <button
                                key={service.label}
                                onClick={() => handleNavClick(service.tab)}
                                className="group rounded-xl p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-50"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">
                                    {service.label}
                                  </span>
                                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-600" />
                                </div>
                                <span className="mt-1 block text-xs text-slate-500">
                                  {service.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ease-out cursor-pointer hover:-translate-y-0.5 ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>Current Dashboard:</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-900 font-bold capitalize">
                {portal} Management
              </span>
            </div>
          )}

          {/* Right Action CTA & Mobile Menu Toggle */}
          <div className="flex items-center gap-3">
            {portal === "consumer" ? (
              <>
                <a
                  href="tel:+14045550199"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 cursor-pointer"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Customer Care</span>
                </a>
                <button
                  onClick={onOpenAuth}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white transition hover:bg-blue-700 cursor-pointer"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Log in</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => handleSwitchPortal("consumer")}
                className="hidden sm:inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-xl transition cursor-pointer"
              >
                <Store className="w-3.5 h-3.5 text-blue-600" />
                <span>Exit to Storefront</span>
              </button>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="nav-panel md:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-6 space-y-4 shadow-lg">
          {portal === "consumer" && (
            <div className="space-y-1">
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-2">
                <button
                  onClick={() => setIsServicesMenuOpen((open) => !open)}
                  aria-expanded={isServicesMenuOpen}
                  className="w-full px-2 py-2 flex items-center justify-between text-left text-blue-700 cursor-pointer"
                >
                  <span className="flex items-center gap-3 text-sm font-bold">
                    <span className="rounded-lg bg-blue-100 p-1.5">
                      <Package className="h-4 w-4" />
                    </span>
                    Services
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isServicesMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isServicesMenuOpen && (
                  <div className="mt-1 grid gap-1 border-t border-blue-100 pt-1">
                    {serviceLinks.map((service) => (
                      <button
                        key={service.label}
                        onClick={() => handleNavClick(service.tab)}
                        className="rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-white hover:text-blue-700 cursor-pointer"
                      >
                        <span className="block font-semibold">
                          {service.label}
                        </span>
                        <span className="block text-xs text-slate-400">
                          {service.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {navLinks.map((item) => {
                if (item.id === "services") return null;
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-left transition cursor-pointer ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-1.5 rounded-lg ${isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">
                          {item.label}
                        </div>
                        <div className="text-xs text-slate-400 font-normal">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                );
              })}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 space-y-2 text-center text-xs text-slate-500">
            <button
              onClick={onOpenAuth}
              className="w-full py-2 px-3 bg-slate-900 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Log in or sign up</span>
            </button>
            <a
              href="tel:+14045550199"
              className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Customer Care: (404) 555-0199</span>
            </a>
          </div>
        </div>
      )}

      {false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  JB & Best Logistics
                </span>
                <h2
                  id="account-title"
                  className="mt-1 text-2xl font-display font-bold text-slate-900"
                >
                  {isSignUp && authRole === "customer"
                    ? "Create your account"
                    : "Welcome back"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {authRole === "customer"
                    ? "Manage shipments, mailboxes, and receipts."
                    : `Access your ${authRole} account.`}
                </p>
              </div>
              <button
                onClick={() => setIsAuthOpen(false)}
                aria-label="Close account dialog"
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              {(["customer", "staff", "admin"] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    setAuthRole(role);
                    if (role !== "customer") setIsSignUp(false);
                  }}
                  className={`rounded-lg px-2 py-2 capitalize transition cursor-pointer ${
                    authRole === role
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            <form onSubmit={handleAuthSubmit} className="mt-5 space-y-4">
              {isSignUp && authRole === "customer" && (
                <label className="block text-sm font-semibold text-slate-700">
                  Full name
                  <input
                    name="name"
                    required
                    type="text"
                    placeholder="Your full name"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>
              )}
              <label className="block text-sm font-semibold text-slate-700">
                Email address
                <input
                  name="email"
                  required
                  type="email"
                  placeholder="you@example.com"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Password
                <input
                  name="password"
                  required
                  type="password"
                  placeholder="Enter your password"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              {authError && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {authError}
                </p>
              )}
              <button
                disabled={isSubmittingAuth}
                type="submit"
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60 cursor-pointer"
              >
                {isSubmittingAuth
                  ? "Connecting..."
                  : isSignUp && authRole === "customer"
                    ? "Create account"
                    : `Log in as ${authRole}`}
              </button>
            </form>

            {authRole === "customer" && (
              <button
                onClick={() => setIsSignUp((value) => !value)}
                className="mt-4 w-full text-center text-sm font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
              >
                {isSignUp
                  ? "Already have an account? Log in"
                  : "New here? Create an account"}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
