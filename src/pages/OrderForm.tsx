/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import {
  Printer,
  Save,
  ChevronLeft,
  ChevronRight,
  X,
  Home,
  Share2, // Add this import
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
import { generateHTML } from "../utils/generateHTML"; // Import the generateHTML function
import supabase from "@/utils/supabase";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import InputWithAutocomplete from "@/components/custom/InputWithAutocomplete";
import { v4 as uuidv4 } from "uuid"; // Add this import at the top of your file
import html2pdf from "html2pdf.js";

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
  const navigate = useNavigate();
  const [orderNo, setOrderNo] = useState<string>("");

  useEffect(() => {
    fetchBrokers();
    fetchDesigns();
    fetchTransportOptions();
    fetchPartyOptions();
    generateUniqueOrderNo();
  }, []);

  const generateUniqueOrderNo = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("order_no")
        .order("order_no", { ascending: false })
        .limit(1);

      if (error) throw error;
      console.log(data);
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

  const handlePreview = async () => {
    const orderDetails: OrderDetails = {
      orderNo: orderNo,
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
        previewWindow.document.close();
      } else {
        console.error("Failed to open preview window");
      }
    } catch (error) {
      console.error("Error fetching party details:", error);
      // Optionally, you can show an error message to the user
    }
  };

  const handleSave = async () => {
    const orderDetails: OrderDetails = {
      orderNo: orderNo,
      date: formatDate(date),
      billTo: selectedBillTo,
      shipTo: selectedShipTo,
      broker: selectedBroker,
      transport: selectedTransport,
      designs: designEntries,
      remark: (document.getElementById("remark") as HTMLInputElement)?.value,
    };

    try {
      // Fetch additional details for PDF generation
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

      // Generate PDF
      const orderDetailsFixed = {
        ...orderDetails,
        broker: orderDetails.broker?.toString() ?? "",
        transport: orderDetails.transport?.toString() ?? "",
        billTo: orderDetails.billTo?.toString() ?? "",
        shipTo: orderDetails.shipTo?.toString() ?? "",
        billToAddress: orderDetails.billToAddress?.toString() ?? "",
        shipToAddress: orderDetails.shipToAddress?.toString() ?? "",
      };
      const html = generateHTML(orderDetailsFixed);
      const pdfBlob = await htmlToPdf(html);

      // Generate a UUID for the file name
      const fileUuid = uuidv4();
      const pdfFileName = `order_${fileUuid}.pdf`;

      // Upload PDF to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("temp-pdfs")
        .upload(pdfFileName, pdfBlob, {
          contentType: "application/pdf",
        });

      if (uploadError) throw uploadError;

      const pdfPath = uploadData.path;

      // Insert order details
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
            pdf: pdfPath,
          },
        ])
        .select();

      if (orderError) throw orderError;

      const orderId = orderData[0].id;

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

  // Add these new functions near the top of your component
  const handleInputChange = (field: string, value: string) => {
    const option = getOptionsForField(field).find(
      (opt) => opt.name.toLowerCase() === value.toLowerCase()
    );
    if (option) {
      if (field === "Bill To") handleBillToChange(option.id);
      else if (field === "Ship To") setSelectedShipTo(option.id);
      else if (field === "Broker") setSelectedBroker(option.id);
      else if (field === "Transport") setSelectedTransport(option.id);
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

  const handleShare = async () => {
    try {
      // Fetch the order details from the database
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("order_no", orderNo)
        .single();

      if (orderError) throw orderError;

      if (!orderData.pdf) {
        throw new Error("PDF not found for this order");
      }

      // Get the public URL for the PDF
      const { data: publicUrlData } = supabase.storage
        .from("temp-pdfs")
        .getPublicUrl(orderData.pdf);

      const publicUrl = publicUrlData.publicUrl;

      // Prepare order summary
      const orderSummary = `
Order No: ${orderData.order_no}
Date: ${orderData.date}
Bill To: ${getSelectedValue("Bill To")}
Ship To: ${getSelectedValue("Ship To")}
    `.trim();

      // Create WhatsApp share link
      const whatsappText = encodeURIComponent(
        `${orderSummary}\n\nView full order: ${publicUrl}`
      );
      const whatsappLink = `https://wa.me/?text=${whatsappText}`;

      // Open WhatsApp share link in a new window
      window.open(whatsappLink, "_blank");

      toast({
        title: "Order Shared",
        description: "Order summary and secure link sent to WhatsApp.",
      });
    } catch (error) {
      console.error("Error sharing order:", error);
      toast({
        title: "Error",
        description: `There was an error sharing the order: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
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
          <Button onClick={handleShare} className="flex items-center">
            <Share2 className="mr-2 h-4 w-4" /> Share
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

async function htmlToPdf(html: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    const pdfOptions = {
      margin: 5,
      filename: "order.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        logging: false,
        dpi: 192,
        letterRendering: true,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf()
      .from(container)
      .set(pdfOptions)
      .outputPdf("blob")
      .then((pdfBlob: Blob) => {
        document.body.removeChild(container);
        resolve(pdfBlob);
      })
      .catch((error: Error) => {
        document.body.removeChild(container);
        reject(error);
      });
  });
}
