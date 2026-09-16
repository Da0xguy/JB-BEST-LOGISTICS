import React, { useState } from 'react';
import {
  FileText,
  Printer,
  CreditCard,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Receipt,
  QrCode,
  DollarSign,
  Lock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Invoice, InvoiceStatus, PaymentGateway } from '../types';

interface InvoiceReceiptViewProps {
  invoices: Invoice[];
  onUpdateInvoice: (invoice: Invoice) => void;
}

export const InvoiceReceiptView: React.FC<InvoiceReceiptViewProps> = ({
  invoices,
  onUpdateInvoice,
}) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(invoices[0]?.id || 'inv-8801');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showDeveloperNotes, setShowDeveloperNotes] = useState(false);
  const [webhookLog, setWebhookLog] = useState<string | null>(null);

  const currentInvoice = invoices.find((inv) => inv.id === selectedInvoiceId) || invoices[0];

  const handlePrint = () => {
    window.print();
  };

  const handlePay = (gateway: PaymentGateway) => {
    if (!currentInvoice || currentInvoice.status === 'paid') return;
    setIsProcessingPayment(true);

    setTimeout(() => {
      const updated: Invoice = {
        ...currentInvoice,
        status: 'paid',
        paidAt: new Date().toISOString(),
        paymentGateway: gateway,
        paymentReference:
          gateway === 'paystack'
            ? `pstk_ref_${Math.floor(10000000 + Math.random() * 90000000)}`
            : `pi_3Pj${Math.random().toString(36).substring(2, 12)}`,
        updatedAt: new Date().toISOString(),
      };

      onUpdateInvoice(updated);
      setIsProcessingPayment(false);
    }, 600);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60 inline-flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5" /> Secure Billing & Receipts
          </span>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 mt-2">
            Pay Your Bill & View Receipts
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Review your shipping and mailbox invoices, pay online securely, or print receipts for your records.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer shrink-0 shadow-xs"
        >
          <Printer className="w-4 h-4" />
          <span>Print Receipt</span>
        </button>
      </div>

      {/* Invoice Selector */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-3 shadow-xs flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 px-2">Your Invoices:</span>
        {invoices.map((inv) => (
          <button
            key={inv.id}
            onClick={() => setSelectedInvoiceId(inv.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer flex items-center gap-2 ${
              selectedInvoiceId === inv.id
                ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-xs'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span>{inv.invoiceNumber}</span>
            <span className="text-[11px] opacity-80">${(inv.totalAmount ?? 0).toFixed(2)}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                inv.status === 'paid' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
          </button>
        ))}
      </div>

      {currentInvoice && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Invoice Card (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-10 shadow-xs space-y-6">
            {/* Top Store & Invoice Meta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    JB
                  </div>
                  <h3 className="font-display font-bold text-gray-900 text-lg">
                    JB & Best Logistics LLC
                  </h3>
                </div>
                <p className="text-xs text-gray-500">2450 Piedmont Rd NE, Atlanta, GA 30324</p>
                <p className="text-xs text-gray-500">Phone: (404) 555-0199</p>
              </div>

              <div className="sm:text-right space-y-1">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    currentInvoice.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {currentInvoice.status === 'paid' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>{currentInvoice.status === 'paid' ? 'Paid' : 'Payment Due'}</span>
                </span>
                <p className="text-sm font-bold text-gray-900 pt-1">
                  Invoice #{currentInvoice.invoiceNumber}
                </p>
                <p className="text-xs text-gray-500">
                  Issued: {new Date(currentInvoice.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Billed To */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/60 text-xs text-gray-600 space-y-0.5">
              <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block mb-1">
                Billed To Customer
              </span>
              <p className="text-sm font-bold text-gray-900">{currentInvoice.customerName}</p>
              {currentInvoice.customerCompany && (
                <p className="text-gray-700 font-medium">{currentInvoice.customerCompany}</p>
              )}
              <p className="text-gray-500">{currentInvoice.customerEmail}</p>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                    <th className="pb-3">Item / Service Description</th>
                    <th className="pb-3 text-center">Qty</th>
                    <th className="pb-3 text-right">Rate</th>
                    <th className="pb-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-800">
                  {currentInvoice.items.map((item, index) => (
                    <tr key={index}>
                      <td className="py-3 pr-2">
                        <span className="font-medium text-gray-900">{item.description}</span>
                      </td>
                      <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                      <td className="py-3 text-right text-gray-600">${(item.unitPrice ?? 0).toFixed(2)}</td>
                      <td className="py-3 text-right font-semibold text-gray-900">
                        ${(item.total ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Breakdown */}
            <div className="pt-4 border-t border-gray-100 flex flex-col items-end text-xs sm:text-sm space-y-1.5">
              <div className="flex justify-between w-64 text-gray-500">
                <span>Subtotal:</span>
                <span className="font-medium text-gray-900">${(currentInvoice.subtotal ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-64 text-gray-500">
                <span>Georgia Sales Tax (8.9%):</span>
                <span className="font-medium text-gray-900">${((currentInvoice.tax ?? (currentInvoice as unknown as { taxAmount?: number }).taxAmount) ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-64 text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total Due:</span>
                <span className="text-blue-600 text-lg">${(currentInvoice.totalAmount ?? 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Payment status or receipt badge */}
            {currentInvoice.status === 'paid' && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="font-bold block">Payment Received</span>
                    <span>Reference: {currentInvoice.paymentReference || 'Card-Ending-4242'}</span>
                  </div>
                </div>
                <span className="text-emerald-700 font-medium">Thank you for your business!</span>
              </div>
            )}
          </div>

          {/* Right Action / Checkout Column (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {currentInvoice.status !== 'paid' ? (
              <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
                <h4 className="font-bold text-base text-gray-900">Online Checkout</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Pay with any credit card, debit card, or Apple Pay. Payments are processed securely with 256-bit encryption.
                </p>

                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 space-y-1">
                  <span className="font-semibold block">Total to Pay:</span>
                  <span className="text-2xl font-bold text-blue-700">
                    ${(currentInvoice.totalAmount ?? 0).toFixed(2)}
                  </span>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button
                    onClick={() => handlePay('stripe')}
                    disabled={isProcessingPayment}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{isProcessingPayment ? 'Processing...' : 'Pay with Credit / Debit Card'}</span>
                  </button>

                  <button
                    onClick={() => handlePay('paystack')}
                    disabled={isProcessingPayment}
                    className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Pay with Paystack</span>
                  </button>
                </div>

                <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Secure 256-bit encrypted transaction</span>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-gray-900">Receipt Generated</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  This invoice has been settled in full. A copy was sent to {currentInvoice.customerEmail}.
                </p>
                <button
                  onClick={handlePrint}
                  className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Paper Receipt</span>
                </button>
              </div>
            )}

            {/* Assistance Card */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xs space-y-3">
              <h5 className="font-bold text-xs uppercase tracking-wider text-gray-500">
                Billing Support
              </h5>
              <p className="text-xs text-gray-600 leading-relaxed">
                Have questions about a charge or need a corporate W-9 tax form? Contact our accounting desk.
              </p>
              <div className="pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-1">
                <p><strong>Phone:</strong> (404) 555-0199</p>
                <p><strong>Email:</strong> billing@jbbestlogistics.com</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
