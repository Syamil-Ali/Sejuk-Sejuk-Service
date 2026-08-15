import { describe, expect, it } from "vitest";
import { describeAuditEvent } from "./audit-events";

const context = {
  technicianName: (id: string) =>
    id === "20000000-0000-0000-0000-000000000004" ? "John" : undefined,
  checklistItemTitle: (id: string) =>
    id === "item-1" ? "Clean filters" : undefined,
};

describe("describeAuditEvent", () => {
  it("turns lifecycle rows into friendly labels without raw JSON", () => {
    const event = describeAuditEvent(
      {
        action: "order.completed",
        before_values: {
          status: "In Progress",
          version: 5,
          order_no: "ORDER001237",
          customer_name: "Mei Ling",
        },
        after_values: {
          status: "Job Done",
          version: 6,
          order_no: "ORDER001237",
          customer_name: "Mei Ling",
        },
      },
      context,
    );
    expect(event.action).toBe("Job completed");
    expect(event.detail).toBe("Job marked done.");
    expect(event.changes).toEqual([{ label: "Status", before: "In Progress", after: "Job Done" }]);
    expect(JSON.stringify(event)).not.toContain("ORDER001237");
  });

  it("resolves assigned technician names in summaries and diffs", () => {
    const event = describeAuditEvent(
      {
        action: "order.assigned",
        before_values: { status: "New", assigned_technician_id: null },
        after_values: {
          status: "Assigned",
          assigned_technician_id: "20000000-0000-0000-0000-000000000004",
        },
      },
      context,
    );
    expect(event.action).toBe("Order assigned");
    expect(event.detail).toBe("Assigned to John.");
    expect(event.changes).toEqual([
      { label: "Status", before: "New", after: "Assigned" },
      { label: "Technician", after: "John" },
    ]);
  });

  it("summarizes checklist updates with item titles instead of ids", () => {
    const event = describeAuditEvent(
      {
        action: "Checklist item updated",
        after_values: { item_id: "item-1", completed: true, note: null },
      },
      context,
    );
    expect(event.detail).toBe("Checklist item completed.");
    expect(event.changes).toEqual([
      { label: "Checklist item", after: "Clean filters" },
      { label: "Completed", after: "Yes" },
    ]);
  });

  it("formats payments as currency", () => {
    const event = describeAuditEvent(
      {
        action: "Payment recorded",
        after_values: { amount: 300, method: "E-Wallet", notes: null },
      },
      context,
    );
    expect(event.detail).toContain("RM");
    expect(event.changes?.[0]).toMatchObject({ label: "Amount" });
  });

  it("keeps WhatsApp handoff truthful without raw JSON", () => {
    const event = describeAuditEvent({
      action: "whatsapp.feedback_opened",
      after_values: { delivery_confirmed: false },
    });
    expect(event.action).toBe("Customer feedback opened");
    expect(event.detail).toContain("delivery is not confirmed");
    expect(event.changes).toEqual([{ label: "Delivery confirmed", after: "No" }]);
  });

  it("exposes reopened checklist items as related items", () => {
    const event = describeAuditEvent(
      {
        action: "checklist.items_reopened",
        after_values: { itemIds: ["item-1"] },
      },
      context,
    );
    expect(event.action).toBe("Checklist items reopened");
    expect(event.relatedItems).toEqual(["Clean filters"]);
    expect(event.detail).toBe("Reopened 1 checklist item for correction.");
  });

  it("falls back to the raw action for unknown event types", () => {
    const event = describeAuditEvent({
      action: "custom.event",
      after_values: { note: "hello" },
    });
    expect(event.action).toBe("custom.event");
    expect(event.changes).toEqual([{ label: "Note", after: "hello" }]);
  });

  it("keeps creation events readable without a changes list", () => {
    const event = describeAuditEvent(
      {
        action: "order.created",
        after_values: {
          customer_name: "Mei Ling",
          service_type: "Repair",
          quoted_price: 260,
        },
      },
      context,
    );
    expect(event.action).toBe("Order created");
    expect(event.detail).toContain("Mei Ling");
    expect(event.changes).toBeUndefined();
  });
});
