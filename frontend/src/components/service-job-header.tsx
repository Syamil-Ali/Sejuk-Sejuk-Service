"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import type { ServiceOrder } from "@/lib/domain";
import { money } from "@/lib/utils";

const steps = [
  "New",
  "Assigned",
  "In Progress",
  "Job Done",
  "Reviewed",
  "Closed",
] as const;

export function ServiceJobHeader({
  order,
  technician,
}: {
  order: ServiceOrder;
  technician?: string;
}) {
  const current = Math.max(0, steps.indexOf(order.status));

  return (
    <>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/portal/orders"
            className="text-[10px] font-medium uppercase tracking-[.14em] text-[#60738f] hover:text-[#2563eb]"
          >
            {order.serviceType} ·{" "}
            <span className="font-code">{order.orderNo}</span>
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-.025em] text-[#0f1f38]">
            {order.customerName}
          </h1>
          <p className="mt-1 text-sm text-[#60738f]">
            {order.problemDescription}
          </p>
        </div>
        <div className="flex divide-x divide-[#dfe5ec] pt-2">
          <HeaderFact
            label="Quotation"
            value={money.format(order.quotedPrice)}
          />
          <HeaderFact
            label="Technician"
            value={technician || "Unassigned"}
            technician
          />
        </div>
      </header>

      <section className="mb-6 overflow-x-auto rounded-xl border border-[#d7e0ec] bg-white px-5 py-4">
        <p className="mb-4 text-[10px] font-medium uppercase tracking-[.12em] text-[#7487a2]">
          Service journey
        </p>
        <ol className="grid min-w-[620px] grid-cols-6">
          {steps.map((step, index) => {
            const complete = index < current;
            const active = index === current;
            return (
              <li
                key={step}
                className="relative flex flex-col items-center text-center"
              >
                <span
                  className={`absolute left-0 right-0 top-4 h-0.5 ${index <= current ? "bg-[#14233b]" : "bg-[#d7e0ec]"} ${index === 0 ? "left-1/2" : ""} ${index === steps.length - 1 ? "right-1/2" : ""}`}
                />
                <span
                  className={`relative z-10 grid size-8 place-items-center rounded-full border-2 text-xs font-bold ${
                    complete
                      ? "border-[#14233b] bg-[#14233b] text-white"
                      : active
                        ? "border-[#2563eb] bg-[#2563eb] text-white"
                        : "border-[#cfd9e6] bg-white text-[#8da0b8]"
                  }`}
                >
                  {complete ? (
                    <Check className="size-3" strokeWidth={2.5} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={`mt-2 text-[10px] ${active ? "font-medium text-[#2563eb]" : "text-[#7487a2]"}`}
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}

function HeaderFact({
  label,
  value,
  technician = false,
}: {
  label: string;
  value: string;
  technician?: boolean;
}) {
  return (
    <div className="min-w-28 px-4 text-right first:pl-0">
      <p className="text-[9px] font-medium uppercase tracking-[.1em] text-[#8290a3]">
        {label}
      </p>
      <p className="mt-1 flex items-center justify-end gap-2 text-sm font-semibold text-[#0f1f38]">
        {technician && (
          <span className="grid size-6 place-items-center rounded-full bg-[#14233b] text-[10px] text-white">
            {value.charAt(0)}
          </span>
        )}
        {value}
      </p>
    </div>
  );
}
