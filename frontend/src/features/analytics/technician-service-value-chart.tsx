"use client";

import { CircleDollarSign } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money } from "@/lib/utils";

type Entry = { date: string; jobs: number; earnings: number };

export function TechnicianServiceValueChart({ data }: { data: Entry[] }) {
  if (!data.length) {
    return (
      <div className="grid h-full place-items-center text-center">
        <div>
          <CircleDollarSign className="mx-auto size-8 text-[#cbd5e1]" />
          <p className="mt-2 text-sm font-medium text-body">
            No completed service value in this range
          </p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        barSize={42}
        margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#f1f5f9"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#94a3b8" }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#94a3b8" }}
          tickFormatter={(value) => `RM${value}`}
          width={72}
        />
        <Tooltip
          formatter={(value) => money.format(Number(value))}
          cursor={{ fill: "#f8fafc" }}
        />
        <Bar dataKey="earnings" fill="#2563eb" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
