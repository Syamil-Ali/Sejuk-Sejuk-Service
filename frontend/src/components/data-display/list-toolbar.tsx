import type { ReactNode } from "react";

export function ListToolbar({
  title,
  resultCount,
  children,
}: {
  title?: string;
  resultCount?: number;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-end">
      {(title || resultCount !== undefined) && (
        <div className="mr-auto">
          <p className="text-sm font-medium text-slate-800">{title}</p>
          {resultCount !== undefined && (
            <p className="text-xs text-slate-500">
              {resultCount} result{resultCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:justify-end">
        {children}
      </div>
    </div>
  );
}
