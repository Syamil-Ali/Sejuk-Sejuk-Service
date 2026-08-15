import { describe, expect, it } from "vitest";
import {
  canAccessConversation,
  conversationUnread,
  directKey,
} from "./communications";
import { createSeedOrders, demoUsers } from "./demo-data";
import type { OrganizationConversation } from "./domain";

const base: OrganizationConversation = {
  id: "c",
  kind: "direct",
  title: "Chat",
  directKey: "a:b",
  createdBy: "a",
  createdAt: "2026-08-12T00:00:00Z",
  members: [
    { userId: "a", lastReadAt: "2026-08-12T00:00:00Z" },
    { userId: "b" },
  ],
  messages: [
    {
      id: "m",
      conversationId: "c",
      senderId: "b",
      senderName: "B",
      body: "Hello",
      createdAt: "2026-08-12T01:00:00Z",
      mentions: [],
      attachments: [],
    },
  ],
};

describe("communications authorization", () => {
  it("uses a canonical direct key", () =>
    expect(directKey("b", "a")).toBe("a:b"));
  it("counts unread messages per member", () =>
    expect(conversationUnread(base, "a")).toBe(1));
  it("restricts direct conversations to members", () =>
    expect(canAccessConversation(base, demoUsers[0], createSeedOrders())).toBe(
      base.members.some((m) => m.userId === demoUsers[0].id),
    ));
  it("restricts order conversations to the assigned technician", () => {
    const orders = createSeedOrders();
    const order = orders[0];
    const conversation = {
      ...base,
      kind: "order" as const,
      orderId: order.id,
      directKey: undefined,
    };
    const assigned = demoUsers.find((u) => u.id === order.technicianId)!;
    const other = demoUsers.find(
      (u) => u.role === "technician" && u.id !== assigned.id,
    )!;
    expect(canAccessConversation(conversation, assigned, orders)).toBe(true);
    expect(canAccessConversation(conversation, other, orders)).toBe(false);
  });
});
