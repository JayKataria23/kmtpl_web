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

  return (
    <div className="container mx-auto mt-10 p-4">
      <Button onClick={() => navigate("/")} className="mb-4">
        Back to Home
      </Button>
      <h1 className="text-2xl font-bold">Dispatch List</h1>
      <Accordion type="single" collapsible className="w-full">
        {designCounts.map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger
              className="text-lg flex justify-between items-center w-full"
              onClick={() => fetchDesignEntries(item.design)} // Fetch details on click
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
                      <p>Price: {entry.price}</p>
                      <p>Dispatch Date: {entry.dispatch_date}</p>
                      {entry.order_remark && <p>Remark: {entry.order_remark}</p>}
                    </div>
                    <div className="ml-4 w-1/3"> 
                      <strong>Shades:</strong>
                      <ul>
                        {entry.shades.map((shade, idx) => (
                          shade ? (
                            <li key={idx}>
                              {idx + 1}: {shade}m
                            </li>
                          ) : null
                        ))}
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
