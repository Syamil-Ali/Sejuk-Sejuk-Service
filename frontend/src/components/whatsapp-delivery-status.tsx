"use client";

import { useEffect, useState } from "react";
import { CheckCheck, CircleAlert, LoaderCircle } from "lucide-react";

/**
 * Shows the latest WhatsApp delivery status for an order. Renders nothing
 * until a delivery record exists, so it stays invisible until a provider is
 * configured and messages are actually sent.
 */
export function WhatsAppDeliveryStatus({ orderId }: { orderId: string }) {
  const [record, setRecord] = useState<
    { status: string; updated_at?: string } | null | "loading"
  >("loading");
  useEffect(() => {
    let active = true;
    fetch(`/api/whatsapp/status?orderId=${encodeURIComponent(orderId)}`)
      .then((response) => response.json())
      .then((data: { status: string; updated_at?: string } | null) => {
        if (active) setRecord(data);
      })
      .catch(() => {
        if (active) setRecord(null);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  if (record === "loading" || record === null) return null;
  const labels: Record<string, string> = {
    queued: "Queued",
    sent: "Sent",
    delivered: "Delivered",
    read: "Read",
    failed: "Failed",
  };
  const label = labels[record.status] ?? record.status;
  const done = record.status === "delivered" || record.status === "read";
  const failed = record.status === "failed";
  return (
    <span
      className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
        done
          ? "bg-green-50 text-green-700"
          : failed
            ? "bg-red-50 text-red-700"
            : "bg-slate-100 text-slate-600"
      }`}
    >
      {done ? (
        <CheckCheck className="size-3" />
      ) : failed ? (
        <CircleAlert className="size-3" />
      ) : (
        <LoaderCircle className="size-3" />
      )}
      WhatsApp {label}
    </span>
  );
}
