import React, { useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";
import {
  listWarehouseAppointmentHistory,
  listWarehouseShipmentHistory,
  WarehouseShipmentHistory,
} from "../../lib/api";
import { Appointment } from "../../types";

type HistoryTab = "shipments" | "appointments";

export const WarehouseHistoryView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HistoryTab>("shipments");
  const [shipments, setShipments] = useState<WarehouseShipmentHistory[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [shipmentResult, appointmentResult] = await Promise.all([
        listWarehouseShipmentHistory(),
        listWarehouseAppointmentHistory(),
      ]);
      setShipments(shipmentResult.shipments);
      setAppointments(appointmentResult.appointments);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load warehouse history",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Warehouse records
          </p>
          <h2 className="mt-1 text-xl font-bold text-gray-900">
            Shipment and appointment history
          </h2>
        </div>
        <button
          type="button"
          onClick={() => void loadHistory()}
          disabled={isLoading}
          aria-label="Refresh warehouse history"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      <div className="flex gap-5 border-b border-gray-200">
        {(["shipments", "appointments"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 px-1 py-3 text-sm font-semibold capitalize ${activeTab === tab ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-900"}`}
          >
            {tab} (
            {tab === "shipments" ? shipments.length : appointments.length})
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {isLoading ? (
          <p className="p-6 text-sm text-gray-500">Loading history...</p>
        ) : activeTab === "shipments" ? (
          shipments.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-155 text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Tracking</th>
                    <th className="px-4 py-3">Customer / sender</th>
                    <th className="px-4 py-3">Destination</th>
                    <th className="px-4 py-3">Package</th>
                    <th className="px-4 py-3">Allocated rider</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shipments.map((shipment) => (
                    <tr key={shipment._id}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">
                        {shipment.trackingId}
                      </td>
                      <td className="px-4 py-3">
                        {shipment.sender?.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {shipment.receiver?.city || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {shipment.package?.quantity || 1} ×{" "}
                        {Number(shipment.package?.weight || 0).toFixed(1)} kg
                      </td>
                      <td className="px-4 py-3">
                        {typeof shipment.assignedRiderId === "object" &&
                        shipment.assignedRiderId ? (
                          <>
                            <p className="font-medium text-gray-900">
                              {shipment.assignedRiderId.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {shipment.assignedRiderId.phone ||
                                shipment.assignedRiderId.email}
                            </p>
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">
                            Awaiting assignment
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {shipment.status.replaceAll("_", " ")}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(shipment.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center">
              <History className="mx-auto h-7 w-7 text-gray-400" />
              <p className="mt-3 font-semibold text-gray-900">
                No shipment history yet
              </p>
            </div>
          )
        ) : appointments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-155 text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Appointment</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Booked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {appointment.customerName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {appointment.customerEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {appointment.serviceType.replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-3">
                      {appointment.appointmentDate} · {appointment.timeSlot}
                    </td>
                    <td className="px-4 py-3">{appointment.customerPhone}</td>
                    <td className="px-4 py-3 capitalize">
                      {appointment.status.replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(appointment.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <History className="mx-auto h-7 w-7 text-gray-400" />
            <p className="mt-3 font-semibold text-gray-900">
              No appointment history yet
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
