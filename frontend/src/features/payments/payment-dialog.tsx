"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/components/demo-provider";
import { FormField } from "@/components/ui";
import type { ServiceOrder } from "@/lib/domain";
import { orderPaymentSummary } from "@/lib/payments";
import { localDateTime, money } from "@/lib/utils";

export function PaymentDialog({
  order,
  onClose,
}: {
  order: ServiceOrder;
  onClose: () => void;
}) {
  const { recordPayment } = useDemo();
  const summary = orderPaymentSummary(order);
  const [amount, setAmount] = useState(
    summary.outstanding ? String(summary.outstanding) : "",
  );
  const [method, setMethod] = useState("");
  const [notes, setNotes] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await recordPayment(order.id, Number(amount), method, notes);
      toast.success(`Payment recorded for ${order.orderNo}`);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not record payment",
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/60 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#dfe5ec] bg-white"
      >
        <header className="flex items-start border-b border-[#e5e9ef] px-6 py-5">
          <div>
            <p className="font-code text-xs text-[#60738f]">{order.orderNo}</p>
            <h2
              id="payment-title"
              className="mt-1 text-xl font-semibold text-[#0f1f38]"
            >
              {order.customerName}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="ml-auto grid size-10 place-items-center rounded-xl hover:bg-[#f3f6fa]"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="space-y-6 p-6">
          <div className="grid grid-cols-3 gap-3 rounded-xl border border-[#dfe5ec] bg-[#f8fafc] p-4">
            <Amount label="Final" value={summary.finalAmount} />
            <Amount label="Received" value={summary.received} />
            <Amount label="Outstanding" value={summary.outstanding} accent />
          </div>
          <PaymentHistory payments={summary.payments} />
          {summary.outstanding > 0 ? (
            <form
              onSubmit={submit}
              className="rounded-xl border border-[#cfe0f5] bg-[#f4f8fd] p-5"
            >
              <h3 className="text-sm font-semibold text-[#0f1f38]">
                Record customer payment
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <FormField id="payment-amount" label="Amount (RM)" required>
                  <input
                    id="payment-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={summary.outstanding}
                    required
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="field mt-1.5 !rounded-xl !border !border-[#cbd5e1] !bg-white"
                  />
                </FormField>
                <FormField id="payment-method" label="Method" required>
                  <select
                    id="payment-method"
                    required
                    value={method}
                    onChange={(event) => setMethod(event.target.value)}
                    className="field mt-1.5 !rounded-xl !border !border-[#cbd5e1] !bg-white"
                  >
                    <option value="">Select method</option>
                    <option>Cash</option>
                    <option>Card</option>
                    <option>Bank Transfer</option>
                    <option>E-Wallet</option>
                  </select>
                </FormField>
              </div>
              <FormField
                id="payment-notes"
                label="Additional notes"
                hint="Optional"
                className="mt-4"
              >
                <textarea
                  id="payment-notes"
                  rows={3}
                  maxLength={1_000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Example: Customer paid 50% today; remaining balance due next month."
                  className="field mt-1.5 !rounded-xl !border !border-[#cbd5e1] !bg-white"
                />
              </FormField>
              <button
                type="submit"
                className="mt-4 min-h-11 rounded-xl bg-[#193a63] px-5 text-sm font-medium text-white hover:bg-[#173c68]"
              >
                Record payment
              </button>
            </form>
          ) : (
            <div className="rounded-xl border border-[#b7efd8] bg-[#f0fdf8] p-4 text-sm font-medium text-[#047857]">
              This account is fully paid.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PaymentHistory({
  payments,
}: {
  payments: NonNullable<ServiceOrder["payments"]>;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-[#0f1f38]">Payment history</h3>
      <div className="mt-3 divide-y divide-[#e5e9ef] rounded-xl border border-[#dfe5ec]">
        {payments.length ? (
          [...payments].reverse().map((payment) => (
            <div key={payment.id} className="flex items-start gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[#0f1f38]">
                  {money.format(payment.amount)} · {payment.method}
                </p>
                <p className="mt-0.5 text-xs text-[#60738f]">
                  {payment.recordedBy} ·{" "}
                  {localDateTime.format(new Date(payment.receivedAt))}
                </p>
                {payment.notes && (
                  <p className="mt-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-xs leading-relaxed text-[#475569]">
                    {payment.notes}
                  </p>
                )}
              </div>
              <span className="ml-auto text-xs capitalize text-[#8290a3]">
                {payment.source}
              </span>
            </div>
          ))
        ) : (
          <p className="p-4 text-sm text-[#60738f]">No payment received yet.</p>
        )}
      </div>
    </section>
  );
}

function Amount({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[.08em] text-[#8290a3]">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-semibold ${accent && value > 0 ? "text-[#b45309]" : "text-[#0f1f38]"}`}
      >
        {money.format(value)}
      </p>
    </div>
  );
}
