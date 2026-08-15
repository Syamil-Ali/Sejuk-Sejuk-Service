"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Entry = { name: string; jobs: number };

export function ManagerCompletedJobsChart({ data }: { data: Entry[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        barSize={36}
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#f1f5f9"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#94a3b8" }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#94a3b8" }}
          allowDecimals={false}
          width={28}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="jobs" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={entry.jobs > 0 ? "#0f172a" : "#e2e8f0"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0].value || 0);
  return (
    <div className="rounded-lg bg-[#0f172a] px-3 py-2 text-xs text-white">
      <p className="mb-0.5 font-semibold">{label}</p>
      <p className="text-[#cbd5e1]">
        {value} job{value === 1 ? "" : "s"}
      </p>
    </div>
  );
}
