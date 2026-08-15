import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { OrganizationConversation } from "../domain";
import type { CommunicationsRepository } from "./communications";

const identityMap: Record<string, { appId: string; name: string }> = {
  "20000000-0000-0000-0000-000000000001": { appId: "admin-1", name: "Nadia" },
  "20000000-0000-0000-0000-000000000002": { appId: "manager-1", name: "Farah" },
  "20000000-0000-0000-0000-000000000003": { appId: "tech-ali", name: "Ali" },
  "20000000-0000-0000-0000-000000000004": { appId: "tech-john", name: "John" },
  "20000000-0000-0000-0000-000000000005": { appId: "tech-bala", name: "Bala" },
  "20000000-0000-0000-0000-000000000006": {
    appId: "tech-yusoff",
    name: "Yusoff",
  },
};
const databaseUserId = (appId: string) =>
  Object.entries(identityMap).find(
    ([, identity]) => identity.appId === appId,
  )?.[0] || appId;
const appUserId = (databaseId: string) =>
  identityMap[databaseId]?.appId || databaseId;
const userName = (databaseId: string) =>
  identityMap[databaseId]?.name || "Organization member";
const orderMap: Record<string, string> = {
  "order-1234": "30000000-0000-0000-0000-000000000001",
  "order-1237": "30000000-0000-0000-0000-000000000002",
  "order-1241": "30000000-0000-0000-0000-000000000003",
};
const databaseOrderId = (appId: string) => orderMap[appId] || appId;
const appOrderId = (databaseId: string) =>
  Object.entries(orderMap).find(([, id]) => id === databaseId)?.[0] ||
  databaseId;

interface RawConversation {
  id: string;
  kind: "order" | "direct" | "announcement";
  title: string;
  order_id: string | null;
  direct_key: string | null;
  audience_role: "admin" | "technician" | "manager" | null;
  created_by: string;
  created_at: string;
  conversation_members: Array<{ user_id: string; last_read_at: string | null }>;
  messages: Array<{
    id: string;
    conversation_id: string;
    sender_id: string;
    body: string;
    mentions: string[];
    created_at: string;
    edited_at: string | null;
    deleted_at: string | null;
  }>;
}

export class SupabaseCommunicationsRepository implements CommunicationsRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  private async mutate<T>(payload: Record<string, unknown>): Promise<T> {
    const response = await fetch("/api/communications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as T & { error?: string };
    if (!response.ok)
      throw new Error(result.error || "Communication request failed.");
    return result;
  }

  async list(): Promise<OrganizationConversation[]> {
    const { data, error } = await this.client
      .from("conversations")
      .select("*, conversation_members(*), messages(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data || []) as unknown as RawConversation[];
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      orderId: row.order_id ? appOrderId(row.order_id) : undefined,
      directKey: row.direct_key || undefined,
      audienceRole: row.audience_role || undefined,
      createdBy: row.created_by,
      createdAt: row.created_at,
      members: (row.conversation_members || []).map((member) => ({
        userId: appUserId(member.user_id),
        lastReadAt: member.last_read_at || undefined,
      })),
      messages: (row.messages || [])
        .map((message) => ({
          id: message.id,
          conversationId: message.conversation_id,
          senderId: appUserId(message.sender_id),
          senderName: userName(message.sender_id),
          body: message.body,
          createdAt: message.created_at,
          editedAt: message.edited_at || undefined,
          deletedAt: message.deleted_at || undefined,
          mentions: message.mentions.map(appUserId),
          attachments: [],
        }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }));
  }

  async send(conversationId: string, body: string, mentions: string[] = []) {
    await this.mutate({
      action: "send",
      conversationId,
      body: body.trim(),
      mentions: mentions.map(databaseUserId),
    });
  }

  async markRead(conversationId: string) {
    await this.mutate({ action: "markRead", conversationId });
  }

  async edit(messageId: string, body: string) {
    await this.mutate({ action: "edit", messageId, body: body.trim() });
  }

  async remove(messageId: string) {
    await this.mutate({ action: "remove", messageId });
  }

  async startDirect(participantId: string) {
    const participantDatabaseId = databaseUserId(participantId);
    const result = await this.mutate<{ id: string }>({
      action: "startDirect",
      participantId: participantDatabaseId,
    });
    return result.id;
  }

  async createAnnouncement(
    title: string,
    body: string,
    audienceRole: "admin" | "technician" | "manager" | "all",
  ) {
    const result = await this.mutate<{ id: string }>({
      action: "announcement",
      title,
      body,
      audienceRole,
    });
    return result.id;
  }

  async ensureOrder(orderId: string, title: string) {
    const mappedOrderId = databaseOrderId(orderId);
    const result = await this.mutate<{ id: string }>({
      action: "ensureOrder",
      orderId: mappedOrderId,
      title,
    });
    return result.id;
  }

  subscribe(onChange: () => void) {
    const channel = this.client
      .channel("organization-communications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        onChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_members" },
        onChange,
      )
      .subscribe();
    return () => void this.client.removeChannel(channel);
  }
}
