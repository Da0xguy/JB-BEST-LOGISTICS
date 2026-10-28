import React, { useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import {
  changePassword,
  clearAuthToken,
  login,
  register,
  requestPasswordResetCode,
  resetPassword,
  setAuthToken,
  verifyRegistrationCode,
} from "../lib/api";
import { AuthRole } from "../lib/api";

type AuthMode = "customer" | "rider" | "staff" | "admin";
type Portal = "consumer" | "staff" | "admin";
type UserRole = "customer" | "associate" | "admin";

interface AuthViewProps {
  mode?: AuthMode;
  startWithSignUp?: boolean;
  onBack: () => void;
  setPortal: (portal: Portal) => void;
  setUserRole: (role: UserRole) => void;
  onAuthenticated?: (mode: AuthMode, role: AuthRole) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  mode = "customer",
  startWithSignUp = false,
  onBack,
  setPortal,
  setUserRole,
  onAuthenticated,
}) => {
  const [isSignUp, setIsSignUp] = useState(startWithSignUp);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [verificationFlow, setVerificationFlow] = useState<
    "registration" | "password_reset" | null
  >(null);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
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

  const togglePasswordVisibility = (field: string) =>
    setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    clearAuthToken();

    try {
      if (isSignUp && mode === "customer") {
        const email = String(form.get("email") || "").trim();
        await register(
          String(form.get("name") || ""),
          email,
          String(form.get("password") || ""),
        );
        setVerificationEmail(email);
        setVerificationFlow("registration");
        setAuthNotice("");
        return;
      }
      const response = await login(
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

      setAuthToken(response.token);
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

  const handleRegistrationVerification = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setAuthError("");
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await verifyRegistrationCode(
        verificationEmail,
        String(form.get("code") || ""),
      );
      setAuthToken(response.token);
      setAuthenticatedRole(response.user.role);
      completeAuthentication(response.user.role);
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Unable to verify your email",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setAuthError("");
    setAuthNotice("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    setIsSubmitting(true);
    try {
      if (verificationFlow !== "password_reset") {
        await requestPasswordResetCode(email);
        setVerificationEmail(email);
        setVerificationFlow("password_reset");
        setAuthNotice(
          "If an active account exists for that email, a verification code has been sent.",
        );
        return;
      }

      const newPassword = String(form.get("newPassword") || "");
      if (newPassword.length < 8) {
        setAuthError("Use at least 8 characters for your new password.");
        return;
      }
      if (newPassword !== form.get("confirmPassword")) {
        setAuthError("The passwords do not match.");
        return;
      }
      await resetPassword(
        verificationEmail,
        String(form.get("code") || ""),
        newPassword,
      );
      setIsForgotPassword(false);
      setVerificationFlow(null);
      setAuthNotice("Your password has been reset. You can now sign in.");
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Unable to reset password",
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
            <img src="/logo.jpg" alt="JB & Best Logistics logo" className="h-12 w-12 shrink-0 rounded-xl object-cover shadow-sm" />
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
          <div className="absolute inset-x-0 top-0 h-1 bg-red-700 lg:hidden" />
          <button
            onClick={onBack}
            className="absolute right-5 top-5 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Return to website"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center gap-2.5 lg:hidden">
              <img src="/logo.jpg" alt="JB & Best Logistics logo" className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm" />
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
              <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                {mode === "customer" ? "Customer account" : `${mode} portal`}
              </span>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {verificationFlow === "registration"
                  ? "Verify your email"
                  : isForgotPassword
                    ? verificationFlow === "password_reset"
                      ? "Reset your password"
                      : "Forgot password?"
                    : isSignUp && mode === "customer"
                      ? "Create your account"
                      : portalTitle}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {needsPasswordChange
                  ? "Your temporary password must be changed before continuing."
                  : verificationFlow === "registration"
                    ? `Enter the 6-digit code we sent to ${verificationEmail}.`
                    : isForgotPassword
                      ? "We’ll email you a code to securely reset your password."
                      : mode === "customer"
                        ? "Manage shipments, mailboxes, and receipts."
                        : `Access the ${mode} workspace.`}
              </p>
            </div>

            {needsPasswordChange ? (
              <form onSubmit={handlePasswordChange} className="mt-6 space-y-5">
                <label className="block text-sm font-semibold text-slate-700">
                  New password
                  <div className="relative">
                    <input
                      name="newPassword"
                      required
                      minLength={12}
                      type={visiblePasswords.changePassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 12 characters"
                      className="auth-input bg-slate-50 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("changePassword")}
                      aria-label={visiblePasswords.changePassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                    >
                      {visiblePasswords.changePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Confirm new password
                  <div className="relative">
                    <input
                      name="confirmPassword"
                      required
                      minLength={12}
                      type={visiblePasswords.confirmChangePassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Enter it again"
                      className="auth-input bg-slate-50 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("confirmChangePassword")}
                      aria-label={visiblePasswords.confirmChangePassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                    >
                      {visiblePasswords.confirmChangePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
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
            ) : verificationFlow === "registration" ? (
              <form
                onSubmit={handleRegistrationVerification}
                className="mt-6 space-y-5"
              >
                <label className="block text-sm font-semibold text-slate-700">
                  Email verification code
                  <input
                    name="code"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
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
                  <ShieldCheck className="h-4 w-4" />
                  {isSubmitting ? "Verifying..." : "Verify email and create account"}
                </button>
              </form>
            ) : isForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="mt-6 space-y-5">
                {verificationFlow !== "password_reset" ? (
                  <label className="block text-sm font-semibold text-slate-700">
                    Email address
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        name="email"
                        required
                        type="email"
                        defaultValue={verificationEmail}
                        placeholder="you@example.com"
                        className="auth-input bg-slate-50 pl-10"
                      />
                    </div>
                  </label>
                ) : (
                  <>
                    <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-800">
                      Enter the code sent to {verificationEmail}.
                    </p>
                    <input
                      type="hidden"
                      name="email"
                      value={verificationEmail}
                    />
                    <label className="block text-sm font-semibold text-slate-700">
                      Verification code
                      <input
                        name="code"
                        required
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        autoComplete="one-time-code"
                        placeholder="6-digit code"
                        className="auth-input bg-slate-50"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                      New password
                      <div className="relative">
                        <input
                          name="newPassword"
                          required
                          minLength={8}
                          type={visiblePasswords.resetPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="At least 8 characters"
                          className="auth-input bg-slate-50 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility("resetPassword")}
                          aria-label={visiblePasswords.resetPassword ? "Hide password" : "Show password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                        >
                          {visiblePasswords.resetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                      Confirm new password
                      <div className="relative">
                        <input
                          name="confirmPassword"
                          required
                          minLength={8}
                          type={visiblePasswords.confirmResetPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Enter it again"
                          className="auth-input bg-slate-50 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility("confirmResetPassword")}
                          aria-label={visiblePasswords.confirmResetPassword ? "Hide password" : "Show password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                        >
                          {visiblePasswords.confirmResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </label>
                  </>
                )}
                {authNotice && (
                  <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {authNotice}
                  </p>
                )}
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
                    ? "Please wait..."
                    : verificationFlow === "password_reset"
                      ? "Reset password"
                      : "Send verification code"}
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
                      defaultValue={verificationEmail}
                      placeholder="you@example.com"
                      className="auth-input bg-slate-50 pl-10"
                    />
                  </div>
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Password
                  <div className="relative">
                    <input
                      name="password"
                      required
                      minLength={isSignUp && mode === "customer" ? 8 : undefined}
                      type={visiblePasswords.login ? "text" : "password"}
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                      placeholder="Enter your password"
                      className="auth-input bg-slate-50 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("login")}
                      aria-label={visiblePasswords.login ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                    >
                      {visiblePasswords.login ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
                {mode === "customer" && !isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setVerificationFlow(null);
                      setAuthError("");
                      setAuthNotice("");
                    }}
                    className="-mt-2 w-full text-right text-sm font-semibold text-blue-700 hover:text-blue-900"
                  >
                    Forgot password?
                  </button>
                )}
                {authError && (
                  <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                    {authError}
                  </p>
                )}
                {authNotice && (
                    <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      {authNotice}
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
            {mode === "customer" &&
              verificationFlow === "registration" && (
                <button
                  type="button"
                  onClick={() => {
                    setVerificationFlow(null);
                    setVerificationEmail("");
                    setAuthError("");
                  }}
                  className="mt-5 w-full text-center text-sm font-semibold text-blue-700 hover:text-blue-900"
                >
                  Back to account details
                </button>
              )}
            {mode === "customer" && isForgotPassword && (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setVerificationFlow(null);
                  setAuthError("");
                  setAuthNotice("");
                }}
                className="mt-5 w-full text-center text-sm font-semibold text-blue-700 hover:text-blue-900"
              >
                Back to sign in
              </button>
            )}
            {mode === "customer" &&
              !needsPasswordChange &&
              !isForgotPassword &&
              verificationFlow !== "registration" && (
              <button
                onClick={() => {
                  setIsSignUp((value) => !value);
                  setAuthError("");
                  setAuthNotice("");
                }}
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
