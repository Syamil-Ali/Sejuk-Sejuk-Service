import { describe, expect, it, vi } from "vitest";
import { MetaWhatsAppConfig, MetaWhatsAppProvider } from "./meta";

function provider(
  overrides: Partial<MetaWhatsAppConfig> = {},
) {
  return new MetaWhatsAppProvider({
    accessToken: "token",
    phoneNumberId: "123",
    verifyToken: "secret",
    apiVersion: "v21.0",
    ...overrides,
  });
}

describe("MetaWhatsAppProvider", () => {
  it("verifies the webhook challenge", () => {
    const p = provider();
    expect(
      p.verifyWebhook({
        "hub.mode": "subscribe",
        "hub.verify_token": "secret",
        "hub.challenge": "challenge-123",
      }),
    ).toBe("challenge-123");
    expect(
      p.verifyWebhook({
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong",
        "hub.challenge": "challenge-123",
      }),
    ).toBeNull();
  });

  it("parses delivery statuses from Meta webhook payloads", () => {
    const p = provider();
    const payload = {
      entry: [
        {
          id: "1",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                statuses: [
                  { id: "wamid-1", status: "delivered", timestamp: "1700000000" },
                ],
              },
            },
          ],
        },
      ],
    };
    expect(p.parseDeliveryUpdate(payload)).toEqual({
      messageId: "wamid-1",
      status: "delivered",
      timestamp: "1700000000",
    });
    expect(p.parseDeliveryUpdate({ entry: [] })).toBeUndefined();
    expect(p.parseDeliveryUpdate({})).toBeUndefined();
  });

  it("sends through the Graph API and returns the message id", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid-1" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const p = new MetaWhatsAppProvider(
      { accessToken: "token", phoneNumberId: "123", verifyToken: "secret" },
      fetcher as unknown as typeof fetch,
    );
    const sent = await p.send({ to: "60123456789", body: "Hello" });
    expect(sent.provider).toBe("meta");
    expect(sent.messageId).toBe("wamid-1");
    const url = String(fetcher.mock.calls[0]?.[0]);
    expect(url).toContain("graph.facebook.com/v21.0/123/messages");
    const init = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(init.headers).toMatchObject({ Authorization: "Bearer token" });
  });

  it("rejects sends before credentials are configured", async () => {
    const p = provider({ accessToken: "", phoneNumberId: "" });
    await expect(p.send({ to: "60123456789", body: "Hi" })).rejects.toThrow(
      "not configured",
    );
  });
});
