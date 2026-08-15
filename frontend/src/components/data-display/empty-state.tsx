import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-40 place-items-center px-5 py-8 text-center">
      <div>
        {icon && (
          <span className="mx-auto mb-3 grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
            {icon}
          </span>
        )}
        <h3 className="font-medium text-slate-800">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
