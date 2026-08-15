import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  blue: "border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]",
  amber: "border-[#fde68a] bg-[#fffbeb] text-[#d97706]",
  red: "border-[#fecaca] bg-[#fef2f2] text-[#dc2626]",
  green: "border-[#a7f3d0] bg-[#ecfdf5] text-[#059669]",
  slate: "border-[#e2e8f0] bg-[#f8fafc] text-[#64748b]",
};

export function QueueSummaryCard({
  icon: Icon,
  label,
  value,
  tone,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: keyof typeof tones;
  active?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-lg border",
          tones[tone],
        )}
      >
        <Icon className="size-5" />
      </span>
      <span>
        <strong className="font-display block text-2xl font-semibold leading-none text-[#0f172a]">
          {value}
        </strong>
        <span className="mt-1.5 block text-xs font-medium uppercase tracking-[.08em] text-[#94a3b8]">
          {label}
        </span>
      </span>
    </>
  );
  const classes = cn(
    "flex items-center gap-4 rounded-xl border bg-white p-4 text-left transition-colors",
    active
      ? "border-[#60a5fa] bg-[#f8fbff]"
      : "border-[#e2e8f0] hover:border-[#b8c7da]",
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={classes}
    >
      {content}
    </button>
  ) : (
    <div className={classes}>{content}</div>
  );
}
