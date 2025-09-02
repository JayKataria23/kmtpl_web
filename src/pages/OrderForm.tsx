/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import {
  Printer,
  Save,
  ChevronLeft,
  ChevronRight,
  X,
  Home,
} from "lucide-react";
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  ScrollArea,
  Toaster,
} from "@/components/ui";
import supabase from "@/utils/supabase";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import InputWithAutocomplete from "@/components/custom/InputWithAutocomplete";
// Add this import at the top of your file
import { useUser } from "@clerk/clerk-react"; // Import useAuth
import NewPartyDrawer from "@/components/custom/NewPartyDrawer";
import { AddNewDesign } from "@/components/custom/AddNewDesign";

interface DesignEntry {
  id: string;
  design: string;
  price: string;
  remark: string;
  shades: { [key: string]: string }[];
}

interface PriceEntry {
  design: string;
  price: string;
}

interface OrderDetails {
  orderNo: string;
  date: string;
  billTo: number | null;
  shipTo: number | null;
  broker: number | null;
  transport: number | null;
  designs: DesignEntry[];
  remark: string;
  billToAddress?: string;
  shipToAddress?: string;
}

export default function OrderForm() {
  const [date, setDate] = useState(new Date());
  const [designEntries, setDesignEntries] = useState<DesignEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<DesignEntry | null>(null);
  const [designs, setDesigns] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const [brokerOptions, setBrokerOptions] = useState<
    { id: number; name: string }[]
  >([]);
  const [transportOptions, setTransportOptions] = useState<
    { id: number; name: string }[]
  >([]);
  const [partyOptions, setPartyOptions] = useState<
    {
      id: number;
      name: string;
      delivery_id: number | null;
      broker_id: number | null;
      transport_id: number | null;
    }[]
  >([]);
  const [selectedBillTo, setSelectedBillTo] = useState<number | null>(null);
  const [selectedShipTo, setSelectedShipTo] = useState<number | null>(null);
  const [selectedBroker, setSelectedBroker] = useState<number | null>(null);
  const [selectedTransport, setSelectedTransport] = useState<number | null>(
    null
  );
  const navigate = useNavigate();
  const [orderNo, setOrderNo] = useState<string>("");
  const { user } = useUser(); // Get the user object
  const userName = user?.fullName || user?.firstName || "Unknown User"; // Get the user's name
  const [isOrderSaved, setIsOrderSaved] = useState(false); // New state to track if the order is saved
  const [orderId, setOrderId] = useState<string | null>(null); // New state to store the order ID
  const [remarkOptions, setRemarkOptions] = useState<string[]>([]);
  const [priceList, setPriceList] = useState<PriceEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false); // State to control drawer visibility
  const [newCustomShade, setNewCustomShade] = useState<string>("");
  const [isAddDesignOpen, setIsAddDesignOpen] = useState(false);

  const fetchAllOptions = async () => {
    await Promise.all([
      fetchBrokers(),
      fetchDesigns(),
      fetchTransportOptions(),
      fetchPartyOptions(),
      fetchRemarkOptions(),
    ]);
  };
  useEffect(() => {
    fetchAllOptions();
    generateUniqueOrderNo();
  }, []);

  useEffect(() => {
    fetchAllOptions();
  }, [isOpen]);

  useEffect(() => {
    if (selectedShipTo) {
      const selectedParty = partyOptions.find(
        (party) => party.id === selectedShipTo
      );
      if (selectedParty && selectedParty.transport_id) {
        setSelectedTransport(selectedParty.transport_id);
      }
    }
  }, [selectedShipTo, partyOptions]);

  const generateUniqueOrderNo = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("order_no")
        .order("order_no", { ascending: false })
        .limit(1);

      if (error) throw error;
      const lastOrderNo = data.length > 0 ? parseInt(data[0].order_no) : 0;
      const newOrderNo = (lastOrderNo + 1).toString();
      setOrderNo(newOrderNo);
    } catch (error) {
      console.error("Error generating unique order number:", error);
      toast({
        title: "Error",
        description: `Failed to generate unique order number: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  const fetchTransportOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("transport_profiles")
        .select("id, name")
        .order("name");

      if (error) throw error;

      setTransportOptions(data);
    } catch (error) {
      console.error("Error fetching transport options:", error);
      // Optionally, you can show an error message to the user
    }
  };

  const fetchBrokers = async () => {
    try {
      const { data, error } = await supabase
        .from("brokers")
        .select("id, name")
        .order("name");

      if (error) throw error;

      setBrokerOptions(data);
    } catch (error) {
      console.error("Error fetching brokers:", error);
      // Optionally, you can show an error message to the user
    }
  };

  const fetchDesigns = async () => {
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
      // Optionally, you can show an error message to the user
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

  const fetchPartyOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("party_profiles")
        .select("id, name, delivery_id, broker_id, transport_id")
        .order("name");

      if (error) throw error;

      setPartyOptions(data);
    } catch (error) {
      console.error("Error fetching party options:", error);
      // Optionally, you can show an error message to the user
    }
  };

  const fetchPriceList = async (partyId: number) => {
    const { data, error } = await supabase.rpc(
      "get_latest_design_prices_by_party",
      {
        partyid: partyId,
      }
    );

    if (error) throw error;

    setPriceList(data);
  };

  const handleDateChange = (amount: number, unit: "day" | "month" | "year") => {
    const newDate = new Date(date);
    if (unit === "day") newDate.setDate(newDate.getDate() + amount);
    if (unit === "month") newDate.setMonth(newDate.getMonth() + amount);
    if (unit === "year") newDate.setFullYear(newDate.getFullYear() + amount);
    setDate(newDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
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
        remark: value.toUpperCase(),
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
      if (!currentEntry.price || currentEntry.price.trim() === "") {
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
      setIsDialogOpen(false);
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
      setIsDialogOpen(true);
    }
  };

  const handleDeleteDesign = (id: string) => {
    setDesignEntries((prev) => prev.filter((entry) => entry.id !== id));
    toast({
      title: "Design Deleted",
      description: `Design entry has been deleted.`,
    });
  };

  const handleSave = async () => {
    generateUniqueOrderNo();
    const orderDetails: OrderDetails = {
      orderNo: orderNo,
      date: formatDate(date),
      billTo: selectedBillTo,
      shipTo: selectedShipTo,
      broker: selectedBroker,
      transport: selectedTransport,
      designs: designEntries,
      remark: (
        document.getElementById("remark") as HTMLInputElement
      )?.value.toUpperCase(),
    };

    try {
      // Fetch additional details for order generation
      if (selectedBillTo) {
        const { data: billToData, error: billToError } = await supabase
          .from("party_profiles")
          .select("name, address")
          .eq("id", selectedBillTo)
          .single();

        if (billToError) throw billToError;

        orderDetails.billTo = billToData.name;
        orderDetails.billToAddress = billToData.address;
      } else {
        throw new Error("Bill To is required");
      }

      if (selectedShipTo) {
        const { data: shipToData, error: shipToError } = await supabase
          .from("party_profiles")
          .select("name, address")
          .eq("id", selectedShipTo)
          .single();

        if (shipToError) throw shipToError;

        orderDetails.shipTo = shipToData.name;
        orderDetails.shipToAddress = shipToData.address;
      }

      if (selectedBroker) {
        const { data: brokerData, error: brokerError } = await supabase
          .from("brokers")
          .select("name")
          .eq("id", selectedBroker)
          .single();

        if (brokerError) throw brokerError;

        orderDetails.broker = brokerData.name;
      }

      if (selectedTransport) {
        const { data: transportData, error: transportError } = await supabase
          .from("transport_profiles")
          .select("name")
          .eq("id", selectedTransport)
          .single();

        if (transportError) throw transportError;

        orderDetails.transport = transportData.name;
      }

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            order_no: orderDetails.orderNo,
            date: orderDetails.date,
            bill_to_id: selectedBillTo,
            ship_to_id: selectedShipTo,
            broker_id: selectedBroker,
            transport_id: selectedTransport,
            remark: orderDetails.remark,
            created_by: userName, // Add the created_by field
          },
        ])
        .select();

      if (orderError) throw orderError;

      const orderId = orderData[0].id; // Get the order ID
      setOrderId(orderId); // Set the order ID in the state

      // Insert design entries
      const designEntriesData = orderDetails.designs.map((design) => ({
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

      toast({
        title: "Order Saved",
        description: `Order ${orderDetails.orderNo} has been saved successfully.`,
      });

      setIsOrderSaved(true); // Set order as saved
    } catch (error) {
      console.error("Error saving order details:", error);
      toast({
        title: "Error",
        description: `There was an error saving the order details: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  const handleBillToChange = (partyId: number) => {
    setSelectedBillTo(partyId);
    fetchPriceList(partyId);
    const selectedParty = partyOptions.find((party) => party.id === partyId);
    if (selectedParty) {
      if (selectedParty.delivery_id) {
        setSelectedShipTo(selectedParty.delivery_id);
      } else {
        setSelectedShipTo(selectedParty.id);
      }
      if (selectedParty.broker_id) {
        setSelectedBroker(selectedParty.broker_id);
      }
    }
  };

  // Modify the getOptionsForField function
  const getOptionsForField = (field: string) => {
    switch (field) {
      case "Broker":
        return brokerOptions;
      case "Transport":
        return transportOptions;
      case "Bill To":
      case "Ship To":
        return partyOptions;
      default:
        return [];
    }
  };

  // Add these new functions near the top of your component
  const handleInputChange = (field: string, value: string) => {
    const option = getOptionsForField(field).find(
      (opt) => opt.name.toLowerCase() === value.toLowerCase()
    );
    if (option) {
      if (field === "Bill To") handleBillToChange(option.id);
      else if (field === "Ship To") handleShipToChange(option.id);
      else if (field === "Broker") setSelectedBroker(option.id);
      else if (field === "Transport") setSelectedTransport(option.id);
    }
  };

  const handleShipToChange = (partyId: number) => {
    setSelectedShipTo(partyId);
    const selectedParty = partyOptions.find((party) => party.id === partyId);
    if (selectedParty && selectedParty.transport_id) {
      setSelectedTransport(selectedParty.transport_id);
    }
  };

  const getSelectedValue = (field: string) => {
    const options = getOptionsForField(field);
    switch (field) {
      case "Bill To":
        return options.find((opt) => opt.id === selectedBillTo)?.name;
      case "Ship To":
        return options.find((opt) => opt.id === selectedShipTo)?.name;
      case "Broker":
        return options.find((opt) => opt.id === selectedBroker)?.name;
      case "Transport":
        return options.find((opt) => opt.id === selectedTransport)?.name;
      default:
        return "";
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">General Details</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/")}
          className="flex items-center"
        >
          <Home className="mr-2 h-4 w-4" /> Back to Home
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="orderNo">Order No.</Label>
          <Input id="orderNo" value={orderNo} readOnly />
        </div>

        <div>
          <Label htmlFor="date">Date</Label>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDateChange(-1, "day")}
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-center flex-1" id="date">
              {formatDate(date)}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDateChange(1, "day")}
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex justify-center">
          {" "}
          {/* Center the drawer */}
          <NewPartyDrawer
            brokerOptions={brokerOptions}
            transportOptions={transportOptions}
            isOpen={isOpen}
            setIsOpen={setIsOpen}
          />
        </div>
        {/* Replace the existing mapping of fields with this updated version */}
        {["Bill To", "Broker", "Transport", "Ship To"].map((field) => (
          <div key={field}>
            <Label htmlFor={field.toLowerCase().replace(" ", "-")}>
              {field}
            </Label>
            <InputWithAutocomplete
              id={field.toLowerCase().replace(" ", "-")}
              value={getSelectedValue(field) ?? ""}
              onChange={(value) => handleInputChange(field, value)}
              options={getOptionsForField(field)}
              placeholder={`Select ${field}`}
              label={field}
            />
          </div>
        ))}

        <div>
          <Label>Designs</Label>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" onClick={() => setCurrentEntry(null)}>
                Add Design
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] top-[40%]">
              <DialogHeader>
                <DialogTitle>
                  {currentEntry ? `Edit ${currentEntry.design}` : "Add Design"}
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
                    onClick={() => {
                      setIsAddDesignOpen(true);
                      setIsDialogOpen(false);
                    }}
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
                      placeholder={
                        priceList.find(
                        (price) =>
                          price.design.split("-")[0] ===
                          currentEntry.design.split("-")[0]
                        )?.price
                        ? "Old Price " +
                          priceList.find(
                          (price) =>
                            price.design.split("-")[0] ===
                            currentEntry.design.split("-")[0]
                          )?.price
                        : "Enter Price"
                      }
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
                                shades: [...currentEntry.shades, ...newShades],
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
        </div>

        <AddNewDesign
          val={currentEntry?.design || null}
          isOpen={isAddDesignOpen}
          onClose={() => setIsAddDesignOpen(false)}
          onSuccess={() => {
            fetchDesigns();
            if (currentEntry) {
              handleDesignSelect(currentEntry.design);
            }
          }}
          designs={designs}
        />

        {designEntries.length > 0 && (
          <div>
            <Label>Saved Designs</Label>
            <div className="mt-2 space-y-2">
              {designEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-2 bg-gray-100 rounded"
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
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="remark">Remark</Label>
          <Input id="remark" />
        </div>
        <div className="flex justify-between pt-4">
          <Button
            onClick={() => navigate(`/order-preview/${orderId}`)}
            className="flex items-center"
            disabled={!isOrderSaved}
          >
            <Printer className="mr-2 h-4 w-4" /> Preview
          </Button>

          <Button onClick={handleSave} className="flex items-center">
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
