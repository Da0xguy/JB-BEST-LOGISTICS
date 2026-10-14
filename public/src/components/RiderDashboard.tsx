import React, { useEffect, useState } from "react";
import {
  Check,
  MapPin,
  PackageCheck,
  Printer,
  QrCode,
  RefreshCw,
  Truck,
} from "lucide-react";
import { QrCameraScanner, extractTrackingId } from "./QrCameraScanner";
import {
  ApiError,
  acceptRiderOffer,
  apiRequest,
  clearAuthToken,
  getShipmentByTrackingNumber,
  getRiderProfile,
  listRiderOffers,
  RiderDispatchOffer,
  setRiderAvailability,
  updateRiderLocation,
} from "../lib/api";
import { printShipmentLabel } from "../lib/printShipmentLabel";

type RiderShipmentStatus =
  | "assigned"
  | "picked_up"
  | "at_warehouse"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "exception";

interface RiderShipment {
  _id: string;
  trackingId: string;
  status: RiderShipmentStatus;
  sender: {
    name: string;
    street: string;
    city: string;
    state?: string;
    country?: string;
    phone: string;
  };
  receiver: {
    name: string;
    street: string;
    city: string;
    state?: string;
    country?: string;
    phone: string;
  };
}

interface RiderJob {
  _id: string;
  status: string;
  scheduledAt: string;
  shipmentId: RiderShipment | null;
}

const NEXT_STATUS: Partial<Record<RiderShipmentStatus, RiderShipmentStatus>> = {
  assigned: "picked_up",
  picked_up: "in_transit",
  in_transit: "out_for_delivery",
  out_for_delivery: "delivered",
};

const STATUS_LABEL: Record<RiderShipmentStatus, string> = {
  assigned: "Assigned",
  picked_up: "Picked up",
  at_warehouse: "At warehouse",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  exception: "Needs attention",
};

