import { describe, expect, it } from "vitest";
import {
  createManagerRescheduleNotifications,
  visibleNotifications,
} from "@/lib/notifications";
import type { DemoUser } from "@/lib/domain";

const users: DemoUser[] = [
  { id: "manager-1", name: "Farah", role: "manager", branch: "HQ" },
  { id: "manager-2", name: "Sam", role: "manager", branch: "HQ" },
  { id: "tech-1", name: "John", role: "technician", branch: "KL" },
];

describe("createManagerRescheduleNotifications", () => {
  it("fans out full postponement context only to managers", () => {
    const notifications = createManagerRescheduleNotifications({
      users,
      orderId: "order-1",
      orderNo: "ORDER001",
      technicianName: "John",
      reason: "Part unavailable",
      from: "2026-08-12T01:00:00.000Z",
      to: "2026-08-14T06:00:00.000Z",
      createdAt: "2026-08-12T00:00:00.000Z",
    });

    expect(notifications.map((item) => item.recipientId)).toEqual([
      "manager-1",
      "manager-2",
    ]);
    expect(
      notifications.every((item) => item.recipientRole === "manager"),
    ).toBe(true);
    expect(notifications[0].body).toContain("ORDER001 was postponed by John");
    expect(notifications[0].body).toContain("Reason: Part unavailable");
    expect(notifications[0].body).toMatch(/Previous:.*New:/);
  });
});

describe("visibleNotifications", () => {
  it("scopes and deduplicates recipient notifications", () => {
    const user = users[2];
    const base = {
      id: "n1",
      orderId: "o",
      recipientId: user.id,
      title: "Message",
      body: "Hello",
      createdAt: "2026-08-12T00:00:00Z",
      dedupeKey: "same",
    };
    expect(
      visibleNotifications(
        [
          base,
          { ...base, id: "n2" },
          {
            ...base,
            id: "n3",
            recipientId: "someone-else",
            dedupeKey: "other",
          },
        ],
        user,
      ),
    ).toHaveLength(1);
  });
});
