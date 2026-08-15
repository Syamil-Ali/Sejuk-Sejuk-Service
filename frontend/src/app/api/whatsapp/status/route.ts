import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  orderId: z.string().uuid(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = requestSchema.safeParse({
    orderId: url.searchParams.get("orderId"),
  });
  if (!parsed.success)
    return NextResponse.json(
      { error: "A valid order id is required." },
      { status: 400 },
    );
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  // RLS limits delivery records to admin/manager readers.
  const { data, error } = await supabase
    .from("whatsapp_deliveries")
    .select("status,provider,message_id,updated_at")
    .eq("order_id", parsed.data.orderId)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data?.[0] ?? null);
}
