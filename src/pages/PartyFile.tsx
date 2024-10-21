import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import supabase from "@/utils/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerClose,
  DrawerTrigger,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Toaster } from "@/components/ui";

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
  price: number;
  design_entry_id: number;
}

interface SelectedDesignDetail extends DesignDetail {
  date: string; // New date attribute
}

function PartyFile() {
  const [partyCounts, setPartyCounts] = useState<PartyCount[]>([]);
  const [partyOrders, setPartyOrders] = useState<{
    [key: string]: DesignDetail[];
  }>({});
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // Add state for drawer visibility
  const [selectedEntries, setSelectedEntries] = useState<
    SelectedDesignDetail[]
  >([]);
  const { toast } = useToast();
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

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
        (entry: {
          design_name: string;
          shades: string;
          remark: string;
          canceled: boolean;
          bhiwandi_date: string;
          price: number;
          design_entry_id: number;
        }) => ({
          design: entry.design_name,
          shades: entry.shades,
          totalMeters: entry.shades,
          remark: entry.remark,
          canceled: entry.canceled,
          bhiwandi_date: entry.bhiwandi_date,
          price: entry.price,
          design_entry_id: entry.design_entry_id,
        })
      );

      setPartyOrders((prev) => ({ ...prev, [party]: designDetails }));
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  };

  // Function to toggle the drawer

  const addToDrawer = (entry: DesignDetail) => {
    const lastEntryDate =
      selectedEntries.length > 0
        ? selectedEntries[selectedEntries.length - 1].date
        : new Date().toISOString().split("T")[0]; // Use today's date if no entries

    setSelectedEntries((prev) => [...prev, { ...entry, date: lastEntryDate }]);

    setIsDrawerOpen(true);
  };

  // Function to remove an entry from the drawer
  const removeFromDrawer = (entry: DesignDetail) => {
    setSelectedEntries((prev) =>
      prev.filter((e) => e.design_entry_id !== entry.design_entry_id)
    );
  };

  const handleDispatch = async () => {
    try {
      const updates = selectedEntries.map((entry) => ({
        id: entry.design_entry_id,
        dispatch_date: entry.date,
      }));
      const { error } = await supabase.rpc(
        "update_design_entries_dispatch_date",
        {
          dispatch_info: updates,
        }
      );
      if (error) throw error;
      setSelectedEntries([]);
      setIsDrawerOpen(false);
      fetchPartyCounts();
      setOpenAccordionItems([]); // Close all accordions
      toast({
        title: "Success",
        description: "Entries dispatched successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Error sending entries to Dispatch. ${
          (error as Error).message
        }`,
      });
    }
  };

  return (
    <div className="container mx-auto mt-10 p-4 relative">
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerTrigger asChild>
          <Button className="absolute top-4 right-4">Dispatch</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Selected Entries</DrawerTitle>
            <DrawerDescription>
              Entries added to Dispatch list
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            {selectedEntries.map((entry, index) => (
              <div key={index} className="mb-4">
                <h3 className="text-lg font-semibold mb-2">{entry.design}</h3>
                <table className="w-full divide-y divide-gray-200">
                  <tbody>
                    <tr>
                      <td className="px-2 py-4 w-3/6 text-sm font-medium text-gray-900">
                        <div className="break-words">
                          {entry.design}
                          {entry.remark && (
                            <>
                              <br />
                              Remark: {entry.remark}
                            </>
                          )}
                          {entry.price && (
                            <>
                              <br />
                              Price: {entry.price}
                            </>
                          )}
                          <br />
                          <input
                            type="date"
                            className="mt-2 border rounded p-1"
                            value={entry.date}
                            onChange={(e) => {
                              const updatedDate = e.target.value;
                              setSelectedEntries((prev) =>
                                prev.map((e) =>
                                  e.design_entry_id === entry.design_entry_id
                                    ? { ...e, date: updatedDate }
                                    : e
                                )
                              );
                            }} // Update the date in selected entries
                          />
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
                      <td className="px-2 py-4 w-1/6 text-sm text-gray-500">
                        <Button
                          className="ml-2 bg-green-500 active:bg-green-500 visited:bg-green-500 hover:bg-green-500 rounded-full w-10 h-10 text-lg text-white"
                          onClick={() => removeFromDrawer(entry)} // Add function to remove entry from drawer
                        >
                          X
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <DrawerFooter>
            <Button
              onClick={handleDispatch} // Call the function when clicked
              className="mr-2" // Optional: Add some margin
              disabled={selectedEntries.length === 0} // Disable if no items in drawer
            >
              Dispatch
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <Button onClick={() => navigate("/")} className="mr-4">
        Back to Home
      </Button>

      <Accordion 
        type="multiple" 
        value={openAccordionItems}
        onValueChange={setOpenAccordionItems}
        className="w-full"
      >
        {partyCounts
          .sort((a, b) => a.party_name.localeCompare(b.party_name))
          .map((item, index) => (
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

                            const nameComparison = designA[1].localeCompare(
                              designB[1]
                            );
                            if (nameComparison !== 0) return nameComparison;

                            // Sort numerically
                            const numA = parseInt(designA[2] || "0");
                            const numB = parseInt(designB[2] || "0");
                            return numA - numB;
                          }) // Sort alphabetically by design and then numerically by number
                          .map((order, orderIndex) => (
                            <tr
                              key={order.design_entry_id}
                              className={
                                order.bhiwandi_date
                                  ? "bg-yellow-100"
                                  : order.canceled
                                  ? "bg-red-100"
                                  : orderIndex % 2 === 0
                                  ? "bg-white"
                                  : "bg-gray-50"
                              }
                            >
                              <td className="px-2 py-4 w-3/6 text-sm font-medium text-gray-900">
                                <div className="break-words">
                                  {order.design}
                                  {order.remark && (
                                    <>
                                      <br />
                                      Remark: {order.remark}
                                    </>
                                  )}
                                  {order.price && (
                                    <>
                                      <br />
                                      Price: {order.price}
                                    </>
                                  )}
                                </div>
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
                              <td className="px-2 py-4 w-1/6 text-sm text-gray-500">
                                {order.bhiwandi_date ? (
                                  selectedEntries.some(
                                    (entry) =>
                                      entry.design_entry_id ===
                                      order.design_entry_id
                                  ) ? (
                                    <Button
                                      className="ml-2 bg-red-500 active:bg-red-500 visited:bg-red-500 hover:bg-red-500 rounded-full w-10 h-10 text-lg text-white"
                                      onClick={() => removeFromDrawer(order)} // Remove entry from drawer on click
                                    >
                                      X
                                    </Button>
                                  ) : (
                                    <Button
                                      className="ml-2 bg-green-500 active:bg-green-500 visited:bg-green-500 hover:bg-green-500 rounded-full w-10 h-10 text-lg text-white"
                                      onClick={() => addToDrawer(order)} // Add entry to drawer on click
                                    >
                                      D
                                    </Button>
                                  )
                                ) : null}
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
      <Toaster />
    </div>
  );
}

export default PartyFile;
