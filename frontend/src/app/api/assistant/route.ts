import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getServerEnv, hasSupabaseEnv } from "@/lib/env";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2_000),
  threadId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Enter a valid question." },
      { status: 400 },
    );
  const env = getServerEnv();
  if (
    !hasSupabaseEnv() ||
    !env.AGNO_ASSISTANT_ENABLED ||
    !env.AGNO_ASSISTANT_URL
  ) {
    return NextResponse.json(
      { mode: "demo", error: "Production assistant is disabled." },
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
  const correlationId = request.headers.get("x-correlation-id") ?? randomUUID();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    env.AGNO_ASSISTANT_TIMEOUT_MS,
  );
  try {
    const upstream = await fetch(
      `${env.AGNO_ASSISTANT_URL.replace(/\/$/, "")}/v1/chat`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
          "x-correlation-id": correlationId,
        },
        body: JSON.stringify({
          message: parsed.data.message,
          thread_id: parsed.data.threadId,
        }),
        signal: controller.signal,
      },
    );
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        {
          error:
            upstream.status === 429
              ? "Please wait before retrying."
              : "Assistant unavailable.",
          retryable: upstream.status >= 429,
        },
        {
          status:
            upstream.status === 401 ? 401 : upstream.status === 429 ? 429 : 502,
        },
      );
    }
    return new Response(upstream.body, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        "x-correlation-id": correlationId,
      },
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        error: timedOut ? "Assistant timed out." : "Assistant unavailable.",
        retryable: true,
      },
      { status: 504 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
