import { Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";

export const COMPANY_NAME = "Sejuk Sejuk Service Sdn Bhd";

export function CompanyBrand({
  className,
  iconClassName,
  nameClassName,
  subtitle,
  shortName = false,
}: {
  className?: string;
  iconClassName?: string;
  nameClassName?: string;
  subtitle?: string;
  shortName?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl bg-[#193a63] text-white",
          iconClassName,
        )}
        aria-hidden="true"
      >
        <Snowflake className="size-5" strokeWidth={2.25} />
      </span>
      <span className="min-w-0">
        <strong
          className={cn(
            "block text-sm font-semibold leading-tight text-[#10213a]",
            nameClassName,
          )}
        >
          {shortName ? "Sejuk Sejuk" : COMPANY_NAME}
        </strong>
        {subtitle && <small className="mt-0.5 block text-xs opacity-65">{subtitle}</small>}
      </span>
    </div>
  );
}
