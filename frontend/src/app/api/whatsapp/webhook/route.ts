import { NextResponse } from "next/server";
import { getWhatsAppProvider } from "@/lib/whatsapp/messaging";
import { MetaWhatsAppProvider } from "@/lib/whatsapp/meta";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Provider webhook endpoint. Meta calls GET for subscription verification and
 * POST with message status updates (sent/delivered/read/failed).
 */
export async function GET(request: Request) {
  const provider = getWhatsAppProvider(process.env);
  if (!provider) {
    return NextResponse.json(
      { error: "No WhatsApp provider is configured." },
      { status: 503 },
    );
  }
  const url = new URL(request.url);
  const challenge = provider.verifyWebhook(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (challenge === null) {
    return NextResponse.json(
      { error: "Webhook verification failed." },
      { status: 403 },
    );
  }
  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(request: Request) {
  const provider = getWhatsAppProvider(process.env);
  if (!provider) {
    return NextResponse.json(
      { error: "No WhatsApp provider is configured." },
      { status: 503 },
    );
  }
  // Read the exact raw bytes: Meta signs the raw request body, so the
  // signature must be verified before any JSON parsing.
  const rawBody = Buffer.from(await request.arrayBuffer());
  if (provider instanceof MetaWhatsAppProvider) {
    const signature = request.headers.get("x-hub-signature-256");
    if (!provider.verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 401 },
      );
    }
  }
  let payload: unknown = null;
  try {
    payload = JSON.parse(rawBody.toString("utf-8"));
  } catch {
    // Always acknowledge so the provider does not retry unrelated events.
    return NextResponse.json({ ok: true });
  }
  const update = provider.parseDeliveryUpdate(payload);
  // Always acknowledge so the provider does not retry unrelated events.
  if (!update) return NextResponse.json({ ok: true });
  try {
    const client = createServiceClient();
    const { data: existing } = await client
      .from("whatsapp_deliveries")
      .select("id")
      .eq("provider", provider.name)
      .eq("message_id", update.messageId)
      .maybeSingle();
    const record = {
      status: update.status,
      updated_at: new Date().toISOString(),
      metadata: { timestamp: update.timestamp ?? null },
    };
    if (existing) {
      await client
        .from("whatsapp_deliveries")
        .update(record)
        .eq("id", existing.id);
    } else {
      await client.from("whatsapp_deliveries").insert({
        provider: provider.name,
        message_id: update.messageId,
        recipient_phone: "",
        status: update.status,
        metadata: record.metadata,
      });
    }
  } catch (error) {
    console.error("whatsapp webhook store failed", error);
  }
  return NextResponse.json({ ok: true });
}
