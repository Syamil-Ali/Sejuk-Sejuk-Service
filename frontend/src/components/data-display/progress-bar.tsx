import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  label,
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const normalized = Math.min(100, Math.max(0, value));
  return (
    <div className={className}>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>{label}</span>
          <span>{Math.round(normalized)}%</span>
        </div>
      )}
      <div
        className="h-1.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(normalized)}
      >
        <div
          className={cn(
            "h-full rounded-full bg-blue-600 transition-[width] duration-300",
          )}
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  );
}