export const RiderDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<RiderJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [offers, setOffers] = useState<RiderDispatchOffer[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);
  const [offersError, setOffersError] = useState("");
  const [offersPollingEnabled, setOffersPollingEnabled] = useState(true);
  const [error, setError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [trackingIdInput, setTrackingIdInput] = useState("");
  const [scanNotice, setScanNotice] = useState("");

  const redirectUnauthorizedRider = (requestError: unknown) => {
    if (
      !(requestError instanceof ApiError) ||
      ![401, 403].includes(requestError.status)
    )
      return false;
    clearAuthToken();
    window.location.replace("/rider/login");
    return true;
  };

  const loadJobs = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await apiRequest<{ jobs: RiderJob[] }>("/api/jobs");
      setJobs(result.jobs.filter((job) => job.shipmentId));
    } catch (loadError) {
      if (redirectUnauthorizedRider(loadError)) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load your jobs",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadOffers = async () => {
    try {
      const { offers: pendingOffers } = await listRiderOffers();
      setOffers(pendingOffers.filter((offer) => offer.shipmentId));
      setOffersError("");
    } catch (loadError) {
      if (redirectUnauthorizedRider(loadError)) return;
      setOffers([]);
      setOffersError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load pickup offers",
      );
      setOffersPollingEnabled(false);
    }
  };

  useEffect(() => {
    void loadJobs();
    getRiderProfile()
      .then(({ riderProfile }) => setIsOnline(riderProfile.is_active))
      .catch((profileError: unknown) => {
        if (redirectUnauthorizedRider(profileError)) return;
        setError(
          profileError instanceof Error
            ? profileError.message
            : "Unable to load rider status",
        );
      });
  }, []);

  useEffect(() => {
    if (!isOnline || !offersPollingEnabled) return;
    void loadOffers();
    const interval = window.setInterval(() => void loadOffers(), 5000);
    return () => window.clearInterval(interval);
  }, [isOnline, offersPollingEnabled]);

  const toggleAvailability = async () => {
    setAvailabilityBusy(true);
    setError("");
    try {
      if (isOnline) {
        await setRiderAvailability(false);
        setIsOnline(false);
      } else {
        if (!navigator.geolocation)
          throw new Error("Location is required to go online.");
        const coordinates = await new Promise<[number, number]>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              ({ coords }) => resolve([coords.longitude, coords.latitude]),
              () =>
                reject(
                  new Error(
                    "Allow location access to receive nearby pickup offers.",
                  ),
                ),
              { enableHighAccuracy: true, timeout: 10000 },
            );
          },
        );
        await updateRiderLocation(coordinates);
        await setRiderAvailability(true);
        setIsOnline(true);
      }
    } catch (availabilityError) {
      setError(
        availabilityError instanceof Error
          ? availabilityError.message
          : "Unable to change rider availability",
      );
    } finally {
      setAvailabilityBusy(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    setAcceptingOfferId(offerId);
    setError("");
    try {
      await acceptRiderOffer(offerId);
      setOffers((current) => current.filter((offer) => offer._id !== offerId));
      await loadJobs();
    } catch (acceptError) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : "This offer is no longer available.",
      );
    } finally {
      setAcceptingOfferId(null);
    }
  };

  const advanceShipment = async (shipment: RiderShipment) => {
    const nextStatus = NEXT_STATUS[shipment.status];
    if (!nextStatus) return;
    setUpdatingId(shipment._id);
    setError("");
    try {
      await apiRequest(
        `/api/shipments/${encodeURIComponent(shipment._id)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      setJobs((current) =>
        current.map((job) =>
          job.shipmentId?._id === shipment._id
            ? { ...job, shipmentId: { ...shipment, status: nextStatus } }
            : job,
        ),
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update shipment",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRiderScan = async (payload: string) => {
    setScannerOpen(false);
    setError("");
    setScanNotice("");
    try {
      const trackingId = extractTrackingId(payload);
      const shipment = await getShipmentByTrackingNumber(trackingId);
      const assignedJob = jobs.find(
        (job) => job.shipmentId?._id === shipment.id,
      );
      if (!assignedJob?.shipmentId) {
        throw new Error("This shipment is not assigned to your rider account.");
      }

      if (shipment.currentStatus === "picked_up") {
        const needsWarehouse =
          Boolean(shipment.sender.country.trim()) &&
          Boolean(shipment.recipient.country?.trim()) &&
          shipment.sender.country.trim().toLowerCase() !==
            shipment.recipient.country!.trim().toLowerCase();
        if (needsWarehouse) {
          throw new Error(
            "Take this shipment to the warehouse. Staff will scan receipt before outbound shipping.",
          );
        }
      }

      const nextStatus =
        NEXT_STATUS[shipment.currentStatus as RiderShipmentStatus];
      if (!nextStatus)
        throw new Error("This shipment has no rider scan action remaining.");
      await apiRequest(
        `/api/shipments/${encodeURIComponent(shipment.id)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: nextStatus,
            note: `Rider scanned shipment and updated status to ${nextStatus.replaceAll("_", " ")}.`,
          }),
        },
      );
      setTrackingIdInput("");
      setScanNotice(`${trackingId} updated: ${STATUS_LABEL[nextStatus]}.`);
      await loadJobs();
    } catch (scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : "Unable to scan shipment.",
      );
    }
  };

  const printShipmentLabelForRider = async (shipment: RiderShipment) => {
    try {
      await printShipmentLabel({
        trackingNumber: shipment.trackingId,
        sender: shipment.sender,
        recipient: shipment.receiver,
      });
    } catch (printError) {
      setError(
        printError instanceof Error
          ? printError.message
          : "Unable to print QR code.",
      );
    }
  };

  const activeJobs = jobs.filter(
    (job) =>
      job.shipmentId &&
      !["at_warehouse", "delivered", "cancelled"].includes(
        job.shipmentId.status,
      ),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Rider workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            My assigned pickups
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {activeJobs.length} active deliveries
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${isOnline ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
          >
            {isOnline ? "Online for offers" : "Offline"}
          </span>
          <button
            type="button"
            onClick={() => setScannerOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <QrCode className="h-4 w-4" /> Scan shipment
          </button>
          <button
            type="button"
            onClick={() => void toggleAvailability()}
            disabled={availabilityBusy}
            className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60 ${isOnline ? "bg-gray-700 hover:bg-gray-800" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {availabilityBusy
              ? "Updating..."
              : isOnline
                ? "Go offline"
                : "Go online"}
          </button>
          <button
            type="button"
            onClick={() => {
              void loadJobs();
              if (offersPollingEnabled) {
                if (isOnline) void loadOffers();
              } else {
                setOffersPollingEnabled(true);
              }
            }}
            disabled={isLoading}
            aria-label="Refresh assigned pickups and offers"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {offersError && (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {offersError} Use Refresh to retry.
        </p>
      )}

      {scanNotice && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {scanNotice}
        </p>
      )}

      {scannerOpen && (
        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <QrCameraScanner
            onScan={(value) => void handleRiderScan(value)}
            onClose={() => setScannerOpen(false)}
          />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleRiderScan(trackingIdInput);
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <input
              value={trackingIdInput}
              onChange={(event) => setTrackingIdInput(event.target.value)}
              placeholder="Or enter the tracking ID"
              aria-label="Tracking ID"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Update shipment
            </button>
          </form>
        </section>
      )}

      {offers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Pickup offers</h2>
          {offers.map((offer) => {
            const shipment = offer.shipmentId!;
            return (
              <article
                key={offer._id}
                className="flex flex-col gap-4 rounded-xl border border-emerald-300 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-sm font-bold text-gray-900">
                    {shipment.trackingId}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    Pickup from {shipment.sender.name} ·{" "}
                    {shipment.sender.street}, {shipment.sender.city}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {shipment.package.quantity || 1} package(s),{" "}
                    {shipment.package.weight.toFixed(1)} kg ·{" "}
                    {shipment.package.vehicleRequired || "vehicle matched"}
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    Offer expires{" "}
                    {new Date(offer.expiresAt).toLocaleTimeString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleAcceptOffer(offer._id)}
                  disabled={acceptingOfferId !== null}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
                >
                  <Check className="h-4 w-4" />
                  {acceptingOfferId === offer._id
                    ? "Accepting..."
                    : "Accept pickup"}
                </button>
              </article>
            );
          })}
        </section>
      )}

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Loading assigned pickups...
        </div>
      ) : activeJobs.length ? (
        <div className="space-y-3">
          {activeJobs.map((job) => {
            const shipment = job.shipmentId!;
            const needsWarehouse =
              shipment.status === "picked_up" &&
              Boolean(shipment.sender.country?.trim()) &&
              Boolean(shipment.receiver.country?.trim()) &&
              shipment.sender.country!.trim().toLowerCase() !==
                shipment.receiver.country!.trim().toLowerCase();
            const nextStatus = needsWarehouse
              ? undefined
              : NEXT_STATUS[shipment.status];
            return (
              <article
                key={job._id}
                className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-gray-900">
                      {shipment.trackingId}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {STATUS_LABEL[shipment.status]}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="flex gap-2 text-gray-600">
                      <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-gray-900">
                          Pickup: {shipment.sender.name}
                        </p>
                        <p>
                          {shipment.sender.street}, {shipment.sender.city}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 text-gray-600">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      <div>
                        <p className="font-semibold text-gray-900">
                          Deliver to: {shipment.receiver.name}
                        </p>
                        <p>
                          {shipment.receiver.street}, {shipment.receiver.city}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                    <Truck className="h-3.5 w-3.5" /> Scheduled{" "}
                    {new Date(job.scheduledAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:min-w-36">
                  <button
                    type="button"
                    onClick={() => void printShipmentLabelForRider(shipment)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Printer className="h-4 w-4" /> Print label
                  </button>
                  {nextStatus && (
                    <button
                      type="button"
                      onClick={() => void advanceShipment(shipment)}
                      disabled={updatingId !== null}
                      className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                    >
                      {updatingId === shipment._id
                        ? "Updating..."
                        : `Mark ${STATUS_LABEL[nextStatus]}`}
                    </button>
                  )}
                  {needsWarehouse && (
                    <p className="max-w-52 text-xs text-amber-800">
                      Take this interstate/international parcel to the warehouse
                      for intake scanning.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <Truck className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-3 font-semibold text-gray-900">
            No assigned pickups
          </p>
          <p className="mt-1 text-sm text-gray-500">
            New work will appear here when it is assigned to you.
          </p>
        </div>
      )}
    </div>
  );
};
