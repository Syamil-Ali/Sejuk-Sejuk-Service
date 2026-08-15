import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, getServerEnv, hasSupabaseEnv } = vi.hoisted(() => ({
  getSession: vi.fn(),
  getServerEnv: vi.fn(),
  hasSupabaseEnv: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getSession } }),
}));
vi.mock("@/lib/env", () => ({ getServerEnv, hasSupabaseEnv }));

import { POST } from "./route";

function request(message = "Show my jobs") {
  return new Request("http://localhost/api/assistant", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "correlation-1",
    },
    body: JSON.stringify({ message }),
  });
}

describe("assistant BFF", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    hasSupabaseEnv.mockReturnValue(true);
    getServerEnv.mockReturnValue({
      AGNO_ASSISTANT_ENABLED: true,
      AGNO_ASSISTANT_URL: "http://agno.internal",
      AGNO_ASSISTANT_TIMEOUT_MS: 30_000,
    });
    getSession.mockResolvedValue({
      data: { session: { access_token: "caller-token" } },
    });
  });

  it("returns explicit demo fallback while disabled", async () => {
    getServerEnv.mockReturnValue({ AGNO_ASSISTANT_ENABLED: false });
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ mode: "demo" });
  });

  it("rejects an expired session", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    expect((await POST(request())).status).toBe(401);
  });

  it("forwards caller token and relays stream with correlation", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('data: {"type":"complete"}\n\n'),
        );
        controller.close();
      },
    });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(stream, { status: 200 }));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toBe("correlation-1");
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      authorization: "Bearer caller-token",
    });
  });

  it("maps retryable upstream failures without leaking payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("private provider error", { status: 429 }),
    );
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "Please wait before retrying.",
      retryable: true,
    });
  });
});
