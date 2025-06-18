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
import { useToast } from "@/hooks/use-toast"; // Import useToast at the top
import { Input, Toaster } from "@/components/ui";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { X, Truck } from "lucide-react"; // For icons

interface DesignCount {
  design: string;
  count: number;
  part: boolean;
}

interface OrderDetail {
  partyName: string;
  shades: { [key: string]: string }[];
  order_remark: string;
  id: number; // Add id to OrderDetail interface
  price: number;
  part: boolean;
  entry_remark: string;
  order_date: string;
  order_no: number;
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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const optionsDate: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "long", // Change month to 'long'
      year: "numeric",
    };

    const formattedDateGB = date.toLocaleDateString("en-GB", optionsDate); // Format date to day/month/year

    return `${formattedDateGB}`; // Return combined formatted date and time
  };
  const fetchDesignCounts = async () => {
    try {
      const { data, error } = await supabase.rpc("get_design_entry_count");

      if (error) throw error;
      const formattedData: DesignCount[] = data.map(
        (item: { design: string; count: bigint; part: bigint }) => ({
          design: item.design,
          count: Number(item.count),
          part: Boolean(Number(item.part) > 0),
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
          order_date: string;
          order_no: number;
        }) => ({
          partyName: entry.party_name,
          shades: entry.shades,
          order_remark: entry.order_remark, // Existing line
          id: entry.id, // Add this line to include id
          price: entry.price,
          part: entry.part,
          entry_remark: entry.entry_remark,
          order_date: entry.order_date,
          order_no: entry.order_no,
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
      if (drawerEntries.length === 0) {
        toast({
          title: "Error",
          description: "No entries to send to Bhiwandi",
        });
        return;
      }

      const today = new Date(
        new Date().getTime() + 5.5 * 60 * 60 * 1000
      ).toISOString();

      const idsToUpdate = drawerEntries.map((entry) => entry.id);

      //update remarks for design entries
      const remarksToUpdate = drawerEntries.map((entry) => ({
        id: entry.id,
        remark: entry.entry_remark,
      }));

      if (remarksToUpdate.length > 0) {
        for (const remark of remarksToUpdate) {
          const { error: remarkError } = await supabase
            .from("design_entries")
            .update(remark)
            .eq("id", remark.id);
          if (remarkError) throw remarkError;
        }
      }

      //update bhiwandi date for design entries
      const { error: bhiwandiError } = await supabase
        .from("design_entries")
        .update({ bhiwandi_date: today })
        .in("id", idsToUpdate);

      if (bhiwandiError) throw bhiwandiError;

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
      return designCounts.sort((a, b) => a.design.localeCompare(b.design)); // Sort alphabetically before returning
    } else if (filter === "regular") {
      return designCounts
        .filter(
          (item) =>
            !(
              item.design.includes("-") && /^\d{4}$/.test(item.design.slice(-4))
            ) &&
            !(
              item.design.includes("-") && /^\d{3}$/.test(item.design.slice(-3))
            ) &&
            isNaN(Number(item.design))
        )
        .sort((a, b) => a.design.localeCompare(b.design));
    } else if (filter === "Design No.") {
      return designCounts
        .filter((item) => !isNaN(Number(item.design))) // Filter out designs starting with "D-" or "P-"
        .sort((a, b) => Number(a.design) - Number(b.design)); // Sort numerically before returning
    } else if (filter === "digital") {
      return designCounts
        .filter(
          (item) => item.design.includes("D-") // Check if design ends with a 4-digit number
        )
        .sort((a, b) => {
          const numA = Number(a.design.split("-").pop());
          const numB = Number(b.design.split("-").pop());
          return numA - numB; // Sort by the number after the hyphen
        }); // Filter out designs starting with "P-"
    } else {
      return designCounts
        .filter(
          (item) =>
            (item.design.includes("-") &&
              /^\d{4}$/.test(item.design.slice(-4))) ||
            (item.design.includes("-") && /^\d{3}$/.test(item.design.slice(-3))) // Check if design ends with a 4-digit number
        )
        .sort((a, b) => {
          const numA = Number(a.design.split("-").pop());
          const numB = Number(b.design.split("-").pop());
          return numA - numB; // Sort by the number after the hyphen
        });
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
    <div className="container mx-auto mt-4 p-2 sm:p-4 relative">
      <div className="sticky top-0 bg-white z-10 p-2 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
          <Button onClick={() => navigate("/")} className="w-full sm:w-auto">
            Back to Home
          </Button>
          <ToggleGroup
            variant="outline"
            type="single"
            value={filter}
            onValueChange={(value) => {
              setFilter(value);
              setOpenAccordionItems([]);
            }}
            className="w-full sm:w-auto flex-wrap justify-start"
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
            <ToggleGroupItem value="digital" aria-label="Show digital">
              Digital
            </ToggleGroupItem>
            <ToggleGroupItem value="Design No." aria-label="Show Design No.">
              Design No.
            </ToggleGroupItem>
          </ToggleGroup>
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <Truck className="w-4 h-4 mr-2" />
                Bhiwandi
                {drawerEntries.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {drawerEntries.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Selected Entries</SheetTitle>
              </SheetHeader>
              {drawerEntries.length > 0 && (
                <Button
                  onClick={handleSendBhiwandi}
                  className="w-full mt-4"
                  variant="default"
                  disabled={drawerEntries.length === 0}
                >
                  Send to Bhiwandi
                </Button>
              )}
              <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-180px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {Object.entries(
                  drawerEntries.reduce((acc, entry) => {
                    if (!acc[entry.design]) acc[entry.design] = [];
                    acc[entry.design].push(entry);
                    return acc;
                  }, {} as Record<string, DrawerEntry[]>)
                ).map(([design, entries]) => (
                  <div key={design} className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">{design}</h3>
                    {entries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="p-4 border rounded-lg relative mb-2 bg-white"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => handleRemoveFromDrawer(entry.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <div className="font-medium">{entry.partyName}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Price: {entry.price}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          <div className="flex flex-row items-center gap-2">
                            <Input
                              value={entry.entry_remark}
                              onChange={(e) =>
                                handleEntryRemarkChange(entry.id, e.target.value)
                              }
                              placeholder="Entry Remark"
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              className=""
                              onClick={() =>
                                handleEntryRemarkChange(entry.id, "")
                              }
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2">
                          <h4 className="text-xs font-medium">Shades:</h4>
                          <div className="flex flex-wrap gap-2">
                            {entry.shades &&
                              entry.shades.map((shade, idx) => {
                                const shadeName = Object.keys(shade)[0];
                                const shadeValue = shade[shadeName];
                                if (!shadeValue) return null;
                                return (
                                  <span
                                    key={idx}
                                    className="bg-gray-100 px-2 py-1 rounded text-xs"
                                  >
                                    {shadeName}: {shadeValue}m
                                  </span>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {drawerEntries.length === 0 && (
                  <p className="text-center text-gray-500">No entries selected</p>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <Accordion
        type="multiple"
        className="w-full"
        value={openAccordionItems}
        onValueChange={setOpenAccordionItems}
      >
        {filteredDesignCounts().map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <div className="flex items-center justify-between w-full">
              <AccordionTrigger
                className="text-lg flex items-center w-full hover:bg-gray-50"
                onClick={() => fetchOrderDetails(item.design)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-left font-medium">{item.design}</span>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {item.count} orders
                  </span>
                </div>
              </AccordionTrigger>
            </div>
            <AccordionContent>
              {designOrders[item.design] ? (
                <div className="overflow-x-auto">
                  <div className="min-w-full divide-y divide-gray-200">
                    {designOrders[item.design]
                      .sort((a, b) => Number(b.part) - Number(a.part))
                      .map((order, orderIndex) => {
                        const isSelected = drawerEntries.some(
                          (entry) => entry.id === order.id
                        );
                        return (
                          <div
                            key={order.id}
                            className={`p-4 border rounded-lg mb-2 relative ${
                              isSelected
                                ? "bg-yellow-100 border-yellow-400"
                                : "bg-white"
                            }`}
                          >
                            <div className="flex flex-row sm:flex-row gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3
                                    className={`text-base font-medium ${
                                      order.part ? "text-red-500" : ""
                                    }`}
                                  >
                                    {order.partyName}
                                  </h3>
                                  {order.part && (
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                      Part
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                  {order.order_remark && (
                                    <p className="break-all">
                                      <span className="font-medium">Order Remark:</span> {order.order_remark}
                                    </p>
                                  )}
                                  <p>
                                    <span className="font-medium">Price:</span> ₹{order.price}
                                  </p>
                                  <p>
                                    <span className="font-medium">Date:</span> {formatDate(order.order_date)}
                                  </p>
                                  {order.order_no && (
                                    <p>
                                      <span className="font-medium">Order No:</span> {order.order_no}
                                    </p>
                                  )}
                                  {order.entry_remark && (
                                    <p>
                                      <span className="font-medium">Entry Remark:</span> {order.entry_remark}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-row gap-2 sm:w-48">
                                <div className="bg-gray-50 p-2 rounded-lg">
                                  <h4 className="text-sm font-medium mb-2">Shades</h4>
                                  <div className="space-y-1">
                                    {order.shades &&
                                      order.shades.map((shade, idx) => {
                                        const shadeName = Object.keys(shade)[0];
                                        const shadeValue = shade[shadeName];
                                        if (!shadeValue) return null;
                                        return (
                                          <div key={idx} className="text-sm">
                                            <span className="font-medium">{shadeName}:</span> {shadeValue}m
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              {isSelected ? (
                                <Button
                                  onClick={() => handleRemoveFromDrawer(order.id)}
                                  variant="destructive"
                                  className="flex-1"
                                >
                                  Remove from Bhiwandi
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleAddToDrawer(order, item.design)}
                                  variant="outline"
                                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
                                >
                                  Add to Bhiwandi
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  Loading order details...
                </div>
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
