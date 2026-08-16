import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MetaWhatsAppProvider } from "@/lib/whatsapp/meta";

const {
  getWhatsAppProvider,
  createServiceClient,
  fromMock,
  insertMock,
} = vi.hoisted(() => {
  const fromMock = vi.fn();
  const insertMock = vi.fn();
  return {
    getWhatsAppProvider: vi.fn(),
    createServiceClient: vi.fn(() => ({ from: fromMock })),
    fromMock,
    insertMock,
  };
});

vi.mock("@/lib/whatsapp/messaging", () => ({ getWhatsAppProvider }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient }));

import { POST } from "./route";

const APP_SECRET = "webhook-app-secret";

function provider() {
  return new MetaWhatsAppProvider({
    accessToken: "token",
    phoneNumberId: "123",
    verifyToken: "verify-token",
    appSecret: APP_SECRET,
  });
}

function sign(body: string) {
  return `sha256=${createHmac("sha256", APP_SECRET).update(body).digest("hex")}`;
}

function webhookRequest(body: string, signature?: string) {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature) headers.set("x-hub-signature-256", signature);
  return new Request("http://localhost/api/whatsapp/webhook", {
    method: "POST",
    headers,
    body,
  });
}

describe("whatsapp webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getWhatsAppProvider.mockReturnValue(provider());
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      insert: insertMock,
      update: vi.fn().mockReturnThis(),
    });
    insertMock.mockResolvedValue({ error: null });
  });

  it("rejects unsigned or tampered webhook posts", async () => {
    const body = JSON.stringify({ entry: [] });
    expect((await POST(webhookRequest(body))).status).toBe(401);
    expect(
      (await POST(webhookRequest(body, `sha256=${"0".repeat(64)}`))).status,
    ).toBe(401);
  });

  it("accepts a valid signature and stores the delivery update", async () => {
    const body = JSON.stringify({
      entry: [
        {
          id: "1",
          changes: [
            {
              value: {
                statuses: [
                  { id: "wamid-9", status: "delivered", timestamp: "1700000000" },
                ],
              },
            },
          ],
        },
      ],
    });
    const response = await POST(webhookRequest(body, sign(body)));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "meta",
        message_id: "wamid-9",
        status: "delivered",
      }),
    );
  });

  it("acknowledges unrelated Meta events without storing them", async () => {
    const body = JSON.stringify({
      entry: [{ id: "1", changes: [{ field: "messages" }] }],
    });
    const response = await POST(webhookRequest(body, sign(body)));
    expect(response.status).toBe(200);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
