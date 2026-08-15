import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FormField({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
  labelClassName,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={cn(
          "mb-1.5 block text-xs font-medium text-slate-600",
          labelClassName,
        )}
      >
        {label}
        {required && (
          <span className="ml-1 text-red-600" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {(error || hint) && (
        <p
          id={`${id}-description`}
          className={cn(
            "mt-1.5 text-xs",
            error ? "text-red-700" : "text-slate-500",
          )}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
