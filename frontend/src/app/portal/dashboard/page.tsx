"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
} from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import { malaysiaWeek } from "@/lib/dates";
import { money } from "@/lib/utils";
import {
  AnalyticsKpi,
  DateRangeFilter,
  Leaderboard,
  managerPerformance,
} from "@/features/analytics";
import { ChartLoadingPlaceholder } from "@/features/analytics/chart-loading-placeholder";

const ManagerCompletedJobsChart = dynamic(
  () =>
    import("@/features/analytics/manager-completed-jobs-chart").then(
      (module) => module.ManagerCompletedJobsChart,
    ),
  { ssr: false, loading: () => <ChartLoadingPlaceholder /> },
);

const iso = (date: Date) => date.toISOString().slice(0, 10);

export default function Dashboard() {
  const { user, users, orders } = useDemo();
  const week = malaysiaWeek();
  const [from, setFrom] = useState(iso(week.from));
  const [to, setTo] = useState(
    iso(new Date(week.toExclusive.getTime() - 86400000)),
  );

  const data = useMemo(
    () => managerPerformance(orders, users, from, to),
    [from, to, orders, users],
  );

  if (user?.role !== "manager")
    return <p className="card p-6">Manager access required.</p>;

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
          Performance overview
        </h1>
        <p className="mt-2 text-sm text-[#64748b] lg:mt-1">
          A shared date range keeps every card, chart, and ranking aligned.
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
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5 lg:mb-4 lg:shrink-0">
            <AnalyticsKpi
              icon={BriefcaseBusiness}
              label="Completed jobs"
              value={String(data.jobs)}
              tone="slate"
            />
            <AnalyticsKpi
              icon={CircleDollarSign}
              label="Final amount"
              value={money.format(data.total)}
              tone="blue"
            />
            <AnalyticsKpi
              icon={CheckCircle2}
              label="Payments"
              value={money.format(data.paid)}
              detail="collected"
              tone="green"
            />
            <AnalyticsKpi
              icon={AlertTriangle}
              label="Outstanding"
              value={money.format(data.outstanding)}
              detail="unpaid"
              tone="amber"
            />
            <AnalyticsKpi
              icon={CalendarClock}
              label="Postponements"
              value={String(data.postponed)}
              tone="slate"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-3">
            <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white lg:col-span-2 lg:flex lg:min-h-0 lg:flex-col">
              <div className="flex items-center justify-between border-b border-[#f1f5f9] px-6 py-5 lg:shrink-0 lg:py-3.5">
                <div>
                  <h2 className="font-semibold text-[#0f172a]">
                    Jobs completed by technician
                  </h2>
                  <p className="mt-0.5 text-xs text-[#94a3b8]">
                    {from} → {to}
                  </p>
                </div>
                <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-semibold text-[#64748b]">
                  Range
                </span>
              </div>
              <div
                className="h-[280px] px-4 py-5 lg:min-h-0 lg:flex-1 lg:py-3"
                aria-label="Technician completed job chart"
              >
                <ManagerCompletedJobsChart data={data.techs} />
              </div>
            </section>

            <Leaderboard entries={data.techs} />
          </div>
        </>
      )}
    </div>
  );
}
