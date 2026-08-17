"use client";

import {
  CalendarDays,
  CircleDot,
  ClipboardCheck,
  Clock3,
  MapPin,
  Plus,
  UserRound,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useDemo } from "@/components/demo-provider";
import { NewOrderModal } from "@/components/new-order-modal";
import { orderUrl } from "@/lib/order-id";
import { StatusBadge } from "@/components/status-badge";
import {
  OrderQueue,
  QueueSummaryCard,
  matchesOrderQuery,
  technicianName,
} from "@/features/orders";
import type { OrderStatus, ServiceOrder } from "@/lib/domain";
import { localDateTime, money } from "@/lib/utils";

type OrderFilter = "All" | OrderStatus;
const filters: OrderFilter[] = [
  "All",
  "New",
  "Assigned",
  "In Progress",
  "Job Done",
  "Reviewed",
  "Closed",
];

export default function OrdersPage() {
  const { orders, user, users } = useDemo();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<OrderFilter>("All");
  const [creating, setCreating] = useState(false);
  const filtered = useMemo(
    () =>
      orders.filter(
        (order) =>
          (status === "All" || order.status === status) &&
          matchesOrderQuery(order, query, users),
      ),
    [orders, query, status, users],
  );
  if (user?.role !== "admin")
    return <p className="card p-6">Admin access required.</p>;
  const summary = [
    {
      label: "Open queue",
      value: orders.filter(
        (order) => !["Reviewed", "Closed"].includes(order.status),
      ).length,
      icon: CircleDot,
      tone: "slate" as const,
    },
    {
      label: "In progress",
      value: orders.filter((order) => order.status === "In Progress").length,
      icon: Clock3,
      tone: "amber" as const,
    },
    {
      label: "Completed",
      value: orders.filter((order) =>
        ["Job Done", "Reviewed", "Closed"].includes(order.status),
      ).length,
      icon: ClipboardCheck,
      tone: "green" as const,
    },
  ];
  return (
    <div className="lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <header className="mb-8 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
        <h1 className="page-title">
          Service orders
        </h1>
<p className="mt-1.5 text-[13px] text-[#64748b] lg:text-sm">
Create, assign, and track every service request from one queue.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#173c68] bg-[#193a63] px-5 text-sm font-medium text-white hover:bg-[#173c68]"
          onClick={() => setCreating(true)}
        >
          <Plus className="size-4" /> New order
        </button>
      </header>
      <div className="mb-10 grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
        {summary.map((item) => (
          <QueueSummaryCard key={item.label} {...item} />
        ))}
      </div>
      <OrderQueue
        title="Queue view"
        resultCount={filtered.length}
        query={query}
        onQueryChange={setQuery}
        searchLabel="Search orders"
        searchPlaceholder="Search by order or customer..."
        filter={status}
        onFilterChange={setStatus}
        filterLabel="Filter status"
        filterOptions={filters.map((value) => ({ value, label: value }))}
        columns={[
          "Order & customer",
          "Status",
          "Service & quote",
          "Technician",
          "Visit details",
        ]}
        gridClassName="grid-cols-[minmax(170px,1.1fr)_140px_minmax(170px,1fr)_140px_minmax(210px,1.25fr)]"
        emptyTitle="No matching orders"
        emptyDescription="Try another search or status filter."
      >
        {filtered.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            technician={technicianName(order, users)}
          />
        ))}
      </OrderQueue>
      <NewOrderModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function OrderRow({
  order,
  technician,
}: {
  order: ServiceOrder;
  technician: string;
}) {
  return (
    <Link
        href={orderUrl(order)}
      className="block bg-white px-5 py-5 hover:bg-[#f8fbff]"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(170px,1.1fr)_140px_minmax(170px,1fr)_140px_minmax(210px,1.25fr)] lg:items-center">
        <div className="min-w-0">
          <p className="font-code text-xs text-[#60738f]">{order.orderNo}</p>
          <h3 className="mt-1 truncate text-[15px] font-medium text-[#07152c]">
            {order.customerName}
          </h3>
        </div>
        <StatusBadge status={order.status} />
        <div className="flex min-w-0 items-center gap-2 text-[15px] text-[#07152c]">
          <Wrench className="size-4 shrink-0 text-[#8290a3]" />
          <span className="truncate">
            {order.serviceType} · {money.format(order.quotedPrice)}
          </span>
        </div>
        <div
          className={`flex min-w-0 items-center gap-2 text-sm ${technician === "Unassigned" ? "text-[#b45309]" : "text-[#334155]"}`}
        >
          <UserRound className="size-4 shrink-0 text-[#8290a3]" />
          <span className="truncate">{technician}</span>
        </div>
        <div className="space-y-1 text-sm text-[#60738f]">
          <p className="flex min-w-0 items-center gap-2">
            <MapPin className="size-4 shrink-0 text-[#8290a3]" />
            <span className="truncate">{order.address}</span>
          </p>
          {order.scheduledAt && (
            <p className="flex items-center gap-2 text-xs">
              <CalendarDays className="size-3.5 shrink-0 text-[#8290a3]" />
              {localDateTime.format(new Date(order.scheduledAt))}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
