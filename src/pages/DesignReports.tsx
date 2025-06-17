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
import { Toaster } from "@/components/ui";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface DesignCount {
  design: string;
  count: number;
  part: boolean;
}

interface OrderDetail {
  partyName: string;
  shades: { [key: string]: string }[];
  order_remark: string;
  id: number;
  price: number;
  part: boolean;
  entry_remark: string;
  order_date: string;
  order_no: number;
  design: string;
}

function DesignReports() {
  const [designCounts, setDesignCounts] = useState<DesignCount[]>([]);
  const [designOrders, setDesignOrders] = useState<{
    [key: string]: OrderDetail[];
  }>({});
  const [selectedEntries, setSelectedEntries] = useState<OrderDetail[]>([]);
  const [isReportDrawerOpen, setIsReportDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("all");
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [editedShades, setEditedShades] = useState<{ [key: string]: string }[]>([]);
  const [newShadeName, setNewShadeName] = useState("");
  const [newShadeValue, setNewShadeValue] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchDesignCounts();
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const optionsDate: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "long",
      year: "numeric",
    };

    const formattedDateGB = date.toLocaleDateString("en-GB", optionsDate);
    return `${formattedDateGB}`;
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

        const isANumeric = !isNaN(Number(nameA));
        const isBNumeric = !isNaN(Number(nameB));

        if (isANumeric && isBNumeric) {
          return Number(nameA) - Number(nameB);
        }
        if (isANumeric) return 1;
        if (isBNumeric) return -1;

        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
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
          id: number;
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
          order_remark: entry.order_remark,
          id: entry.id,
          price: entry.price,
          part: entry.part,
          entry_remark: entry.entry_remark,
          order_date: entry.order_date,
          order_no: entry.order_no,
          design: design,
        })
      );

      setDesignOrders((prev) => ({ ...prev, [design]: orderDetails }));
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  };

  const filteredDesignCounts = () => {
    if (filter === "all") {
      return designCounts.sort((a, b) => a.design.localeCompare(b.design));
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
        .filter((item) => !isNaN(Number(item.design)))
        .sort((a, b) => Number(a.design) - Number(b.design));
    } else if (filter === "digital") {
      return designCounts
        .filter((item) => item.design.includes("D-") || item.design.includes("DDBY-"))
        .sort((a, b) => {
          const numA = Number(a.design.split("-").pop());
          const numB = Number(b.design.split("-").pop());
          return numA - numB;
        });
    } else {
      return designCounts
        .filter(
          (item) =>
            (item.design.includes("-") &&
              /^\d{4}$/.test(item.design.slice(-4))) ||
            (item.design.includes("-") && /^\d{3}$/.test(item.design.slice(-3)))
        )
        .sort((a, b) => {
          const numA = Number(a.design.split("-").pop());
          const numB = Number(b.design.split("-").pop());
          return numA - numB;
        });
    }
  };

  const handleEditShades = (order: OrderDetail) => {
    setSelectedOrder(order);
    setEditedShades([...order.shades]);
    setIsEditDialogOpen(true);
  };

  const handleSaveShades = async () => {
    if (!selectedOrder) return;

    try {
      const { error } = await supabase
        .from("design_entries")
        .update({ shades: editedShades })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      // Update local state
      setDesignOrders((prev) => ({
        ...prev,
        [selectedOrder.design]: prev[selectedOrder.design].map((order) =>
          order.id === selectedOrder.id
            ? { ...order, shades: editedShades }
            : order
        ),
      }));

      toast({
        title: "Success",
        description: "Shades updated successfully",
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating shades:", error);
      toast({
        title: "Error",
        description: "Failed to update shades",
        variant: "destructive",
      });
    }
  };

  const handleAddShade = () => {
    if (newShadeName && newShadeValue) {
      setEditedShades([...editedShades, { [newShadeName]: newShadeValue }]);
      setNewShadeName("");
      setNewShadeValue("");
    }
  };

  const handleRemoveShade = (index: number) => {
    setEditedShades(editedShades.filter((_, i) => i !== index));
  };

  const handleUpdateShade = (index: number, value: string) => {
    const shadeName = Object.keys(editedShades[index])[0];
    const newShades = [...editedShades];
    newShades[index] = { [shadeName]: value };
    setEditedShades(newShades);
  };

  const handleAddFifty = (index: number) => {
    const shadeName = Object.keys(editedShades[index])[0];
    const currentValue = parseFloat(editedShades[index][shadeName]) || 0;
    const newValue = (currentValue + 50).toString();
    handleUpdateShade(index, newValue);
  };

  const handleSelectEntry = (order: OrderDetail) => {
    setSelectedEntries(prev => [...prev, order]);
  };

  const handleRemoveEntry = (orderId: number) => {
    setSelectedEntries(prev => prev.filter(entry => entry.id !== orderId));
  };

  const isEntrySelected = (orderId: number) => {
    return selectedEntries.some(entry => entry.id === orderId);
  };

  return (
    <div className="container mx-auto mt-4 p-2 sm:p-4 relative">
      <div className="sticky top-0 bg-white z-10 p-2 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
          <Button 
            onClick={() => navigate("/")} 
            className="w-full sm:w-auto"
          >
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
          <Sheet open={isReportDrawerOpen} onOpenChange={setIsReportDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                Selected Entries
                {selectedEntries.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {selectedEntries.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Selected Entries</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {selectedEntries.map((entry) => (
                  <div key={entry.id} className="p-4 border rounded-lg relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => handleRemoveEntry(entry.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <h3 className="font-medium">{entry.partyName}</h3>
                    <p className="text-sm text-gray-600">Design: {entry.design}</p>
                    <p className="text-sm text-gray-600">Order No: {entry.order_no}</p>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Shades:</h4>
                      <div className="space-y-1">
                        {entry.shades.map((shade, idx) => {
                          const shadeName = Object.keys(shade)[0];
                          const shadeValue = shade[shadeName];
                          if (shadeValue === "") return null;
                          return (
                            <div key={idx} className="text-sm">
                              <span className="font-medium">{shadeName}:</span> {shadeValue}m
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                {selectedEntries.length === 0 && (
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
            <AccordionTrigger
              className="text-lg flex justify-between items-center w-full hover:bg-gray-50"
              onClick={() => fetchOrderDetails(item.design)}
            >
              <div className="flex items-center gap-2">
                <span className="text-left font-medium">{item.design}</span>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {item.count} orders
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {designOrders[item.design] ? (
                <div className="overflow-x-auto">
                  <div className="min-w-full divide-y divide-gray-200">
                    {designOrders[item.design]
                      .sort((a, b) => Number(b.part) - Number(a.part))
                      .map((order, orderIndex) => (
                        <div
                          key={order.id}
                          className={`p-4 ${
                            orderIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <div className="flex sm:flex-row gap-4">
                            <div className="flex-1 min-w-0 flex flex-row gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className={`text-base font-medium ${
                                    order.part ? "text-red-500" : ""
                                  }`}>
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
                                        if (shadeValue == "") return null;
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
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button
                              onClick={() => handleEditShades(order)}
                              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                            >
                              Edit Shades
                            </Button>
                            {isEntrySelected(order.id) ? (
                              <Button
                                onClick={() => handleRemoveEntry(order.id)}
                                variant="destructive"
                                className="flex-1"
                              >
                                Remove from Report
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleSelectEntry(order)}
                                variant="outline"
                                className="flex-1"
                              >
                                Add to Report
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Shades</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {editedShades.map((shade, index) => {
                const shadeName = Object.keys(shade)[0];
                return (
                  <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                    <span className="font-medium min-w-[80px]">{shadeName}</span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={shade[shadeName]}
                        onChange={(e) => handleUpdateShade(index, e.target.value)}
                        className="w-24"
                      />
                      <Button
                        onClick={() => handleAddFifty(index)}
                        size="sm"
                        variant="outline"
                        className="px-2"
                      >
                        +50
                      </Button>
                    </div>
                    <span className="text-sm text-gray-500">m</span>
                    <Button
                      onClick={() => handleRemoveShade(index)}
                      variant="destructive"
                      size="sm"
                      className="ml-auto"
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Add New Shade</h4>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Shade name"
                  value={newShadeName}
                  onChange={(e) => setNewShadeName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Value"
                  value={newShadeValue}
                  onChange={(e) => setNewShadeValue(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">m</span>
                <Button 
                  onClick={handleAddShade}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  Add Shade
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveShades}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  );
}

export default DesignReports; 