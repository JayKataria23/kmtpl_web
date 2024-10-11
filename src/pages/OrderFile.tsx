import { useState, useEffect, useMemo } from "react"; // Add useMemo import
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import supabase from "@/utils/supabase";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast"; // Import useToast at the top

interface DesignCount {
  design: string;
  count: number;
}

interface OrderDetail {
  partyName: string;
  shades: number[];
  order_remark: string;
  id: number; // Add id to OrderDetail interface
}

interface DrawerEntry extends OrderDetail {
  design: string;
  id: number; // Add id to DrawerEntry interface
}

function OrderFile() {
  const [designCounts, setDesignCounts] = useState<DesignCount[]>([]);
  const [designOrders, setDesignOrders] = useState<{
    [key: string]: OrderDetail[];
  }>({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerEntries, setDrawerEntries] = useState<DrawerEntry[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast(); // Initialize toast

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
        (entry: {
          id: number; // Add id to the mapping
          party_name: string;
          shades: [];
          order_remark: string | null;
        }) => ({
          partyName: entry.party_name,
          shades: entry.shades,
          order_remark: entry.order_remark, // Existing line
          id: entry.id, // Add this line to include id
        })
      );

      setDesignOrders((prev) => ({ ...prev, [design]: orderDetails }));
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  };

  const handleAddToDrawer = (order: OrderDetail, design: string) => {
    setDrawerEntries((prev) => [...prev, { ...order, design, id: order.id }]); // Include id in the drawer entry
  };

  const handleRemoveFromDrawer = (id: number) => {
    setDrawerEntries((prev) => prev.filter((entry) => entry.id !== id)); // Remove entry by id
  };

  // Sort the drawerEntries by design
  const sortedDrawerEntries = useMemo(() => {
    return [...drawerEntries].sort((a, b) => a.design.localeCompare(b.design));
  }, [drawerEntries]);

  const handleSendBhiwandi = async () => {
    try {
      const today = new Date().toDateString(); 
      const idsToUpdate = drawerEntries.map((entry) => entry.id); // Extract the IDs from drawerEntries

      const { data, error } = await supabase
        .from("design_entries")
        .update({ bhiwandi_date: today }) // Set the bhiwandi_date to today
        .in("id", idsToUpdate); // Update only the entries with the specified IDs

      if (error) throw error;

      console.log("Successfully updated Bhiwandi dates:", data);
      toast({
        // Add success toast
        title: "Success",
        description: `Successfully sent ${idsToUpdate.length} entries to Bhiwandi.`,
      });
      fetchDesignCounts();
      setDrawerEntries([]);
    } catch (error) {
      console.error("Error sending to Bhiwandi:", error);
      toast({
        // Add error toast
        title: "Error",
        description: `Failed to send entries to Bhiwandi: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto mt-10 p-4 relative">
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerTrigger asChild>
          <Button className="absolute top-4 right-4">Bhiwandi</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Selected Entries</DrawerTitle>
            <DrawerDescription>
              Entries added to Bhiwandi list
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            {Object.entries(
              sortedDrawerEntries.reduce((acc, entry) => {
                if (!acc[entry.design]) acc[entry.design] = [];
                acc[entry.design].push(entry);
                return acc;
              }, {} as Record<string, DrawerEntry[]>)
            ).map(([design, entries]) => (
              <div key={design} className="mb-4">
                <h3 className="text-lg font-semibold mb-2">{design}</h3>
                <table className="w-full divide-y divide-gray-200">
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-2 py-4 w-4/6 text-sm font-medium text-gray-900">
                          <div className="break-words">{entry.partyName}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {entry.order_remark}
                          </div>
                        </td>
                        <td className="px-2 py-4 w-2/6 text-sm text-gray-500">
                          {entry.shades.map((meters, idx) =>
                            meters ? (
                              <div key={idx}>
                                {idx + 1}: {meters}m
                              </div>
                            ) : null
                          )}
                        </td>
                        <td className="px-2 py-4 w-1/6 text-right">
                          {" "}
                          {/* Added a new cell for the button */}
                          <Button
                            className="ml-2 rounded-full w-8 h-8 text-white"
                            onClick={() => handleRemoveFromDrawer(entry.id)} // Call the remove function
                          >
                            X
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <DrawerFooter>
            <Button
              onClick={handleSendBhiwandi} // Call the function when clicked
              className="mr-2" // Optional: Add some margin
              disabled={drawerEntries.length === 0} // Disable if no items in drawer
            >
              Send to Bhiwandi
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Button onClick={() => navigate("/")} className="mb-4">
        Back to Home
      </Button>
      <Accordion type="single" collapsible className="w-full">
        {designCounts.map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger
              className="text-lg flex justify-between items-center w-full"
              onClick={() => fetchOrderDetails(item.design)}
            >
              <span className="text-left flex-grow">{item.design}</span>
              <span className="text-sm text-gray-500 ml-2 mr-3">
                count: {item.count}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {designOrders[item.design] ? (
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200">
                    <tbody>
                      {designOrders[item.design].map((order, orderIndex) => {
                        const isSelected = drawerEntries.some(
                          (entry) => entry.id === order.id
                        );
                        return (
                          <tr
                            key={order.id}
                            className={
                              isSelected
                                ? "bg-yellow-100"
                                : orderIndex % 2 === 0
                                ? "bg-white"
                                : "bg-gray-50"
                            }
                          >
                            <td className="px-2 py-4 w-3/6 text-sm font-medium text-gray-900">
                              <div className="break-words">
                                {order.partyName}
                              </div>
                              {order.order_remark && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {order.order_remark}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-4 w-2/6 text-sm text-gray-500">
                              {order.shades.map((meters, index) =>
                                meters ? (
                                  <div key={index}>
                                    {index + 1}: {meters}m
                                  </div>
                                ) : null
                              )}
                            </td>
                            <td className="px-2 py-4 w-1/6">
                              {isSelected ? (
                                <Button
                                  className="ml-2 rounded-full w-8 h-8 text-white"
                                  onClick={() =>
                                    handleRemoveFromDrawer(order.id)
                                  }
                                >
                                  X
                                </Button>
                              ) : (
                                <Button
                                  onClick={() =>
                                    handleAddToDrawer(order, item.design)
                                  }
                                  className="ml-2 rounded-full w-8 h-8 bg-yellow-500 active:bg-yellow-500 visited:bg-yellow-500 hover:bg-yellow-500"
                                >
                                  B
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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
