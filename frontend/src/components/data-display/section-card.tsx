import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionCardProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: SectionCardProps) {
  const hasHeader = title || description || action;
  return (
    <section className={cn("card overflow-hidden", className)}>
      {hasHeader && (
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            {title && <h2 className="font-semibold text-slate-900">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className={cn("p-5 sm:p-6", contentClassName)}>{children}</div>
    </section>
  );
}
