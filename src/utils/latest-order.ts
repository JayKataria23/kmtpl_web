import supabase from "@/utils/supabase";

/**
 * Returns the ship-to party used on the order with the highest order number
 * for a bill-to party. An order being edited can be excluded from the lookup.
 */
export async function fetchLatestShipToId(
  billToId: number,
  excludedOrderId?: number | null
): Promise<number | null> {
  let query = supabase
    .from("orders")
    .select("ship_to_id")
    .eq("bill_to_id", billToId);

  if (excludedOrderId !== undefined && excludedOrderId !== null) {
    query = query.neq("id", excludedOrderId);
  }

  const { data, error } = await query
    .order("order_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data?.ship_to_id ?? null;
}
