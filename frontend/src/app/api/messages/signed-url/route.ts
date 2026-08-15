import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  path: z
    .string()
    .min(3)
    .max(500)
    .refine((value) => !value.includes("..")),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid attachment path." },
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
  const { data: attachment } = await client
    .from("message_attachments")
    .select("id")
    .eq("storage_path", parsed.data.path)
    .maybeSingle();
  if (!attachment)
    return NextResponse.json(
      { error: "Attachment unavailable." },
      { status: 404 },
    );
  const { data, error } = await client.storage
    .from("message-attachments")
    .createSignedUrl(parsed.data.path, 300);
  if (error)
    return NextResponse.json(
      { error: "Unable to create attachment link." },
      { status: 500 },
    );
  return NextResponse.json(
    { url: data.signedUrl, expiresIn: 300 },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
