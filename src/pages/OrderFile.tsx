import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import supabase from "@/utils/supabase";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface DesignCount {
  design: string;
  count: number;
}

function OrderFile() {
  const [designCounts, setDesignCounts] = useState<DesignCount[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDesignCounts();
  }, []);

  const fetchDesignCounts = async () => {
    try {
      const { data, error } = await supabase.rpc("get_design_entry_count");

      if (error) throw error;

      const formattedData: DesignCount[] = data.map(
        (item: { design: string; count: bigint }) => ({
          design: item.design,
          count: Number(item.count), // Convert BIGINT to number
        })
      );
      console.log(formattedData);
      setDesignCounts(formattedData);
    } catch (error) {
      console.error("Error fetching design counts:", error);
    }
  };

  return (
    <div className="container mx-auto mt-10 p-4">
      <Button onClick={() => navigate("/")} className="mb-4">
        Back to Home
      </Button>
      <Accordion type="single" collapsible className="w-full">
        {designCounts.map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger className="text-lg">
              {item.design}
              <span className="text-sm text-gray-500 ml-2">
                count: {item.count}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {/* Add any additional content you want to show when expanded */}
              <p>Additional details for {item.design} can go here.</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export default OrderFile;
