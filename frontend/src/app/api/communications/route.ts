import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const postgresUuid = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Invalid database identifier.",
  );

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send"),
    conversationId: postgresUuid,
    body: z.string().trim().min(1).max(2000),
    mentions: z.array(postgresUuid).max(20),
  }),
  z.object({
    action: z.literal("edit"),
    messageId: postgresUuid,
    body: z.string().trim().min(1).max(2000),
  }),
  z.object({ action: z.literal("remove"), messageId: postgresUuid }),
  z.object({
    action: z.literal("markRead"),
    conversationId: postgresUuid,
  }),
  z.object({
    action: z.literal("startDirect"),
    participantId: postgresUuid,
  }),
  z.object({
    action: z.literal("announcement"),
    title: z.string().trim().min(1).max(100),
    body: z.string().trim().min(1).max(2000),
    audienceRole: z.enum(["admin", "technician", "manager", "all"]),
  }),
  z.object({
    action: z.literal("ensureOrder"),
    orderId: postgresUuid,
    title: z.string().trim().min(1).max(100),
  }),
]);

export async function POST(request: Request) {
  const authClient = await createClient();
  const { data: auth } = await authClient.auth.getUser();
  if (!auth.user)
    return NextResponse.json(
      { error: "Sign in is required." },
      { status: 401 },
    );
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid communication request." },
      { status: 400 },
    );

  const db = authClient;
  const input = parsed.data;
  const isMember = async (conversationId: string) => {
    const { data } = await db
      .from("conversation_members")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    return Boolean(data);
  };

  try {
    if (input.action === "startDirect") {
      if (input.participantId === auth.user.id)
        throw new Error("Choose another team member.");
      const { data: directory, error: directoryError } = await db.rpc(
        "staff_directory" as never,
      );
      if (directoryError) throw directoryError;
      const staff = (directory || []) as Array<{
        id: string;
        display_name: string;
      }>;
      const participant = staff.find((item) => item.id === input.participantId);
      if (!participant) throw new Error("Team member not found.");
      const own = staff.find((item) => item.id === auth.user.id);
      const directKey = [auth.user.id, input.participantId].sort().join(":");
      const { data: existing } = await db
        .from("conversations")
        .select("id")
        .eq("direct_key", directKey)
        .maybeSingle();
      if (existing) return NextResponse.json({ id: existing.id });
      const id = crypto.randomUUID();
      const { error } = await db.from("conversations").insert({
        id,
        kind: "direct",
        title: `${own?.display_name || "Member"} and ${participant.display_name}`,
        direct_key: directKey,
        created_by: auth.user.id,
      } as never);
      if (error) throw error;
      return NextResponse.json({ id });
    }

    if (input.action === "announcement") {
      const { data: profile } = await db
        .from("profiles")
        .select("role")
        .eq("id", auth.user.id)
        .single();
      if (!profile || !["admin", "manager"].includes(profile.role))
        throw new Error("Admin or manager access required.");
      const id = crypto.randomUUID();
      const { error } = await db.from("conversations").insert({
        id,
        kind: "announcement",
        title: input.title,
        audience_role: input.audienceRole === "all" ? null : input.audienceRole,
        created_by: auth.user.id,
      } as never);
      if (error) throw error;
      await db
        .from("conversation_members")
        .upsert({ conversation_id: id, user_id: auth.user.id } as never);
      const { error: messageError } = await db.from("messages").insert({
        conversation_id: id,
        sender_id: auth.user.id,
        body: input.body,
        mentions: [],
      } as never);
      if (messageError) throw messageError;
      return NextResponse.json({ id });
    }

    if (input.action === "ensureOrder") {
      const { data: order } = await db
        .from("orders")
        .select("id, assigned_technician_id")
        .eq("id", input.orderId)
        .maybeSingle();
      const { data: profile } = await db
        .from("profiles")
        .select("role")
        .eq("id", auth.user.id)
        .single();
      if (
        !order ||
        !profile ||
        (profile.role === "technician" &&
          order.assigned_technician_id !== auth.user.id)
      )
        throw new Error("You do not have access to this order.");
      const { data: existing } = await db
        .from("conversations")
        .select("id")
        .eq("order_id", input.orderId)
        .maybeSingle();
      if (existing) return NextResponse.json({ id: existing.id });
      const id = crypto.randomUUID();
      const { error } = await db.from("conversations").insert({
        id,
        kind: "order",
        title: input.title,
        order_id: input.orderId,
        created_by: auth.user.id,
      } as never);
      if (error) throw error;
      return NextResponse.json({ id });
    }

    if (input.action === "edit" || input.action === "remove") {
      const { data: message } = await db
        .from("messages")
        .select("sender_id")
        .eq("id", input.messageId)
        .maybeSingle();
      if (!message || message.sender_id !== auth.user.id)
        throw new Error("You can only change your own message.");
      const changes =
        input.action === "edit"
          ? { body: input.body, edited_at: new Date().toISOString() }
          : { deleted_at: new Date().toISOString() };
      const { error } = await db
        .from("messages")
        .update(changes as never)
        .eq("id", input.messageId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (!(await isMember(input.conversationId)))
      throw new Error("You do not have access to this conversation.");
    if (input.action === "send") {
      const { error } = await db.from("messages").insert({
        conversation_id: input.conversationId,
        sender_id: auth.user.id,
        body: input.body,
        mentions: input.mentions,
      } as never);
      if (error) throw error;
    } else {
      const { error } = await db
        .from("conversation_members")
        .update({ last_read_at: new Date().toISOString() } as never)
        .eq("conversation_id", input.conversationId)
        .eq("user_id", auth.user.id);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof error.message === "string"
          ? error.message
          : "Communication request failed.";
    return NextResponse.json({ error: detail }, { status: 400 });
  }
}
