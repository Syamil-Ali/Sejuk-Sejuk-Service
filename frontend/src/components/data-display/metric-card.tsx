import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  slate: "border-slate-200 bg-slate-50 text-slate-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
};

export type MetricTone = keyof typeof tones;

export function MetricCard({
  label,
  value,
  detail,
  icon,
  tone = "slate",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: MetricTone;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "rounded-xl border bg-white p-4",
        tones[tone].split(" ")[0],
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            "mb-3 grid size-8 place-items-center rounded-lg",
            tones[tone],
          )}
        >
          {icon}
        </span>
      )}
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-semibold text-slate-900">
        {value}
      </p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </article>
  );
}
