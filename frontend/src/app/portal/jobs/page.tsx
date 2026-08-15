"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  MapPin,
  RotateCcw,
  Wrench,
} from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import { StatusBadge } from "@/components/status-badge";
import type { ServiceOrder } from "@/lib/domain";
import { localDateTime, money } from "@/lib/utils";
import {
  OrderQueue,
  QueueSummaryCard,
  matchesOrderQuery,
  needsCorrection,
  technicianJobAction,
} from "@/features/orders";

type JobFilter =
  "All" | "Assigned" | "In Progress" | "Needs correction" | "Completed";

const completedStatuses = ["Job Done", "Reviewed", "Closed"];

export default function JobsPage() {
  const { user, orders } = useDemo();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<JobFilter>("All");

  const jobs = useMemo(
    () =>
      orders
        .filter((order) => order.technicianId === user?.id)
        .sort((a, b) => {
          if (!a.scheduledAt) return 1;
          if (!b.scheduledAt) return -1;
          return (
            new Date(a.scheduledAt).getTime() -
            new Date(b.scheduledAt).getTime()
          );
        }),
    [orders, user?.id],
  );
  const counts = {
    Assigned: jobs.filter((order) => order.status === "Assigned").length,
    "In Progress": jobs.filter(
      (order) => order.status === "In Progress" && !needsCorrection(order),
    ).length,
    "Needs correction": jobs.filter(needsCorrection).length,
    Completed: jobs.filter((order) => completedStatuses.includes(order.status))
      .length,
  };
  const filtered = useMemo(
    () =>
      jobs.filter((order) => {
        const matchesFilter =
          filter === "All" ||
          (filter === "Needs correction"
            ? needsCorrection(order)
            : filter === "Completed"
              ? completedStatuses.includes(order.status)
              : order.status === filter);
        return matchesFilter && matchesOrderQuery(order, query);
      }),
    [filter, jobs, query],
  );

  if (user?.role !== "technician")
    return <p className="card p-6">Technician access required.</p>;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <header className="mb-7 shrink-0">
        <h1 className="text-3xl font-bold leading-none tracking-[-.025em] text-[#0f172a]">
          My jobs
        </h1>
        <p className="mt-2 text-sm text-[#64748b]">
          Welcome back, {user.name}. Track assigned visits and continue field
          work from one queue.
        </p>
      </header>

      <div className="mb-6 grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
        <QueueSummaryCard
          icon={ClipboardCheck}
          label="Assigned"
          value={counts.Assigned}
          tone="blue"
          active={filter === "Assigned"}
          onClick={() => setFilter(filter === "Assigned" ? "All" : "Assigned")}
        />
        <QueueSummaryCard
          icon={Clock3}
          label="In progress"
          value={counts["In Progress"]}
          tone="amber"
          active={filter === "In Progress"}
          onClick={() =>
            setFilter(filter === "In Progress" ? "All" : "In Progress")
          }
        />
        <QueueSummaryCard
          icon={RotateCcw}
          label="Needs correction"
          value={counts["Needs correction"]}
          tone="red"
          active={filter === "Needs correction"}
          onClick={() =>
            setFilter(
              filter === "Needs correction" ? "All" : "Needs correction",
            )
          }
        />
        <QueueSummaryCard
          icon={CheckCircle2}
          label="Completed"
          value={counts.Completed}
          tone="green"
          active={filter === "Completed"}
          onClick={() =>
            setFilter(filter === "Completed" ? "All" : "Completed")
          }
        />
      </div>

      <OrderQueue
        title="Job queue"
        icon
        resultCount={filtered.length}
        query={query}
        onQueryChange={setQuery}
        searchLabel="Search jobs"
        searchPlaceholder="Search order, customer or location..."
        filter={filter}
        onFilterChange={setFilter}
        filterLabel="Filter job status"
        filterOptions={(
          [
            "All",
            "Assigned",
            "In Progress",
            "Needs correction",
            "Completed",
          ] as JobFilter[]
        ).map((value) => ({ value, label: value }))}
        columns={[
          "Order & customer",
          "Status",
          "Service & quote",
          "Checklist",
          "Visit details",
          "Action",
        ]}
        gridClassName="grid-cols-[minmax(180px,1.1fr)_140px_minmax(180px,1fr)_150px_minmax(220px,1.2fr)_90px]"
        emptyTitle="No matching jobs"
        emptyDescription="Try another search or job-status filter."
      >
        {filtered.map((order) => (
          <JobRow key={order.id} order={order} />
        ))}
      </OrderQueue>
    </div>
  );
}

function JobRow({ order }: { order: ServiceOrder }) {
  const completed = order.checklist.filter((item) => item.completed).length;
  const total = order.checklist.length;
  const correction = needsCorrection(order);
  const action = technicianJobAction(order);
  return (
    <Link
      href={`/portal/orders/${order.id}`}
      className="group block px-5 py-4 transition-colors hover:bg-[#f8fbff]"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(180px,1.1fr)_140px_minmax(180px,1fr)_150px_minmax(220px,1.2fr)_90px] lg:items-center">
        <div className="min-w-0">
          <p className="font-code text-[11px] text-[#64748b]">
            {order.orderNo}
          </p>
          <h3 className="mt-1 truncate text-sm font-semibold text-[#0f172a]">
            {order.customerName}
          </h3>
          <p className="mt-0.5 truncate text-xs text-[#94a3b8]">
            {order.problemDescription}
          </p>
        </div>
        <div>
          <StatusBadge status={order.status} />
          {correction && (
            <p className="mt-1.5 text-xs font-medium text-[#dc2626]">
              Correction required
            </p>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-2 text-sm text-[#334155]">
          <Wrench className="size-4 shrink-0 text-[#94a3b8]" />
          <span className="truncate">
            {order.serviceType} · {money.format(order.quotedPrice)}
          </span>
        </div>
        <div>
          <p className="text-xs font-semibold text-[#334155]">
            {completed}/{total} completed
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e2e8f0]">
            <div
              className="h-full rounded-full bg-[#2563eb]"
              style={{ width: `${total ? (completed / total) * 100 : 0}%` }}
            />
          </div>
        </div>
        <div className="min-w-0 space-y-1 text-xs text-[#64748b]">
          <p className="flex items-center gap-2">
            <MapPin className="size-3.5 shrink-0 text-[#94a3b8]" />
            <span className="truncate">{order.address}</span>
          </p>
          <p className="flex items-center gap-2">
            <CalendarDays className="size-3.5 shrink-0 text-[#94a3b8]" />
            <span className="truncate">
              {order.scheduledAt
                ? localDateTime.format(new Date(order.scheduledAt))
                : "Not scheduled"}
            </span>
          </p>
        </div>
        <span className="flex items-center justify-end gap-1 text-sm font-semibold text-[#2563eb]">
          {action}
          <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
