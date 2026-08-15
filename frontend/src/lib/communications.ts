import type {
  DemoUser,
  OrganizationConversation,
  ServiceOrder,
} from "./domain";

export function directKey(a: string, b: string) {
  return [a, b].sort().join(":");
}

export function conversationDisplayTitle(
  conversation: OrganizationConversation,
  currentUserId: string,
  users: DemoUser[],
) {
  if (conversation.kind !== "direct") return conversation.title;
  const otherMember = conversation.members.find(
    (member) => member.userId !== currentUserId,
  );
  return (
    users.find((user) => user.id === otherMember?.userId)?.name ||
    conversation.title
  );
}

export function canAccessConversation(
  conversation: OrganizationConversation,
  user: DemoUser,
  orders: ServiceOrder[],
) {
  if (conversation.kind === "announcement")
    return (
      conversation.audienceRole === "all" ||
      conversation.audienceRole === user.role
    );
  if (conversation.kind === "direct")
    return conversation.members.some((member) => member.userId === user.id);
  const order = orders.find(
    (candidate) => candidate.id === conversation.orderId,
  );
  return Boolean(
    order && (user.role !== "technician" || order.technicianId === user.id),
  );
}

export function conversationUnread(
  conversation: OrganizationConversation,
  userId: string,
) {
  const member = conversation.members.find(
    (candidate) => candidate.userId === userId,
  );
  if (!member) return 0;
  return conversation.messages.filter(
    (message) =>
      message.senderId !== userId &&
      (!member.lastReadAt || message.createdAt > member.lastReadAt),
  ).length;
}

export function createSeedConversations(
  users: DemoUser[],
  orders: ServiceOrder[],
): OrganizationConversation[] {
  const admin = users.find((user) => user.role === "admin")!;
  const manager = users.find((user) => user.role === "manager")!;
  const technician = users.find((user) => user.role === "technician")!;
  const createdAt = new Date().toISOString();
  return [
    {
      id: "conversation-announcement-1",
      kind: "announcement",
      title: "Operations updates",
      audienceRole: "all",
      createdBy: manager.id,
      createdAt,
      members: users.map((user) => ({ userId: user.id })),
      messages: [
        {
          id: "message-announcement-1",
          conversationId: "conversation-announcement-1",
          senderId: manager.id,
          senderName: manager.name,
          body: "Use order conversations for job-specific updates so the full team has one source of truth.",
          createdAt,
          mentions: [],
          attachments: [],
        },
      ],
    },
    {
      id: "conversation-direct-1",
      kind: "direct",
      title: `${admin.name} and ${technician.name}`,
      directKey: directKey(admin.id, technician.id),
      createdBy: admin.id,
      createdAt,
      members: [{ userId: admin.id }, { userId: technician.id }],
      messages: [
        {
          id: "message-direct-1",
          conversationId: "conversation-direct-1",
          senderId: admin.id,
          senderName: admin.name,
          body: "Message me here if a customer changes the visit timing.",
          createdAt,
          mentions: [],
          attachments: [],
        },
      ],
    },
    ...orders
      .filter((order) => order.technicianId)
      .slice(0, 2)
      .map((order) => ({
        id: `conversation-order-${order.id}`,
        kind: "order" as const,
        title: `${order.orderNo} · ${order.customerName}`,
        orderId: order.id,
        createdBy: admin.id,
        createdAt,
        members: [admin.id, manager.id, order.technicianId!].map((userId) => ({
          userId,
        })),
        messages: [],
      })),
  ];
}
