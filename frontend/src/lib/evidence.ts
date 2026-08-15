import { createClient } from "@/lib/supabase/client";

/**
 * Uploads a receipt file to the private job-evidence bucket and records it as
 * committed evidence for the order. Returns the evidence row id so the payment
 * RPC can attach it to the payment record.
 */
export async function stageReceiptEvidence(
  orderId: string,
  file: File,
): Promise<string> {
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Sign in before attaching a receipt.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${orderId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await client.storage
    .from("job-evidence")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) throw uploadError;
  const { data: row, error: metadataError } = await client
    .from("job_evidence")
    .insert({
      order_id: orderId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      media_kind: "receipt",
      size_bytes: file.size,
      uploader_id: user.id,
      committed: true,
    })
    .select("id")
    .single();
  if (metadataError) throw metadataError;
  return row.id;
}
