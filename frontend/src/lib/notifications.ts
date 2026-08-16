import type { AppNotification, DemoUser } from "@/lib/domain";
import { encodeOrderId } from "@/lib/order-id";

export function visibleNotifications(
  notifications: AppNotification[],
  user: DemoUser,
) {
  const seen = new Set<string>();
  return notifications.filter((notification) => {
    if (
      notification.recipientId !== user.id &&
      notification.recipientRole !== user.role
    )
      return false;
    const key = notification.dedupeKey || notification.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function createManagerRescheduleNotifications({
  users,
  orderId,
  orderNo,
  technicianName,
  reason,
  from,
  to,
  createdAt,
}: {
  users: DemoUser[];
  orderId: string;
  orderNo: string;
  technicianName: string;
  reason: string;
  from?: string;
  to: string;
  createdAt: string;
}): AppNotification[] {
  const schedule = (value?: string) =>
    value
      ? new Intl.DateTimeFormat("en-MY", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Kuala_Lumpur",
        }).format(new Date(value))
      : "Not previously scheduled";

  return users
    .filter((user) => user.role === "manager")
    .map((manager) => ({
      id: crypto.randomUUID(),
      orderId,
      recipientId: manager.id,
      recipientRole: "manager",
      title: "Job postponed — manager attention",
      body: `${orderNo} was postponed by ${technicianName}. Reason: ${reason}. Previous: ${schedule(from)}. New: ${schedule(to)}.`,
      createdAt,
      category: "schedule",
      priority: "high",
      href: `/portal/orders/${encodeOrderId(orderId)}`,
      dedupeKey: `postponed:${orderId}:${createdAt}:${manager.id}`,
    }));
}
