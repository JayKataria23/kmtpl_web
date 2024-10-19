import { useEffect, useState } from "react"; // Import useEffect and useState
import { Button } from "@/components/ui/button"; // Import Button
import { useNavigate } from "react-router-dom"; // Import useNavigate
import supabase from "@/utils/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"; // Import Shadcn Accordion components
import { Toaster } from "@/components/ui";

interface BhiwandiEntry {
  bhiwandi_date: string; // Date from the database
  count: number; // Count of entries for that date
}

interface Entry {
  design_entry_id: number;
  design: string;
  price: string;
  remark: string;
  shades: string[];
  bill_to_party: string;
  ship_to_party: string;
  broker_name: string;
  transporter_name: string;
  order_id: string;
}

interface GroupedEntry {
  design: string;
  price: string;
  remark: string;
  shades: string[];
  design_entry_id: number;
}

interface GroupedOrder {
  order_id: string;
  bill_to_party: string;
  ship_to_party: string;
  broker_name: string;
  transporter_name: string;
  entries: GroupedEntry[];
}

// Utility function to format the date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const optionsDate: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long", // Change month to 'long'
    year: "numeric",
  };
  const optionsTime: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "numeric",
    hour12: false, // Set hour12 to false for 24-hour format
  };

  const formattedDate = date.toLocaleDateString("en-US", optionsDate); // Format date
  const formattedTime = date.toLocaleTimeString("en-US", optionsTime); // Format time

  return `${formattedDate} ${formattedTime}`; // Return combined formatted date and time
};

const BhiwandiList = () => {
  const [bhiwandiEntries, setBhiwandiEntries] = useState<BhiwandiEntry[]>([]); // State to hold Bhiwandi entries
  const [designEntries, setDesignEntries] = useState<GroupedOrder[]>([]); // State to hold design entries for the selected date
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchBhiwandiEntries(); // Fetch Bhiwandi entries on component mount
  }, []);

  const fetchBhiwandiEntries = async () => {
    try {
      const { data, error } = await supabase.rpc("get_bhiwandi_date_counts"); // Call the new function

      if (error) throw error;

      const formattedData: BhiwandiEntry[] = data.map(
        (item: { bhiwandi_date: string; count: number }) => ({
          bhiwandi_date: item.bhiwandi_date, // Format the date
          count: item.count,
        })
      );

      setBhiwandiEntries(formattedData); // Set the fetched data to state
    } catch (error) {
      console.error("Error fetching Bhiwandi entries:", error);
    }
  };

  // Updated function to group entries by order_id
  function groupByOrderId(entries: Entry[]): GroupedOrder[] {
    const grouped = new Map<string, GroupedOrder>();

    entries.forEach((entry) => {
      const {
        order_id,
        bill_to_party,
        ship_to_party,
        broker_name,
        transporter_name,
        design_entry_id,
        design,
        price,
        remark,
        shades,
      } = entry;

      // Check if the order_id already exists in the map
      if (!grouped.has(order_id)) {
        // Create a new GroupedOrder if it doesn't exist
        grouped.set(order_id, {
          order_id,
          bill_to_party,
          ship_to_party,
          broker_name,
          transporter_name,
          entries: [], // Initialize with an empty entries array
        });
      }

      // Get the existing group and push the design entry into it
      const group = grouped.get(order_id)!;
      group.entries.push({ design, price, remark, shades, design_entry_id });
    });

    return Array.from(grouped.values()); // Return the grouped orders as an array
  }

  const fetchDesignEntries = async (date: string) => {
    try {
      const { data, error } = await supabase.rpc(
        "get_design_entries_by_bhiwandi_date",
        { input_date: date }
      );

      if (error) throw error;

      // Group the entries by order_id
      const groupedEntries = groupByOrderId(data);

      setDesignEntries(groupedEntries);
    } catch (error) {
      console.error("Error fetching design entries:", error);
    }
  };

  const handleDelete = async (design_entry_id: number) => {
    try {
      // Update the design entry to set bhiwandi_date to null
      const { error } = await supabase
        .from("design_entries")
        .update({ bhiwandi_date: null }) // Set bhiwandi_date to null
        .eq("id", design_entry_id);

      if (error) throw error;
      fetchBhiwandiEntries();
      toast({
        title: "Success!",
        description: "Design entry deleted from Bhiwandi List",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete design entry from Bhiwandi List: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto mt-10 text-center">
      <h1 className="text-2xl font-bold">Bhiwandi List</h1>
      <Button onClick={() => navigate("/")} className="mt-4">
        Back to Home
      </Button>

      <div className="mt-6">
        <Accordion type="single" collapsible className="w-full">
          {bhiwandiEntries.map((entry, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger
                className="p-4 flex justify-between items-center"
                onClick={() => {
                  fetchDesignEntries(entry.bhiwandi_date);
                }}
              >
                <div>
                  <span className="text-lg font-semibold">
                    {formatDate(entry.bhiwandi_date)}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    Count: {entry.count}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 border rounded mt-2">
                <div>
                  <Button
                    onClick={() => {
                      navigate(`/bhiwandi-list-print/:${entry.bhiwandi_date}`); // Navigate to BhiwandiListPrint with designEntries
                    }}
                    className="mb-4"
                  >
                    Open PDF
                  </Button>
                  {designEntries.map((entry, index) => (
                    <div
                      key={index}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-100"}
                    >
                      <p style={{ textAlign: "left" }}>
                        <strong>Bill To:</strong> {entry.bill_to_party}
                      </p>
                      <p style={{ textAlign: "left" }}>
                        <strong>Ship To:</strong> {entry.ship_to_party}
                      </p>
                      <p style={{ textAlign: "left" }}>
                        <strong>Broker:</strong> {entry.broker_name}
                      </p>
                      <p style={{ textAlign: "left" }}>
                        <strong>Transport:</strong> {entry.transporter_name}
                      </p>
                      <div>
                        {entry.entries.map((designEntry, designIndex) => (
                          <div
                            key={designIndex}
                            className="flex justify-between border-b p-4"
                          >
                            <div className="text-left w-3/6">
                              <p className="font-semibold text-base md:text-lg">
                                Design: {designEntry.design}
                              </p>
                              <p className="text-sm md:text-base font-semibold">
                                Price: {designEntry.price}
                              </p>
                              <p className="text-sm md:text-base">
                                Remark: {designEntry.remark || "N/A"}
                              </p>
                            </div>
                            <div className="text-left w-2/6">
                              <p className="font-semibold text-base md:text-lg">
                                Shades:
                              </p>
                              {designEntry.shades.length > 0 ? (
                                designEntry.shades[50] == "" ||
                                designEntry.shades.length == 50 ? (
                                  designEntry.shades.map((meters, idx) =>
                                    meters ? (
                                      <div key={idx}>
                                        {idx + 1}: {meters}m
                                      </div>
                                    ) : null
                                  )
                                ) : (
                                  "All Colours: " + designEntry.shades[50] + "m"
                                )
                              ) : (
                                <p className="text-sm md:text-base">
                                  No shades available
                                </p>
                              )}
                            </div>
                            <div className="w-1/6 flex items-center justify-center">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleDelete(designEntry.design_entry_id)
                                }
                              >
                                X
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <Toaster />
    </div>
  );
};

export default BhiwandiList;
