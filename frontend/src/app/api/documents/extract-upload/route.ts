import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerEnv, hasSupabaseEnv } from "@/lib/env";

export async function POST(request: Request) {
  const env = getServerEnv();
  if (
    !hasSupabaseEnv() ||
    !env.AGNO_ASSISTANT_ENABLED ||
    !env.AGNO_ASSISTANT_URL
  ) {
    return NextResponse.json(
      { error: "Document service is disabled." },
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
  const form = await request.formData();
  const headers = { Authorization: `Bearer ${session.access_token}` };
  const ingestResponse = await fetch(
    `${env.AGNO_ASSISTANT_URL}/v1/documents/ingest`,
    { method: "POST", headers, body: form },
  );
  const ingestBody = await ingestResponse.json().catch(() => ({}));
  if (!ingestResponse.ok)
    return NextResponse.json(ingestBody, { status: ingestResponse.status });
  const documentId = ingestBody?.document_id;
  if (!documentId)
    return NextResponse.json(
      { error: "Document upload did not return an id." },
      { status: 502 },
    );
  const extractResponse = await fetch(
    `${env.AGNO_ASSISTANT_URL}/v1/documents/${encodeURIComponent(documentId)}/extract`,
    { method: "POST", headers },
  );
  const extractBody = await extractResponse.json().catch(() => ({}));
  if (!extractResponse.ok)
    return NextResponse.json(extractBody, { status: extractResponse.status });
  return NextResponse.json(extractBody);
}
