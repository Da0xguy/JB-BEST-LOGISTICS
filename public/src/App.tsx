import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Navbar } from "./components/Navbar";
import { ServicesHubView } from "./components/ServicesHubView";
import { TrackingView } from "./components/TrackingView";
import { AppointmentBookingView } from "./components/AppointmentBookingView";
import { PickupSchedulerView } from "./components/PickupSchedulerView";
import { InvoiceReceiptView } from "./components/InvoiceReceiptView";
import { StaffDashboard } from "./components/staff/StaffDashboard";
import { RiderDashboard } from "./components/RiderDashboard";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { ArchitectureModal } from "./components/ArchitectureModal";
import { AuthView } from "./components/AuthView";
import { CustomerProfileView } from "./components/CustomerProfileView";
import {
  getCurrentUser,
  getAuthToken,
  clearAuthToken,
  getCustomerProfile,
  listCustomerShipments,
  listOperationalPickups,
  listWarehouseAppointmentHistory,
  CustomerProfile,
} from "./lib/api";
import {
  Shipment,
  Invoice,
  Appointment,
  PickupRequest,
  UserRole,
} from "./types";
import {
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Truck,
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
  HelpCircle,
  FileCheck,
  Shield,
  Briefcase,
  Store,
} from "lucide-react";

type ToastVariant = "success" | "error" | "info" | "processing";

interface ToastItem {
  id: number;
  title: string;
  message: string;
  variant: ToastVariant;
}

