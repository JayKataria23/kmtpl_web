import supabase from "@/utils/supabase";
import { PartyCount, DesignDetail } from "@/types/party-file";

export const fetchPartyCounts = async (): Promise<PartyCount[]> => {
  try {
    let allData: any[] = [];
    let from = 0;
    let to = 999;
    while (true) {
      const { data, error } = await supabase
        .from("design_entries")
        .select(`id, part, orders!inner(canceled, party_profiles!orders_bill_to_id_fkey(name))`)
        .is("dispatch_date", null)
        .eq("orders.canceled", false)
        .range(from, to);

      if (error) throw error;
      allData = allData.concat(data || []);
      if (!data || data.length < 1000) break;
      from += 1000;
      to += 1000;
    }

    const countsMap = new Map<string, { count: number; part: boolean }>();
    allData.forEach((row: any) => {
      const p = row.orders?.party_profiles?.name;
      if (!p) return;
      if (!countsMap.has(p)) {
        countsMap.set(p, { count: 0, part: false });
      }
      const meta = countsMap.get(p)!;
      meta.count += 1;
      if (row.part) meta.part = true;
    });

    return Array.from(countsMap.entries()).map(([party_name, meta]) => ({
      party_name,
      design_entry_count: meta.count,
      part: meta.part,
    })).sort((a, b) => a.party_name.localeCompare(b.party_name));
  } catch (error) {
    console.error("Error fetching party counts:", error);
    return [];
  }
};

export const fetchOrderDetails = async (
  party: string
): Promise<DesignDetail[]> => {
  try {
    let allData: any[] = [];
    let from = 0;
    let to = 999;
    while (true) {
      const { data, error } = await supabase
        .from("design_entries")
        .select(`
          id, design, price, remark, shades, bhiwandi_date, part, program,
          orders!inner(order_no, date, remark, canceled, party_profiles!orders_bill_to_id_fkey(name))
        `)
        .eq("orders.party_profiles.name", party)
        .is("dispatch_date", null)
        .eq("orders.canceled", false)
        .range(from, to);

      if (error) throw error;
      allData = allData.concat(data || []);
      if (!data || data.length < 1000) break;
      from += 1000;
      to += 1000;
    }

    const filteredData = allData.filter((entry: any) => entry.orders?.party_profiles?.name === party);

    return filteredData.map((entry: any) => ({
      design: entry.design,
      shades: entry.shades || [],
      totalMeters: entry.shades,
      remark: entry.orders?.remark || entry.remark || "",
      canceled: false,
      bhiwandi_date: entry.bhiwandi_date,
      price: entry.price || 0,
      design_entry_id: entry.id,
      order_date: entry.orders?.date || "",
      order_no: entry.orders?.order_no || 0,
      party_name: party,
      part: entry.part || false,
      program: entry.program || "",
    }));
  } catch (error) {
    console.error("Error fetching order details:", error);
    return [];
  }
};
