import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { OrderStatus } from "@/lib/domain";

export async function listAuthorizedOrders(
  client: SupabaseClient<Database>,
  query?: string,
  status?: OrderStatus,
) {
  let request = client
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (status) request = request.eq("status", status);
  if (query)
    request = request.or(
      `order_no.ilike.%${query}%,customer_name.ilike.%${query}%`,
    );
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

export async function getAuthorizedOrder(
  client: SupabaseClient<Database>,
  id: string,
) {
  const { data, error } = await client
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