function ToastHost({
  toasts,
  onClose,
}: {
  toasts: ToastItem[];
  onClose: (id: number) => void;
}) {
  return (
    <div className="fixed inset-x-3 top-3 z-[100] flex flex-col gap-3 sm:left-auto sm:right-5 sm:top-5 sm:w-[min(92vw,380px)]">
      {toasts.map((toast) => {
        const isProcessing = toast.variant === "processing";
        const isSuccess = toast.variant === "success";
        const isError = toast.variant === "error";

        return (
          <div
            key={toast.id}
            className={`animate-[toast-in_260ms_cubic-bezier(0.22,1,0.36,1)] rounded-2xl border p-4 shadow-2xl backdrop-blur-sm ${
              isSuccess
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : isError
                  ? "border-red-200 bg-red-50 text-red-900"
                  : isProcessing
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-blue-200 bg-blue-50 text-blue-900"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    isSuccess
                      ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                      : isError
                        ? "border-red-300 bg-red-100 text-red-700"
                        : isProcessing
                          ? "border-amber-300 bg-amber-100 text-amber-700"
                          : "border-blue-300 bg-blue-100 text-blue-700"
                  }`}
                >
                  {isProcessing ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : isSuccess ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 animate-[check-pop_280ms_ease-out]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12.5 9.2 16.7 19 6.8" />
                    </svg>
                  ) : isError ? (
                    <span className="text-sm">!</span>
                  ) : (
                    <span className="text-sm">i</span>
                  )}
                </div>

                <div className="flex-1">
                  <p className="text-sm font-bold">{toast.title}</p>
                  <p className="mt-1 text-xs leading-relaxed opacity-90">
                    {toast.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onClose(toast.id)}
                className="rounded-full p-1 text-current/80 transition hover:bg-black/5 cursor-pointer"
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [portalAccess, setPortalAccess] = useState<"checking" | "allowed">(
    "checking",
  );
  const portalMode = pathname.startsWith("/rider")
    ? "rider"
    : pathname.startsWith("/staff")
      ? "staff"
      : pathname.startsWith("/admin")
        ? "admin"
        : null;
  const portal =
    pathname === "/staff"
      ? "staff"
      : pathname === "/admin"
        ? "admin"
        : "consumer";
  const [activeTab, setActiveTab] = useState<string>("services");
  const [userRole, setUserRole] = useState<UserRole>("customer");
  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);
  const [customerAccess, setCustomerAccess] = useState<
    "checking" | "guest" | "authenticated"
  >(() => (getAuthToken() ? "checking" : "guest"));
  const [pendingCustomerTab, setPendingCustomerTab] = useState<string | null>(
    null,
  );
  const [isArchitectureOpen, setIsArchitectureOpen] = useState<boolean>(false);
  const [heroSearch, setHeroSearch] = useState<string>("");
  const [isAuthPageOpen, setIsAuthPageOpen] = useState(false);

  const routeTo = (path: string) => {
    window.history.pushState({}, "", path);
    setPathname(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const setPortal = (target: "consumer" | "staff" | "admin") => {
    routeTo(target === "consumer" ? "/" : `/${target}/login`);
  };

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (pathname !== "/") return;
    if (!getAuthToken()) {
      setCustomerAccess("guest");
      return;
    }
    let isCurrent = true;
    setCustomerAccess("checking");
    const loadCustomerProfile = async () => {
      try {
        const { user } = await getCurrentUser();
        if (!isCurrent) return;
        if (user.role !== "customer") {
          clearAuthToken();
          setCustomerAccess("guest");
          return;
        }
        const { profile, mailboxes } = await getCustomerProfile();
        if (!isCurrent) return;
        setCustomerProfile({ ...profile, mailboxes });
        setCustomerAccess("authenticated");
        void Promise.all([
          listCustomerShipments(),
          listWarehouseAppointmentHistory(),
        ])
          .then(([orders, appointmentResult]) => {
            if (!isCurrent) return;
            setShipments(orders.shipments);
            setPickups(orders.pickups);
            setAppointments(appointmentResult.appointments);
          })
          .catch(() => {});
      } catch {
        if (isCurrent) setCustomerAccess("guest");
      }
    };
    void loadCustomerProfile();
    return () => {
      isCurrent = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!pendingCustomerTab) return;
    if (customerAccess === "authenticated") {
      setActiveTab(pendingCustomerTab);
      setPendingCustomerTab(null);
    } else if (customerAccess === "guest") {
      setIsAuthPageOpen(true);
    }
  }, [customerAccess, pendingCustomerTab]);

  useEffect(() => {
    if (pathname !== "/rider" && pathname !== "/staff" && pathname !== "/admin")
      return;
    let isCurrent = true;
    const expectedPortal =
      pathname === "/rider"
        ? "rider"
        : pathname === "/staff"
          ? "staff"
          : "admin";
    setPortalAccess("checking");

    const redirectToLogin = () => {
      if (!isCurrent) return;
      clearAuthToken();
      const loginPath = `/${expectedPortal}/login`;
      window.history.replaceState({}, "", loginPath);
      setPathname(loginPath);
    };

    getCurrentUser()
      .then(({ user }) => {
        if (!isCurrent) return;
        const hasAccess =
          expectedPortal === "admin"
            ? user.role === "admin"
            : expectedPortal === "rider"
              ? user.role === "rider"
              : ["warehouse", "warehouse_staff"].includes(user.role);
        if (hasAccess) setPortalAccess("allowed");
        else redirectToLogin();
      })
      .catch(redirectToLogin);

    return () => {
      isCurrent = false;
    };
  }, [pathname]);

  // Application State
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pickups, setPickups] = useState<PickupRequest[]>([]);
  const [activeTrackingNumber, setActiveTrackingNumber] = useState<string>("");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleExpiredSession = () => {
      setCustomerProfile(null);
      setShipments([]);
      setPickups([]);
      setAppointments([]);
      setCustomerAccess("guest");
      setPendingCustomerTab(null);
      setActiveTab("services");
    };
    window.addEventListener("jb:auth-expired", handleExpiredSession);
    return () =>
      window.removeEventListener("jb:auth-expired", handleExpiredSession);
  }, []);

  useEffect(() => {
    if (pathname !== "/staff" || portalAccess !== "allowed") return;
    let isCurrent = true;
    const refreshPickups = async () => {
      try {
        const livePickups = await listOperationalPickups();
        if (isCurrent) setPickups(livePickups);
      } catch {}
    };
    void refreshPickups();
    const interval = window.setInterval(() => void refreshPickups(), 15000);
    return () => {
      isCurrent = false;
      window.clearInterval(interval);
    };
  }, [pathname, portalAccess]);

  useEffect(() => {
    if (pathname !== "/" || !customerProfile || !getAuthToken()) return;
    let isCurrent = true;
    const refreshShipments = async () => {
      try {
        const orders = await listCustomerShipments();
        if (!isCurrent) return;
        setShipments(orders.shipments);
        setPickups(orders.pickups);
      } catch {}
    };
    const interval = window.setInterval(() => void refreshShipments(), 15000);
    return () => {
      isCurrent = false;
      window.clearInterval(interval);
    };
  }, [pathname, customerProfile?.email]);

  const generateQrCodeDataUrl = async (value: string) => {
    try {
      return await QRCode.toDataURL(value, {
        margin: 1,
        width: 220,
        errorCorrectionLevel: "M",
      });
    } catch {
      return "";
    }
  };

  const buildTrackingQrPayload = (
    type: "shipment" | "pickup",
    trackingId: string,
    summary: Record<string, string | number | undefined>,
  ) => {
    return JSON.stringify({
      type,
      trackingId,
      scannedAt: new Date().toISOString(),
      ...summary,
    });
  };

  const removeToast = (id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const showToast = (
    title: string,
    message: string,
    variant: ToastVariant = "info",
  ) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, title, message, variant }]);
    window.setTimeout(() => removeToast(id), 4200);
  };

  const openCustomerAuth = (returnToTab = "services") => {
    setPendingCustomerTab(returnToTab);
    setIsAuthPageOpen(true);
  };

  const navigateConsumerTab = (tab: string) => {
    if (tab !== "track" && customerAccess !== "authenticated") {
      setPendingCustomerTab(tab);
      setActiveTab("track");
      if (customerAccess === "guest") setIsAuthPageOpen(true);
      return;
    }
    setPendingCustomerTab(null);
    setActiveTab(tab);
  };

  const signOutCustomer = () => {
    clearAuthToken();
    setCustomerProfile(null);
    setShipments([]);
    setPickups([]);
    setAppointments([]);
    setCustomerAccess("guest");
    setPendingCustomerTab(null);
    setUserRole("customer");
    setActiveTab("services");
  };

  const loadCustomerData = async () => {
    const [orders, appointmentResult] = await Promise.all([
      listCustomerShipments(),
      listWarehouseAppointmentHistory(),
    ]);
    setShipments(orders.shipments);
    setPickups(orders.pickups);
    setAppointments(appointmentResult.appointments);
  };

  const showProcessingThenSuccess = (
    processingTitle: string,
    processingMessage: string,
    successTitle: string,
    successMessage: string,
  ) => {
    const processingId = Date.now() + Math.random();
    const successId = processingId + 1;

    setToasts((current) => [
      ...current.filter((toast) => toast.variant !== "processing"),
      {
        id: processingId,
        title: processingTitle,
        message: processingMessage,
        variant: "processing",
      },
    ]);

    window.setTimeout(() => {
      removeToast(processingId);
      setToasts((current) => [
        ...current.filter((toast) => toast.id !== processingId),
        {
          id: successId,
          title: successTitle,
          message: successMessage,
          variant: "success",
        },
      ]);
      window.setTimeout(() => removeToast(successId), 4200);
    }, 1800);
  };

  useEffect(() => {
    return () => {
      toasts.forEach((toast) => window.clearTimeout(Number(toast.id)));
    };
  }, [toasts]);

  const handleUpdateShipment = (updated: Shipment) => {
    setShipments((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s)),
    );
  };

  const handleAddShipment = async (newShipment: Shipment) => {
    const payload = buildTrackingQrPayload(
      "shipment",
      newShipment.trackingNumber,
      {
        customerName: newShipment.recipient.name,
        destination: `${newShipment.recipient.city}, ${newShipment.recipient.state}`,
        status: newShipment.currentStatus,
        carrier: newShipment.carrier,
      },
    );
    const qrCode = await generateQrCodeDataUrl(payload);
    setShipments((prev) => [
      { ...newShipment, qrCode, qrPayload: payload },
      ...prev,
    ]);
  };

  const handleUpdateInvoice = (updated: Invoice) => {
    setInvoices((prev) => {
      const exists = prev.some((inv) => inv.id === updated.id);
      if (exists) {
        return prev.map((inv) => (inv.id === updated.id ? updated : inv));
      }
      return [updated, ...prev];
    });
  };

  const handleAddAppointment = (newApt: Appointment) => {
    setAppointments((prev) => [newApt, ...prev]);
    showProcessingThenSuccess(
      "Processing appointment",
      `We are reserving your ${newApt.serviceType.replace(/_/g, " ")} time slot now.`,
      "Appointment booked",
      `Your ${newApt.serviceType.replace(/_/g, " ")} request has been scheduled successfully.`,
    );
  };

  const handleAddPickup = async (newPickup: PickupRequest) => {
    const trackingId = newPickup.trackingNumber || newPickup.id;
    const payload = buildTrackingQrPayload("pickup", trackingId, {
      customerName: newPickup.contactName,
      phone: newPickup.contactPhone,
      address: `${newPickup.pickupAddress.street}, ${newPickup.pickupAddress.city}, ${newPickup.pickupAddress.state}`,
      scheduledDate: newPickup.pickupDate,
      carrier: newPickup.preferredCarrier,
      packageCount: newPickup.estimatedPackagesCount,
      notes: newPickup.specialInstructions || "No additional instructions",
    });
    const qrCode = await generateQrCodeDataUrl(payload);
    setPickups((prev) => [
      { ...newPickup, trackingNumber: trackingId, qrCode, qrPayload: payload },
      ...prev,
    ]);
    try {
      await loadCustomerData();
    } catch {
      showToast(
        "Order saved",
        "Your pickup is live, but the order list could not be refreshed.",
        "error",
      );
    }
    showProcessingThenSuccess(
      "Processing pickup",
      `We are scheduling your doorstep collection for ${newPickup.pickupDate}.`,
      "Pickup scheduled",
      `Your pickup for ${newPickup.pickupDate} has been confirmed successfully.`,
    );
  };

  const handleUpdateAppointment = (updated: Appointment) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === updated.id ? updated : apt)),
    );
  };

  const handleUpdatePickup = (updated: PickupRequest) => {
    setPickups((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
  };

  const handleQuickTrack = (trackingNo: string) => {
    const trimmed = trackingNo.trim();
    if (!trimmed) {
      showToast(
        "Tracking required",
        "Please enter a tracking number to continue.",
        "error",
      );
      return;
    }

    setPortal("consumer");
    setActiveTrackingNumber(trimmed);
    setActiveTab("track");
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("Tracking ready", `Looking up shipment ${trimmed}.`, "info");
  };

  const handleHeroTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleQuickTrack(heroSearch);
  };

  if (portalMode) {
    const isLoginPage = pathname === `/${portalMode}/login`;
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <ToastHost toasts={toasts} onClose={removeToast} />
        {isLoginPage ? (
          <AuthView
            key={portalMode}
            mode={portalMode}
            onBack={() => routeTo("/")}
            setPortal={setPortal}
            setUserRole={setUserRole}
            onAuthenticated={(_mode, role) =>
              routeTo(
                role === "rider"
                  ? "/rider"
                  : role === "admin"
                    ? "/admin"
                    : "/staff",
              )
            }
          />
        ) : portalAccess === "allowed" ? (
          <>
            <header className="flex h-16 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 sm:gap-4 sm:px-8">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <img src="/assets/logo.jpg" alt="JB & Best Logistics logo" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                <span className="truncate font-display text-sm font-bold text-slate-900 sm:text-base">
                  JB & Best Logistics
                </span>
                <span className="hidden border-l border-slate-200 pl-3 text-sm font-semibold capitalize text-slate-500 sm:inline">
                  {portalMode === "staff" ? "warehouse" : portalMode} portal
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearAuthToken();
                  setUserRole("customer");
                  routeTo(`/${portalMode}/login`);
                }}
                className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:text-sm"
              >
                Sign out
              </button>
            </header>
            <main className="w-full px-0 py-0">
              {portalMode === "rider" ? (
                <RiderDashboard />
              ) : portalMode === "staff" ? (
                <StaffDashboard
                  shipments={shipments}
                  pickups={pickups}
                  appointments={appointments}
                  onAddShipment={handleAddShipment}
                  onUpdateShipment={handleUpdateShipment}
                  onUpdateAppointment={handleUpdateAppointment}
                />
              ) : (
                <AdminDashboard
                  shipments={shipments}
                  invoices={invoices}
                  appointments={appointments}
                  pickups={pickups}
                  onUpdateInvoice={handleUpdateInvoice}
                  onOpenArchitecture={() => setIsArchitectureOpen(true)}
                  onUpdatePickup={handleUpdatePickup}
                  onUpdatePickups={setPickups}
                />
              )}
            </main>
          </>
        ) : (
          <main className="flex min-h-screen items-center justify-center px-4 text-sm font-semibold text-slate-600">
            Checking portal access...
          </main>
        )}
        <ArchitectureModal
          isOpen={portalMode === "admin" && isArchitectureOpen}
          onClose={() => setIsArchitectureOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      <ToastHost toasts={toasts} onClose={removeToast} />
      {/* Top Header & Navigation with Integrated Role/Dashboard Switcher */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={navigateConsumerTab}
        portal={portal}
        setPortal={(newPortal) => {
          setPortal(newPortal);
          if (newPortal === "consumer") setUserRole("customer");
          else if (newPortal === "staff") setUserRole("associate");
          else setUserRole("admin");
        }}
        userRole={userRole}
        setUserRole={setUserRole}
        customerName={customerProfile?.name}
        isCustomerAuthenticated={customerAccess === "authenticated"}
        onOpenAuth={() => openCustomerAuth("services")}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
      />

      {isAuthPageOpen && (
        <AuthView
          onBack={() => setIsAuthPageOpen(false)}
          setPortal={setPortal}
          setUserRole={setUserRole}
          onAuthenticated={(_mode, role) => {
            setUserRole(
              role === "customer"
                ? "customer"
                : role === "admin"
                  ? "admin"
                  : "associate",
            );
            setIsAuthPageOpen(false);
            if (role === "customer") {
              setCustomerAccess("authenticated");
              setActiveTab(pendingCustomerTab || "services");
              setPendingCustomerTab(null);
              void Promise.all([
                getCustomerProfile().then(({ profile, mailboxes }) =>
                  setCustomerProfile({ ...profile, mailboxes }),
                ),
                loadCustomerData(),
              ]).catch(() => {});
            }
          }}
        />
      )}

      {/* Main Canvas Based on Selected Dashboard */}
      {!isAuthPageOpen && (
        <main
          className={`flex-1 w-full mx-auto ${
            portal === "consumer"
              ? "max-w-none px-0 py-0"
              : portal === "staff" || portal === "admin"
                ? "max-w-none px-0 py-0"
                : "max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
          }`}
        >
          {/* ======================================================================= */}
          {/* 1. STAFF DASHBOARD                                                      */}
          {/* ======================================================================= */}
          {portal === "staff" && (
            <StaffDashboard
              shipments={shipments}
              pickups={pickups}
              appointments={appointments}
              onAddShipment={handleAddShipment}
              onUpdateShipment={handleUpdateShipment}
              onUpdateAppointment={handleUpdateAppointment}
            />
          )}

          {/* ======================================================================= */}
          {/* 2. ADMIN DASHBOARD                                                      */}
          {/* ======================================================================= */}
          {portal === "admin" && (
            <AdminDashboard
              shipments={shipments}
              invoices={invoices}
              appointments={appointments}
              pickups={pickups}
              onUpdateInvoice={handleUpdateInvoice}
              onOpenArchitecture={() => setIsArchitectureOpen(true)}
              onUpdatePickup={handleUpdatePickup}
              onUpdatePickups={setPickups}
            />
          )}

          {/* ======================================================================= */}
          {/* 3. CONSUMER STOREFRONT DASHBOARD                                        */}
          {/* ======================================================================= */}
          {portal === "consumer" && (
            <>
              {/* Consumer Welcome Hero (Displayed on the Home & Services view) */}
              {activeTab === "services" && (
                <section className="landing-hero bg-white">
                  <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14 lg:px-8 lg:py-16">
                    <div className="animate-fade-up">
                      <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-blue-800">
                        <MapPin className="h-3.5 w-3.5 text-red-600" />
                        Shipping with worldwide reach
                      </span>
                      <h1 className="mt-5 max-w-xl font-display text-4xl font-bold leading-[1.04] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                        Shipping made{" "}
                        <span className="text-red-600">personal.</span>
                      </h1>
                      <p className="mt-5 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">
                        From getting your package ready to sending it on its way, find shipping, mailbox, and business services backed by personal support.
                      </p>
                      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                        <button type="button" onClick={() => navigateConsumerTab("pickup")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800">
                          Schedule a pickup <ArrowRight className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => document.getElementById("services-overview")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-blue-400 hover:text-blue-800">
                          Explore our services
                        </button>
                      </div>
                      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-slate-200 pt-5 text-sm font-semibold text-slate-700">
                        <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-red-600" /> Worldwide shipping options</span>
                        <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-red-600" /> Personal shipping support</span>
                      </div>
                    </div>
                    <div className="relative min-h-[300px] overflow-hidden rounded-[28px] bg-slate-200 sm:min-h-[420px] lg:min-h-[500px]">
                      <img src="https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?auto=format&fit=crop&w=1400&q=85" alt="Packages prepared for a local delivery" className="absolute inset-0 h-full w-full object-cover object-center" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                      <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/30 bg-white/95 p-4 shadow-xl backdrop-blur sm:bottom-7 sm:left-7 sm:right-7 sm:p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-700">Close to home. Ready to go.</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">Get help preparing and sending packages to destinations around the world.</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-y border-slate-200 bg-slate-50">
                    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
                      <form onSubmit={handleHeroTrackSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                          <label htmlFor="hero-tracking-number" className="mb-2 block text-sm font-bold text-slate-900">Track a package</label>
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input id="hero-tracking-number" type="text" value={heroSearch} maxLength={20} autoCapitalize="characters" onChange={(e) => setHeroSearch(e.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 20).toUpperCase())} placeholder="Enter your tracking number" className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                          </div>
                        </div>
                        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-red-800">Track <ArrowRight className="h-4 w-4" /></button>
                      </form>
                      <div className="flex flex-wrap gap-2 text-sm font-semibold">
                        <button type="button" onClick={() => navigateConsumerTab("appointment")} className="rounded-lg px-3 py-2 text-blue-800 transition hover:bg-blue-100">Mailbox & in-store services</button>
                        <button type="button" onClick={() => navigateConsumerTab("profile")} className="rounded-lg px-3 py-2 text-blue-800 transition hover:bg-blue-100">My account</button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Dynamic Consumer Views */}
              <div
                key={activeTab}
                id={activeTab === "services" ? "services-overview" : undefined}
                className="page-transition max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
              >
                {activeTab === "services" && (
                  <ServicesHubView
                    onSelectService={(s) => {
                      if (s === "pickup") navigateConsumerTab("pickup");
                      else if (s === "notary" || s === "packing")
                        navigateConsumerTab("appointment");
                      else navigateConsumerTab("track");
                    }}
                    onBookAppointment={() => {
                      navigateConsumerTab("appointment");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onSchedulePickup={() => {
                      navigateConsumerTab("pickup");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                )}

                {activeTab === "track" && (
                  <TrackingView
                    shipments={shipments}
                    initialTrackingId={activeTrackingNumber}
                  />
                )}

                {activeTab === "appointment" && (
                  <AppointmentBookingView
                    appointments={appointments}
                    onAddAppointment={handleAddAppointment}
                    onNotify={showToast}
                    profile={customerProfile}
                  />
                )}

                {activeTab === "pickup" && (
                  <PickupSchedulerView
                    pickups={pickups}
                    onAddPickup={handleAddPickup}
                    onNotify={showToast}
                    profile={customerProfile}
                  />
                )}

                {activeTab === "invoices" && (
                  <InvoiceReceiptView
                    invoices={invoices}
                    onUpdateInvoice={handleUpdateInvoice}
                  />
                )}
              </div>
            </>
          )}
        </main>
      )}
      {activeTab === "profile" && (
        <CustomerProfileView
          onProfileSaved={(profile) => {
            setCustomerProfile(profile);
            setCustomerAccess("authenticated");
          }}
          onOpenAuth={() => openCustomerAuth("profile")}
          onSignOut={signOutCustomer}
        />
      )}

      {/* Clean, Approachable Consumer Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 pt-12 pb-8 text-gray-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-gray-100">
            {/* Column 1: Brand & Bio */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <img src="/assets/logo.jpg" alt="JB & Best Logistics logo" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                <span className="font-display font-bold text-gray-900 text-base">
                  JB & Best Logistics LLC
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
                Shipping, private mailbox services, and more with personal support.
              </p>
            </div>
            {/* Column 2: Quick Links */}
            <div className="space-y-2.5 text-sm">
              <h4 className="font-semibold text-gray-900">Services</h4>
              <ul className="space-y-2 text-gray-500">
                <li>
                  <button
                    onClick={() => {
                      setPortal("consumer");
                      navigateConsumerTab("services");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="hover:text-blue-600 transition cursor-pointer"
                  >
                    Shipping & Carriers
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setPortal("consumer");
                      navigateConsumerTab("services");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="hover:text-blue-600 transition cursor-pointer"
                  >
                    Private Mailbox Rental
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setPortal("consumer");
                      navigateConsumerTab("appointment");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="hover:text-blue-600 transition cursor-pointer"
                  >
                    Georgia Notary Public
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setPortal("consumer");
                      navigateConsumerTab("pickup");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="hover:text-blue-600 transition cursor-pointer"
                  >
                    Schedule Doorstep Pickup
                  </button>
                </li>
              </ul>
            </div>
            {/* Column 3: Store Hours */}
            <div className="space-y-2.5 text-sm">
              <h4 className="font-semibold text-gray-900">Store Hours</h4>
              <div className="space-y-1.5 text-gray-500 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span>Monday – Saturday:</span>
                  <span className="font-medium text-gray-800">
                    8:00 AM – 9:00 PM
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday:</span>
                  <span className="font-medium text-gray-800">
                    12:00 PM – 8:00 PM
                  </span>
                </div>
              </div>
            </div>
            {/* Column 4: Store Location */}
            <div className="space-y-2.5 text-sm">
              <h4 className="font-semibold text-gray-900">Visit or call</h4>
              <div className="space-y-1 pt-1 text-xs text-gray-500">
                <p>📍 1900 The Exchange SE, Suite 500, Atlanta, GA 30339</p>
                <p>📞 <a href="tel:+19498441280" className="hover:text-blue-600">+1 949-844-1280</a></p>
                <p>✉️ <a href="mailto:jb.bestlogistics@gmail.com" className="hover:text-blue-600">jb.bestlogistics@gmail.com</a></p>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <p>
              © {new Date().getFullYear()} JB & Best Logistics LLC. All rights
              reserved.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsArchitectureOpen(true)}
                className="text-gray-400 hover:text-gray-600 underline cursor-pointer text-xs"
              >
                Developer Info & Architecture
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Code Architecture Explorer Modal */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />
    </div>
  );
}
