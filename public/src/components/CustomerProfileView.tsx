import React, { useEffect, useState } from "react";
import { LocateFixed, LogOut, UserRound } from "lucide-react";
import {
  CustomerProfile,
  clearAuthToken,
  getAuthToken,
  getCurrentUser,
  getCustomerProfile,
  saveCustomerProfile,
} from "../lib/api";

interface CustomerProfileViewProps {
  onProfileSaved: (profile: CustomerProfile) => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export const CustomerProfileView: React.FC<CustomerProfileViewProps> = ({
  onProfileSaved,
  onOpenAuth,
  onSignOut,
}) => {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [location, setLocation] =
    useState<CustomerProfile["address"]["location"]>();

  useEffect(() => {
    let isCurrent = true;
    if (!getAuthToken()) {
      setIsLoading(false);
      return () => {
        isCurrent = false;
      };
    }
    getCurrentUser()
      .then(({ user }) => {
        if (user.role !== "customer") {
          clearAuthToken();
          throw new Error(
            "Sign in with a customer account to view this profile.",
          );
        }
        return getCustomerProfile();
      })
      .then(({ profile: savedProfile, mailboxes }) => {
        if (!isCurrent) return;
        const fullProfile = { ...savedProfile, mailboxes };
        setProfile(fullProfile);
        setLocation(savedProfile.address.location);
        onProfileSaved(fullProfile);
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Sign in to manage your profile",
          );
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not available in this browser.");
      return;
    }
    setIsLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({
          type: "Point",
          coordinates: [coords.longitude, coords.latitude],
        });
        setIsLocating(false);
      },
      () => {
        setError(
          "Location permission was not granted. You can still save your address.",
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    const form = new FormData(event.currentTarget);
    setError("");
    setNotice("");
    setIsSaving(true);
    try {
      const result = await saveCustomerProfile({
        name: String(form.get("name") || "").trim(),
        phone: String(form.get("phone") || "").trim(),
        address: {
          street: String(form.get("street") || "").trim(),
          suite: String(form.get("suite") || "").trim() || undefined,
          city: String(form.get("city") || "").trim(),
          state: String(form.get("state") || "").trim(),
          postalCode: String(form.get("postalCode") || "").trim(),
          country: String(form.get("country") || "").trim(),
          ...(location ? { location } : {}),
        },
      });
      const fullProfile = { ...result.profile, mailboxes: profile.mailboxes };
      setProfile(fullProfile);
      setLocation(result.profile.address.location);
      onProfileSaved(fullProfile);
      setNotice(
        "Profile saved. Your details will be ready the next time you book.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save profile",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <section className="mx-auto max-w-xl border-y border-gray-200 bg-white px-6 py-10 text-center">
        <UserRound className="mx-auto h-8 w-8 text-blue-600" />
        <h1 className="mt-3 text-xl font-bold text-gray-900">
          Customer profile
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Sign in to save your contact details and default pickup address.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={onOpenAuth}
          className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Sign in
        </button>
      </section>
    );
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none";

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Account
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Your profile
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Saved details are used to prefill pickup and appointment requests.
          </p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </header>
      <form
        onSubmit={handleSubmit}
        className="space-y-5 border-y border-gray-200 bg-white py-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">
            Full name
            <input
              name="name"
              required
              defaultValue={profile.name}
              autoComplete="name"
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Phone number
            <input
              name="phone"
              type="tel"
              required
              defaultValue={profile.phone}
              autoComplete="tel"
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-gray-700 sm:col-span-2">
            Email
            <input
              value={profile.email}
              readOnly
              className={`${inputClass} bg-gray-50 text-gray-500`}
            />
          </label>
        </div>
        <div className="border-t border-gray-100 pt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">
                Default pickup address
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Used to prefill future pickup bookings.
              </p>
            </div>
            <button
              type="button"
              onClick={captureLocation}
              disabled={isLocating}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <LocateFixed className="h-4 w-4" />
              {isLocating
                ? "Locating..."
                : location
                  ? "Update location"
                  : "Use current location"}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700 sm:col-span-2">
              Street address
              <input
                name="street"
                required
                defaultValue={profile.address.street || ""}
                autoComplete="address-line1"
                className={inputClass}
              />
            </label>
            <label className="text-sm font-medium text-gray-700 sm:col-span-2">
              Apartment, suite, or unit
              <input
                name="suite"
                defaultValue={profile.address.suite || ""}
                autoComplete="address-line2"
                className={inputClass}
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              City
              <input
                name="city"
                required
                defaultValue={profile.address.city || ""}
                autoComplete="address-level2"
                className={inputClass}
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              State
              <input
                name="state"
                required
                defaultValue={profile.address.state || ""}
                autoComplete="address-level1"
                className={inputClass}
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              ZIP / postal code
              <input
                name="postalCode"
                required
                defaultValue={profile.address.postalCode || ""}
                autoComplete="postal-code"
                className={inputClass}
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Country
              <input
                name="country"
                required
                defaultValue={profile.address.country || "USA"}
                autoComplete="country-name"
                className={inputClass}
              />
            </label>
          </div>
          {location && (
            <p className="mt-3 text-xs text-gray-500">
              Location saved: {location.coordinates[1].toFixed(5)},{" "}
              {location.coordinates[0].toFixed(5)}
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-emerald-700">
            {notice}
          </p>
        )}
        <div className="flex justify-end border-t border-gray-100 pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
      <section className="border-y border-gray-200 bg-white py-6">
        <h2 className="font-semibold text-gray-900">Mailbox profiles</h2>
        {profile.mailboxes?.length ? (
          <div className="mt-3 divide-y divide-gray-100">
            {profile.mailboxes.map((mailbox) => (
              <div
                key={mailbox.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    {mailbox.mailboxNumber}{" "}
                    <span className="font-normal capitalize text-gray-500">
                      {mailbox.plan}
                    </span>
                  </p>
                  {mailbox.companyName && (
                    <p className="text-xs text-gray-500">
                      {mailbox.companyName}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>Renews {mailbox.renewalDate}</p>
                  <p className="capitalize">
                    {mailbox.status} · {mailbox.packagesHeld} packages held
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            No mailbox profile has been assigned to your account.
          </p>
        )}
      </section>
    </section>
  );
};
