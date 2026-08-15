import type { DemoUser, ServiceOrder } from "./domain";
import { malaysiaWeek } from "./dates";

export type AssistantIntent =
  | "technician-completions"
  | "technician-ranking"
  | "completed-today"
  | "current-workload"
  | "unassigned-orders"
  | "tomorrow-jobs"
  | "corrections"
  | "outstanding-payments"
  | "unsupported";
export interface AssistantResult {
  intent: AssistantIntent;
  answer: string;
  interpreted: string;
  count: number;
}

const techFrom = (question: string, users: DemoUser[]) =>
  users.find(
    (u) =>
      u.role === "technician" &&
      question.toLowerCase().includes(u.name.toLowerCase()),
  );
const completed = (orders: ServiceOrder[]) =>
  orders.filter((o) => o.completion);

export function authorizedAssistantOrders(
  orders: ServiceOrder[],
  user?: DemoUser,
) {
  return user?.role === "technician"
    ? orders.filter((order) => order.technicianId === user.id)
    : orders;
}

export function askOperations(
  question: string,
  orders: ServiceOrder[],
  users: DemoUser[],
  reference = new Date(),
  currentUser?: DemoUser,
): AssistantResult {
  orders = authorizedAssistantOrders(orders, currentUser);
  const q = question.trim().toLowerCase();
  if (
    !q ||
    q.length > 500 ||
    /\b(select|drop|delete|insert|update)\b.*\b(from|table|database)\b/i.test(q)
  )
    return {
      intent: "unsupported",
      answer:
        "I can only answer allow-listed operational questions. Try asking about completed jobs, technician rankings, today's completions, or current workload.",
      interpreted: "Unsupported request",
      count: 0,
    };
  if (
    currentUser?.role === "technician" &&
    users.some(
      (candidate) =>
        candidate.role === "technician" &&
        candidate.id !== currentUser.id &&
        q.includes(candidate.name.toLowerCase()),
    )
  )
    return {
      intent: "unsupported",
      answer: "I can only show jobs and activity assigned to you.",
      interpreted: "Blocked by technician data boundary",
      count: 0,
    };
  if (
    (q.includes("unassigned") || q.includes("not assigned")) &&
    currentUser?.role !== "technician"
  ) {
    const rows = orders.filter((order) => !order.technicianId);
    return {
      intent: "unassigned-orders",
      answer: rows.length
        ? rows
            .map((order) => `${order.orderNo} — ${order.customerName}`)
            .join("\n")
        : "No unassigned orders found.",
      interpreted: "Orders without a technician",
      count: rows.length,
    };
  }
  if (
    (q.includes("outstanding") || q.includes("unpaid")) &&
    currentUser?.role === "admin"
  ) {
    const rows = orders.filter(
      (order) =>
        order.completion &&
        order.completion.finalAmount -
          (order.payments?.reduce((sum, p) => sum + p.amount, 0) ??
            order.completion.payment?.amount ??
            0) >
          0,
    );
    return {
      intent: "outstanding-payments",
      answer: rows.length
        ? rows
            .map(
              (order) =>
                `${order.orderNo} — RM${Math.max(order.completion!.finalAmount - (order.payments?.reduce((sum, p) => sum + p.amount, 0) ?? order.completion?.payment?.amount ?? 0), 0).toFixed(2)} outstanding`,
            )
            .join("\n")
        : "No outstanding customer balances found.",
      interpreted: "Completed orders with an outstanding balance",
      count: rows.length,
    };
  }
  if (q.includes("tomorrow") && currentUser?.role === "technician") {
    const tomorrow = new Date(reference);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kuala_Lumpur",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(tomorrow);
    const rows = orders.filter(
      (order) =>
        order.scheduledAt &&
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kuala_Lumpur",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(order.scheduledAt)) === key,
    );
    return {
      intent: "tomorrow-jobs",
      answer: rows.length
        ? rows
            .map(
              (order) =>
                `${order.orderNo} — ${order.customerName}, ${order.address}`,
            )
            .join("\n")
        : "You have no jobs scheduled tomorrow.",
      interpreted: `Your jobs tomorrow (${key})`,
      count: rows.length,
    };
  }
  if (
    (q.includes("correction") || q.includes("redo")) &&
    currentUser?.role === "technician"
  ) {
    const rows = orders.filter(
      (order) =>
        order.status === "In Progress" &&
        order.reviews.at(-1)?.outcome === "returned",
    );
    return {
      intent: "corrections",
      answer: rows.length
        ? rows
            .map(
              (order) =>
                `${order.orderNo} — ${order.reviews.at(-1)?.notes || "Correction requested"}`,
            )
            .join("\n")
        : "You have no jobs awaiting correction.",
      interpreted: "Your returned jobs",
      count: rows.length,
    };
  }
  if (q.includes("workload") || q.includes("overloaded")) {
    const rows = users
      .filter((u) => u.role === "technician")
      .map((u) => ({
        name: u.name,
        count: orders.filter(
          (o) =>
            o.technicianId === u.id &&
            ["Assigned", "In Progress"].includes(o.status),
        ).length,
      }))
      .sort((a, b) => b.count - a.count);
    return {
      intent: "current-workload",
      answer:
        rows
          .map(
            (r) =>
              `${r.name}: ${r.count} active job${r.count === 1 ? "" : "s"}`,
          )
          .join("\n") || "No active technician workloads found.",
      interpreted: "Current Assigned and In Progress jobs",
      count: rows.length,
    };
  }
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(reference);
  if (
    q.includes("today") &&
    (q.includes("how many") || q.includes("completed"))
  ) {
    const rows = completed(orders).filter(
      (o) =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kuala_Lumpur",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(o.completion!.completedAt)) === today,
    );
    return {
      intent: "completed-today",
      answer: `${rows.length} job${rows.length === 1 ? " was" : "s were"} completed today.${rows.length ? ` ${rows.map((o) => o.orderNo).join(", ")}.` : ""}`,
      interpreted: `Today (${today}, Malaysia time)`,
      count: rows.length,
    };
  }
  if (q.includes("most") || q.includes("ranking") || q.includes("leader")) {
    const { from, toExclusive } = malaysiaWeek(reference);
    const rows = users
      .filter((u) => u.role === "technician")
      .map((u) => {
        const jobs = completed(orders).filter(
          (o) =>
            o.technicianId === u.id &&
            new Date(o.completion!.completedAt) >= from &&
            new Date(o.completion!.completedAt) < toExclusive,
        );
        return {
          name: u.name,
          jobs: jobs.length,
          amount: jobs.reduce((s, o) => s + o.completion!.finalAmount, 0),
        };
      })
      .sort((a, b) => b.jobs - a.jobs || b.amount - a.amount);
    return {
      intent: "technician-ranking",
      answer: rows
        .map(
          (r, i) =>
            `${i + 1}. ${r.name} — ${r.jobs} jobs, RM${r.amount.toFixed(2)}`,
        )
        .join("\n"),
      interpreted: "Current Malaysian calendar week",
      count: rows.length,
    };
  }
  const tech = techFrom(q, users);
  if (tech && (q.includes("complete") || q.includes("job"))) {
    const { from, toExclusive } = malaysiaWeek(reference);
    const rows = completed(orders).filter(
      (o) =>
        o.technicianId === tech.id &&
        new Date(o.completion!.completedAt) >= from &&
        new Date(o.completion!.completedAt) < toExclusive,
    );
    return {
      intent: "technician-completions",
      answer: rows.length
        ? `${tech.name} completed ${rows.length} job${rows.length === 1 ? "" : "s"}:\n${rows.map((o) => `${o.orderNo} — ${o.serviceType}`).join("\n")}`
        : `No completed jobs were found for ${tech.name} in the interpreted period.`,
      interpreted: "Current Malaysian calendar week",
      count: rows.length,
    };
  }
  return {
    intent: "unsupported",
    answer:
      "I couldn't map that to a supported query. Try “How many jobs were completed today?”, “Who completed the most jobs this week?”, or “Show Ali's completed jobs.”",
    interpreted: "Unsupported request",
    count: 0,
  };
}
