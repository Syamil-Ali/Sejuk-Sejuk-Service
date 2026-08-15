import type { DemoUser, ServiceOrder } from "@/lib/domain";
import { inclusiveRange } from "@/lib/dates";
import { orderPaymentSummary } from "@/lib/payments";

export function managerPerformance(
  orders: ServiceOrder[],
  users: DemoUser[],
  from: string,
  to: string,
) {
  let range;
  try {
    range = inclusiveRange(from, to);
  } catch {
    return null;
  }
  const done = orders.filter(
    (order) =>
      order.completion &&
      new Date(order.completion.completedAt) >= range.from &&
      new Date(order.completion.completedAt) < range.toExclusive,
  );
  const total = done.reduce(
    (sum, order) => sum + order.completion!.finalAmount,
    0,
  );
  const paid = done.reduce(
    (sum, order) => sum + orderPaymentSummary(order).received,
    0,
  );
  const techs = users
    .filter((user) => user.role === "technician")
    .map((user) => {
      const jobs = done.filter((order) => order.technicianId === user.id);
      return {
        name: user.name,
        initials: user.name.slice(0, 2).toUpperCase(),
        jobs: jobs.length,
        amount: jobs.reduce(
          (sum, order) => sum + order.completion!.finalAmount,
          0,
        ),
        postponed: orders.reduce(
          (sum, order) =>
            sum +
            (order.technicianId === user.id
              ? order.scheduleEvents.filter(
                  (event) =>
                    new Date(event.at) >= range.from &&
                    new Date(event.at) < range.toExclusive,
                ).length
              : 0),
          0,
        ),
      };
    })
    .sort(
      (a, b) =>
        b.jobs - a.jobs || b.amount - a.amount || a.name.localeCompare(b.name),
    );
  return {
    jobs: done.length,
    total,
    paid,
    outstanding: Math.max(total - paid, 0),
    postponed: techs.reduce((sum, tech) => sum + tech.postponed, 0),
    techs,
  };
}

export function technicianPerformance(
  orders: ServiceOrder[],
  technicianId: string,
  from: string,
  to: string,
) {
  let range;
  try {
    range = inclusiveRange(from, to);
  } catch {
    return null;
  }
  const mine = orders.filter((order) => order.technicianId === technicianId);
  const completed = mine.filter(
    (order) =>
      order.completion &&
      new Date(order.completion.completedAt) >= range.from &&
      new Date(order.completion.completedAt) < range.toExclusive,
  );
  const earnings = completed.reduce(
    (sum, order) => sum + order.completion!.finalAmount,
    0,
  );
  const paid = completed.reduce(
    (sum, order) => sum + orderPaymentSummary(order).received,
    0,
  );
  const postponed = mine.reduce(
    (sum, order) =>
      sum +
      order.scheduleEvents.filter(
        (event) =>
          new Date(event.at) >= range.from &&
          new Date(event.at) < range.toExclusive,
      ).length,
    0,
  );
  const byDay = new Map<
    string,
    { date: string; jobs: number; earnings: number }
  >();
  completed.forEach((order) => {
    const date = new Date(order.completion!.completedAt).toLocaleDateString(
      "en-MY",
      { day: "2-digit", month: "short", timeZone: "Asia/Kuala_Lumpur" },
    );
    const current = byDay.get(date) || { date, jobs: 0, earnings: 0 };
    current.jobs += 1;
    current.earnings += order.completion!.finalAmount;
    byDay.set(date, current);
  });
  return {
    assigned: mine.filter((order) =>
      ["Assigned", "In Progress"].includes(order.status),
    ).length,
    completed,
    earnings,
    paid,
    outstanding: Math.max(earnings - paid, 0),
    postponed,
    chart: [...byDay.values()],
  };
}
