import Link from "next/link";
import { CalendarDays, MapPin, Wrench } from "lucide-react";
import type { ServiceOrder } from "@/lib/domain";
import { orderUrl } from "@/lib/order-id";
import { localDateTime, money } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

export function OrderCard({
  order,
  compact = false,
}: {
  order: ServiceOrder;
  compact?: boolean;
}) {
  return (
    <Link
      href={orderUrl(order)}
      className="card group relative block overflow-hidden bg-white p-5 transition duration-200 hover:scale-[1.02] hover:bg-blue-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-code text-xs font-bold tracking-wide text-teal-700">
            {order.orderNo}
          </p>
          <h3 className="mt-1 text-base font-extrabold tracking-tight text-ink">
            {order.customerName}
          </h3>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="mt-5 space-y-2.5 text-sm leading-5 text-body">
        <p className="flex items-start gap-2">
          <Wrench className="mt-0.5 size-4 shrink-0 text-teal-700" />
          {order.serviceType} · {money.format(order.quotedPrice)}
        </p>
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-teal-700" />
          <span className={compact ? "line-clamp-1" : ""}>{order.address}</span>
        </p>
        {order.scheduledAt && (
          <p className="flex items-start gap-2">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-teal-700" />
            {localDateTime.format(new Date(order.scheduledAt))}
          </p>
        )}
      </div>
      <p className="mt-5 flex items-center justify-between pt-4 text-sm font-black text-teal-700">
        View service job{" "}
        <span aria-hidden className="transition group-hover:translate-x-1">
          →
        </span>
      </p>
    </Link>
  );
}
