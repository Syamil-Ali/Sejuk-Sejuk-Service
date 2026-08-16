import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  DeliveryUpdate,
  SentMessage,
  WhatsAppDeliveryStatus,
  WhatsAppMessage,
  WhatsAppProvider,
} from "./messaging";

const DELIVERY_STATUS: Record<string, WhatsAppDeliveryStatus> = {
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
};

export interface MetaWhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
  /**
   * Meta app secret used to verify `X-Hub-Signature-256` on webhook POSTs.
   * Required for the webhook to accept delivery updates.
   */
  appSecret?: string;
  apiVersion?: string;
  baseUrl?: string;
}

/**
 * WhatsApp Business Cloud API provider. Credentials stay unset until Meta
 * approval/subscription is in place; the provider only activates when both
 * WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are configured.
 */
export class MetaWhatsAppProvider implements WhatsAppProvider {
  readonly name = "meta";

  constructor(
    private readonly config: MetaWhatsAppConfig,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  get enabled(): boolean {
    return Boolean(
      this.config.accessToken && this.config.phoneNumberId,
    );
  }

  async send(message: WhatsAppMessage): Promise<SentMessage> {
    if (!this.enabled)
      throw new Error("WhatsApp Meta provider is not configured.");
    const url =
      `${this.config.baseUrl ?? "https://graph.facebook.com"}/` +
      `${this.config.apiVersion ?? "v21.0"}/` +
      `${this.config.phoneNumberId}/messages`;
    const response = await this.fetcher(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: message.to,
        type: "text",
        text: { body: message.body },
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `WhatsApp send failed (${response.status}): ${detail.slice(0, 200)}`,
      );
    }
    const data = (await response.json()) as {
      messages?: Array<{ id?: string }>;
    };
    return { provider: this.name, messageId: data.messages?.[0]?.id };
  }

  verifyWebhook(
    query: Record<string, string | undefined>,
  ): string | null {
    if (
      query["hub.mode"] === "subscribe" &&
      query["hub.verify_token"] === this.config.verifyToken
    ) {
      return query["hub.challenge"] ?? null;
    }
    return null;
  }

  /**
   * Verifies Meta's `X-Hub-Signature-256` HMAC-SHA256 signature over the raw
   * webhook body. Fails closed: requests without a signature or without an
   * app secret configured are rejected.
   */
  verifyWebhookSignature(
    rawBody: Uint8Array,
    signature: string | null,
  ): boolean {
    if (!this.config.appSecret || !signature) return false;
    const expected =
      "sha256=" +
      createHmac("sha256", this.config.appSecret)
        .update(rawBody)
        .digest("hex");
    const provided = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (provided.length !== expectedBuffer.length) return false;
    return timingSafeEqual(provided, expectedBuffer);
  }

  parseDeliveryUpdate(payload: unknown): DeliveryUpdate | undefined {
    if (!payload || typeof payload !== "object") return undefined;
    const entries = (payload as { entry?: unknown[] }).entry ?? [];
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const changes = (entry as { changes?: unknown[] }).changes ?? [];
      for (const change of changes) {
        if (!change || typeof change !== "object") continue;
        const value = (change as { value?: unknown }).value;
        if (!value || typeof value !== "object") continue;
        const statuses = (value as { statuses?: unknown[] }).statuses ?? [];
        const status = statuses[0];
        if (!status || typeof status !== "object") continue;
        const record = status as {
          id?: string;
          status?: string;
          timestamp?: string;
        };
        const normalized = record.status
          ? DELIVERY_STATUS[record.status]
          : undefined;
        if (!record.id || !normalized) continue;
        return {
          messageId: record.id,
          status: normalized,
          timestamp: record.timestamp,
        };
      }
    }
    return undefined;
  }
}
