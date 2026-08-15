import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  path: z
    .string()
    .min(3)
    .max(500)
    .refine(
      (value) => !value.includes("..") && value.split("/").length >= 2,
      "Invalid evidence path.",
    ),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid evidence path." },
      { status: 400 },
    );
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  const { data: metadata, error: metadataError } = await client
    .from("job_evidence")
    .select("id")
    .eq("storage_path", parsed.data.path)
    .eq("committed", true)
    .maybeSingle();
  if (metadataError || !metadata)
    return NextResponse.json(
      { error: "Evidence is unavailable or you do not have access." },
      { status: 404 },
    );
  const { data, error } = await client.storage
    .from("job-evidence")
    .createSignedUrl(parsed.data.path, 300);
  if (error)
    return NextResponse.json(
      { error: "Unable to create evidence link." },
      { status: 500 },
    );
  return NextResponse.json(
    { url: data.signedUrl, expiresIn: 300 },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
