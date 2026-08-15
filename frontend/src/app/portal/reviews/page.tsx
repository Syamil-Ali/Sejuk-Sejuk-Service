"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Archive,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ImageIcon,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import { StatusBadge } from "@/components/status-badge";
import type { ServiceOrder } from "@/lib/domain";
import { localDateTime, money } from "@/lib/utils";
import { orderPaymentSummary } from "@/lib/payments";
import {
  OrderQueue,
  QueueSummaryCard,
  matchesOrderQuery,
  reviewState,
  technicianName,
} from "@/features/orders";

type ReviewFilter =
  "All" | "Needs review" | "Needs correction" | "Reviewed" | "Closed";

export default function ReviewsPage() {
  const { user, users, orders } = useDemo();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ReviewFilter>("All");

  const reviewOrders = useMemo(
    () =>
      orders
        .filter((order) => reviewState(order))
        .sort(
          (a, b) =>
            new Date(b.completion?.completedAt || b.createdAt).getTime() -
            new Date(a.completion?.completedAt || a.createdAt).getTime(),
        ),
    [orders],
  );
  const counts = {
    "Needs review": reviewOrders.filter(
      (order) => reviewState(order) === "Needs review",
    ).length,
    "Needs correction": reviewOrders.filter(
      (order) => reviewState(order) === "Needs correction",
    ).length,
    Reviewed: reviewOrders.filter((order) => reviewState(order) === "Reviewed")
      .length,
    Closed: reviewOrders.filter((order) => reviewState(order) === "Closed")
      .length,
  };
  const filtered = useMemo(
    () =>
      reviewOrders.filter((order) => {
        const matchesFilter = filter === "All" || reviewState(order) === filter;
        return matchesFilter && matchesOrderQuery(order, query, users);
      }),
    [filter, query, reviewOrders, users],
  );

  if (user?.role !== "manager")
    return <p className="card p-6">Manager access required.</p>;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <header className="mb-7 shrink-0">
        <h1 className="text-3xl font-bold leading-none tracking-[-.025em] text-[#0f172a]">
          Job reviews
        </h1>
        <p className="mt-2 text-sm text-[#64748b]">
          Review completed work, track corrections, and close verified service
          records.
        </p>
      </header>

      <div className="mb-6 grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
        <QueueSummaryCard
          icon={CheckCircle2}
          label="Needs review"
          value={counts["Needs review"]}
          tone="blue"
          active={filter === "Needs review"}
          onClick={() =>
            setFilter(filter === "Needs review" ? "All" : "Needs review")
          }
        />
        <QueueSummaryCard
          icon={RotateCcw}
          label="Needs correction"
          value={counts["Needs correction"]}
          tone="amber"
          active={filter === "Needs correction"}
          onClick={() =>
            setFilter(
              filter === "Needs correction" ? "All" : "Needs correction",
            )
          }
        />
        <QueueSummaryCard
          icon={BadgeCheck}
          label="Reviewed"
          value={counts.Reviewed}
          tone="green"
          active={filter === "Reviewed"}
          onClick={() => setFilter(filter === "Reviewed" ? "All" : "Reviewed")}
        />
        <QueueSummaryCard
          icon={Archive}
          label="Closed"
          value={counts.Closed}
          tone="slate"
          active={filter === "Closed"}
          onClick={() => setFilter(filter === "Closed" ? "All" : "Closed")}
        />
      </div>

      <OrderQueue
        title="Review queue"
        resultCount={filtered.length}
        query={query}
        onQueryChange={setQuery}
        searchLabel="Search reviews"
        searchPlaceholder="Search order, customer or technician..."
        filter={filter}
        onFilterChange={setFilter}
        filterLabel="Filter review state"
        filterOptions={(
          [
            "All",
            "Needs review",
            "Needs correction",
            "Reviewed",
            "Closed",
          ] as ReviewFilter[]
        ).map((value) => ({ value, label: value }))}
        columns={[
          "Order & customer",
          "Review state",
          "Technician & amount",
          "Completion",
          "Action",
        ]}
        gridClassName="grid-cols-[minmax(180px,1.15fr)_150px_minmax(180px,.9fr)_minmax(220px,1.2fr)_90px]"
        emptyTitle="No matching reviews"
        emptyDescription="Try another search or review-state filter."
      >
        {filtered.map((order) => (
          <ReviewRow
            key={order.id}
            order={order}
            technician={technicianName(order, users)}
          />
        ))}
      </OrderQueue>
    </div>
  );
}

function ReviewRow({
  order,
  technician,
}: {
  order: ServiceOrder;
  technician: string;
}) {
  const state = reviewState(order)!;
  const completion = order.completion;
  const evidenceCount = completion?.evidence.length || 0;
  const payment = orderPaymentSummary(order);
  const correctionReason =
    state === "Needs correction" ? order.reviews.at(-1)?.notes : undefined;
  return (
    <Link
      href={`/portal/orders/${order.id}`}
      className="group block px-5 py-4 transition-colors hover:bg-[#f8fbff]"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(180px,1.15fr)_150px_minmax(180px,.9fr)_minmax(220px,1.2fr)_90px] lg:items-center">
        <div className="min-w-0">
          <p className="font-code text-[11px] text-[#64748b]">
            {order.orderNo}
          </p>
          <h3 className="mt-1 truncate text-sm font-semibold text-[#0f172a]">
            {order.customerName}
          </h3>
          <p className="mt-0.5 truncate text-xs text-[#94a3b8]">
            {order.serviceType} · {order.address}
          </p>
        </div>
        <div>
          <StatusBadge status={order.status} />
          <p
            className={`mt-1.5 text-xs font-medium ${state === "Needs correction" ? "text-[#b45309]" : state === "Needs review" ? "text-[#2563eb]" : "text-[#64748b]"}`}
          >
            {state}
          </p>
        </div>
        <div className="space-y-1 text-xs">
          <p className="flex items-center gap-2 text-[#334155]">
            <UserRound className="size-3.5 text-[#94a3b8]" />
            {technician}
          </p>
          <p className="flex items-center gap-2 font-semibold text-[#334155]">
            <CircleDollarSign className="size-3.5 text-[#94a3b8]" />
            {money.format(completion?.finalAmount || order.quotedPrice)}
          </p>
        </div>
        <div className="min-w-0 space-y-1 text-xs text-[#64748b]">
          <p className="flex items-center gap-2">
            <CalendarDays className="size-3.5 shrink-0 text-[#94a3b8]" />
            <span className="truncate">
              {completion
                ? localDateTime.format(new Date(completion.completedAt))
                : "Awaiting technician correction"}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <ImageIcon className="size-3.5 text-[#94a3b8]" />
            {evidenceCount} evidence file{evidenceCount === 1 ? "" : "s"}
          </p>
          <p
            className={`truncate font-medium ${payment.status === "Paid" ? "text-[#047857]" : payment.status === "Partially paid" ? "text-[#b45309]" : "text-[#dc2626]"}`}
          >
            {payment.status} · {money.format(payment.outstanding)} outstanding
          </p>
          {correctionReason && (
            <p className="truncate text-[#b45309]">{correctionReason}</p>
          )}
        </div>
        <span className="flex items-center justify-end gap-1 text-sm font-semibold text-[#2563eb]">
          {state === "Needs review" ? "Review" : "Open"}
          <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
