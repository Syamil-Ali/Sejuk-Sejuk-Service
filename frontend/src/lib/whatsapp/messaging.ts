/**
 * Pluggable WhatsApp messaging layer.
 *
 * Providers implement send + webhook handling so the app can switch between
 * the Meta WhatsApp Business Cloud API, Twilio, a local console logger, or a
 * future provider without touching callers. Everything stays inert until a
 * provider is configured via WHATSAPP_PROVIDER.
 */

import { MetaWhatsAppProvider } from "./meta";

export type WhatsAppDeliveryStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export interface WhatsAppMessage {
  to: string;
  body: string;
  orderId?: string;
}

export interface SentMessage {
  provider: string;
  messageId?: string;
}

export interface DeliveryUpdate {
  messageId: string;
  status: WhatsAppDeliveryStatus;
  timestamp?: string;
}

export interface WhatsAppProvider {
  readonly name: string;
  send(message: WhatsAppMessage): Promise<SentMessage>;
  /**
   * Handles provider webhook verification. Returns the challenge to echo when
   * the request is legitimate, otherwise null.
   */
  verifyWebhook(query: Record<string, string | undefined>): string | null;
  /** Parses a provider webhook body into a delivery status update, if any. */
  parseDeliveryUpdate(payload: unknown): DeliveryUpdate | undefined;
}

/** Local-only provider for development and demos; logs instead of sending. */
export class ConsoleWhatsAppProvider implements WhatsAppProvider {
  readonly name = "console";

  async send(message: WhatsAppMessage): Promise<SentMessage> {
    console.log("[whatsapp:console]", message);
    return { provider: this.name, messageId: `console-${Date.now()}` };
  }

  verifyWebhook(): string | null {
    return null;
  }

  parseDeliveryUpdate(): DeliveryUpdate | undefined {
    return undefined;
  }
}

export type WhatsAppProviderName = "meta" | "twilio" | "console";

export function getWhatsAppProvider(
  env: Record<string, string | undefined> = process.env,
): WhatsAppProvider | null {
  const provider = (env.WHATSAPP_PROVIDER ?? "none").toLowerCase();
  if (provider === "console") return new ConsoleWhatsAppProvider();
  if (provider === "meta") {
    return new MetaWhatsAppProvider({
      accessToken: env.WHATSAPP_ACCESS_TOKEN ?? "",
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID ?? "",
      verifyToken: env.WHATSAPP_VERIFY_TOKEN ?? "",
      appSecret: env.WHATSAPP_APP_SECRET ?? "",
      apiVersion: env.WHATSAPP_API_VERSION ?? "v21.0",
    });
  }
  return null;
}
