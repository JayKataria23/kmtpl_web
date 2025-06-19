import { useState, useEffect } from "react";
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
}

function DispatchList() {
  const [designCounts, setDesignCounts] = useState<DesignCount[]>([]);
  const [designEntries, setDesignEntries] = useState<DesignEntry[]>([]);
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
        const { data, error } = await supabase.rpc(
          "get_design_counts_with_dispatch"
        );
        if (error) throw error;
        const formattedData: DesignCount[] = data.map(
          (item: { design_name: string; entry_count: bigint }) => ({
            design: item.design_name,
            count: Number(item.entry_count),
          })
        );
        formattedData.sort((a, b) => {
          const nameA = a.design.toLowerCase();
          const nameB = b.design.toLowerCase();
          const isANumeric = !isNaN(Number(nameA));
          const isBNumeric = !isNaN(Number(nameB));
          if (isANumeric && isBNumeric) return 0;
          if (isANumeric) return 1;
          if (isBNumeric) return -1;
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });
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

  const fetchDesignEntries = async (design: string) => {
    try {
      const { data, error } = await supabase.rpc(
        "get_design_entries_by_name_dispatched",
        {
          design_input: design,
        }
      );
      if (error) throw error;
      setDesignEntries(data);
    } catch (error) {
      console.error("Error fetching design entries:", error);
      toast({
        title: "Error",
        description: "Failed to fetch design entries.",
        variant: "destructive",
      });
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
    } else {
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

  const handleRemoveDispatchDate = async (id: number) => {
    if (!window.confirm("Are you sure you want to remove this entry from dispatch list?")) {
      return;
    }
    try {
      const { error } = await supabase
        .from("design_entries")
        .update({ dispatch_date: null })
        .eq("id", id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Entry removed from dispatch list.",
      });
      // Optionally refresh entries
      setDesignEntries((prev) => prev.filter((entry) => entry.id !== id));
    } catch (error) {
      console.error("Error removing dispatch date:", error);
      toast({
        title: "Error",
        description: "Failed to remove dispatch date.",
        variant: "destructive",
      });
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
        onValueChange={setOpenAccordion}
      >
        {filteredDesignCounts().length === 0 ? (
          <div className="text-center text-gray-500 py-12">No designs in dispatch list.</div>
        ) : (
          filteredDesignCounts().map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="rounded-lg border mb-4 shadow-sm bg-white">
              <div className="flex items-center justify-between px-4 py-2">
                <AccordionTrigger
                  className="text-lg flex items-center w-full hover:bg-gray-50 font-semibold"
                  onClick={() => fetchDesignEntries(item.design)}
                >
                  <span className="text-left flex-grow">{item.design}</span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full ml-2 mr-3">
                    {item.count} entr{item.count === 1 ? "y" : "ies"}
                  </span>
                </AccordionTrigger>
              </div>
              <AccordionContent>
                <div className="space-y-4">
                  {designEntries.length === 0 ? (
                    <div className="text-center text-gray-400 py-4">No entries for this design.</div>
                  ) : (
                    designEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border rounded-lg bg-gray-50 shadow-sm relative"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col gap-1">
                            <h3 className="font-semibold text-base">{entry.party_name}</h3>
                            <p className="text-sm text-gray-600 font-semibold">Price: {entry.price}</p>
                            <p className="text-xs text-gray-500">Dispatch Date: {formatDate(entry.dispatch_date)}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 min-w-[120px]">
                          <span className="font-semibold text-sm mb-1">Shades:</span>
                          <div className="flex flex-wrap gap-1">
                            {entry.shades && entry.shades.length > 0 ? (
                              entry.shades.map((shade, idx) => {
                                const shadeName = Object.keys(shade)[0];
                                const shadeValue = shade[shadeName];
                                if (!shadeValue) return null;
                                return (
                                  <span
                                    key={idx}
                                    className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium"
                                  >
                                    {shadeName}: {shadeValue}m
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-gray-400">No shades</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => handleRemoveDispatchDate(entry.id)}
                          title="Remove from Dispatch"
                        >
                          <X className="h-4 w-4" />
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
