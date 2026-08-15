import type { PaymentRecord, ServiceOrder } from "./domain";

export type PaymentStatus = "Unpaid" | "Partially paid" | "Paid";

export function normalizePaymentNotes(notes?: string) {
  const normalized = notes?.trim();
  return normalized || undefined;
}

export function validatePaymentCollection(
  amount: number,
  method: string,
  outstanding: number,
) {
  const paymentMethod = method.trim();
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("Enter a payment amount greater than zero.");
  if (!paymentMethod) throw new Error("Select a payment method.");
  if (amount > outstanding)
    throw new Error(
      `Payment cannot exceed the outstanding ${outstanding.toFixed(2)}.`,
    );
  return paymentMethod;
}

export function orderPaymentHistory(order: ServiceOrder): PaymentRecord[] {
  if (order.payments?.length) return order.payments;
  const legacy = order.completion?.payment;
  if (!legacy) return [];
  return [
    {
      id: `legacy-${order.id}`,
      amount: legacy.amount,
      method: legacy.method,
      receivedAt: legacy.receivedAt,
      recordedBy: "Field technician",
      source: "field",
    },
  ];
}

export function orderPaymentSummary(order: ServiceOrder) {
  const finalAmount = order.completion?.finalAmount ?? order.quotedPrice;
  const payments = orderPaymentHistory(order);
  const received = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const outstanding = Math.max(finalAmount - received, 0);
  const status: PaymentStatus =
    received <= 0 ? "Unpaid" : outstanding > 0 ? "Partially paid" : "Paid";
  return { finalAmount, received, outstanding, status, payments };
}
