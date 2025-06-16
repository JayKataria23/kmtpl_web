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
  comment?: string; // Add comment field
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
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(
    new Set()
  ); // New state for selected entries
  const [designEntries, setDesignEntries] = useState<GroupedOrder[]>([]); // State to hold design entries for the selected date
  const navigate = useNavigate();
  const { toast } = useToast();
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editingRemark, setEditingRemark] = useState<{
    orderId: string;
    entryIndex: number;
    design_entry_id: number;
  } | null>(null);

  useEffect(() => {
    fetchBhiwandiEntries();
    fetchComments();
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

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("bhiwandi_comments")
        .select("bhiwandi_date, comment");

      if (error) throw error;

      const commentMap = (data || []).reduce(
        (acc: { [key: string]: string }, item) => {
          acc[item.bhiwandi_date] = item.comment || "";
          return acc;
        },
        {}
      );

      setComments(commentMap);
    } catch (error) {
      console.error("Error fetching comments:", error);
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

      // Sort the grouped entries by bill_to_party
      const sortedEntries = groupedEntries.sort((a, b) =>
        a.bill_to_party.localeCompare(b.bill_to_party)
      );

      setDesignEntries(sortedEntries);
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

  const combineBhiwandiLists = async () => {
    // Make the function async
    if (selectedEntries.size < 2) {
      toast({
        title: "Error",
        description: "Please select at least two entries to combine.",
        variant: "destructive",
      });
      return;
    }

    const today = new Date(
      new Date().getTime() + 5.5 * 60 * 60 * 1000
    ).toISOString();

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

  const handleCommentUpdate = async (
    bhiwandi_date: string,
    comment: string
  ) => {
    try {
      const { error } = await supabase.from("bhiwandi_comments").upsert(
        {
          bhiwandi_date,
          comment,
        },
        {
          onConflict: "bhiwandi_date",
        }
      );

      if (error) throw error;

      setComments((prev) => ({
        ...prev,
        [bhiwandi_date]: comment,
      }));
      setEditingComment(null);

      toast({
        title: "Success!",
        description: "Comment updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update comment: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  // New function to handle updating remarks
  const handleRemarkUpdate = async (
    design_entry_id: number,
    remark: string
  ) => {
    try {
      const { error } = await supabase
        .from("design_entries")
        .update({ remark })
        .eq("id", design_entry_id);

      if (error) throw error;

      // Update the local state to reflect the changes
      setDesignEntries(
        designEntries.map((orderGroup) => ({
          ...orderGroup,
          entries: orderGroup.entries.map((entry) =>
            entry.design_entry_id === design_entry_id
              ? { ...entry, remark }
              : entry
          ),
        }))
      );

      setEditingRemark(null);

      toast({
        title: "Success!",
        description: "Remark updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update remark: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
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
                <div className="flex items-center justify-between w-full">
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
                  <div className="ml-4 flex items-center">
                    {editingComment === entry.bhiwandi_date ? (
                      <input
                        type="text"
                        value={comments[entry.bhiwandi_date] || ""}
                        onChange={(e) => {
                          setComments((prev) => ({
                            ...prev,
                            [entry.bhiwandi_date]: e.target.value,
                          }));
                        }}
                        onBlur={() =>
                          handleCommentUpdate(
                            entry.bhiwandi_date,
                            comments[entry.bhiwandi_date] || ""
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCommentUpdate(
                              entry.bhiwandi_date,
                              comments[entry.bhiwandi_date] || ""
                            );
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 border rounded"
                        placeholder="NA"
                      />
                    ) : (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingComment(entry.bhiwandi_date);
                        }}
                        className="text-sm text-gray-600 cursor-pointer hover:text-gray-900"
                      >
                        {comments[entry.bhiwandi_date] || "NA"}
                      </span>
                    )}
                  </div>
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
                  {designEntries.map((orderGroup, orderIndex) => (
                    <div
                      key={orderIndex}
                      className={
                        orderIndex % 2 === 0 ? "bg-white" : "bg-gray-100"
                      }
                    >
                      <p style={{ textAlign: "left" }}>
                        <strong>Bill To:</strong> {orderGroup.bill_to_party}
                      </p>
                      <p style={{ textAlign: "left" }}>
                        <strong>Ship To:</strong> {orderGroup.ship_to_party}
                      </p>
                      <p style={{ textAlign: "left" }}>
                        <strong>Order No.:</strong> {orderGroup.order_no}
                      </p>
                      <p style={{ textAlign: "left" }}>
                        <strong>Transport:</strong>{" "}
                        {orderGroup.transporter_name}
                      </p>
                      <div>
                        {orderGroup.entries.map((designEntry, designIndex) => (
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
                              <div className="text-sm md:text-base">
                                <span className="mr-2">Remark:</span>
                                {editingRemark &&
                                editingRemark.orderId === orderGroup.order_id &&
                                editingRemark.entryIndex === designIndex ? (
                                  <input
                                    type="text"
                                    value={designEntry.remark || ""}
                                    onChange={(e) => {
                                      const updatedEntries = [...designEntries];
                                      updatedEntries[orderIndex].entries[
                                        designIndex
                                      ].remark = e.target.value;
                                      setDesignEntries(updatedEntries);
                                    }}
                                    onBlur={() =>
                                      handleRemarkUpdate(
                                        designEntry.design_entry_id,
                                        designEntry.remark
                                      )
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleRemarkUpdate(
                                          designEntry.design_entry_id,
                                          designEntry.remark
                                        );
                                      }
                                    }}
                                    className="px-2 py-1 border rounded"
                                    placeholder="Enter remark"
                                    autoFocus
                                  />
                                ) : (
                                  <span
                                    onClick={() =>
                                      setEditingRemark({
                                        orderId: orderGroup.order_id,
                                        entryIndex: designIndex,
                                        design_entry_id:
                                          designEntry.design_entry_id,
                                      })
                                    }
                                    className="cursor-pointer hover:text-blue-600 hover:underline"
                                  >
                                    {designEntry.remark || "N/A"}
                                  </span>
                                )}
                              </div>
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
                                    return null;
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
                                        entry.order_id !== orderGroup.order_id
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
