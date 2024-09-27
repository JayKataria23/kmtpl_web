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

interface DesignCount {
  design: string;
  count: number;
}

interface OrderDetail {
  partyName: string;
  shades: number[];
  totalMeters: number;
}

function OrderFile() {
  const [designCounts, setDesignCounts] = useState<DesignCount[]>([]);
  const [designOrders, setDesignOrders] = useState<{
    [key: string]: OrderDetail[];
  }>({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchDesignCounts();
  }, []);

  const fetchDesignCounts = async () => {
    try {
      const { data, error } = await supabase.rpc("get_design_entry_count");

      if (error) throw error;

      const formattedData: DesignCount[] = data.map(
        (item: { design: string; count: bigint }) => ({
          design: item.design,
          count: Number(item.count), // Convert BIGINT to number
        })
      );
      console.log(formattedData);
      setDesignCounts(formattedData);
    } catch (error) {
      console.error("Error fetching design counts:", error);
    }
  };

  const fetchOrderDetails = async (design: string) => {
    try {
      const { data, error } = await supabase.rpc("get_orders_by_design", {
        design_input: design,
      });

      if (error) throw error;

      const orderDetails: OrderDetail[] = data.map(
        (entry: { party_name: string; shades: [] }) => ({
          partyName: entry.party_name,
          shades: entry.shades,
          totalMeters: entry.shades.reduce(
            (sum: number, meters: number) => sum + Number(meters || 0),
            0
          ),
        })
      );

      setDesignOrders((prev) => ({ ...prev, [design]: orderDetails }));
      console.log(designOrders);
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
        {designCounts.map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger
              className="text-lg"
              onClick={() => fetchOrderDetails(item.design)}
            >
              {item.design}
              <span className="text-sm text-gray-500 ml-2">
                count: {item.count}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {designOrders[item.design] ? (
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200">
                    <tbody>
                      {designOrders[item.design].map((order, orderIndex) => (
                        <tr
                          key={orderIndex}
                          className={orderIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <td className="px-2 py-4 w-2/3 text-sm font-medium text-gray-900">
                            <div className="break-words">{order.partyName}</div>
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

export default OrderFile;
