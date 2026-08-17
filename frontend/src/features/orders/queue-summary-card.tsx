import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  blue: "border-[#bfdbfe] bg-accent-soft text-accent",
  amber: "border-[#fde68a] bg-[#fffbeb] text-[#d97706]",
  red: "border-[#fecaca] bg-[#fef2f2] text-danger",
  green: "border-[#a7f3d0] bg-[#ecfdf5] text-[#059669]",
  slate: "border-line bg-canvas text-body",
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
          "grid size-9 shrink-0 place-items-center rounded-lg border lg:size-10",
          tones[tone],
        )}
      >
        <Icon className="size-4 lg:size-5" />
      </span>
      <span>
        <strong className="font-display block text-xl font-semibold leading-none text-ink lg:text-2xl">
          {value}
        </strong>
        <span className="mt-1 block text-[10px] font-medium uppercase tracking-[.06em] text-muted lg:mt-1.5 lg:text-xs lg:tracking-[.08em]">
          {label}
        </span>
      </span>
    </>
  );
  const classes = cn(
    "flex items-center gap-3 rounded-xl border bg-white p-3.5 text-left transition-colors lg:gap-4 lg:p-4",
    active
      ? "border-[#60a5fa] bg-[#f8fbff]"
      : "border-line hover:border-[#b8c7da]",
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
