import supabase from "@/utils/supabase";
import { PartyCount, DesignDetail } from "@/types/party-file";

export const fetchPartyCounts = async (): Promise<PartyCount[]> => {
  try {
    const { data, error } = await supabase.rpc("get_party_design_entry_count");
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching party counts:", error);
    return [];
  }
};

export const fetchOrderDetails = async (
  party: string
): Promise<DesignDetail[]> => {
  try {
    const { data, error } = await supabase.rpc("get_designs_by_party", {
      party_name_input: party,
    });

    if (error) throw error;

    return data.map(
      (entry: {
        design_name: string;
        shades: string;
        remark: string;
        canceled: boolean;
        bhiwandi_date: string;
        price: number;
        design_entry_id: number;
        order_date: string;
        order_no: number;
      }) => ({
        design: entry.design_name,
        shades: entry.shades,
        totalMeters: entry.shades,
        remark: entry.remark,
        canceled: entry.canceled,
        bhiwandi_date: entry.bhiwandi_date,
        price: entry.price,
        design_entry_id: entry.design_entry_id,
        order_date: entry.order_date,
        order_no: entry.order_no,
        party_name: party,
      })
    );
  } catch (error) {
    console.error("Error fetching order details:", error);
    return [];
  }
};
