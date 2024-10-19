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

interface DesignCount {
  design: string;
  count: number;
}

interface DesignEntry {
  id: number;
  party_name: string;
  shades: string[];
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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const optionsDate: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "long", // Change month to 'long'
      year: "numeric",
    };

    const formattedDate = date.toLocaleDateString("en-US", optionsDate); // Format date

    return `${formattedDate}`; // Return combined formatted date and time
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
            count: Number(item.entry_count), // Convert BIGINT to number
          })
        );

        // Sort the data by design_name (first alphabets then numbers)
        formattedData.sort((a, b) => {
          const nameA = a.design.toLowerCase();
          const nameB = b.design.toLowerCase();

          // Check if both names are purely numeric
          const isANumeric = !isNaN(Number(nameA));
          const isBNumeric = !isNaN(Number(nameB));

          if (isANumeric && isBNumeric) return 0; // Both are numeric, consider equal
          if (isANumeric) return 1; // Numeric comes after alphabets
          if (isBNumeric) return -1; // Numeric comes after alphabets

          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0; // If they are equal
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

      setDesignEntries(data); // Store the fetched design entries
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
      return designCounts; // No filter applied
    } else if (filter === "regular") {
      return designCounts.filter(
        (item) =>
          !item.design.startsWith("D-") &&
          !item.design.startsWith("P-") &&
          !item.design.startsWith("WC-") &&
          !item.design.startsWith("RLT-") &&
          isNaN(Number(item.design))
      ); // Filter out designs starting with "D-" or "P-"
    } else if (filter === "Design No.") {
      return designCounts.filter((item) => !isNaN(Number(item.design))); // Filter out designs starting with "D-" or "P-"
    } else {
      return designCounts.filter(
        (item) =>
          item.design.startsWith("P-") ||
          item.design.startsWith("D-") ||
          item.design.startsWith("WC-") ||
          item.design.startsWith("RLT-")
      ); // Filter out designs starting with "D-" or "P-"
    }
  };

  return (
    <div className="container mx-auto mt-10 p-4">
      {/* Toggle Group for Filters */}

      <Button onClick={() => navigate("/")} className="mb-4">
        Back to Home
      </Button>
      <h1 className="text-2xl font-bold">Dispatch List</h1>
      <ToggleGroup
        variant="outline"
        type="single"
        value={filter}
        onValueChange={setFilter}
        className="mb-4 mx-4 border" // Added border class
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

      <Accordion type="single" collapsible className="w-full">
        {filteredDesignCounts().map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger
              className="text-lg flex justify-between items-center w-full"
              onClick={() => fetchDesignEntries(item.design)}
            >
              <span className="text-left flex-grow">{item.design}</span>
              <span className="text-sm text-gray-500 ml-2 mr-3">
                count: {item.count}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-4 py-2">
                {designEntries.map((entry) => (
                  <div key={entry.id} className="flex justify-between">
                    <div className="flex-grow w-2/3">
                      <h3 className="font-semibold">{entry.party_name}</h3>
                      <p className="font-semibold">Price: {entry.price}</p>
                      <p>Dispatch Date: {formatDate(entry.dispatch_date)}</p>
                    </div>
                    <div className="ml-4 w-1/3">
                      <strong>Shades:</strong>
                      <ul>
                        {entry.shades.map((shade, idx) =>
                          shade ? (
                            <li key={idx}>
                              {idx + 1}: {shade}m
                            </li>
                          ) : null
                        )}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <Toaster />
    </div>
  );
}

export default DispatchList;
