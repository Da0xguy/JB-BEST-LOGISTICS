"use client";

import React, { useEffect, useState } from "react";
import { Shipment, ShipmentStatus } from "@/types";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
} from "lucide-react";

interface PageProps {
  params: { trackingId: string } | Promise<{ trackingId: string }>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const MILESTONES: { status: ShipmentStatus; label: string }[] = [
  { status: "order_created", label: "Order created" },
  { status: "assigned", label: "Rider assigned" },
  { status: "picked_up", label: "Picked up" },
  { status: "in_transit", label: "In transit" },
  { status: "out_for_delivery", label: "Out for delivery" },
  { status: "delivered", label: "Delivered" },
];

const WAREHOUSE_MILESTONE: (typeof MILESTONES)[number] = {
  status: "at_warehouse",
  label: "At warehouse",
};

const mapStatus = (status: string): ShipmentStatus => {
  if (status === "assigned") return "assigned";
  if (status === "picked_up") return "picked_up";
  if (status === "at_warehouse") return "at_warehouse";
  if (status === "in_transit") return "in_transit";
  if (status === "out_for_delivery") return "out_for_delivery";
  if (status === "delivered") return "delivered";
  if (status === "exception" || status === "cancelled") return "exception";
  return "order_created";
};

const mapShipment = (record: Record<string, any>): Shipment => {
  const mapAddress = (value: Record<string, any>) => ({
    name: String(value.name || "Unknown"),
    company: value.company ? String(value.company) : undefined,
    street: String(value.street || ""),
    suite: value.suite ? String(value.suite) : undefined,
    city: String(value.city || "Location unavailable"),
    state: String(value.state || ""),
    zip: String(value.postalCode || ""),
    country: String(value.country || ""),
    phone: String(value.phone || ""),
    email: value.email ? String(value.email) : undefined,
  });
  const sender = mapAddress(record.sender || {});
  const recipient = mapAddress(record.receiver || {});
  const pickup = record.pickupLocation?.coordinates as
    | [number, number]
    | undefined;
  const delivery = record.deliveryLocation?.coordinates as
    | [number, number]
    | undefined;
  const mapLocation = (address: typeof sender, point?: [number, number]) => ({
    city: address.city,
    state: address.state,
    country: address.country,
    latitude: point?.[1] || 0,
    longitude: point?.[0] || 0,
  });
  const originLocation = mapLocation(sender, pickup);
  const destinationLocation = mapLocation(recipient, delivery);
  const currentStatus = mapStatus(String(record.status || "booked"));
  const history = record.tracking_history?.length
    ? record.tracking_history
    : record.events || [];
  const trackingLogs = history.map(
    (event: Record<string, any>, index: number) => ({
      id: String(event._id || `${record.trackingId}-${index}`),
      shipmentId: String(record._id),
      status: mapStatus(String(event.status || record.status)),
      title: String(
        event.note ||
          String(event.status || record.status).replaceAll("_", " "),
      ),
      description: String(event.note || ""),
      location:
        currentStatus === "delivered" ? destinationLocation : originLocation,
      timestamp: String(event.createdAt || record.createdAt),
    }),
  );
  const packageDetails = record.package || {};
  const appointment = record.appointmentWindow;

  return {
    id: String(record._id),
    trackingNumber: String(record.trackingId),
    carrier: record.carrier || "jb_freight",
    serviceLevel:
      `${String(record.deliveryOption || "standard").replaceAll("_", " ")} ${record.transport || ""}`.trim(),
    sender,
    recipient,
    packageDetails: {
      weightLbs: Number(packageDetails.weight || 0) * 2.20462,
      dimensions: {
        length: Number(packageDetails.length || 0),
        width: Number(packageDetails.width || 0),
        height: Number(packageDetails.height || 0),
        unit: packageDetails.unit === "cm" ? "cm" : "in",
      },
      packageType: packageDetails.suggestedPackaging || "box",
      isFragile: Boolean(packageDetails.fragile),
      requiresSignature: false,
      declaredValue: Number(packageDetails.declaredValue || 0),
    },
    currentStatus,
    currentLocation:
      currentStatus === "delivered" ? destinationLocation : originLocation,
    originLocation,
    destinationLocation,
    estimatedDelivery: appointment
      ? new Date(appointment.start).toLocaleString()
      : "Not scheduled",
    actualDelivery: record.deliveredAt,
    trackingLogs,
    createdAt: String(record.createdAt),
    updatedAt: String(record.updatedAt),
  };
};

export default function TrackingPage({ params }: PageProps) {
  const [trackingId, setTrackingId] = useState("");
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve(params).then(({ trackingId: resolved }) => {
      if (active) setTrackingId(resolved);
    });
    return () => {
      active = false;
    };
  }, [params]);

  useEffect(() => {
    if (!trackingId) return;
    let active = true;
    let hasLoaded = false;
    const refresh = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/shipments/track/${encodeURIComponent(trackingId)}`,
        );
        const result = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(result.error || "Tracking ID not found");
        if (!active) return;
        setShipment(mapShipment(result.shipment));
        setError("");
        setIsLive(true);
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Tracking service unavailable",
        );
        setIsLive(false);
      } finally {
        if (active) setLoading(false);
        hasLoaded = true;
      }
    };

    if (!hasLoaded) setLoading(true);
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [trackingId]);

  if (loading && !shipment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Loading shipment status...
      </main>
    );
  }

  if (!shipment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="max-w-md border border-slate-200 bg-white p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-600" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Shipment not found
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {error || "No shipment matches this tracking ID."}
          </p>
        </section>
      </main>
    );
  }

  const senderCountry = shipment.sender.country.trim().toLowerCase();
  const recipientCountry = shipment.recipient.country.trim().toLowerCase();
  const hasWarehouseMilestone =
    (senderCountry !== "" &&
      recipientCountry !== "" &&
      senderCountry !== recipientCountry) ||
    shipment.currentStatus === "at_warehouse" ||
    shipment.trackingLogs.some((event) => event.status === "at_warehouse");
  const milestones = hasWarehouseMilestone
    ? [...MILESTONES.slice(0, 3), WAREHOUSE_MILESTONE, ...MILESTONES.slice(3)]
    : MILESTONES;
  const currentIndex = Math.max(
    0,
    milestones.findIndex(({ status }) => status === shipment.currentStatus),
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-12 text-slate-900">
      <header className="border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div>
            <p className="text-sm font-bold">JB &amp; Best Logistics</p>
            <h1 className="mt-1 text-xs text-slate-300">Shipment tracking</h1>
          </div>
          <span className="inline-flex items-center gap-2 text-xs text-slate-300">
            <span
              className={`h-2 w-2 rounded-full ${isLive ? "bg-emerald-400" : "bg-amber-400"}`}
            />
            {isLive
              ? "Live API • refreshes every 15 seconds"
              : "Tracking service unavailable"}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        {error && (
          <p
            role="alert"
            className="border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            {error}
          </p>
        )}
        <section className="border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Tracking ID
              </p>
              <h2 className="mt-1 break-all font-mono text-2xl font-bold">
                {shipment.trackingNumber}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {shipment.serviceLevel}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Pickup window
              </p>
              <p className="mt-1 font-semibold">{shipment.estimatedDelivery}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-sm capitalize text-blue-800">
                <Clock className="h-4 w-4" />
                {shipment.currentStatus.replaceAll("_", " ")}
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-7">
            {milestones.map((milestone, index) => (
              <div key={milestone.status} className="text-center">
                <div
                  className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${index <= currentIndex ? "bg-blue-700 text-white" : "border border-slate-300 bg-white text-slate-400"}`}
                >
                  {index < currentIndex ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <p className="mt-2 text-[11px] font-semibold sm:text-xs">
                  {milestone.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2">
          <div className="bg-white p-6">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Pickup address
            </p>
            <p className="mt-2 font-bold">{shipment.sender.name}</p>
            <p className="mt-1 text-sm text-slate-600">
              {shipment.sender.street}
              {shipment.sender.suite ? `, ${shipment.sender.suite}` : ""}
            </p>
            <p className="text-sm text-slate-600">
              {shipment.sender.city}, {shipment.sender.state}{" "}
              {shipment.sender.zip}
            </p>
          </div>
          <div className="bg-white p-6">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Delivery address
            </p>
            <p className="mt-2 font-bold">{shipment.recipient.name}</p>
            <p className="mt-1 text-sm text-slate-600">
              {shipment.recipient.street}
              {shipment.recipient.suite ? `, ${shipment.recipient.suite}` : ""}
            </p>
            <p className="text-sm text-slate-600">
              {shipment.recipient.city}, {shipment.recipient.state}{" "}
              {shipment.recipient.zip}
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="border border-slate-200 bg-white p-6">
            <h3 className="flex items-center gap-2 font-bold">
              <Package className="h-4 w-4" /> Package
            </h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Weight</dt>
                <dd className="font-semibold">
                  {shipment.packageDetails.weightLbs.toFixed(1)} lb
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Dimensions</dt>
                <dd className="font-semibold">
                  {shipment.packageDetails.dimensions.length} ×{" "}
                  {shipment.packageDetails.dimensions.width} ×{" "}
                  {shipment.packageDetails.dimensions.height}{" "}
                  {shipment.packageDetails.dimensions.unit}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Type</dt>
                <dd className="font-semibold capitalize">
                  {shipment.packageDetails.packageType.replaceAll("_", " ")}
                </dd>
              </div>
            </dl>
          </section>
          <section className="border border-slate-200 bg-white p-6">
            <h3 className="font-bold">Tracking history</h3>
            {shipment.trackingLogs.length ? (
              <ol className="mt-4 space-y-4 border-l border-slate-200 pl-4">
                {shipment.trackingLogs
                  .slice()
                  .reverse()
                  .map((event) => (
                    <li key={event.id} className="relative">
                      <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-blue-700 ring-4 ring-white" />
                      <p className="text-sm font-semibold">{event.title}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {event.description}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" />
                        {event.location.city}, {event.location.state} ·{" "}
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                No tracking events yet.
              </p>
            )}
          </section>
        </div>
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <ArrowRight className="h-3.5 w-3.5" />
          Shipment details refresh automatically while this page is open.
        </p>
      </div>
    </main>
  );
}
