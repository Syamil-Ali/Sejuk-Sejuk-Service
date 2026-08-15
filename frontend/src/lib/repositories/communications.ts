import type { OrganizationConversation } from "../domain";

export interface CommunicationsRepository {
  list(): Promise<OrganizationConversation[]>;
  send(
    conversationId: string,
    body: string,
    mentions?: string[],
  ): Promise<void>;
  edit(messageId: string, body: string): Promise<void>;
  remove(messageId: string): Promise<void>;
  markRead(conversationId: string): Promise<void>;
  startDirect(participantId: string): Promise<string>;
  createAnnouncement(
    title: string,
    body: string,
    audienceRole: "admin" | "technician" | "manager" | "all",
  ): Promise<string>;
  ensureOrder(orderId: string, title: string): Promise<string>;
  subscribe(onChange: () => void): () => void;
}
