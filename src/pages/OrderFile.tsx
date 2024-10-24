import { useState, useEffect } from "react"; // Add useMemo import
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
import { Input, Toaster } from "@/components/ui";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface DesignCount {
  design: string;
  count: number;
}

interface OrderDetail {
  partyName: string;
  shades: number[];
  order_remark: string;
  id: number; // Add id to OrderDetail interface
  price: number;
  part: boolean;
  entry_remark: string;
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
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all"); // State for filter
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

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
      formattedData.sort((a, b) => {
        const nameA = a.design.toLowerCase();
        const nameB = b.design.toLowerCase();

        // Check if both names are purely numeric
        const isANumeric = !isNaN(Number(nameA));
        const isBNumeric = !isNaN(Number(nameB));

        if (isANumeric && isBNumeric) {
          return Number(nameA) - Number(nameB); // Sort numerically if both are numeric
        }
        if (isANumeric) return 1; // Numeric comes after alphabets
        if (isBNumeric) return -1; // Numeric comes after alphabets

        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0; // If they are equal
      });

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
          price: number;
          part: boolean;
          entry_remark: string | null;
        }) => ({
          partyName: entry.party_name,
          shades: entry.shades,
          order_remark: entry.order_remark, // Existing line
          id: entry.id, // Add this line to include id
          price: entry.price,
          part: entry.part,
          entry_remark: entry.entry_remark,
        })
      );

      setDesignOrders((prev) => ({ ...prev, [design]: orderDetails }));
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  };

  const handleAddToDrawer = (order: OrderDetail, design: string) => {
    setDrawerEntries((prev) => [...prev, { ...order, design, id: order.id }]);
  };

  const handleRemoveFromDrawer = (id: number) => {
    setDrawerEntries((prev) => prev.filter((entry) => entry.id !== id)); // Remove entry by id
  };

  // Sort the drawerEntries by design

  const handleSendBhiwandi = async () => {
    try {
      const today = new Date(
        new Date().getTime() + 5.5 * 60 * 60 * 1000
      ).toISOString();

      const idsToUpdate = drawerEntries.map((entry) => entry.id);

      const { data, error } = await supabase
        .from("design_entries")
        .update({ bhiwandi_date: today })
        .in("id", idsToUpdate);

      if (error) throw error;

      console.log("Successfully updated Bhiwandi dates:", data);
      toast({
        title: "Success",
        description: `Successfully sent ${idsToUpdate.length} entries to Bhiwandi.`,
      });
      fetchDesignCounts();
      setDrawerEntries([]);
      setIsDrawerOpen(false);
      setOpenAccordionItems([]); // Close all accordions
    } catch (error) {
      console.error("Error sending to Bhiwandi:", error);
      toast({
        title: "Error",
        description: `Failed to send entries to Bhiwandi: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  const filteredDesignCounts = () => {
    if (filter === "all") {
      return designCounts; // No filter applied
    } else if (filter === "regular") {
      return designCounts.filter(
        (item) =>
          !item.design.startsWith("D-") &&
          !item.design.startsWith("P-") &&
          !item.design.startsWith("WC-") &&
          !item.design.startsWith("RLT-") &&
          isNaN(Number(item.design))
      ); // Filter out designs starting with "D-" or "P-"
    } else if (filter === "Design No.") {
      return designCounts.filter((item) => !isNaN(Number(item.design))); // Filter out designs starting with "D-" or "P-"
    } else {
      return designCounts.filter(
        (item) =>
          item.design.startsWith("P-") ||
          item.design.startsWith("D-") ||
          item.design.startsWith("WC-") ||
          item.design.startsWith("RLT-")
      ); // Filter out designs starting with "D-" or "P-"
    }
  };

  const handleEntryRemarkChange = (id: number, value: string) => {
    setDrawerEntries((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, entry_remark: value } : entry
      )
    );
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
              drawerEntries.reduce((acc, entry) => {
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
                          {entry.order_remark && (
                            <div className="text-xs text-gray-500 mt-1">
                              Remark: {entry.order_remark}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Price: {entry.price}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Remark:{" "}
                            <Input
                              value={entry.entry_remark}
                              onChange={(e) =>
                                handleEntryRemarkChange(
                                  entry.id,
                                  e.target.value
                                )
                              }
                            ></Input>
                            <Button className="m-2">Clear</Button>
                            {/* <Button onClick={() => handleUpdateEntryRemark(entry.id)}>Update</Button> */}
                          </div>
                        </td>
                        <td className="px-2 py-4 w-2/6 text-sm text-gray-500">
                          {entry.shades[50] == 0 || entry.shades.length == 50
                            ? entry.shades.map((meters, idx) =>
                                meters ? (
                                  <div key={idx}>
                                    {idx + 1}: {meters}m
                                  </div>
                                ) : null
                              )
                            : "All Colours: " + entry.shades[50] + "m"}
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
      <ToggleGroup
        variant="outline"
        type="single"
        value={filter}
        onValueChange={setFilter}
        className="mb-4 mx-4 border" // Added border class
      >
        <ToggleGroupItem value="all" aria-label="Show all">
          ALL
        </ToggleGroupItem>
        <ToggleGroupItem value="regular" aria-label="Show regular">
          Regular
        </ToggleGroupItem>
        <ToggleGroupItem value="print" aria-label="Show print">
          Print
        </ToggleGroupItem>
        <ToggleGroupItem value="Design No." aria-label="Show Design No.">
          Design No.
        </ToggleGroupItem>
      </ToggleGroup>
      <Accordion
        type="multiple"
        className="w-full"
        value={openAccordionItems}
        onValueChange={setOpenAccordionItems}
      >
        {filteredDesignCounts().map((item, index) => (
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
                      {designOrders[item.design]
                        .sort((a, b) => Number(b.part) - Number(a.part)) // Sort orders with part = true at the top
                        .map((order, orderIndex) => {
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
                                <div
                                  className={`break-words ${
                                    order.part ? "text-red-500" : ""
                                  }`}
                                >
                                  {order.partyName}
                                </div>
                                {order.order_remark && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Order Remark: {order.order_remark}
                                  </div>
                                )}
                                <div className="text-xs text-gray-500 mt-1">
                                  Price: {order.price}
                                </div>
                                {order.entry_remark && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Entry Remark: {order.entry_remark}
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-4 w-2/6 text-sm text-gray-500">
                                {order.shades[50] == 0 ||
                                order.shades.length == 50
                                  ? order.shades.map((meters, idx) =>
                                      meters ? (
                                        <div key={idx}>
                                          {idx + 1}: {meters}m
                                        </div>
                                      ) : null
                                    )
                                  : "All Colours: " + order.shades[50] + "m"}
                              </td>
                              <td className="px-2 py-4 w-1/6">
                                {isSelected ? (
                                  <Button
                                    className="ml-2 rounded-full w-10 h-10 text-lg text-white"
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
                                    className="ml-2 rounded-full w-10 h-10 bg-yellow-500 active:bg-yellow-500 visited:bg-yellow-500 hover:bg-yellow-500 text-lg"
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
      <Toaster />
    </div>
  );
}

export default OrderFile;
