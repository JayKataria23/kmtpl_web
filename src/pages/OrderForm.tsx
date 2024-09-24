import { useState, useEffect } from "react";
import { Printer, Save, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateHTML } from "../utils/generateHTML";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/utils/supabase";

interface DesignEntry {
  id: string;
  design: string;
  price: string;
  remark: string;
  shades: string[];
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
  const [designSearch, setDesignSearch] = useState<string>("");

  useEffect(() => {
    fetchBrokers();
    fetchDesigns();
    fetchTransportOptions();
    fetchPartyOptions();
  }, []);

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
      shades: Array(50).fill(""),
    });
    setDesignSearch(design);
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
      setDesignSearch("");
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

  const handlePreview = async () => {
    const orderDetails: OrderDetails = {
      orderNo: (document.getElementById("orderNo") as HTMLInputElement)?.value,
      date: formatDate(date),
      billTo: selectedBillTo,
      shipTo: selectedShipTo,
      broker: selectedBroker,
      transport: selectedTransport,
      designs: designEntries,
      remark: (document.getElementById("remark") as HTMLInputElement)?.value,
    };

    try {
      // Fetch billTo details
      if (selectedBillTo) {
        const { data: billToData, error: billToError } = await supabase
          .from("party_profiles")
          .select("name, address")
          .eq("id", selectedBillTo)
          .single();

        if (billToError) throw billToError;

        orderDetails.billTo = billToData.name;
        orderDetails.billToAddress = billToData.address;
      }

      // Fetch shipTo details
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
      // Fetch broker details
      if (selectedBroker) {
        const { data: brokerData, error: brokerError } = await supabase
          .from("brokers")
          .select("name")
          .eq("id", selectedBroker)
          .single();

        if (brokerError) throw brokerError;

        orderDetails.broker = brokerData.name;
      }

      // Fetch transport details
      if (selectedTransport) {
        const { data: transportData, error: transportError } = await supabase
          .from("transport_profiles")
          .select("name")
          .eq("id", selectedTransport)
          .single();

        if (transportError) throw transportError;

        orderDetails.transport = transportData.name;
      }

      const orderDetailsFixed = {
        ...orderDetails,
        broker:
          orderDetails.broker !== null ? orderDetails.broker.toString() : "",
        transport:
          orderDetails.transport !== null
            ? orderDetails.transport.toString()
            : "",
        billTo:
          orderDetails.billTo !== null ? orderDetails.billTo.toString() : "",
        shipTo:
          orderDetails.shipTo !== null ? orderDetails.shipTo.toString() : "",
        billToAddress: orderDetails.billToAddress?.toString() ?? "",
        shipToAddress: orderDetails.shipToAddress?.toString() ?? "",
      };
      const html = generateHTML(orderDetailsFixed);
      console.log(orderDetails);
      const previewWindow = window.open("", "_blank");
      if (previewWindow) {
        previewWindow.document.write(html);
        previewWindow.focus();
        previewWindow.print();
        previewWindow.document.close();
      } else {
        console.error("Failed to open preview window");
      }
    } catch (error) {
      console.error("Error fetching party details:", error);
      // Optionally, you can show an error message to the user
    }
  };

  const handleSave = () => {
    console.log("Save clicked");
  };

  const handleBillToChange = (partyId: number) => {
    setSelectedBillTo(partyId);
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
      if (selectedParty.transport_id) {
        setSelectedTransport(selectedParty.transport_id);
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

  const filteredDesigns = designs.filter((design) =>
    design.toLowerCase().includes(designSearch.toLowerCase())
  );

  // Close the scroll area if there is only one item and it matches the search input
  useEffect(() => {
    if (filteredDesigns.length === 1 && filteredDesigns[0] === designSearch) {
      handleDesignSelect(filteredDesigns[0]);
    }
  }, [designSearch, filteredDesigns]);

  return (
    <div className="max-w-md mx-auto p-6 bg-white">
      <h1 className="text-2xl font-bold mb-6">General Details</h1>

      <div className="space-y-4">
        <div>
          <Label htmlFor="orderNo">Order No.</Label>
          <Input id="orderNo" defaultValue="1" />
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

        {["Bill To", "Broker", "Transport", "Ship To"].map((field) => (
          <div key={field}>
            <Label htmlFor={field.toLowerCase().replace(" ", "-")}>
              {field}
            </Label>
            <Select
              onValueChange={(value) => {
                if (field === "Bill To") {
                  handleBillToChange(Number(value));
                } else if (field === "Ship To") {
                  setSelectedShipTo(Number(value));
                } else if (field === "Broker") {
                  setSelectedBroker(Number(value));
                } else if (field === "Transport") {
                  setSelectedTransport(Number(value));
                }
              }}
              value={
                field === "Bill To"
                  ? selectedBillTo?.toString()
                  : field === "Ship To"
                  ? selectedShipTo?.toString()
                  : field === "Broker"
                  ? selectedBroker?.toString()
                  : field === "Transport"
                  ? selectedTransport?.toString()
                  : undefined
              }
            >
              <SelectTrigger id={field.toLowerCase().replace(" ", "-")}>
                <SelectValue placeholder={`Select ${field}`} />
              </SelectTrigger>
              <SelectContent>
                {getOptionsForField(field).map((option) => (
                  <SelectItem key={option.id} value={option.id.toString()}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <DialogContent className="sm:max-w-[425px]">
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
                    value={designSearch}
                    onChange={(e) => setDesignSearch(e.target.value)}
                    className="col-span-3"
                    placeholder="Search for a design"
                  />
                </div>
                <ScrollArea className="max-h-[200px] w-full rounded-md border p-4">
                  <div className="grid gap-4">
                    {filteredDesigns.map((design) => (
                      <div
                        key={design}
                        className="cursor-pointer"
                        onClick={() => handleDesignSelect(design)}
                      >
                        {design}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {currentEntry && (
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
        </div>

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
          <Button onClick={handlePreview} className="flex items-center">
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
