import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, Input, Label, ScrollArea } from "@/components/ui";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/utils/supabase";
import InputWithAutocomplete from "@/components/custom/InputWithAutocomplete";
import { format, isValid, parseISO } from "date-fns";
import { X } from "lucide-react";

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
  onOrderUpdated: () => void;
}

interface OrderDetails {
  order_no: string;
  date: string;
  bill_to_id: number | null;
  ship_to_id: number | null;
  broker_id: number | null;
  transport_id: number | null;
  remark: string;
}

interface Option {
  id: number;
  name: string;
}

interface DesignEntry {
  id: string;
  design: string;
  price: number | string; // Updated to allow number
  remark: string;
  shades: string[];
}

export function EditOrderModal({
  isOpen,
  onClose,
  orderId,
  onOrderUpdated,
}: EditOrderModalProps) {
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    order_no: "",
    date: "",
    bill_to_id: null,
    ship_to_id: null,
    broker_id: null,
    transport_id: null,
    remark: "",
  });
  const [partyOptions, setPartyOptions] = useState<Option[]>([]);
  const [brokerOptions, setBrokerOptions] = useState<Option[]>([]);
  const [transportOptions, setTransportOptions] = useState<Option[]>([]);
  const [designEntries, setDesignEntries] = useState<DesignEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<DesignEntry | null>(null);
  const [designs, setDesigns] = useState<string[]>([]);
  const [isDesignDialogOpen, setIsDesignDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          bill_to:bill_to_id(id, name),
          ship_to:ship_to_id(id, name),
          broker:broker_id(id, name),
          transport:transport_id(id, name)
        `
        )
        .eq("id", orderId)
        .single();

      if (error) throw error;

      setOrderDetails({
        ...data,
        bill_to_id: data.bill_to?.id || null,
        ship_to_id: data.ship_to?.id || null,
        broker_id: data.broker?.id || null,
        transport_id: data.transport?.id || null,
      });
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch order details",
        variant: "destructive",
      });
    }
  }, [orderId, toast]);

  const fetchOptions = useCallback(async () => {
    try {
      const [partiesResponse, brokersResponse, transportsResponse] =
        await Promise.all([
          supabase.from("party_profiles").select("id, name"),
          supabase.from("brokers").select("id, name"),
          supabase.from("transport_profiles").select("id, name"),
        ]);

      setPartyOptions(partiesResponse.data || []);
      setBrokerOptions(brokersResponse.data || []);
      setTransportOptions(transportsResponse.data || []);
    } catch (error) {
      console.error("Error fetching options:", error);
      toast({
        title: "Error",
        description: "Failed to fetch options",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchDesigns = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("designs")
        .select("title")
        .order("title");

      if (error) throw error;

      const designTitles = data.map((design) => design.title);
      setDesigns(designTitles);
    } catch (error) {
      console.error("Error fetching designs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch designs",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchDesignEntries = useCallback(async () => {
    if (!orderId) return;

    try {
      const { data, error } = await supabase
        .from("design_entries")
        .select("*")
        .eq("order_id", orderId);

      if (error) throw error;

      setDesignEntries(
        data.map((entry) => ({
          id: entry.id,
          design: entry.design,
          price: entry.price,
          remark: entry.remark,
          shades: entry.shades,
        }))
      );
    } catch (error) {
      console.error("Error fetching design entries:", error);
      toast({
        title: "Error",
        description: "Failed to fetch design entries",
        variant: "destructive",
      });
    }
  }, [orderId, toast]);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
      fetchOptions();
      fetchDesigns();
      fetchDesignEntries();
    }
  }, [
    isOpen,
    orderId,
    fetchOrderDetails,
    fetchOptions,
    fetchDesigns,
    fetchDesignEntries,
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOrderDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (value: string) => {
    setOrderDetails((prev) => ({ ...prev, date: value }));
  };

  const handleSelectChange = (field: keyof OrderDetails, value: string) => {
    const option = getOptionsForField(field).find(
      (opt) => opt.name.toLowerCase() === value.toLowerCase()
    );
    if (option) {
      setOrderDetails((prev) => ({ ...prev, [field]: option.id }));
    }
  };

  const getOptionsForField = (field: keyof OrderDetails): Option[] => {
    switch (field) {
      case "broker_id":
        return brokerOptions;
      case "transport_id":
        return transportOptions;
      case "bill_to_id":
      case "ship_to_id":
        return partyOptions;
      default:
        return [];
    }
  };

  const getSelectedValue = (field: keyof OrderDetails): string => {
    const options = getOptionsForField(field);
    return options.find((opt) => opt.id === orderDetails[field])?.name || "";
  };

  const handleDesignSelect = (design: string) => {
    setCurrentEntry({
      id: Date.now().toString(),
      design,
      price: "",
      remark: "",
      shades: Array(50).fill(""),
    });
  };

  const handleShadeChange = (index: number, value: string) => {
    if (currentEntry) {
      setCurrentEntry({
        ...currentEntry,
        shades: currentEntry.shades.map((shade, i) =>
          i === index ? value : shade
        ),
      });
    }
  };

  const handlePriceChange = (value: string) => {
    if (currentEntry) {
      setCurrentEntry({
        ...currentEntry,
        price: value,
      });
    }
  };

  const handleRemarkChange = (value: string) => {
    if (currentEntry) {
      setCurrentEntry({
        ...currentEntry,
        remark: value,
      });
    }
  };

  const handleShadeIncrement = (index: number) => {
    if (currentEntry) {
      setCurrentEntry({
        ...currentEntry,
        shades: currentEntry.shades.map((shade, i) => {
          if (i === index) {
            const currentValue = parseInt(shade) || 0;
            return (currentValue + 50).toString();
          }
          return shade;
        }),
      });
    }
  };

  const handleSaveDesign = () => {
    if (currentEntry) {
      if (
        currentEntry.price === undefined ||
        currentEntry.price === null ||
        (typeof currentEntry.price === "string" &&
          currentEntry.price.trim() === "")
      ) {
        toast({
          title: "Error",
          description: "Please enter a price for the design before saving.",
          variant: "destructive",
        });
        return;
      }

      setDesignEntries((prev) => {
        const index = prev.findIndex((entry) => entry.id === currentEntry.id);
        if (index !== -1) {
          // Update existing entry
          return prev.map((entry) =>
            entry.id === currentEntry.id ? currentEntry : entry
          );
        } else {
          // Add new entry
          return [...prev, currentEntry];
        }
      });
      setCurrentEntry(null);
      setIsDesignDialogOpen(false);
      toast({
        title: "Design Saved",
        description: `${currentEntry.design} has been saved successfully.`,
      });
    }
  };

  const handleEditDesign = (id: string) => {
    const entryToEdit = designEntries.find((entry) => entry.id === id);
    if (entryToEdit) {
      setCurrentEntry({ ...entryToEdit });
      setIsDesignDialogOpen(true);
    }
  };

  const handleDeleteDesign = (id: string) => {
    setDesignEntries((prev) => prev.filter((entry) => entry.id !== id));
    toast({
      title: "Design Deleted",
      description: `Design entry has been deleted.`,
    });
  };

  const handleSubmit = async () => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          date: orderDetails.date,
          bill_to_id: orderDetails.bill_to_id,
          ship_to_id: orderDetails.ship_to_id,
          broker_id: orderDetails.broker_id,
          transport_id: orderDetails.transport_id,
          remark: orderDetails.remark,
        })
        .eq("id", orderId);

      if (error) throw error;

      // Update design entries
      await supabase.from("design_entries").delete().eq("order_id", orderId);

      const designEntriesData = designEntries.map((design) => ({
        order_id: orderId,
        design: design.design,
        price: design.price,
        remark: design.remark,
        shades: design.shades,
      }));

      const { error: designEntriesError } = await supabase
        .from("design_entries")
        .insert(designEntriesData);

      if (designEntriesError) throw designEntriesError;

      toast({ title: "Success", description: "Order updated successfully" });
      onOrderUpdated();
      onClose();
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    return isValid(date) ? format(date, "yyyy-MM-dd") : "";
  };

  const handleAddDesign = () => {
    setCurrentEntry({
      id: Date.now().toString(),
      design: "",
      price: "",
      remark: "",
      shades: Array(50).fill(""),
    });
    setIsDesignDialogOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Order #{orderDetails.order_no}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Date
            </Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={formatDate(orderDetails.date)}
              onChange={(e) => handleDateChange(e.target.value)}
              className="col-span-3"
            />
          </div>
          {(
            ["bill_to_id", "ship_to_id", "broker_id", "transport_id"] as const
          ).map((field) => (
            <div key={field} className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={field} className="text-right">
                {field
                  .replace("_id", "")
                  .replace("_", " ")
                  .charAt(0)
                  .toUpperCase() +
                  field.replace("_id", "").replace("_", " ").slice(1)}
              </Label>
              <InputWithAutocomplete
                label={field}
                id={field}
                value={getSelectedValue(field)}
                onChange={(value) => handleSelectChange(field, value)}
                options={getOptionsForField(field)}
                placeholder={`Select ${field
                  .replace("_id", "")
                  .replace("_", " ")}`}
                className="col-span-3"
              />
            </div>
          ))}
          <div>
            <Label>Designs</Label>
            <Button className="w-full mt-2" onClick={handleAddDesign}>
              Add Design
            </Button>
          </div>

          <Dialog
            open={isDesignDialogOpen}
            onOpenChange={setIsDesignDialogOpen}
          >
            <DialogContent className="sm:max-w-[425px] top-[40%]">
              <DialogHeader>
                <DialogTitle>
                  {currentEntry?.design
                    ? `Edit ${currentEntry.design}`
                    : "Add Design"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="design" className="text-right">
                    Design
                  </Label>
                  <Input
                    id="design"
                    list="designs"
                    value={currentEntry?.design || ""}
                    onChange={(e) => handleDesignSelect(e.target.value)}
                    className="col-span-3"
                    placeholder="Search for a design"
                  />
                  <datalist id="designs">
                    {designs.map((design) => (
                      <option key={design} value={design} />
                    ))}
                  </datalist>
                </div>
                {currentEntry && designs.includes(currentEntry.design) && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="price" className="text-right">
                        Price
                      </Label>
                      <Input
                        id="price"
                        value={currentEntry.price}
                        onChange={(e) => handlePriceChange(e.target.value)}
                        className="col-span-3"
                        placeholder="Enter price"
                        type="number"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="remark" className="text-right">
                        Remark
                      </Label>
                      <Input
                        id="remark"
                        value={currentEntry.remark}
                        onChange={(e) => handleRemarkChange(e.target.value)}
                        className="col-span-3"
                        placeholder="Enter remark"
                      />
                    </div>
                    <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                      <div className="grid gap-4">
                        {Array.from({ length: 50 }, (_, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-5 items-center gap-2"
                          >
                            <Label
                              htmlFor={`shade-${i}`}
                              className="text-right col-span-1"
                            >
                              Shade {i + 1}
                            </Label>
                            <Input
                              id={`shade-${i}`}
                              value={currentEntry.shades[i]}
                              onChange={(e) =>
                                handleShadeChange(i, e.target.value)
                              }
                              className="col-span-3"
                            />
                            <Button
                              onClick={() => handleShadeIncrement(i)}
                              variant="outline"
                              size="sm"
                              className="col-span-1"
                            >
                              +50
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <Button onClick={handleSaveDesign} className="mt-4">
                      Save Design
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Scrollable area for design entries */}
          <ScrollArea className="max-h-50 overflow-y-auto">
            {" "}
            {/* Adjust max height as needed */}
            {designEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex justify-between p-2 bg-gray-100 rounded mb-2"
              >
                <div>
                  <span>
                    {entry.design} - Price: {entry.price || "N/A"}
                  </span>
                  {entry.remark && (
                    <p className="text-sm text-gray-600">
                      Remark: {entry.remark}
                    </p>
                  )}
                </div>
                <div className="space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditDesign(entry.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDesign(entry.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </ScrollArea>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="remark" className="text-right">
              Remark
            </Label>
            <Input
              id="remark"
              name="remark"
              value={orderDetails.remark || ""}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
