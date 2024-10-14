import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import supabase from "@/utils/supabase";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface PartyCount {
  party_name: string; // Changed from 'party' to 'party_name'
  design_entry_count: number; // Changed from 'count' to 'design_entry_count'
}

interface DesignDetail {
  design: string;
  shades: number[];
  totalMeters: number;
  remark: string;
  canceled: boolean;
  bhiwandi_date: string;
}

function PartyFile() {
  const [partyCounts, setPartyCounts] = useState<PartyCount[]>([]);
  const [partyOrders, setPartyOrders] = useState<{
    [key: string]: DesignDetail[];
  }>({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchPartyCounts();
  }, []);

  const fetchPartyCounts = async () => {
    try {
      const { data, error } = await supabase.rpc(
        "get_party_design_entry_count"
      );

      if (error) throw error;

      setPartyCounts(data); // Directly set the data without mapping
    } catch (error) {
      console.error("Error fetching party counts:", error);
    }
  };

  const fetchOrderDetails = async (party: string) => {
    try {
      const { data, error } = await supabase.rpc("get_designs_by_party", {
        party_name_input: party, // Changed from party_input to party_name_input
      });

      if (error) throw error;

      const designDetails: DesignDetail[] = data.map(
        (entry: { design_name: string; shades: string; remark: string, canceled: boolean, bhiwandi_date: string }) => ({
          design: entry.design_name,
          shades: entry.shades,
          totalMeters: entry.shades,
          remark: entry.remark,
          canceled: entry.canceled,
          bhiwandi_date: entry.bhiwandi_date,
        })
      );

      setPartyOrders((prev) => ({ ...prev, [party]: designDetails }));
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  };

  return (
    <div className="container mx-auto mt-10 p-4">
      <Button onClick={() => navigate("/")} className="mb-4">
        Back to Home
      </Button>
      <Accordion type="single" collapsible className="w-full">
        {partyCounts.sort((a, b) => a.party_name.localeCompare(b.party_name)).map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger
              className="text-md flex justify-between items-center w-full"
              onClick={() => fetchOrderDetails(item.party_name)}
            >
              <span className="text-left flex-grow">{item.party_name}</span>
              <span className="text-sm min-w-20 text-gray-500 ml-2 ">
                count: {item.design_entry_count}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {partyOrders[item.party_name] ? (
                <div className="overflow-x-auto ">
                  <table className="w-full divide-y divide-gray-200">
                    <tbody>
                      {partyOrders[item.party_name]
                        ?.sort((a, b) => {
                          const designA = a.design.match(/(\D+)(\d*)/);
                          const designB = b.design.match(/(\D+)(\d*)/);
                          
                          // Handle cases where designA or designB is null
                          if (!designA && !designB) return 0;
                          if (!designA) return 1;
                          if (!designB) return -1;

                          const nameComparison = designA[1].localeCompare(designB[1]);
                          if (nameComparison !== 0) return nameComparison;

                          // Sort numerically
                          const numA = parseInt(designA[2] || '0');
                          const numB = parseInt(designB[2] || '0');
                          return numA - numB;
                        }) // Sort alphabetically by design and then numerically by number
                        .map((order, orderIndex) => (
                        <tr
                          key={orderIndex}
                          className={
                            order.bhiwandi_date ? "bg-yellow-50" : (order.canceled ? "bg-red-100" : (orderIndex % 2 === 0 ? "bg-white" : "bg-gray-50"))
                          }
                        >
                          <td className="px-2 py-4 w-2/3 text-sm font-medium text-gray-900">
                            <div className="break-words">
                              {order.design}
                              {order.remark && (
                                <>
                                  <br />
                                  Remark: {order.remark}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-4 w-1/3 text-sm text-gray-500">
                            {order.shades.map((meters, index) =>
                              meters ? (
                                <div key={index}>
                                  {index + 1}: {meters}m
                                </div>
                              ) : null
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>Loading order details...</p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export default PartyFile;
