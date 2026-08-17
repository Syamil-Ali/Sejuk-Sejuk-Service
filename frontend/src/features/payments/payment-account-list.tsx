"use client";

import { useMemo, useState } from "react";
import { WalletCards } from "lucide-react";
import {
  EmptyState,
  SearchField,
  SectionCard,
  StatusFilter,
} from "@/components/data-display";
import type { ServiceOrder } from "@/lib/domain";
import { orderPaymentSummary, type PaymentStatus } from "@/lib/payments";
import { money } from "@/lib/utils";

export type PaymentAccountFilter = "Outstanding" | PaymentStatus | "All";

const filterOptions: PaymentAccountFilter[] = [
  "Outstanding",
  "Unpaid",
  "Partially paid",
  "Paid",
  "All",
];

export function PaymentAccountList({
  orders,
  onOpen,
}: {
  orders: ServiceOrder[];
  onOpen: (order: ServiceOrder) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PaymentAccountFilter>("Outstanding");
  const filtered = useMemo(
    () =>
      orders.filter((order) => {
        const payment = orderPaymentSummary(order);
        const matchesFilter =
          filter === "All" ||
          (filter === "Outstanding"
            ? payment.outstanding > 0
            : payment.status === filter);
        const haystack =
          `${order.orderNo} ${order.customerName} ${order.customerPhone}`.toLowerCase();
        return matchesFilter && haystack.includes(query.trim().toLowerCase());
      }),
    [filter, orders, query],
  );

  return (
    <SectionCard
      title="Payment accounts"
      description="Service status and payment status are tracked separately."
      action={
        <span className="text-xs text-body">
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
        </span>
      }
      contentClassName="!p-0"
    >
      <div className="grid gap-3 border-b border-line p-3 sm:grid-cols-[1fr_180px] sm:px-6">
        <SearchField
          label="Search payment accounts"
          placeholder="Search order, customer, or phone..."
          value={query}
          onChange={setQuery}
        />
        <StatusFilter
          label="Filter payment status"
          value={filter}
          onChange={setFilter}
          options={filterOptions.map((value) => ({ value, label: value }))}
        />
      </div>
      <div className="hidden grid-cols-[1.15fr_.8fr_.8fr_.8fr_110px] gap-4 border-b border-line px-6 py-2 text-[10px] font-semibold uppercase tracking-[.08em] text-muted lg:grid">
        <span>Order &amp; customer</span>
        <span>Service / payment</span>
        <span>Final / received</span>
        <span>Outstanding</span>
        <span />
      </div>
      <div className="divide-y divide-line">
        {filtered.map((order) => (
          <PaymentAccountRow
            key={order.id}
            order={order}
            onOpen={() => onOpen(order)}
          />
        ))}
        {!filtered.length && (
          <EmptyState
            icon={<WalletCards />}
            title="No payment accounts"
            description="No payment accounts match this view."
          />
        )}
      </div>
    </SectionCard>
  );
}

export function PaymentAccountRow({
  order,
  onOpen,
}: {
  order: ServiceOrder;
  onOpen: () => void;
}) {
  const payment = orderPaymentSummary(order);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full px-6 py-4 text-left hover:bg-[#f8fbff]"
    >
      <div className="grid gap-3 lg:grid-cols-[1.15fr_.8fr_.8fr_.8fr_110px] lg:items-center">
        <div>
          <p className="font-code text-xs text-body">{order.orderNo}</p>
          <p className="mt-1 text-[15px] font-medium text-ink">
            {order.customerName}
          </p>
          <p className="text-xs text-[#8290a3]">{order.customerPhone}</p>
        </div>
        <div>
          <p className="text-sm text-[#334155]">{order.status}</p>
          <PaymentStatusBadge status={payment.status} />
        </div>
        <div>
          <p className="text-sm text-ink">
            {money.format(payment.finalAmount)}
          </p>
          <p className="text-xs text-body">
            {money.format(payment.received)} received
          </p>
        </div>
        <p
          className={`text-sm font-semibold ${payment.outstanding > 0 ? "text-[#b45309]" : "text-[#047857]"}`}
        >
          {money.format(payment.outstanding)}
        </p>
        <span className="text-sm font-medium text-accent">View account</span>
      </div>
    </button>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const color =
    status === "Paid"
      ? "border-[#b7efd8] bg-[#ecfdf5] text-[#047857]"
      : status === "Partially paid"
        ? "border-[#fde4ad] bg-[#fffbeb] text-[#b45309]"
        : "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]";
  return (
    <span
      className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {status}
    </span>
  );
}
