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
  shades: { [key: string]: string }[];
  bill_to_party: string;
  ship_to_party: string;
  broker_name: string;
  transporter_name: string;
  order_id: string;
  order_no: number;
}

interface GroupedEntry {
  design: string;
  price: string;
  remark: string;
  shades: { [key: string]: string }[];
  design_entry_id: number;
}

interface GroupedOrder {
  order_id: string;
  bill_to_party: string;
  ship_to_party: string;
  broker_name: string;
  transporter_name: string;
  entries: GroupedEntry[];
  order_no: number;
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
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set()); // New state for selected entries
  const [designEntries, setDesignEntries] = useState<GroupedOrder[]>([]); // State to hold design entries for the selected date
  const navigate = useNavigate();
  const { toast } = useToast();
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

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
        order_no,
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
          order_no,
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

  const closeAllAccordions = () => {
    setOpenAccordion(null);
  };

  const handleCheckboxChange = (entryDate: string) => {
    const updatedSelection = new Set(selectedEntries);
    if (updatedSelection.has(entryDate)) {
      updatedSelection.delete(entryDate); // Deselect if already selected
    } else {
      updatedSelection.add(entryDate); // Select if not already selected
    }
    setSelectedEntries(updatedSelection); // Update state
  };

  const combineBhiwandiLists = async () => { // Make the function async
    if (selectedEntries.size < 2) {
      toast({
        title: "Error",
        description: "Please select at least two entries to combine.",
        variant: "destructive",
      });
      return;
    }
    
    const today = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000).toISOString(); 
    
      const { error } = await supabase
        .from("design_entries")
        .update({ bhiwandi_date: today }) 
        .in("bhiwandi_date", Array.from(selectedEntries)); // Update only for selected entries
    

      if (error) {
        toast({
          title: "Error",
          description: `Failed to combine Bhiwandi entries: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        });
        return; // Exit the function if there's an error
      }
    

    // Refresh the page if there are no errors
    window.location.reload(); // Refresh the page
  };

  return (
    <div className="container mx-auto mt-10 text-center">
      <h1 className="text-2xl font-bold">Bhiwandi List</h1>
      <Button onClick={() => navigate("/")} className="mt-4 m-2">
        Back to Home
      </Button>

      <Button
        onClick={combineBhiwandiLists}
        disabled={selectedEntries.size < 2} // Disable if less than 2 selected
        className="mt-4 m-2"
      >
        Combine
      </Button>

      <div className="mt-6">
        <Accordion
          type="single"
          collapsible
          className="w-full"
          value={openAccordion as string | undefined}
          onValueChange={setOpenAccordion}
        >
          {bhiwandiEntries.map((entry, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger
                className="p-4 flex justify-between items-center"
                onClick={() => {
                  fetchDesignEntries(entry.bhiwandi_date);
                }}
              >
                <div>
                  <input
                    type="checkbox"
                    checked={selectedEntries.has(entry.bhiwandi_date)}
                    onChange={() => handleCheckboxChange(entry.bhiwandi_date)}
                    className="mr-2"
                  />
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
                        <strong>Order No.:</strong> {entry.order_no}
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
                              {designEntry.shades &&
                                designEntry.shades.map((shade, idx) => {
                                  const shadeName = Object.keys(shade)[0];
                                  const shadeValue = shade[shadeName];
                                  if (shadeValue == "") {
                                    return;
                                  }
                                  return (
                                    <div key={idx}>
                                      {shadeName}: {shadeValue}m{" "}
                                    </div>
                                  );
                                })}
                            </div>
                            <div className="w-1/6 flex items-center justify-center">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  handleDelete(designEntry.design_entry_id);
                                  setDesignEntries(
                                    designEntries.filter(
                                      (entry) =>
                                        entry.order_id !== entry.order_id
                                    )
                                  );
                                  closeAllAccordions();
                                }}
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
