import { useState, useEffect } from "react";
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
import InputWithAutocomplete from "@/components/custom/InputWithAutocomplete";
import { ChevronLeft, ChevronRight, Printer, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";

interface PriceEntry {
  design: string;
  price: string;
}

interface Entry {
  id: string;
  design: string;
  meters: string;
  pieces: string;
  price: string;
}

function EditChallan() {
  const { challanId } = useParams();
  const [challanNo, setChallanNo] = useState<string>("");
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

  const { toast } = useToast();
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [selectedBillTo, setSelectedBillTo] = useState<number | null>(null);
  const [selectedShipTo, setSelectedShipTo] = useState<number | null>(null);
  const [selectedBroker, setSelectedBroker] = useState<number | null>(null);
  const [selectedTransport, setSelectedTransport] = useState<number | null>(
    null
  );
  const [priceList, setPriceList] = useState<PriceEntry[]>([]);
  const [designs, setDesigns] = useState<string[]>([]);
  const [remark, setRemark] = useState<string>("");
  const [disc, setDisc] = useState<string>("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentEntry, setCurrentEntry] = useState({
    id: "",
    design: "",
    meters: "",
    pieces: "",
    price: "",
  });

  const [entries, setEntries] = useState<Entry[]>([]);

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
    }
  };

  const fetchAllOptions = async () => {
    await Promise.all([
      fetchBrokers(),
      fetchDesigns(),
      fetchTransportOptions(),
      fetchPartyOptions(),
    ]);
  };

  const handleDesignSelect = (design: string) => {
    setCurrentEntry({
      ...currentEntry,
      id: Date.now().toString(),
      design,
    });
  };

  const handleAddEntry = () => {
    if (
      !currentEntry.design ||
      !currentEntry.meters ||
      !currentEntry.pieces ||
      !currentEntry.price
    ) {
      toast({
        title: "Entry not Saved",
        description: "Please fill all fields before adding an entry.",
        variant: "destructive",
      });
      return;
    }

    setEntries([...entries, currentEntry]);
    toast({
      title: "Entry Added",
      description: "The entry has been successfully added.",
    });
    setCurrentEntry({ id: "", design: "", meters: "", pieces: "", price: "" });
    setIsDialogOpen(false);
  };

  const handleDeleteEntry = (entryId: string) => {
    setEntries(entries.filter((entry) => entry.id !== entryId));
  };

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

  const handleBillToChange = async (partyId: number) => {
    setSelectedBillTo(partyId);
    await fetchPriceList(partyId);
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

  const fetchPriceList = async (partyId: number) => {
    try {
      const { data, error } = await supabase.rpc(
        "get_latest_design_prices_by_party",
        {
          partyid: partyId,
        }
      );
      if (error) throw error;
      setPriceList(data);
    } catch (error) {
      console.error("Error fetching price list:", error);
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

  const loadChallanData = async () => {
    try {
      const { data: challanData, error: challanError } = await supabase
        .from("challans")
        .select("*")
        .eq("id", challanId)
        .single();

      if (challanError) throw challanError;

      setChallanNo(challanData.challan_no.toString());
      setDate(new Date(challanData.date));
      setSelectedBillTo(challanData.bill_to_id);
      setSelectedShipTo(challanData.ship_to_id);
      setSelectedBroker(challanData.broker_id);
      setSelectedTransport(challanData.transport_id);
      setRemark(challanData.remark || "");
      setDisc(challanData.discount?.toString() || "");

      await fetchPriceList(challanData.bill_to_id);

      const { data: entriesData, error: entriesError } = await supabase
        .from("challan_entries")
        .select("*")
        .eq("challan_id", challanId);

      if (entriesError) throw entriesError;

      const formattedEntries: Entry[] = entriesData.map((entry) => ({
        id: entry.id.toString(),
        design: entry.design,
        meters: entry.meters.toString(),
        pieces: entry.pcs.toString(),
        price: entry.price.toString(),
      }));

      setEntries(formattedEntries);
    } catch (error) {
      console.error("Error loading challan data:", error);
      toast({
        title: "Error",
        description: "Failed to load challan data",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    try {
      if (
        !challanNo ||
        !selectedBroker ||
        !selectedBillTo ||
        !selectedShipTo ||
        !selectedTransport ||
        entries.length === 0
      ) {
        toast({
          title: "Error",
          description:
            "All fields must be filled and at least one entry must be added.",
          variant: "destructive",
        });
        return;
      }

      const { error: challanError } = await supabase
        .from("challans")
        .update({
          challan_no: Number(challanNo),
          date: date.toISOString().split("T")[0],
          bill_to_id: selectedBillTo,
          ship_to_id: selectedShipTo,
          broker_id: selectedBroker,
          transport_id: selectedTransport,
          remark: remark,
          discount: disc ? Number(disc) : null,
        })
        .eq("id", challanId);

      if (challanError) throw challanError;

      const { error: deleteError } = await supabase
        .from("challan_entries")
        .delete()
        .eq("challan_id", challanId);

      if (deleteError) throw deleteError;

      const entriesToInsert = entries.map((entry) => ({
        challan_id: challanId,
        design: entry.design,
        meters: parseFloat(entry.meters),
        pcs: parseFloat(entry.pieces),
        price: parseFloat(entry.price),
      }));

      const { error: entriesError } = await supabase
        .from("challan_entries")
        .insert(entriesToInsert);

      if (entriesError) throw entriesError;

      toast({
        title: "Success",
        description: "Challan updated successfully",
      });

      navigate(`/challan-view/${challanId}`);
    } catch (error) {
      console.error("Error updating challan:", error);
      toast({
        title: "Error",
        description: `Failed to update challan, ${(error as { details?: string }).details || "Unknown Error"}`,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAllOptions();
    if (challanId) {
      loadChallanData();
    }
  }, [challanId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-md mx-auto p-6 bg-white">
      <h1 className="text-2xl font-bold mb-6">Edit Challan</h1>

      <div className="space-y-4">
        <div>
          <Label htmlFor="challanNo">Challan No.</Label>
          <Input
            id="challanNo"
            value={challanNo}
            onChange={(e) =>
              setChallanNo(String(Math.round(Number(e.target.value))))
            }
            type="number"
          />
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">Add Entry</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Challan Entry</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="design" className="text-right">
                  Design
                </Label>
                <Input
                  id="design"
                  list="designs"
                  value={currentEntry.design}
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
              {currentEntry.design && designs.includes(currentEntry.design) && (
                <div className="grid items-center gap-4">
                  <Label>Meters</Label>
                  <Input
                    type="number"
                    placeholder="Meters"
                    value={currentEntry.meters}
                    onChange={(e) =>
                      setCurrentEntry({
                        ...currentEntry,
                        meters: e.target.value,
                      })
                    }
                  />
                  <Label>Pieces</Label>
                  <Input
                    type="number"
                    placeholder="Pieces"
                    value={currentEntry.pieces}
                    onChange={(e) =>
                      setCurrentEntry({
                        ...currentEntry,
                        pieces: e.target.value,
                      })
                    }
                  />
                  <Label>Price</Label>
                  <Input
                    type="number"
                    placeholder={
                      priceList.find(
                        (price) => price.design === currentEntry.design
                      )?.price
                        ? "Old Price " +
                          priceList.find(
                            (price) => price.design === currentEntry.design
                          )?.price
                        : "Enter Price"
                    }
                    value={currentEntry.price}
                    onChange={(e) =>
                      setCurrentEntry({
                        ...currentEntry,
                        price: e.target.value,
                      })
                    }
                  />
                  <Button onClick={handleAddEntry}>Save Entry</Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {entries.length > 0 && (
          <ScrollArea className="h-[200px] w-full rounded-md border p-4">
            {entries.map((entry, index) => (
              <div key={entry.id}>
                <span>{index + 1}.</span>
                <b className="ml-2">{entry.design}</b>
                <div className="border-b py-2 flex justify-between items-center">
                  <span>{entry.meters}m</span>
                  <span>{entry.pieces} pcs</span>
                  <span>₹{entry.price}</span>
                  <span className="font-bold">
                    ₹
                    {(
                      parseFloat(entry.pieces) *
                      parseFloat(entry.meters) *
                      parseFloat(entry.price)
                    ).toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-red-500"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}
          </ScrollArea>
        )}

        <div>
          <Label htmlFor="discount">Discount %</Label>
          <Input
            type="number"
            id="discount"
            value={disc}
            onChange={(e) => setDisc(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="remark">Remark</Label>
          <Input
            id="remark"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </div>

        <div className="flex justify-between pt-4">
          <Button className="flex items-center" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Update
          </Button>
          <Button
            className="flex items-center"
            onClick={() => navigate(`/challan-view/${challanId}`)}
          >
            <Printer className="mr-2 h-4 w-4" /> Preview
          </Button>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

export default EditChallan;