import supabase from "./supabase";

/**
 * Fetches a list of the latest prices for all designs sold to a party.
 * Combines data from both challan_entries and design_entries.
 */
export const fetchLatestPriceList = async (partyId: number): Promise<{ design: string, price: string }[]> => {
  try {
    // 1. Fetch from challans
    const { data: challans, error: challanError } = await supabase
      .from('challans')
      .select('date, challan_entries(design, price)')
      .eq('bill_to_id', partyId);
    
    // 2. Fetch from orders
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('date, design_entries(design, price)')
      .eq('bill_to_id', partyId);

    const priceMap = new Map<string, { price: string, date: string }>();

    // Process Challans
    if (!challanError && challans) {
      challans.forEach((c: any) => {
        (c.challan_entries || []).forEach((e: any) => {
          const current = priceMap.get(e.design);
          if (!current || new Date(c.date) > new Date(current.date)) {
            priceMap.set(e.design, { price: e.price.toString(), date: c.date });
          }
        });
      });
    }

    // Process Orders
    if (!orderError && orders) {
      orders.forEach((o: any) => {
        (o.design_entries || []).forEach((e: any) => {
          const current = priceMap.get(e.design);
          if (!current || new Date(o.date) > new Date(current.date)) {
            priceMap.set(e.design, { price: e.price.toString(), date: o.date });
          }
        });
      });
    }

    return Array.from(priceMap.entries()).map(([design, info]) => ({
      design,
      price: info.price
    }));

  } catch (error) {
    console.error("Error in fetchLatestPriceList:", error);
    return [];
  }
};
