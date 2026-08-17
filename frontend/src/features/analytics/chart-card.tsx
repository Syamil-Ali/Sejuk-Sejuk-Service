import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  description,
  badge,
  children,
  className,
  contentClassName,
  ariaLabel,
}: {
  title: string;
  description?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  ariaLabel?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden card lg:flex lg:min-h-0 lg:flex-col",
        className,
      )}
    >
      <header className="flex items-center justify-between border-b border-[#f1f5f9] px-6 py-5 lg:shrink-0 lg:py-3.5">
        <div>
          <h2 className="font-semibold text-ink">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted">{description}</p>
          )}
        </div>
        {badge}
      </header>
      <div
        className={cn(
          "h-[280px] px-4 py-5 lg:min-h-0 lg:flex-1 lg:py-3",
          contentClassName,
        )}
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </section>
  );
}
