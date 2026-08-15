import { describe, expect, it } from "vitest";
import type { ServiceOrder } from "./domain";
import {
  normalizePaymentNotes,
  orderPaymentSummary,
  validatePaymentCollection,
} from "./payments";

function order(overrides: Partial<ServiceOrder> = {}): ServiceOrder {
  return {
    id: "order-1",
    orderNo: "ORDER000001",
    customerName: "Customer",
    customerPhone: "60000000000",
    address: "Address",
    problemDescription: "Problem",
    serviceType: "Repair",
    quotedPrice: 260,
    branch: "HQ",
    status: "Closed",
    version: 1,
    createdAt: "2026-08-12T00:00:00.000Z",
    reviews: [],
    scheduleEvents: [],
    audit: [],
    checklist: [],
    completion: {
      workDone: "Repaired",
      extraCharges: 0,
      finalAmount: 260,
      completedAt: "2026-08-12T01:00:00.000Z",
      evidence: [],
    },
    ...overrides,
  };
}

describe("orderPaymentSummary", () => {
  it("marks an order without payment as unpaid", () => {
    expect(orderPaymentSummary(order())).toMatchObject({
      received: 0,
      outstanding: 260,
      status: "Unpaid",
    });
  });

  it("marks a partial payment with its remaining balance", () => {
    expect(
      orderPaymentSummary(
        order({
          payments: [
            {
              id: "p1",
              amount: 100,
              method: "Cash",
              receivedAt: "2026-08-12T02:00:00.000Z",
              recordedBy: "Nadia",
              source: "admin",
            },
          ],
        }),
      ),
    ).toMatchObject({
      received: 100,
      outstanding: 160,
      status: "Partially paid",
    });
  });

  it("totals multiple payments", () => {
    expect(
      orderPaymentSummary(
        order({
          payments: [
            {
              id: "p1",
              amount: 100,
              method: "Cash",
              receivedAt: "2026-08-12T02:00:00.000Z",
              recordedBy: "John",
              source: "field",
            },
            {
              id: "p2",
              amount: 60,
              method: "Bank Transfer",
              receivedAt: "2026-08-13T02:00:00.000Z",
              recordedBy: "Nadia",
              source: "admin",
            },
          ],
        }),
      ),
    ).toMatchObject({
      received: 160,
      outstanding: 100,
      status: "Partially paid",
    });
  });

  it("marks a fully settled order as paid", () => {
    expect(
      orderPaymentSummary(
        order({
          payments: [
            {
              id: "p1",
              amount: 260,
              method: "Card",
              receivedAt: "2026-08-12T02:00:00.000Z",
              recordedBy: "Nadia",
              source: "admin",
            },
          ],
        }),
      ),
    ).toMatchObject({ received: 260, outstanding: 0, status: "Paid" });
  });

  it("normalizes a legacy completion payment without double counting", () => {
    const legacy = order();
    legacy.completion!.payment = {
      amount: 100,
      method: "Cash",
      receivedAt: "2026-08-12T02:00:00.000Z",
    };
    expect(orderPaymentSummary(legacy)).toMatchObject({
      received: 100,
      outstanding: 160,
      status: "Partially paid",
    });
  });
});

describe("validatePaymentCollection", () => {
  it("accepts a partial or exact settlement", () => {
    expect(validatePaymentCollection(100, " Cash ", 160)).toBe("Cash");
    expect(validatePaymentCollection(160, "Card", 160)).toBe("Card");
  });

  it("rejects zero, negative, methodless, and excessive payments", () => {
    expect(() => validatePaymentCollection(0, "Cash", 160)).toThrow();
    expect(() => validatePaymentCollection(-1, "Cash", 160)).toThrow();
    expect(() => validatePaymentCollection(10, " ", 160)).toThrow();
    expect(() => validatePaymentCollection(161, "Cash", 160)).toThrow(
      /cannot exceed/i,
    );
  });
});

describe("normalizePaymentNotes", () => {
  it("trims meaningful payment-arrangement notes", () => {
    expect(normalizePaymentNotes("  Balance due next month.  ")).toBe(
      "Balance due next month.",
    );
  });

  it("omits blank or missing notes", () => {
    expect(normalizePaymentNotes("   ")).toBeUndefined();
    expect(normalizePaymentNotes()).toBeUndefined();
  });
});
