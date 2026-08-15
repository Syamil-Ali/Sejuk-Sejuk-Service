import { describe, expect, it } from "vitest";
import type { DemoUser, ServiceOrder } from "@/lib/domain";
import {
  managerPerformance,
  technicianPerformance,
} from "./analytics-selectors";

const tech: DemoUser = {
  id: "tech-1",
  name: "Yusoff",
  role: "technician",
  branch: "KL",
};
const completedOrder: ServiceOrder = {
  id: "order-1",
  orderNo: "ORDER1",
  customerName: "Kumar",
  customerPhone: "1",
  address: "Penang",
  problemDescription: "Install",
  serviceType: "Installation",
  quotedPrice: 1200,
  technicianId: tech.id,
  branch: "KL",
  scheduledAt: "2026-08-10T01:00:00Z",
  status: "Closed",
  version: 1,
  createdAt: "2026-08-09T01:00:00Z",
  reviews: [],
  checklist: [],
  audit: [],
  scheduleEvents: [
    {
      at: "2026-08-10T02:00:00Z",
      to: "2026-08-10T03:00:00Z",
      reason: "Customer request",
      actor: "Yusoff",
    },
  ],
  completion: {
    workDone: "Installed",
    extraCharges: 250,
    finalAmount: 1450,
    completedAt: "2026-08-10T04:00:00Z",
    evidence: [],
  },
  payments: [
    {
      id: "p1",
      amount: 1000,
      method: "Cash",
      receivedAt: "2026-08-10T04:00:00Z",
      recordedBy: "Yusoff",
      source: "field",
    },
  ],
};

describe("analytics selectors", () => {
  it("attributes manager totals and ranking to the completion range", () => {
    const result = managerPerformance(
      [completedOrder],
      [tech],
      "2026-08-09",
      "2026-08-15",
    )!;
    expect(result).toMatchObject({
      jobs: 1,
      total: 1450,
      paid: 1000,
      outstanding: 450,
      postponed: 1,
    });
    expect(result.techs[0]).toMatchObject({
      name: "Yusoff",
      jobs: 1,
      amount: 1450,
    });
  });

  it("keeps technician data scoped and supports empty datasets", () => {
    const result = technicianPerformance(
      [completedOrder],
      tech.id,
      "2026-08-09",
      "2026-08-15",
    )!;
    expect(result).toMatchObject({
      assigned: 0,
      earnings: 1450,
      paid: 1000,
      outstanding: 450,
      postponed: 1,
    });
    expect(result.completed).toHaveLength(1);
    expect(result.chart[0]).toMatchObject({ jobs: 1, earnings: 1450 });
    expect(
      technicianPerformance(
        [completedOrder],
        "other",
        "2026-08-09",
        "2026-08-15",
      )?.completed,
    ).toEqual([]);
  });

  it("rejects invalid date ranges", () => {
    expect(
      managerPerformance([], [tech], "2026-08-15", "2026-08-09"),
    ).toBeNull();
  });
});
