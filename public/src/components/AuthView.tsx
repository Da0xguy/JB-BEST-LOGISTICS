import React, { useState } from "react";
import {
  ArrowLeft,
  LockKeyhole,
  Mail,
  Package,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { changePassword, login, register } from "../lib/api";
import { AuthRole } from "../lib/api";

type AuthMode = "customer" | "rider" | "staff" | "admin";
type Portal = "consumer" | "staff" | "admin";
type UserRole = "customer" | "associate" | "admin";

interface AuthViewProps {
  mode?: AuthMode;
  onBack: () => void;
  setPortal: (portal: Portal) => void;
  setUserRole: (role: UserRole) => void;
  onAuthenticated?: (mode: AuthMode, role: AuthRole) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  mode = "customer",
  onBack,
  setPortal,
  setUserRole,
  onAuthenticated,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authenticatedRole, setAuthenticatedRole] = useState<AuthRole>(
    mode === "admin"
      ? "admin"
      : mode === "rider"
        ? "rider"
        : mode === "staff"
          ? "warehouse"
          : "customer",
  );

  const completeAuthentication = (role: AuthRole = authenticatedRole) => {
    if (onAuthenticated) {
      onAuthenticated(mode, role);
      return;
    }
    setUserRole(
      role === "admin"
        ? "admin"
        : role === "customer"
          ? "customer"
          : "associate",
    );
    setPortal(
      role === "customer" ? "consumer" : role === "admin" ? "admin" : "staff",
    );
    onBack();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      const response =
        isSignUp && mode === "customer"
          ? await register(
              String(form.get("name") || ""),
              String(form.get("email") || ""),
              String(form.get("password") || ""),
            )
          : await login(
              String(form.get("email") || ""),
              String(form.get("password") || ""),
            );
      const role = response.user.role;
      setAuthenticatedRole(role);
      const allowed =
        (mode === "customer" && role === "customer") ||
        (mode === "rider" && role === "rider") ||
        (mode === "staff" && ["warehouse", "warehouse_staff"].includes(role)) ||
        (mode === "admin" && role === "admin");
      if (!allowed)
        throw new Error(`This account cannot access the ${mode} portal.`);

      localStorage.setItem("jb_best_token", response.token);
      if (response.user.mustChangePassword) {
        setNeedsPasswordChange(true);
        return;
      }
      completeAuthentication(role);
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Unable to authenticate",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setAuthError("");
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") || "");
    if (newPassword.length < 12) {
      setAuthError("Use at least 12 characters for your new password.");
      return;
    }
    if (newPassword !== form.get("confirmPassword")) {
      setAuthError("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(newPassword);
      setNeedsPasswordChange(false);
      setAuthError("");
      completeAuthentication();
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Unable to change password",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const portalTitle = needsPasswordChange
    ? "Set a new password"
    : mode === "rider"
      ? "Rider sign in"
      : mode === "staff"
        ? "Warehouse sign in"
        : mode === "admin"
          ? "Administrator sign in"
          : "Welcome back";

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
              {mode === "customer" ? "Customer account" : `${mode} portal`}
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight">
              {mode === "admin"
                ? "Keep every operation in view."
                : mode === "rider"
                  ? "Keep every delivery moving."
                  : mode === "staff"
                    ? "Keep every shipment moving."
                    : "Move business and life forward."}
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              {mode === "customer"
                ? "Book pickups, follow deliveries, manage mailboxes, and keep every receipt in one secure place."
                : mode === "rider"
                  ? "Sign in to view your assigned pickups and update delivery progress."
                  : mode === "staff"
                    ? "Sign in to manage warehouse intake, pickups, services, and shipment updates."
                    : "Sign in to oversee users, branches, pricing, and system activity."}
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-2 text-xs text-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-300" /> Secure
            role-based access.
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
                {mode === "customer" ? "Customer account" : `${mode} portal`}
              </span>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {isSignUp && mode === "customer"
                  ? "Create your account"
                  : portalTitle}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {needsPasswordChange
                  ? "Your temporary password must be changed before continuing."
                  : mode === "customer"
                    ? "Manage shipments, mailboxes, and receipts."
                    : `Access the ${mode} workspace.`}
              </p>
            </div>

            {needsPasswordChange ? (
              <form onSubmit={handlePasswordChange} className="mt-6 space-y-5">
                <label className="block text-sm font-semibold text-slate-700">
                  New password
                  <input
                    name="newPassword"
                    required
                    minLength={12}
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 12 characters"
                    className="auth-input bg-slate-50"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Confirm new password
                  <input
                    name="confirmPassword"
                    required
                    minLength={12}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Enter it again"
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
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                >
                  <LockKeyhole className="h-4 w-4" />
                  {isSubmitting
                    ? "Updating password..."
                    : "Change password and continue"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {isSignUp && mode === "customer" && (
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
                    : isSignUp
                      ? "Create account"
                      : mode === "customer"
                        ? "Log in"
                        : `Log in to ${mode} portal`}
                </button>
              </form>
            )}
            {mode === "customer" && (
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
              <User className="h-3.5 w-3.5" /> Secure access for your JB & Best
              account.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};
