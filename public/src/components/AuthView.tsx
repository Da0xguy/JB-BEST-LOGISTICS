import React, { useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  LockKeyhole,
  Mail,
  Package,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { login, register } from "../lib/api";

type AuthRole = "customer" | "staff" | "admin";
type Portal = "consumer" | "staff" | "admin";
type UserRole = "customer" | "associate" | "admin";

interface AuthViewProps {
  onBack: () => void;
  setPortal: (portal: Portal) => void;
  setUserRole: (role: UserRole) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onBack,
  setPortal,
  setUserRole,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [authRole, setAuthRole] = useState<AuthRole>("customer");
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      const response =
        isSignUp && authRole === "customer"
          ? await register(
              String(form.get("name") || ""),
              String(form.get("email") || ""),
              String(form.get("password") || ""),
            )
          : await login(
              String(form.get("email") || ""),
              String(form.get("password") || ""),
            );
      localStorage.setItem("jb_best_token", response.token);
      const role = response.user.role;
      setUserRole(
        role === "rider" || role === "warehouse" ? "associate" : role,
      );
      setPortal(
        role === "customer"
          ? "consumer"
          : role === "rider" || role === "warehouse"
            ? "staff"
            : "admin",
      );
      onBack();
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Unable to authenticate",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page relative min-h-[calc(100svh-4rem)] overflow-hidden bg-slate-950 px-0 py-0 sm:px-6 sm:py-6 lg:px-10">
      <img
        src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2000&q=85"
        alt="Packages ready for shipment"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-slate-950/55" />
      <div className="absolute inset-0 bg-linear-to-br from-slate-950/80 via-slate-950/35 to-blue-950/60" />

      <div className="auth-shell relative z-10 mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl overflow-hidden border-x border-white/15 bg-white/10 shadow-2xl backdrop-blur-[2px] sm:min-h-[calc(100svh-7rem)] sm:border lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-slate-950/20 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="relative z-10 flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <Package className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold">
              JB & Best Logistics
            </span>
          </div>
          <div className="relative z-10 max-w-md">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
              One account. Every shipment.
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight">
              Move business and life forward.
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Book pickups, follow deliveries, manage mailboxes, and keep every
              receipt in one secure place.
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-2 text-xs text-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-300" /> Secure
            role-based access for every team.
          </div>
        </section>

        <section className="relative flex items-center bg-white/95 px-5 py-7 backdrop-blur-xl sm:px-10 sm:py-10 lg:px-12">
          <div className="absolute inset-x-0 top-0 h-1 bg-blue-600 lg:hidden" />
          <button
            onClick={onBack}
            className="absolute right-5 top-5 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Return to website"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center gap-2.5 lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Package className="h-4 w-4" />
              </span>
              <span className="font-display text-base font-bold text-slate-900">
                JB & Best{" "}
                <span className="font-medium text-slate-500">Logistics</span>
              </span>
            </div>
            <button
              onClick={onBack}
              className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-700"
            >
              <ArrowLeft className="h-4 w-4" /> Back to website
            </button>
            <div className="mb-7">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Account access
              </span>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {isSignUp && authRole === "customer"
                  ? "Create your account"
                  : "Welcome back"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {authRole === "customer"
                  ? "Manage shipments, mailboxes, and receipts."
                  : `Access your ${authRole} workspace.`}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 border border-slate-200 bg-slate-50 p-1.5 text-xs font-semibold">
              {(["customer", "staff", "admin"] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    setAuthRole(role);
                    if (role !== "customer") setIsSignUp(false);
                  }}
                  className={`flex items-center justify-center gap-1.5 px-2 py-3 capitalize transition ${authRole === role ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {role === "customer" ? (
                    <User className="h-3.5 w-3.5" />
                  ) : role === "staff" ? (
                    <BriefcaseBusiness className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  {role}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              {authRole === "customer"
                ? "Book shipments and manage your delivery history."
                : authRole === "staff"
                  ? "Manage assigned jobs and warehouse operations."
                  : "Oversee users, branches, and system activity."}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {isSignUp && authRole === "customer" && (
                <label className="block text-sm font-semibold text-slate-700">
                  Full name
                  <input
                    name="name"
                    required
                    type="text"
                    placeholder="Your full name"
                    className="auth-input bg-slate-50"
                  />
                </label>
              )}
              <label className="block text-sm font-semibold text-slate-700">
                Email address
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="email"
                    required
                    type="email"
                    placeholder="you@example.com"
                    className="auth-input bg-slate-50 pl-10"
                  />
                </div>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Password
                <input
                  name="password"
                  required
                  type="password"
                  placeholder="Enter your password"
                  className="auth-input bg-slate-50"
                />
              </label>
              {authError && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {authError}
                </p>
              )}
              <button
                disabled={isSubmitting}
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                <LockKeyhole className="h-4 w-4" />
                {isSubmitting
                  ? "Connecting..."
                  : isSignUp && authRole === "customer"
                    ? "Create account"
                    : `Log in as ${authRole}`}
              </button>
            </form>
            {authRole === "customer" && (
              <button
                onClick={() => setIsSignUp((value) => !value)}
                className="mt-5 w-full text-center text-sm font-semibold text-blue-700 hover:text-blue-900"
              >
                {isSignUp
                  ? "Already have an account? Log in"
                  : "New here? Create an account"}
              </button>
            )}
            <p className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-400">
              <User className="h-3.5 w-3.5" /> Your account connects every JB &
              Best service.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};
