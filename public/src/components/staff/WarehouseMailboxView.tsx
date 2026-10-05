import React, { useEffect, useState } from "react";
import { Building2, RefreshCw, UserRoundPlus } from "lucide-react";
import {
  createWarehouseMailbox,
  listWarehouseMailboxes,
  WarehouseMailboxProfile,
} from "../../lib/api";

export const WarehouseMailboxView: React.FC = () => {
  const [mailboxes, setMailboxes] = useState<WarehouseMailboxProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadMailboxes = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await listWarehouseMailboxes();
      setMailboxes(result.mailboxes);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load mailbox profiles",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadMailboxes();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    setSuccess("");
    setIsCreating(true);
    try {
      const result = await createWarehouseMailbox({
        customerEmail: String(form.get("customerEmail") || "").trim(),
        mailboxNumber: String(form.get("mailboxNumber") || "").trim(),
        plan: String(form.get("plan")) as WarehouseMailboxProfile["plan"],
        companyName: String(form.get("companyName") || "").trim() || undefined,
        keyFobId: String(form.get("keyFobId") || "").trim() || undefined,
        renewalDate: String(form.get("renewalDate") || ""),
      });
      setMailboxes((current) => [result.mailbox, ...current]);
      setSuccess(
        `Mailbox ${result.mailbox.mailboxNumber} assigned to ${result.mailbox.customer.name}.`,
      );
      formElement.reset();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create mailbox profile",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const renewalDefault = new Date();
  renewalDefault.setFullYear(renewalDefault.getFullYear() + 1);

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
          Warehouse services
        </p>
        <h2 className="mt-1 text-xl font-bold text-gray-900">
          Mailbox profiles
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Assign a mailbox to an existing customer account.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 border-y border-gray-200 bg-white py-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <label className="text-sm font-medium text-gray-700">
          Customer email
          <input
            name="customerEmail"
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal focus:border-blue-600 focus:outline-none"
            placeholder="customer@example.com"
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Mailbox number
          <input
            name="mailboxNumber"
            required
            maxLength={32}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal focus:border-blue-600 focus:outline-none"
            placeholder="#107"
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Plan
          <select
            name="plan"
            defaultValue="personal"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 focus:border-blue-600 focus:outline-none"
          >
            <option value="personal">Personal</option>
            <option value="business">Business</option>
            <option value="corporate">Corporate 24/7</option>
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">
          Company name{" "}
          <span className="font-normal text-gray-400">(optional)</span>
          <input
            name="companyName"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal focus:border-blue-600 focus:outline-none"
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Key fob ID{" "}
          <span className="font-normal text-gray-400">(optional)</span>
          <input
            name="keyFobId"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal focus:border-blue-600 focus:outline-none"
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Renewal date
          <input
            name="renewalDate"
            type="date"
            required
            defaultValue={renewalDefault.toISOString().slice(0, 10)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal focus:border-blue-600 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={isCreating}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            <UserRoundPlus className="h-4 w-4" />
            {isCreating ? "Assigning..." : "Create mailbox profile"}
          </button>
          {success && (
            <p role="status" className="text-sm text-emerald-700">
              {success}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Assigned mailboxes
          </h3>
          <button
            type="button"
            onClick={() => void loadMailboxes()}
            disabled={isLoading}
            aria-label="Refresh mailbox profiles"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
        {isLoading ? (
          <p className="p-5 text-sm text-gray-500">
            Loading mailbox profiles...
          </p>
        ) : mailboxes.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-155 text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Mailbox</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Renewal</th>
                  <th className="px-4 py-3">Key fob</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mailboxes.map((mailbox) => (
                  <tr key={mailbox.id}>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      <span className="inline-flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        {mailbox.mailboxNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {mailbox.customer.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {mailbox.customer.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 capitalize">{mailbox.plan}</td>
                    <td className="px-4 py-3">{mailbox.renewalDate}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {mailbox.keyFobId || "Not assigned"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500">
            No mailbox profiles have been created.
          </p>
        )}
      </div>
    </section>
  );
};
