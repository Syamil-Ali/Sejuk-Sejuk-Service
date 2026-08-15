import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getWhatsAppProvider } from "@/lib/whatsapp/messaging";
import { createServiceClient } from "@/lib/supabase/service";

const requestSchema = z.object({
  to: z.string().regex(/^\+?\d{8,15}$/, "Invalid recipient number."),
  body: z.string().trim().min(1).max(4_096),
  orderId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const provider = getWhatsAppProvider(process.env);
  if (!provider) {
    return NextResponse.json(
      { error: "No WhatsApp provider is configured." },
      { status: 503 },
    );
  }
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();
  if (!profile || !["admin", "manager"].includes(String(profile.role))) {
    return NextResponse.json(
      { error: "Admin or manager access required." },
      { status: 403 },
    );
  }
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid message." },
      { status: 400 },
    );
  try {
    const sent = await provider.send({
      to: parsed.data.to,
      body: parsed.data.body,
      orderId: parsed.data.orderId,
    });
    try {
      const client = createServiceClient();
      await client.from("whatsapp_deliveries").insert({
        order_id: parsed.data.orderId ?? null,
        recipient_phone: parsed.data.to,
        provider: sent.provider,
        message_id: sent.messageId ?? null,
        status: "queued",
        metadata: {},
      });
    } catch (error) {
      console.error("whatsapp send record failed", error);
    }
    return NextResponse.json({ provider: sent.provider, messageId: sent.messageId ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "WhatsApp send failed." },
      { status: 502 },
    );
  }
}
