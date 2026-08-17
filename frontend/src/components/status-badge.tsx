import type { OrderStatus } from "@/lib/domain";
import { cn } from "@/lib/utils";

const styles: Record<OrderStatus, string> = {
  New: "bg-[#eef3f7] text-[#526b7a] before:bg-[#8290a3]",
  Assigned: "bg-[#eaf2ff] text-[#1859c9] before:bg-[#3b82f6]",
  "In Progress": "bg-[#fff7e6] text-[#b45e00] before:bg-[#f59e0b]",
  "Job Done": "bg-[#e8fbf3] text-[#007e57] before:bg-[#10b981]",
  Reviewed: "bg-[#eaf2ff] text-[#1859c9] before:bg-[#3b82f6]",
  Closed: "bg-[#e8fbf3] text-[#007e57] before:bg-[#10b981]",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium before:mr-1 before:size-1.5 before:rounded-full before:content-[''] lg:px-3 lg:py-1 lg:text-xs",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}
