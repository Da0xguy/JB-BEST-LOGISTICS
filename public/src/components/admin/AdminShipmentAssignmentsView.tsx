import React, { useEffect, useState } from "react";
import { Package, RefreshCw } from "lucide-react";
import { listShipmentHistory, WarehouseShipmentHistory } from "../../lib/api";

export const AdminShipmentAssignmentsView: React.FC = () => {
  const [shipments, setShipments] = useState<WarehouseShipmentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadShipments = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await listShipmentHistory();
      setShipments(result.shipments);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load shipment assignments",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadShipments();
  }, []);

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Dispatch oversight
          </p>
          <h2 className="mt-1 text-xl font-bold text-gray-900">
            Shipment rider assignments
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Rider details appear after an offer is accepted.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadShipments()}
          disabled={isLoading}
          aria-label="Refresh shipment assignments"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

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
          <p className="p-6 text-sm text-gray-500">
            Loading shipment assignments...
          </p>
        ) : shipments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-155 text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Tracking</th>
                  <th className="px-4 py-3">Pickup</th>
                  <th className="px-4 py-3">Package</th>
                  <th className="px-4 py-3">Allocated rider</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ordered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shipments.map((shipment) => (
                  <tr key={shipment._id}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">
                      {shipment.trackingId}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {shipment.sender?.name || "—"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {shipment.sender?.city || ""}
                      </p>
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
            <Package className="mx-auto h-7 w-7 text-gray-400" />
            <p className="mt-3 font-semibold text-gray-900">
              No shipments found
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
