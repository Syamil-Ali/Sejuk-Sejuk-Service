"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  WalletCards,
} from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import { malaysiaWeek } from "@/lib/dates";
import { localDateTime, money } from "@/lib/utils";
import { orderUrl } from "@/lib/order-id";
import {
  AnalyticsKpi,
  ChartCard,
  DateRangeFilter,
  technicianPerformance,
} from "@/features/analytics";
import { ChartLoadingPlaceholder } from "@/features/analytics/chart-loading-placeholder";

const TechnicianServiceValueChart = dynamic(
  () =>
    import("@/features/analytics/technician-service-value-chart").then(
      (module) => module.TechnicianServiceValueChart,
    ),
  { ssr: false, loading: () => <ChartLoadingPlaceholder /> },
);

const iso = (date: Date) => date.toISOString().slice(0, 10);

export default function TechnicianDashboard() {
  const { user, orders } = useDemo();
  const week = malaysiaWeek();
  const [from, setFrom] = useState(iso(week.from));
  const [to, setTo] = useState(
    iso(new Date(week.toExclusive.getTime() - 86400000)),
  );

  const data = useMemo(
    () => (user ? technicianPerformance(orders, user.id, from, to) : null),
    [from, orders, to, user],
  );

  if (user?.role !== "technician")
    return <p className="card p-6">Technician access required.</p>;

  function setThisWeek() {
    const current = malaysiaWeek();
    setFrom(iso(current.from));
    setTo(iso(new Date(current.toExclusive.getTime() - 86400000)));
  }
  function setThisMonth() {
    const today = new Date();
    setFrom(iso(new Date(today.getFullYear(), today.getMonth(), 1)));
    setTo(iso(today));
  }

  return (
    <div className="w-full lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <header className="mb-7 lg:mb-4 lg:shrink-0">
        <h1 className="text-3xl font-bold leading-none tracking-[-.025em] text-[#0f172a] lg:text-[26px]">
          My performance
        </h1>
        <p className="mt-2 text-sm text-[#64748b] lg:mt-1">
          Track your completed service value, payments, and job activity for any
          date range.
        </p>
      </header>

      <DateRangeFilter
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        onThisWeek={setThisWeek}
        onThisMonth={setThisMonth}
      />

      {!data ? (
        <div className="rounded-xl border border-red-200 bg-white p-8 text-red-700">
          Choose a valid inclusive date range.
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6 lg:mb-4 lg:shrink-0">
            <AnalyticsKpi
              compact
              icon={BriefcaseBusiness}
              label="Active jobs"
              value={String(data.assigned)}
              tone="slate"
            />
            <AnalyticsKpi
              compact
              icon={CheckCircle2}
              label="Completed"
              value={String(data.completed.length)}
              tone="blue"
            />
            <AnalyticsKpi
              compact
              icon={CircleDollarSign}
              label="Service value"
              value={money.format(data.earnings)}
              tone="blue"
            />
            <AnalyticsKpi
              compact
              icon={WalletCards}
              label="Customer payments"
              value={money.format(data.paid)}
              tone="green"
            />
            <AnalyticsKpi
              compact
              icon={CircleDollarSign}
              label="Customer outstanding"
              value={money.format(data.outstanding)}
              tone="amber"
            />
            <AnalyticsKpi
              compact
              icon={CalendarClock}
              label="Postponements"
              value={String(data.postponed)}
              tone="slate"
            />
          </div>

          <div className="grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[1.45fr_.8fr]">
            <ChartCard
              title="Service value by completion date"
              description="Final service value attributed to your completed jobs"
            >
              <TechnicianServiceValueChart data={data.chart} />
            </ChartCard>

            <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white lg:min-h-0 lg:overflow-y-auto">
              <div className="sticky top-0 z-10 border-b border-[#f1f5f9] bg-white px-5 py-5 lg:py-3.5">
                <h2 className="font-semibold text-[#0f172a]">
                  Recent completed jobs
                </h2>
                <p className="mt-0.5 text-xs text-[#94a3b8]">
                  Latest work in this date range
                </p>
              </div>
              {data.completed.length ? (
                <div className="divide-y divide-[#f1f5f9]">
                  {[...data.completed]
                    .sort(
                      (a, b) =>
                        new Date(b.completion!.completedAt).getTime() -
                        new Date(a.completion!.completedAt).getTime(),
                    )
                    .slice(0, 6)
                    .map((order) => (
                      <Link
                        key={order.id}
              href={orderUrl(order)}
                        className="group flex items-center gap-3 px-5 py-4 lg:py-3 hover:bg-[#f8fbff]"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#eff6ff] text-[#2563eb]">
                          <CheckCircle2 className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-sm font-semibold text-[#1e293b]">
                            {order.customerName}
                          </strong>
                          <small className="text-xs text-[#94a3b8]">
                            {localDateTime.format(
                              new Date(order.completion!.completedAt),
                            )}
                          </small>
                        </span>
                        <span className="text-right">
                          <strong className="block text-sm text-[#047857]">
                            {money.format(order.completion!.finalAmount)}
                          </strong>
                          <ArrowUpRight className="ml-auto mt-1 size-3.5 text-[#94a3b8] group-hover:text-[#2563eb]" />
                        </span>
                      </Link>
                    ))}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-[#64748b]">
                  No completed jobs in this range.
                </div>
              )}
            </section>
          </div>
          <p className="mt-4 text-xs text-[#94a3b8] lg:mt-2 lg:shrink-0">
            Service value is an operational performance metric. It is not
            technician payroll, commission, or payout.
          </p>
        </>
      )}
    </div>
  );
}
