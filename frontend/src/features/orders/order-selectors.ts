import type { DemoUser, ServiceOrder } from "@/lib/domain";

export function technicianName(order: ServiceOrder, users: DemoUser[]) {
  return (
    users.find((user) => user.id === order.technicianId)?.name || "Unassigned"
  );
}

export function orderSearchText(order: ServiceOrder, users: DemoUser[] = []) {
  return [
    order.orderNo,
    order.customerName,
    order.serviceType,
    order.address,
    order.problemDescription,
    technicianName(order, users),
  ]
    .join(" ")
    .toLowerCase();
}

export function matchesOrderQuery(
  order: ServiceOrder,
  query: string,
  users: DemoUser[] = [],
) {
  return (
    !query.trim() ||
    orderSearchText(order, users).includes(query.trim().toLowerCase())
  );
}

export function needsCorrection(order: ServiceOrder) {
  return (
    order.status === "In Progress" &&
    order.reviews.at(-1)?.outcome === "returned"
  );
}

export type ReviewState =
  "Needs review" | "Needs correction" | "Reviewed" | "Closed";

export function reviewState(order: ServiceOrder): ReviewState | null {
  if (order.status === "Job Done") return "Needs review";
  if (needsCorrection(order)) return "Needs correction";
  if (order.status === "Reviewed") return "Reviewed";
  if (order.status === "Closed") return "Closed";
  return null;
}

export function technicianJobAction(order: ServiceOrder) {
  if (order.status === "Assigned") return "Start";
  if (needsCorrection(order)) return "Correct";
  if (order.status === "In Progress") return "Continue";
  return "View";
}
