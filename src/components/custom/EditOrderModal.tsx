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
  className?: string;
}

interface OrderDetails {
  order_no: string;
  date: string;
  bill_to_id: number | null;
  ship_to_id: number | null;
  broker_id: number | null;
  transport_id: number | null;
  remark: string;
  canceled: boolean;
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
  shades: { [key: string]: string }[];
}

export function EditOrderModal({
  isOpen,
  onClose,
  orderId,
  onOrderUpdated,
  className,
}: EditOrderModalProps) {
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    order_no: "",
    date: "",
    bill_to_id: null,
    ship_to_id: null,
    broker_id: null,
    transport_id: null,
    remark: "",
    canceled: false,
  });
  const [partyOptions, setPartyOptions] = useState<Option[]>([]);
  const [brokerOptions, setBrokerOptions] = useState<Option[]>([]);
  const [transportOptions, setTransportOptions] = useState<Option[]>([]);
  const [designEntries, setDesignEntries] = useState<DesignEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<DesignEntry | null>(null);
  const [designs, setDesigns] = useState<string[]>([]);
  const [isDesignDialogOpen, setIsDesignDialogOpen] = useState(false);
  const { toast } = useToast();
  const [remarkOptions, setRemarkOptions] = useState<string[]>([]);
  const [newCustomShade, setNewCustomShade] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;

    try {
      fetchRemarkOptions();
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          bill_to:bill_to_id(id, name),
          ship_to:ship_to_id(id, name),
          broker:broker_id(id, name),
          transport:transport_id(id, name),
          canceled
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
        canceled: data.canceled || false,
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

  const handleAddDesignToDB = async (newDesign: string) => {
    if (newDesign.trim()) {
      const { data, error } = await supabase
        .from("designs")
        .insert({ title: newDesign.trim().toUpperCase() }) // Convert to uppercase
        .select();
      if (error) {
        toast({
          title: "Error",
          description: "Failed to add design",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Design "${data[0].title}" added successfully`,
        });
        fetchDesigns();
      }
    }
  };

  const fetchRemarkOptions = async () => {
    try {
      const { data, error } = await supabase.from("REMARKS").select("content");

      if (error) throw error;

      setRemarkOptions(data.map((remark) => remark.content));
    } catch (error) {
      console.error("Error fetching remark options:", error);
    }
  };

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
      shades: [
        { "All Colours": "" },
        ...Array.from({ length: 30 }, (_, i) => ({ [`${i + 1}`]: "" })),
      ],
    });
  };

  const handleShadeChange = (index: number, value: string) => {
    if (currentEntry) {
      setCurrentEntry({
        ...currentEntry,
        shades: currentEntry.shades.map((shade, i) =>
          i === index ? { ...shade, [Object.keys(shade)[0]]: value } : shade
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
            const currentValue = parseInt(shade[Object.keys(shade)[0]]) || 0; // Get the current value of the shade
            return { [Object.keys(shade)[0]]: (currentValue + 50).toString() }; // Increment by 50
          }
          return shade; // Return unchanged shade
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
    setIsSubmitting(true);
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

      // Fetch existing design entries from the database
      const { data: existingEntries, error: fetchError } = await supabase
        .from("design_entries")
        .select("*")
        .eq("order_id", orderId);

      if (fetchError) throw fetchError;

      // Create a map of existing entries for easy lookup
      const existingEntriesMap = new Map(existingEntries.map(entry => [entry.id, entry]));

      // Determine which entries to update and which to insert
      const designEntriesToUpdate: DesignEntry[] = []; // Explicitly define the type
      const designEntriesToInsert: DesignEntry[] = []; // Explicitly define the type
      const designEntriesToDelete = existingEntries.filter(entry => 
        !designEntries.some(currentEntry => currentEntry.id === entry.id)
      );

      designEntries.forEach(currentEntry => {
        if (existingEntriesMap.has(currentEntry.id)) {
          // If the entry exists, prepare it for update
          designEntriesToUpdate.push(currentEntry);
        } else {
          // If the entry does not exist, prepare it for insertion
          designEntriesToInsert.push(currentEntry);
        }
      });

      // Update existing design entries
      for (const entry of designEntriesToUpdate) {
        const { error: updateError } = await supabase
          .from("design_entries")
          .update({
            design: entry.design,
            price: entry.price,
            remark: entry.remark,
            shades: entry.shades,
          })
          .eq("id", entry.id);

        if (updateError) throw updateError;
      }

      // Delete design entries that are no longer present
      if (designEntriesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("design_entries")
          .delete()
          .in("id", designEntriesToDelete.map(entry => entry.id));

        if (deleteError) throw deleteError;
      }

      // Insert new design entries
      if (designEntriesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("design_entries")
          .insert(designEntriesToInsert.map(entry => ({
            order_id: orderId,
            design: entry.design,
            price: entry.price,
            remark: entry.remark,
            shades: entry.shades,
          })));

        if (insertError) throw insertError;
      }

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
    } finally {
      setIsSubmitting(false);
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
      shades: [
        { "All Colours": "" },
        ...Array.from({ length: 30 }, (_, i) => ({ [`${i + 1}`]: "" })),
      ],
    });
    setIsDesignDialogOpen(true);
  };

  const handleDelete = async (id: number | null) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ canceled: true }) // Update the canceled column to true
        .eq("id", id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Order canceled successfully", // Update success message
      });
      onOrderUpdated();
      onClose();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Error",
        description: `Failed to cancel order: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  const handleUndo = async (id: number | null) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ canceled: false }) // Update the canceled column to false
        .eq("id", id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Order restored successfully", // Update success message
      }); // Refresh the order list
      onOrderUpdated();
      fetchOrderDetails();
    } catch (error) {
      console.error("Error restoring order:", error);
      toast({
        title: "Error",
        description: `Failed to restore order: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={"sm:max-w-[425px] " + className}>
        <ScrollArea className="h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Order #{orderDetails.order_no}</DialogTitle>
            <div className="flex justify-between">
              {orderId && orderDetails.canceled ? ( // Conditional rendering for buttons
                <Button
                  onClick={() => handleUndo(orderId)} // Call handleUndo to restore the order
                  variant="outline"
                  size="sm"
                >
                  Undo
                </Button>
              ) : (
                <Button
                  onClick={() => handleDelete(orderId)} // Call handleDelete to cancel the order
                  variant="destructive"
                  size="sm"
                >
                  Delete
                </Button>
              )}
            </div>
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
                  {currentEntry && !designs.includes(currentEntry.design) && (
                    <Button
                      onClick={() =>
                        handleAddDesignToDB(currentEntry.design.toUpperCase())
                      }
                    >
                      Add Design
                    </Button>
                  )}
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
                        <div className="col-span-3 flex items-center">
                          <Input
                            id="remark"
                            value={currentEntry.remark}
                            onChange={(e) => handleRemarkChange(e.target.value)}
                            placeholder="Enter remark"
                            className="w-full"
                            list="remarks"
                          />
                          <Button
                            type="button"
                            className="ml-2"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemarkChange("")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <datalist id="remarks">
                            {remarkOptions.map((remark) => (
                              <option key={remark} value={remark} />
                            ))}
                          </datalist>
                        </div>
                      </div>
                      <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                        <div className="grid gap-4">
                          <div className="grid grid-cols-5 items-center gap-2">
                            <Label
                              htmlFor={`shade-custom`}
                              className="text-right col-span-1"
                            >
                              Custom
                            </Label>
                            <Input
                              value={newCustomShade} // Use the value of the shade object
                              onChange={(e) =>
                                setNewCustomShade(e.target.value.toUpperCase())
                              }
                              className="col-span-3"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="col-span-1"
                              onClick={() => {
                                if (currentEntry) {
                                  const newShade = { [newCustomShade]: "" }; // Create new shade object
                                  setCurrentEntry({
                                    ...currentEntry,
                                    shades: [
                                      currentEntry.shades[0], // Keep the first shade
                                      newShade, // Add the new shade at index 1
                                      ...currentEntry.shades.slice(1), // Spread the rest of the shades
                                    ],
                                  });
                                  setNewCustomShade(""); // Clear the input after adding
                                }
                              }}
                            >
                              Add
                            </Button>
                          </div>
                          {currentEntry.shades.length > 0 && // Check if there are shades
                            currentEntry.shades.map((shade, index) => (
                              <div
                                key={index}
                                className="grid grid-cols-5 items-center gap-2"
                              >
                                <Label
                                  htmlFor={`shade-${index}`}
                                  className="text-right col-span-1"
                                >
                                  {Object.keys(shade)[0]}{" "}
                                  {/* Use the key of the shade object */}
                                </Label>
                                <Input
                                  id={`shade-${index}`}
                                  value={shade[Object.keys(shade)[0]]} // Use the value of the shade object
                                  onChange={(e) =>
                                    handleShadeChange(index, e.target.value)
                                  }
                                  type="number"
                                  className="col-span-3"
                                />
                                <Button
                                  onClick={() => handleShadeIncrement(index)}
                                  variant="outline"
                                  size="sm"
                                  className="col-span-1"
                                >
                                  +50
                                </Button>
                              </div>
                            ))}
                          <Button
                            onClick={() => {
                              if (currentEntry) {
                                // Find the maximum shade number from existing shades
                                const maxShadeNumber = Math.max(
                                  ...currentEntry.shades.map(
                                    (shade) =>
                                      parseInt(Object.keys(shade)[0]) || 0
                                  )
                                );

                                const newShades = Array.from(
                                  { length: 10 },
                                  (_, i) => ({
                                    [`${maxShadeNumber + i + 1}`]: "",
                                  })
                                );
                                setCurrentEntry({
                                  ...currentEntry,
                                  shades: [
                                    ...currentEntry.shades,
                                    ...newShades,
                                  ],
                                });
                              }
                            }}
                            className="mt-4"
                          >
                            + 10
                          </Button>
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
            <ScrollArea className="max-h-40 overflow-y-auto">
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
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
