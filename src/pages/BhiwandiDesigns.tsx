import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "@/utils/supabase";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FILTERS = [
  { value: "all", label: "ALL" },
  { value: "regular", label: "Regular" },
  { value: "print", label: "Print" },
  { value: "digital", label: "Digital" },
  { value: "Design No.", label: "Design No." },
  { value: "prefix", label: "Prefix" },
];

interface DesignCount {
  design: string;
  count: number;
}

interface DesignEntry {
  id: number;
  bill_to_party: string;
  order_no: number;
  remark: string;
  order_remark: string;
  price: number;
  shades: { [key: string]: string }[];
  bhiwandi_date: string;
}

interface DispatchEntry extends DesignEntry {}

export default function BhiwandiDesigns() {
  const [designCounts, setDesignCounts] = useState<DesignCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [customPrefix, setCustomPrefix] = useState("");
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  const [designEntries, setDesignEntries] = useState<Record<string, DesignEntry[]>>({});
  const [loadingEntries, setLoadingEntries] = useState<Record<string, boolean>>({});
  const [isDispatchDrawerOpen, setIsDispatchDrawerOpen] = useState(false);
  const [dispatchEntries, setDispatchEntries] = useState<DispatchEntry[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch design counts (used in useEffect and after removing bhiwandi_date)
  const fetchDesignCounts = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("design_entries")
      .select(`
        id,
        design,
        order_id,
        orders!inner(canceled)
      `)
      .is("dispatch_date", null)
      .not("bhiwandi_date", "is", null)
      .neq("design", null)
      .neq("design", "")
      .eq("orders.canceled", false);
    if (error) {
      setError(error.message);
      setDesignCounts([]);
    } else if (data) {
      const countMap: Record<string, number> = {};
      (data as { design: string }[]).forEach((row) => {
        if (row.design) {
          countMap[row.design] = (countMap[row.design] || 0) + 1;
        }
      });
      const counts: DesignCount[] = Object.entries(countMap).map(([design, count]) => ({ design, count }));
      setDesignCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDesignCounts();
  }, []);

  // Filtering and sorting logic from DesignReports
  const filteredDesignCounts = () => {
    if (filter === "all") {
      return [...designCounts].sort((a, b) => a.design.localeCompare(b.design));
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
    } else if (filter === "prefix") {
      return designCounts
        .filter((item) => item.design.startsWith(customPrefix))
        .sort((a, b) => a.design.localeCompare(b.design));
    } else {
      // print
      return designCounts
        .filter(
          (item) =>
            (item.design.includes("-") && /^\d{4}$/.test(item.design.slice(-4))) ||
            (item.design.includes("-") && /^\d{3}$/.test(item.design.slice(-3)))
        )
        .sort((a, b) => {
          const numA = Number(a.design.split("-").pop());
          const numB = Number(b.design.split("-").pop());
          return numA - numB;
        });
    }
  };

  const handleAccordionChange = async (values: string[]) => {
    setOpenAccordionItems(values);
    // Always fetch entries for any opened design
    for (const design of values) {
      setLoadingEntries((prev) => ({ ...prev, [design]: true }));
      const { data, error } = await supabase
        .from("design_entries")
        .select(`
          id,
          price,
          remark,
          shades,
          bhiwandi_date,
          order_id,
          orders!inner(order_no, remark, bill_to_id, canceled, party_profiles!orders_bill_to_id_fkey(name))
        `)
        .is("dispatch_date", null)
        .not("bhiwandi_date", "is", null)
        .eq("design", design)
        .eq("orders.canceled", false);
      if (error) {
        setDesignEntries((prev) => ({ ...prev, [design]: [] }));
      } else if (data) {
        const entries: DesignEntry[] = (data as any[]).map((row) => ({
          id: row.id,
          bill_to_party: row.orders?.party_profiles?.name || "",
          order_no: row.orders?.order_no || "",
          remark: row.remark,
          order_remark: row.orders?.remark || "",
          price: row.price,
          shades: row.shades,
          bhiwandi_date: row.bhiwandi_date,
        }));
        setDesignEntries((prev) => ({ ...prev, [design]: entries }));
      }
      setLoadingEntries((prev) => ({ ...prev, [design]: false }));
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Remove bhiwandi_date from an entry and refresh
  const handleRemoveBhiwandiDate = async (design: string, entryId: number) => {
    try {
      await supabase
        .from("design_entries")
        .update({ bhiwandi_date: null })
        .eq("id", entryId);
      // Refetch entries for this design
      setLoadingEntries((prev) => ({ ...prev, [design]: true }));
      const { data, error } = await supabase
        .from("design_entries")
        .select(`
          id,
          price,
          remark,
          shades,
          bhiwandi_date,
          order_id,
          orders!inner(order_no, remark, bill_to_id, canceled, party_profiles!orders_bill_to_id_fkey(name))
        `)
        .is("dispatch_date", null)
        .not("bhiwandi_date", "is", null)
        .eq("design", design)
        .eq("orders.canceled", false);
      if (error) {
        setDesignEntries((prev) => ({ ...prev, [design]: [] }));
      } else if (data) {
        const entries: DesignEntry[] = (data as any[]).map((row) => ({
          id: row.id,
          bill_to_party: row.orders?.party_profiles?.name || "",
          order_no: row.orders?.order_no || "",
          remark: row.remark,
          order_remark: row.orders?.remark || "",
          price: row.price,
          shades: row.shades,
          bhiwandi_date: row.bhiwandi_date,
        }));
        setDesignEntries((prev) => ({ ...prev, [design]: entries }));
      }
      setLoadingEntries((prev) => ({ ...prev, [design]: false }));
      // Refetch counts
      fetchDesignCounts();
    } catch (err) {
      // Optionally show error
    }
  };

  // Add/remove entries to/from dispatch list
  const handleAddToDispatch = (entry: DispatchEntry) => {
    setDispatchEntries((prev) =>
      prev.some((e) => e.id === entry.id) ? prev : [...prev, entry]
    );
  };
  const handleRemoveFromDispatch = (entryId: number) => {
    setDispatchEntries((prev) => prev.filter((e) => e.id !== entryId));
  };

  // Set dispatch date for all selected entries
  const handleDispatch = async () => {
    if (dispatchEntries.length === 0) return;
    const today = new Date().toISOString();
    const idsToUpdate = dispatchEntries.map((entry) => entry.id);
    const { error } = await supabase
      .from("design_entries")
      .update({ dispatch_date: today })
      .in("id", idsToUpdate);
    if (error) {
      toast({
        title: "Error",
        description: `Failed to dispatch entries: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Dispatched ${idsToUpdate.length} entries.`,
      });
      setDispatchEntries([]);
      setIsDispatchDrawerOpen(false);
      fetchDesignCounts();
      // Refetch open accordions
      handleAccordionChange(openAccordionItems);
    }
  };

  return (
    <div className="container mx-auto mt-4 p-2 sm:p-4 relative">
      <div className="sticky top-0 bg-white z-10 p-2 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
          <Button onClick={() => navigate("/")} className="w-full sm:w-auto">
            Back to Home
          </Button>
          <h1 className="text-2xl font-bold">Bhiwandi Designs</h1>
          <Sheet open={isDispatchDrawerOpen} onOpenChange={setIsDispatchDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                Dispatch List
                {dispatchEntries.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {dispatchEntries.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Dispatch List</SheetTitle>
              </SheetHeader>
              {dispatchEntries.length > 0 && (
                <Button
                  onClick={handleDispatch}
                  className="w-full mt-4"
                  variant="default"
                >
                  Set Dispatch Date
                </Button>
              )}
              <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-180px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {dispatchEntries.length === 0 && (
                  <p className="text-center text-gray-500">No entries selected</p>
                )}
                {dispatchEntries.map((entry) => (
                  <div key={entry.id} className="p-4 border rounded-lg relative mb-2 bg-white">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => handleRemoveFromDispatch(entry.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="font-medium">{entry.bill_to_party}</div>
                    <div className="text-xs text-gray-500 mt-1">Order No: {entry.order_no}</div>
                    <div className="text-xs text-gray-500 mt-1">Price: ₹{entry.price}</div>
                    <div className="mt-2">
                      <h4 className="text-xs font-medium">Shades:</h4>
                      <div className="flex flex-wrap gap-2">
                        {entry.shades && entry.shades.map((shade, idx) => {
                          const shadeName = Object.keys(shade)[0];
                          const shadeValue = shade[shadeName];
                          if (!shadeValue) return null;
                          return (
                            <span key={idx} className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {shadeName}: {shadeValue}m
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex flex-wrap gap-2">
          <ToggleGroup
            variant="outline"
            type="single"
            value={filter}
            onValueChange={(value) => {
              setFilter(value);
            }}
            className="w-full sm:w-auto flex-wrap justify-start"
          >
            {FILTERS.map((f) => (
              <ToggleGroupItem key={f.value} value={f.value} aria-label={f.label}>
                {f.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {filter === "prefix" && (
            <div className="flex items-center gap-2 mt-2">
              <Input
                placeholder="Enter prefix..."
                value={customPrefix}
                onChange={e => setCustomPrefix(e.target.value)}
                className="w-48"
              />
              <span className="text-sm text-gray-500">Filtering designs starting with: <b>{customPrefix || "(none)"}</b></span>
            </div>
          )}
        </div>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">Error: {error}</p>
      ) : filteredDesignCounts().length === 0 ? (
        <p>No designs found.</p>
      ) : (
        <Accordion
          type="multiple"
          className="w-full"
          value={openAccordionItems}
          onValueChange={handleAccordionChange}
        >
          {filteredDesignCounts().map((item) => (
            <AccordionItem key={item.design} value={item.design}>
              <div className="flex items-center justify-between w-full">
                <AccordionTrigger className="text-lg flex items-center w-full hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-left font-medium">{item.design}</span>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {item.count} entries
                    </span>
                  </div>
                </AccordionTrigger>
              </div>
              <AccordionContent>
                {loadingEntries[item.design] ? (
                  <div className="p-4 text-center text-gray-500">Loading entries...</div>
                ) : designEntries[item.design] && designEntries[item.design].length > 0 ? (
                  <div className="overflow-x-auto">
                    <div className="min-w-full divide-y divide-gray-200">
                      {designEntries[item.design].map((entry) => {
                        const isSelected = dispatchEntries.some((e) => e.id === entry.id);
                        return (
                          <div
                            key={entry.id}
                            className={`p-4 border rounded-lg mb-2 relative ${
                              isSelected
                                ? "bg-green-100 border-green-400"
                                : "bg-white"
                            }`}
                          >
                            <div className="flex flex-row sm:flex-row gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="text-base font-medium">
                                    {entry.bill_to_party}
                                  </h3>
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <p>
                                    <span className="font-medium">Order No:</span> {entry.order_no}
                                  </p>
                                  <p>
                                    <span className="font-medium">Price:</span> ₹{entry.price}
                                  </p>
                                  <p>
                                    <span className="font-medium">Bhiwandi Date:</span> {formatDate(entry.bhiwandi_date)}
                                  </p>
                                  <p>
                                    <span className="font-medium">Remark:</span> {entry.remark || <span className="text-gray-400">None</span>}
                                  </p>
                                  <p>
                                    <span className="font-medium">Order Remark:</span> {entry.order_remark || <span className="text-gray-400">None</span>}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-row gap-2 sm:w-48">
                                <div className="bg-gray-50 p-2 rounded-lg">
                                  <h4 className="text-sm font-medium mb-2">Shades</h4>
                                  <div className="space-y-1">
                                    {entry.shades && entry.shades.length > 0 ? (
                                      entry.shades.map((shade, idx) => {
                                        const shadeName = Object.keys(shade)[0];
                                        const shadeValue = shade[shadeName];
                                        if (!shadeValue) return null;
                                        return (
                                          <div key={idx} className="text-sm">
                                            <span className="font-medium">{shadeName}:</span> {shadeValue}m
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <span className="text-gray-400">No shades</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4 justify-end">
                              <Button
                                className="flex-1"
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveBhiwandiDate(item.design, entry.id)}
                              >
                                Remove Bhiwandi Date
                              </Button>
                              {isSelected ? (
                                <Button
                                  className="flex-1"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRemoveFromDispatch(entry.id)}
                                >
                                  Remove from Dispatch
                                </Button>
                              ) : (
                                <Button
                                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddToDispatch(entry)}
                                >
                                  Add to Dispatch
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">No entries found for this design.</div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
} 