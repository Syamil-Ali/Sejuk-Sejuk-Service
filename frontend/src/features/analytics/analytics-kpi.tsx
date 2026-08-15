import type { LucideIcon } from "lucide-react";

const tones = {
  slate: {
    icon: "border-[#e2e8f0] bg-[#f8fafc] text-[#64748b]",
    value: "text-[#1e293b]",
  },
  blue: {
    icon: "border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]",
    value: "text-[#1d4ed8]",
  },
  green: {
    icon: "border-[#a7f3d0] bg-[#ecfdf5] text-[#059669]",
    value: "text-[#047857]",
  },
  amber: {
    icon: "border-[#fde68a] bg-[#fffbeb] text-[#d97706]",
    value: "text-[#b45309]",
  },
};

export function AnalyticsKpi({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  compact = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  tone: keyof typeof tones;
  compact?: boolean;
}) {
  return (
    <article
      className={`rounded-xl border border-[#e2e8f0] bg-white ${compact ? "p-4 lg:p-3.5" : "p-5 lg:p-4"}`}
    >
      <span
        className={`mb-3 grid size-8 place-items-center rounded-lg border lg:mb-2 ${tones[tone].icon}`}
      >
        <Icon className="size-4" />
      </span>
      <p
        className={`${compact ? "text-[10px]" : "text-xs"} mb-1 font-semibold uppercase tracking-wider text-[#94a3b8]`}
      >
        {label}
      </p>
      <p
        className={`font-display ${compact ? "text-lg" : "text-xl"} font-semibold leading-tight ${tones[tone].value}`}
      >
        {value}
      </p>
      {detail && <p className="mt-1 text-xs text-[#94a3b8]">{detail}</p>}
    </article>
  );
}
