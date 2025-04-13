import { useState, useEffect } from "react"; // Add useMemo import
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import supabase from "@/utils/supabase";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast"; // Import useToast at the top
import { Input, Toaster } from "@/components/ui";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import * as XLSX from "xlsx"; // Import XLSX for Excel file generation

interface DesignCount {
  design: string;
  count: number;
  part: boolean;
}

interface OrderDetail {
  partyName: string;
  shades: { [key: string]: string }[];
  order_remark: string;
  id: number; // Add id to OrderDetail interface
  price: number;
  part: boolean;
  entry_remark: string;
  order_date: string;
  order_no: number;
}

interface DrawerEntry extends OrderDetail {
  design: string;
  id: number; // Add id to DrawerEntry interface
}

function OrderFile() {
  const [designCounts, setDesignCounts] = useState<DesignCount[]>([]);
  const [designOrders, setDesignOrders] = useState<{
    [key: string]: OrderDetail[];
  }>({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerEntries, setDrawerEntries] = useState<DrawerEntry[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all"); // State for filter
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

  useEffect(() => {
    fetchDesignCounts();
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const optionsDate: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "long", // Change month to 'long'
      year: "numeric",
    };

    const formattedDateGB = date.toLocaleDateString("en-GB", optionsDate); // Format date to day/month/year

    return `${formattedDateGB}`; // Return combined formatted date and time
  };
  const fetchDesignCounts = async () => {
    try {
      const { data, error } = await supabase.rpc("get_design_entry_count");

      if (error) throw error;
      const formattedData: DesignCount[] = data.map(
        (item: { design: string; count: bigint; part: bigint }) => ({
          design: item.design,
          count: Number(item.count),
          part: Boolean(Number(item.part) > 0),
        })
      );
      formattedData.sort((a, b) => {
        const nameA = a.design.toLowerCase();
        const nameB = b.design.toLowerCase();

        // Check if both names are purely numeric
        const isANumeric = !isNaN(Number(nameA));
        const isBNumeric = !isNaN(Number(nameB));

        if (isANumeric && isBNumeric) {
          return Number(nameA) - Number(nameB); // Sort numerically if both are numeric
        }
        if (isANumeric) return 1; // Numeric comes after alphabets
        if (isBNumeric) return -1; // Numeric comes after alphabets

        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0; // If they are equal
      });

      setDesignCounts(formattedData);
    } catch (error) {
      console.error("Error fetching design counts:", error);
    }
  };

  const fetchOrderDetails = async (design: string) => {
    try {
      const { data, error } = await supabase.rpc("get_orders_by_design", {
        design_input: design,
      });

      if (error) throw error;

      const orderDetails: OrderDetail[] = data.map(
        (entry: {
          id: number; // Add id to the mapping
          party_name: string;
          shades: [];
          order_remark: string | null;
          price: number;
          part: boolean;
          entry_remark: string | null;
          order_date: string;
          order_no: number;
        }) => ({
          partyName: entry.party_name,
          shades: entry.shades,
          order_remark: entry.order_remark, // Existing line
          id: entry.id, // Add this line to include id
          price: entry.price,
          part: entry.part,
          entry_remark: entry.entry_remark,
          order_date: entry.order_date,
          order_no: entry.order_no,
        })
      );

      setDesignOrders((prev) => ({ ...prev, [design]: orderDetails }));
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  };

  const handleAddToDrawer = (order: OrderDetail, design: string) => {
    setDrawerEntries((prev) => [...prev, { ...order, design, id: order.id }]);
  };

  const handleRemoveFromDrawer = (id: number) => {
    setDrawerEntries((prev) => prev.filter((entry) => entry.id !== id)); // Remove entry by id
  };

  // Sort the drawerEntries by design

  const handleSendBhiwandi = async () => {
    try {
      if (drawerEntries.length === 0) {
        toast({
          title: "Error",
          description: "No entries to send to Bhiwandi",
        });
        return;
      }

      const today = new Date(
        new Date().getTime() + 5.5 * 60 * 60 * 1000
      ).toISOString();

      const idsToUpdate = drawerEntries.map((entry) => entry.id);

      //update remarks for design entries
      const remarksToUpdate = drawerEntries.map((entry) => ({
        id: entry.id,
        remark: entry.entry_remark,
      }));

      if (remarksToUpdate.length > 0) {
        for (const remark of remarksToUpdate) {
          const { error: remarkError } = await supabase
            .from("design_entries")
            .update(remark)
            .eq("id", remark.id);
          if (remarkError) throw remarkError;
        }
      }

      //update bhiwandi date for design entries
      const { error: bhiwandiError } = await supabase
        .from("design_entries")
        .update({ bhiwandi_date: today })
        .in("id", idsToUpdate);

      if (bhiwandiError) throw bhiwandiError;

      toast({
        title: "Success",
        description: `Successfully sent ${idsToUpdate.length} entries to Bhiwandi.`,
      });
      fetchDesignCounts();
      setDrawerEntries([]);
      setIsDrawerOpen(false);
      setOpenAccordionItems([]); // Close all accordions
    } catch (error) {
      console.error("Error sending to Bhiwandi:", error);
      toast({
        title: "Error",
        description: `Failed to send entries to Bhiwandi: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  const filteredDesignCounts = () => {
    if (filter === "all") {
      return designCounts.sort((a, b) => a.design.localeCompare(b.design)); // Sort alphabetically before returning
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
        .filter((item) => !isNaN(Number(item.design))) // Filter out designs starting with "D-" or "P-"
        .sort((a, b) => Number(a.design) - Number(b.design)); // Sort numerically before returning
    } else if (filter === "digital") {
      return designCounts
        .filter(
          (item) => item.design.includes("D-") // Check if design ends with a 4-digit number
        )
        .sort((a, b) => {
          const numA = Number(a.design.split("-").pop());
          const numB = Number(b.design.split("-").pop());
          return numA - numB; // Sort by the number after the hyphen
        }); // Filter out designs starting with "P-"
    } else {
      return designCounts
        .filter(
          (item) =>
            (item.design.includes("-") &&
              /^\d{4}$/.test(item.design.slice(-4))) ||
            (item.design.includes("-") && /^\d{3}$/.test(item.design.slice(-3))) // Check if design ends with a 4-digit number
        )
        .sort((a, b) => {
          const numA = Number(a.design.split("-").pop());
          const numB = Number(b.design.split("-").pop());
          return numA - numB; // Sort by the number after the hyphen
        });
    }
  };

  const handleEntryRemarkChange = (id: number, value: string) => {
    setDrawerEntries((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, entry_remark: value } : entry
      )
    );
  };

  const handleDownloadReport = (design: string) => {
    const orderDetails = designOrders[design];
    const shadeMap: { [key: string]: { [key: string]: number } } = {};
    const totalMap: { [key: string]: number } = {}; // To store total quantities

    // Use design entry ID as the unique identifier
    const orderIdentifiers = orderDetails.map((order) => {
      return `Entry-${order.id}`; // Use the design entry ID as the unique identifier
    });

    // Populate the shadeMap with distinct shade names and their quantities
    designOrders[design].forEach((order, index) => {
      const orderIdentifier = orderIdentifiers[index];

      // Process each shade in the order
      order.shades.forEach((shade) => {
        const shadeName = Object.keys(shade)[0];
        const shadeValue = shade[shadeName];

        // Skip empty quantities
        if (shadeValue === "") {
          return;
        }

        const quantity = Number(shadeValue); // Ensure quantity is a number

        // Initialize shade in maps if not present
        if (!shadeMap[shadeName]) {
          shadeMap[shadeName] = {};
          totalMap[shadeName] = 0; // Initialize total for this shade
        }

        // Initialize the quantity for this order and shade if not present
        if (!shadeMap[shadeName][orderIdentifier]) {
          shadeMap[shadeName][orderIdentifier] = 0;
        }

        // Add the quantity for this shade and order
        shadeMap[shadeName][orderIdentifier] += quantity;
        totalMap[shadeName] += quantity; // Update total quantity
      });
    });

    // Prepare data for Excel
    const excelData = [
      [
        "Design Name",
        design,
        "",
        "Date",
        new Date().toLocaleDateString("en-GB"),
      ],
      [
        "Shade Name",
        ...orderIdentifiers.map((id, index) => {
          // Create more readable column headers for orders
          const order = orderDetails[index];
          return `${order.partyName.split(" ").slice(0, 2).join(" ")} (${
            order.order_no
          })`;
        }),
        "Total",
      ], // Header row
    ];

    let highestNonZeroRowIndex = -1; // Track the highest row index with a non-zero total
    const rowsToKeep: string[][] = []; // Explicitly define the type as a 2D array of strings

    Object.entries(shadeMap).forEach(([shadeName, orderQuantities]) => {
      const row: string[] = [shadeName]; // Define row as an array of strings
      let totalQuantity = 0; // Initialize total for this row

      orderIdentifiers.forEach((orderIdentifier) => {
        const quantity = orderQuantities[orderIdentifier] || 0; // Get quantity or 0
        row.push(String(quantity)); // Fill in quantities or 0 as string
        totalQuantity += quantity; // Accumulate total quantity
      });

      row.push(String(totalQuantity)); // Add total quantity to the row

      // Check if the total is not zero and if the shadeName is a digit
      if (totalQuantity !== 0 && !isNaN(Number(shadeName))) {
        highestNonZeroRowIndex = rowsToKeep.length; // Update the highest non-zero row index
      }

      // Add the row to the rowsToKeep array
      rowsToKeep.push(row);
    });

    // Filter rows to keep only those before the highest non-zero row and all non-zero rows
    const filteredRows = rowsToKeep.filter((row, index) => {
      return (
        index <= highestNonZeroRowIndex || Number(row[row.length - 1]) !== 0
      );
    });

    // Add filtered rows to excelData
    excelData.push(...filteredRows);

    // Create a worksheet and workbook
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    // Export the Excel file
    XLSX.writeFile(workbook, `${design}_report.xlsx`);
  };

  return (
    <div className="container mx-auto mt-10 p-4 relative">
      <div className="sticky top-0 bg-white z-10">
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerTrigger asChild>
            <Button className="absolute top-4 right-4">Bhiwandi</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Selected Entries</DrawerTitle>
              <DrawerDescription>
                Entries added to Bhiwandi list
              </DrawerDescription>
            </DrawerHeader>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {Object.entries(
                drawerEntries.reduce((acc, entry) => {
                  if (!acc[entry.design]) acc[entry.design] = [];
                  acc[entry.design].push(entry);
                  return acc;
                }, {} as Record<string, DrawerEntry[]>)
              ).map(([design, entries]) => (
                <div key={design} className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">{design}</h3>
                  <table className="w-full divide-y divide-gray-200">
                    <tbody>
                      {entries.map((entry, index) => (
                        <tr
                          key={index}
                          className={
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
                        >
                          <td className="px-2 py-4 w-4/6 text-sm font-medium text-gray-900">
                            <div className="break-words">{entry.partyName}</div>
                            {entry.order_remark && (
                              <div className="text-xs text-gray-500 mt-1">
                                Remark: {entry.order_remark}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              Price: {entry.price}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Remark:{" "}
                              <Input
                                value={entry.entry_remark}
                                onChange={(e) =>
                                  handleEntryRemarkChange(
                                    entry.id,
                                    e.target.value
                                  )
                                }
                              ></Input>
                              <Button
                                className="m-2"
                                onClick={() =>
                                  handleEntryRemarkChange(entry.id, "")
                                }
                              >
                                Clear
                              </Button>
                            </div>
                          </td>
                          <td className="px-2 py-4 w-2/6 text-sm text-gray-500">
                            {entry.shades &&
                              entry.shades.map((shade, idx) => {
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
                          </td>
                          <td className="px-2 py-4 w-1/6 text-right">
                            <Button
                              className="ml-2 rounded-full w-8 h-8 text-white"
                              onClick={() => handleRemoveFromDrawer(entry.id)} // Call the remove function
                            >
                              X
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
            <DrawerFooter>
              <Button
                onClick={handleSendBhiwandi} // Call the function when clicked
                className="mr-2" // Optional: Add some margin
                disabled={drawerEntries.length === 0} // Disable if no items in drawer
              >
                Send to Bhiwandi
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        <Button onClick={() => navigate("/")} className="mb-4">
          Back to Home
        </Button>
        <ToggleGroup
          variant="outline"
          type="single"
          value={filter}
          onValueChange={(value) => {
            setFilter(value);
            setOpenAccordionItems([]);
          }}
          className="mb-4" // Added border class
        >
          <ToggleGroupItem value="all" aria-label="Show all">
            ALL
          </ToggleGroupItem>
          <ToggleGroupItem value="regular" aria-label="Show regular">
            Regular
          </ToggleGroupItem>
          <ToggleGroupItem value="print" aria-label="Show print">
            Print
          </ToggleGroupItem>{" "}
          <ToggleGroupItem value="digital" aria-label="Show digital">
            Digital
          </ToggleGroupItem>
          <ToggleGroupItem value="Design No." aria-label="Show Design No.">
            Design No.
          </ToggleGroupItem>
          
        </ToggleGroup>
      </div>
      <Accordion
        type="multiple"
        className="w-full"
        value={openAccordionItems}
        onValueChange={setOpenAccordionItems}
      >
        {filteredDesignCounts().map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger
              className="text-lg flex justify-between items-center w-full"
              onClick={() => fetchOrderDetails(item.design)}
            >
              <span className="text-left flex-grow">{item.design}</span>
              <Button onClick={() => handleDownloadReport(item.design)}>
                Report
              </Button>
              <span className="text-sm text-gray-500 ml-2 mr-3">
                count: {item.count}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {designOrders[item.design] ? (
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200">
                    <tbody>
                      {designOrders[item.design]
                        .sort((a, b) => Number(b.part) - Number(a.part)) // Sort orders with part = true at the top
                        .map((order, orderIndex) => {
                          const isSelected = drawerEntries.some(
                            (entry) => entry.id === order.id
                          );
                          return (
                            <tr
                              key={order.id}
                              className={
                                isSelected
                                  ? "bg-yellow-100"
                                  : orderIndex % 2 === 0
                                  ? "bg-white"
                                  : "bg-gray-50"
                              }
                            >
                              <td className="px-2 py-4 w-3/6 text-sm font-medium text-gray-900">
                                <div
                                  className={`break-words ${
                                    order.part ? "text-red-500" : ""
                                  }`}
                                >
                                  {order.partyName}
                                </div>
                                {order.order_remark && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Order Remark: {order.order_remark}
                                  </div>
                                )}
                                <div className="text-xs text-gray-500 mt-1">
                                  Price: {order.price}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {formatDate(order.order_date)}
                                </div>
                                {order.order_no && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Order No: {order.order_no}
                                  </div>
                                )}
                                {order.entry_remark && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Entry Remark: {order.entry_remark}
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-4 w-2/6 text-sm text-gray-500">
                                {order.shades &&
                                  order.shades.map((shade, idx) => {
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
                              </td>
                              <td className="px-2 py-4 w-1/6">
                                {isSelected ? (
                                  <Button
                                    className="ml-2 rounded-full w-10 h-10 text-lg text-white"
                                    onClick={() =>
                                      handleRemoveFromDrawer(order.id)
                                    }
                                  >
                                    X
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() =>
                                      handleAddToDrawer(order, item.design)
                                    }
                                    className="ml-2 rounded-full w-10 h-10 bg-yellow-500 active:bg-yellow-500 visited:bg-yellow-500 hover:bg-yellow-500 text-lg"
                                  >
                                    B
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>Loading order details...</p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <Toaster />
    </div>
  );
}

export default OrderFile;
