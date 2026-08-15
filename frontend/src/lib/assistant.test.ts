import { describe, expect, it } from "vitest";
import { askOperations, authorizedAssistantOrders } from "./assistant";
import { createSeedOrders, demoUsers } from "./demo-data";

const orders = createSeedOrders();
const reference = new Date();
describe("controlled operations assistant", () => {
  it("answers current workload", () =>
    expect(
      askOperations(
        "Who has the highest workload?",
        orders,
        demoUsers,
        reference,
      ).intent,
    ).toBe("current-workload"));
  it("answers technician completions", () =>
    expect(
      askOperations(
        "What jobs did Bala complete?",
        orders,
        demoUsers,
        reference,
      ).intent,
    ).toBe("technician-completions"));
  it("answers ranking", () =>
    expect(
      askOperations(
        "Who completed the most jobs this week?",
        orders,
        demoUsers,
        reference,
      ).intent,
    ).toBe("technician-ranking"));
  it("answers today's count", () =>
    expect(
      askOperations(
        "How many jobs were completed today?",
        orders,
        demoUsers,
        reference,
      ).intent,
    ).toBe("completed-today"));
  it("refuses arbitrary SQL", () =>
    expect(
      askOperations("SELECT * FROM users", orders, demoUsers, reference).intent,
    ).toBe("unsupported"));
  it("does not invent unsupported answers", () =>
    expect(
      askOperations("What is our tax liability?", orders, demoUsers, reference)
        .count,
    ).toBe(0));
  it("returns a grounded empty result", () =>
    expect(
      askOperations("What jobs did Ali complete?", [], demoUsers, reference)
        .answer,
    ).toContain("No completed jobs"));
  it("rejects an unknown technician instead of guessing", () =>
    expect(
      askOperations(
        "What jobs did Zain complete?",
        orders,
        demoUsers,
        reference,
      ).intent,
    ).toBe("unsupported"));
  it("grounds workload names and counts in supplied data", () => {
    const result = askOperations(
      "Show current workload",
      orders,
      demoUsers,
      reference,
    );
    expect(result.answer).toContain("Ali: 1 active job");
    expect(result.count).toBe(4);
  });
});

describe("role-aware assistant", () => {
  it("scopes technicians to their own orders", () => {
    const tech = demoUsers.find((u) => u.role === "technician")!;
    expect(
      authorizedAssistantOrders(orders, tech).every(
        (order) => order.technicianId === tech.id,
      ),
    ).toBe(true);
  });
  it("answers admin unassigned and payment questions", () => {
    const admin = demoUsers.find((u) => u.role === "admin")!;
    expect(
      askOperations(
        "Which orders are unassigned?",
        orders,
        demoUsers,
        reference,
        admin,
      ).intent,
    ).toBe("unassigned-orders");
    expect(
      askOperations(
        "Show outstanding payments",
        orders,
        demoUsers,
        reference,
        admin,
      ).intent,
    ).toBe("outstanding-payments");
  });
  it("blocks technicians from querying coworkers", () => {
    const tech = demoUsers.find((u) => u.role === "technician")!;
    const other = demoUsers.find(
      (u) => u.role === "technician" && u.id !== tech.id,
    )!;
    expect(
      askOperations(
        `Show ${other.name}'s jobs`,
        orders,
        demoUsers,
        reference,
        tech,
      ).interpreted,
    ).toContain("Blocked");
  });
});
