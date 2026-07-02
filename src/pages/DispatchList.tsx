import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "@/utils/supabase";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { X } from "lucide-react";

interface DesignCount {
  design: string;
  count: number;
}

interface DesignEntry {
  id: number;
  party_name: string;
  shades: { [key: string]: string }[];
  order_remark: string;
  price: string;
  dispatch_date: string;
  order_no: number;
  part: boolean;
  bhiwandi_date: string | null;
  order_date: string;
}

function DispatchList() {
  const [designCounts, setDesignCounts] = useState<DesignCount[]>([]);
  // Cache entries per design to avoid re-fetching and re-renders across accordion toggles
  const [entriesByDesign, setEntriesByDesign] = useState<Record<string, DesignEntry[]>>({});
  const [loadingByDesign, setLoadingByDesign] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("all"); // State for filter
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const optionsDate: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    return date.toLocaleDateString("en-US", optionsDate);
  };

  useEffect(() => {
    const fetchDesignCounts = async () => {
      try {
        const { data, error } = await supabase
          .from("design_entries")
          .select("design")
          .not("dispatch_date", "is", null);

        if (error) throw error;

        // Group by design name
        const countsMap = new Map<string, number>();
        data.forEach((entry) => {
          if (entry.design) {
            countsMap.set(entry.design, (countsMap.get(entry.design) || 0) + 1);
          }
        });

        const formattedData: DesignCount[] = Array.from(countsMap.entries()).map(
          ([design, count]) => ({
            design,
            count,
          })
        );

        // Pre-sort just once alphabetically for stable UX when filter === 'all'
        formattedData.sort((a, b) => a.design.localeCompare(b.design));
        setDesignCounts(formattedData);
      } catch (error) {
        console.error("Error fetching design counts:", error);
        toast({
          title: "Error",
          description: "Failed to fetch design counts.",
          variant: "destructive",
        });
      }
    };
    fetchDesignCounts();
  }, [toast]);

  const fetchDesignEntries = useCallback(async (design: string) => {
    try {
      setLoadingByDesign((prev) => ({ ...prev, [design]: true }));
      const { data, error } = await supabase
        .from("design_entries")
        .select(`
          id,
          price,
          remark,
          shades,
          dispatch_date,
          bhiwandi_date,
          part,
          orders!inner(
            order_no,
            date,
            remark,
            party_profiles!orders_bill_to_id_fkey(name)
          )
        `)
        .eq("design", design)
        .not("dispatch_date", "is", null)
        .order("dispatch_date", { ascending: false });

      if (error) throw error;
      
      const formattedData: DesignEntry[] = (data || []).map((row: any) => ({
        id: row.id,
        party_name: row.orders?.party_profiles?.name || "Unknown Party",
        shades: row.shades || [],
        order_remark: row.orders?.remark || row.remark || "",
        price: row.price?.toString() || "0",
        dispatch_date: row.dispatch_date,
        order_no: row.orders?.order_no || 0,
        part: row.part || false,
        bhiwandi_date: row.bhiwandi_date,
        order_date: row.orders?.date
      }));
      
      setEntriesByDesign((prev) => ({ ...prev, [design]: formattedData }));
    } catch (error) {
      console.error("Error fetching design entries:", error);
      toast({
        title: "Error",
        description: "Failed to fetch design entries.",
        variant: "destructive",
      });
    } finally {
      setLoadingByDesign((prev) => ({ ...prev, [design]: false }));
    }
  }, [toast]);

  const filteredDesignCounts = useMemo(() => {
    const counts = [...designCounts];
    if (filter === "all") {
      return counts; // already alpha-sorted in effect
    } else if (filter === "regular") {
      return counts
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
      return counts
        .filter((item) => !isNaN(Number(item.design)))
        .sort((a, b) => Number(a.design) - Number(b.design));
    } else {
      return counts
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
  }, [designCounts, filter]);

  const handleRemoveDispatchDate = async (id: number, design: string) => {
    if (!window.confirm("Are you sure you want to remove this entry from dispatch list?")) {
      return;
    }
    try {
      // Optimistic update: remove entry locally and decrement count
      setEntriesByDesign((prev) => {
        const current = prev[design] || [];
        const updated = current.filter((entry) => entry.id !== id);
        return { ...prev, [design]: updated };
      });
      setDesignCounts((prev) => prev.map((d) => d.design === design ? { ...d, count: Math.max(0, d.count - 1) } : d));
      const { error } = await supabase
        .from("design_entries")
        .update({ dispatch_date: null })
        .eq("id", id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Entry removed from dispatch list.",
      });
    } catch (error) {
      console.error("Error removing dispatch date:", error);
      toast({
        title: "Error",
        description: "Failed to remove dispatch date.",
        variant: "destructive",
      });
      // Rollback best-effort by re-fetching the design entries/counts for consistency
      if (design) {
        fetchDesignEntries(design);
      }
    }
  };

  return (
    <div className="container mx-auto max-w-3xl mt-10 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <Button onClick={() => navigate("/")} variant="outline" className="w-full sm:w-auto">
          Back to Home
        </Button>
        <h1 className="text-3xl font-bold text-center flex-1">Dispatch List</h1>
      </div>
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        <ToggleGroup
          variant="outline"
          type="single"
          value={filter}
          onValueChange={setFilter}
          className="flex-wrap justify-center"
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
          <ToggleGroupItem value="Design No." aria-label="Show Design No.">
            Design No.
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="border-b mb-6" />
      <Accordion
        type="single"
        collapsible
        className="w-full"
        value={openAccordion as string | undefined}
        onValueChange={(val) => {
          setOpenAccordion(val);
          if (val) {
            const index = Number(val.replace("item-", ""));
            const design = filteredDesignCounts[index]?.design;
            if (design && !entriesByDesign[design] && !loadingByDesign[design]) {
              fetchDesignEntries(design);
            }
          }
        }}
      >
        {filteredDesignCounts.length === 0 ? (
          <div className="text-center text-gray-500 py-12">No designs in dispatch list.</div>
        ) : (
          filteredDesignCounts.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="rounded-lg border mb-4 shadow-sm bg-white">
              <div className="flex items-center justify-between px-4 py-2">
                <AccordionTrigger
                  className="text-lg flex items-center w-full hover:bg-gray-50 font-semibold"
                  onClick={() => {
                    if (!entriesByDesign[item.design] && !loadingByDesign[item.design]) {
                      fetchDesignEntries(item.design);
                    }
                  }}
                >
                  <span className="text-left flex-grow">{item.design}</span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full ml-2 mr-3">
                    {item.count} entr{item.count === 1 ? "y" : "ies"}
                  </span>
                </AccordionTrigger>
              </div>
              <AccordionContent>
                <div className="space-y-4">
                  {loadingByDesign[item.design] ? (
                    <div className="text-center text-gray-400 py-4">Loading entries...</div>
                  ) : (entriesByDesign[item.design]?.length ?? 0) === 0 ? (
                    <div className="text-center text-gray-400 py-4">No entries for this design.</div>
                  ) : (
                    (entriesByDesign[item.design] || []).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-col lg:flex-row gap-4 p-4 border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow relative pr-12"
                      >
                        {/* Column 1: Core Details */}
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-bold text-gray-900 leading-tight">{entry.party_name}</h3>
                              {entry.part && (
                                <span className="shrink-0 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded border border-amber-200 uppercase tracking-wider">
                                  Part Order
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">Order #{entry.order_no}</span>
                              <span className="font-semibold text-gray-700 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">₹{entry.price}/m</span>
                            </div>
                          </div>
                        </div>

                        {/* Column 2: Dates */}
                        <div className="flex-[0.8] min-w-[180px] flex flex-col justify-center gap-1.5 text-xs text-gray-600 lg:border-l lg:border-gray-100 lg:pl-5">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-400 uppercase tracking-wider text-[10px]">Order Date</span>
                            <span className="font-semibold text-gray-800">{entry.order_date ? formatDate(entry.order_date) : "-"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-400 uppercase tracking-wider text-[10px]">Bhiwandi Date</span>
                            <span className="font-semibold text-gray-800">{entry.bhiwandi_date ? formatDate(entry.bhiwandi_date) : "-"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-400 uppercase tracking-wider text-[10px]">Dispatch Date</span>
                            <span className="font-semibold text-emerald-600">{entry.dispatch_date ? formatDate(entry.dispatch_date) : "-"}</span>
                          </div>
                        </div>

                        {/* Column 3: Shades */}
                        <div className="flex-[1.2] min-w-[200px] lg:border-l lg:border-gray-100 lg:pl-5">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2 block">Shades Breakdown</span>
                          <div className="flex flex-wrap gap-1.5">
                            {entry.shades && entry.shades.length > 0 ? (
                              entry.shades.map((shade, idx) => {
                                const shadeName = Object.keys(shade)[0];
                                const shadeValue = shade[shadeName];
                                if (!shadeValue) return null;
                                return (
                                  <span
                                    key={idx}
                                    className="bg-gray-50 text-gray-700 border border-gray-200 px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1"
                                  >
                                    {shadeName}: <span className="text-blue-600">{shadeValue}m</span>
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-gray-400 text-xs italic">No shades</span>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-3 right-3 h-8 w-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => handleRemoveDispatchDate(entry.id, item.design)}
                          title="Remove from Dispatch"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))
        )}
      </Accordion>
      <Toaster />
    </div>
  );
}

export default DispatchList;
