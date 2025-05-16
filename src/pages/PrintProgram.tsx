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
import { Toaster } from "@/components/ui";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

function PrintProgram() {
  const [designCounts, setDesignCounts] = useState<DesignCount[]>([]);
  const [designOrders, setDesignOrders] = useState<{
    [key: string]: OrderDetail[];
  }>({});
  const [programEntries, setProgramEntries] = useState<DrawerEntry[]>([]);
  const [isProgramDrawerOpen, setIsProgramDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all"); // State for filter
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  const [colorCounts, setColorCounts] = useState<{ [key: string]: number }>({});
  const [includeParty, setIncludeParty] = useState<boolean>(true); // Default to true
  const [tableTitle, setTableTitle] = useState<string>(""); // State for table title
  const [entryLotNo, setEntryLotNo] = useState<string>(""); // State for table title

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

  const handleAddToProgramList = (order: OrderDetail, design: string) => {
    setProgramEntries((prev) => [
      ...prev,
      { ...order, design, inProgramList: true }, // Add a property to track if it's in the Program List
    ]);
    toast({
      title: "Added to Program List",
      description: `${order.partyName} added to Program List.`,
    });
  };

  const handleRemoveFromProgramList = (id: number) => {
    setProgramEntries((prev) => prev.filter((entry) => entry.id !== id)); // Remove entry by id
  };

  // Sort the drawerEntries by design

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
    } else if (filter === "digital-dobby") {
      return designCounts
        .filter(
          (item) => item.design.includes("DDBY-") // Check if design ends with a 4-digit number
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

  const groupProgramEntries = (entries: DrawerEntry[]) => {
    const groupedEntries: {
      [key: string]: { partyNames: string[]; totalMeters: number };
    } = {};

    entries.forEach((entry) => {
      if (!groupedEntries[entry.design]) {
        groupedEntries[entry.design] = { partyNames: [], totalMeters: 0 };
        // Initialize color count for this design
        if (!colorCounts[entry.design]) {
          setColorCounts((prev) => ({ ...prev, [entry.design]: 2 })); // Default to 2
        }
      }

      // Add party name if not already included
      if (!groupedEntries[entry.design].partyNames.includes(entry.partyName)) {
        groupedEntries[entry.design].partyNames.push(entry.partyName);
      }

      // Only add the highest meters for each design entry
      let maxShadeValue = 0; // Initialize max shade value for this entry
      entry.shades.forEach((shade) => {
        const shadeName = Object.keys(shade)[0];
        const shadeValue = parseFloat(shade[shadeName]);
        if (!isNaN(shadeValue) && shadeValue > maxShadeValue) {
          maxShadeValue = shadeValue; // Update max shade value if current is higher
        }
      });

      // Add the highest shade value to total meters
      if (maxShadeValue > 0) {
        groupedEntries[entry.design].totalMeters += maxShadeValue; // Add to total meters
      }
    });

    return groupedEntries;
  };

  const generateProgram = () => {
    const programData = groupProgramEntries(programEntries);
    let html = `
      <html>
        <head>
          <title>Program Report</title>
          <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .design-column { width: 100px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } /* Fixed width for design column */
            .lumpset-column { width: 100px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } /* Fixed width for design column */
            .header { display: flex; justify-content: space-between; align-items: center; }
            .header h1, .header h2 { margin: 0; font-size: 24px; }
            .header h2 { flex-grow: 1; text-align: center; } /* Center the ॐ symbol */
            .swastik {margin-left: 40px} /* Adjust size as needed */
          </style>
        </head>
        <body>
          <div class="header">
            <h1>श्री</h1>
            <h2>ॐ</h2>
            संतनाम सहाई
            <div class="swastik"><h1>卐</h1></div> <!-- Use a swastik symbol here -->
          </div>
          <h2 style="text-align: center;">${tableTitle}</h2>
          <table>
            <tr>
              <th>Taka</th>
              <th>Design</th>
              <th>Lump Set</th>
              ${includeParty ? "<th>Party</th>" : ""}
            </tr>
    `;

    let totalTaka = 0; // Initialize total Taka

    Object.entries(programData).forEach(
      ([design, { partyNames, totalMeters }]) => {
        const colorCount = colorCounts[design] || 2; // Default to 2 if not set
        const taka = Math.floor((totalMeters / 100) * colorCount); // Convert to integer
        const lumpSet = Math.floor(totalMeters / 100); // Convert to integer
        const parties = includeParty
          ? partyNames
              .map((name) =>
                name
                  .replace(/\s*\[.*?\]\s*/g, "")
                  .replace(/\s*\(.*?\)\s*/g, "")
                  .trim()
              )
              .join(" + ")
          : "";

        totalTaka += taka; // Accumulate total Taka

        html += `
        <tr>
          <td>${taka}</td>
          <td class="design-column">${design}</td>
          <td class="lumpset-column">${lumpSet} lumps X ${colorCount} colours</td>
          ${includeParty ? `<td>${parties}</td>` : ""}
        </tr>
      `;
      }
    );

    html += `
          </table>
          <strong>${totalTaka} Taka</strong>
          <br/>
          <strong>Entry/Lot number = ${entryLotNo}</strong>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="container mx-auto  p-4 relative">
      <div className="sticky top-0 bg-white z-10">
        <Button onClick={() => navigate("/")} className="m-1">
          Back to Home
        </Button>

        <Drawer
          open={isProgramDrawerOpen}
          onOpenChange={setIsProgramDrawerOpen}
        >
          <DrawerTrigger asChild>
            <Button className="m-1">Program List</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="text-xl font-bold">
                Program List
              </DrawerTitle>
              <DrawerDescription className="text-sm text-gray-500">
                All design entries saved in the Program List
              </DrawerDescription>
            </DrawerHeader>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {Object.entries(groupProgramEntries(programEntries)).map(
                ([design, { partyNames, totalMeters }], index) => (
                  <div key={index} className="mb-4 border-b pb-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">{design}</h3>
                      <div className="text-sm font-medium text-gray-900">
                        Total Meters: {totalMeters}m
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <div className="flex items-center mt-2">
                        <button
                          onClick={() => {
                            setColorCounts((prev) => ({
                              ...prev,
                              [design]: Math.max(1, prev[design] - 1), // Prevent going below 1
                            }));
                          }}
                          className="mr-2 rounded-full p-1"
                        >
                          &lt; {/* Use < for decrement */}
                        </button>
                        <span>{colorCounts[design]}</span>
                        <button
                          onClick={() => {
                            setColorCounts((prev) => ({
                              ...prev,
                              [design]: prev[design] + 1,
                            }));
                          }}
                          className="ml-2 rounded-full p-1"
                        >
                          &gt; {/* Use > for increment */}
                        </button>
                      </div>
                      <Button
                        onClick={() => {
                          let extraMeters;
                          if (totalMeters % 100 === 0) {
                            extraMeters = 100; // Add 100 meters if total is a multiple of 100
                          } else {
                            extraMeters = 100 - (totalMeters % 100); // Calculate remaining meters to next multiple of 100
                          }

                          const extraEntry = {
                            design,
                            partyName: "Extra",
                            id: Date.now(), // Unique ID for the extra entry
                            shades: [{ Extra: extraMeters.toString() }], // Add the extra meters as a shade
                            order_remark: "", // Add default values for missing properties
                            price: 0, // Default price
                            part: false, // Default part value
                            entry_remark: "", // Default entry remark
                            order_date: "", // Default order date
                            order_no: 0, // Default order number
                          };
                          setProgramEntries((prev) => [...prev, extraEntry]); // Add extra entry to Program List
                          toast({
                            title: "Added Extra Entry",
                            description: `Extra entry of ${extraMeters}m added to Program List.`,
                          });
                        }}
                        className="mt-2 rounded-full w-32 h-10 bg-red-500 text-white"
                      >
                        + Extra
                      </Button>
                    </div>
                    {partyNames.map((partyName, partyIndex) => (
                      <div
                        key={partyIndex}
                        className="flex items-center justify-between mt-2"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {partyName.replace(/\s*\[.*?\]\s*/g, "").trim()}
                        </div>
                        <Button
                          onClick={() => {
                            const entryToRemove = programEntries.find(
                              (entry) =>
                                entry.partyName === partyName &&
                                entry.design === design
                            );
                            if (entryToRemove) {
                              handleRemoveFromProgramList(entryToRemove.id); // Remove from Program List
                            }
                          }}
                          className="ml-2 rounded-full w-8 h-8 bg-black text-white"
                        >
                          X
                        </Button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
            <DrawerFooter>
              <input
                type="text"
                value={tableTitle}
                onChange={(e) => setTableTitle(e.target.value)}
                placeholder="Enter table title"
                className="mr-2 border rounded p-1"
              />
              <div className="flex items-center justify-around">
                <input
                  type="checkbox"
                  checked={includeParty}
                  onChange={() => setIncludeParty((prev) => !prev)}
                  className="mr-2"
                />
                <label>Party Column</label>
                <input
                  type="text"
                  value={entryLotNo}
                  onChange={(e) => setEntryLotNo(e.target.value)}
                  placeholder="Enter Entry/Lot number"
                  className="mr-2 border rounded p-1"
                />
              </div>
              <Button onClick={generateProgram} className="text-white">
                Generate Program
              </Button>

              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

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
          
          <ToggleGroupItem value="print" aria-label="Show print">
            Print
          </ToggleGroupItem>{" "}
          <ToggleGroupItem value="digital" aria-label="Show digital">
            D
          </ToggleGroupItem>
          <ToggleGroupItem
            value="digital-dobby"
            aria-label="Show digital-dobby"
          >
            DDBY
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
                          return (
                            <tr
                              key={order.id}
                              className={
                                orderIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
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
                                {programEntries.some(
                                  (entry) => entry.id === order.id
                                ) ? ( // Check if the order is in the Program List
                                  <Button
                                    onClick={() =>
                                      handleRemoveFromProgramList(order.id)
                                    } // Remove from Program List
                                    className="ml-2 rounded-full w-10 h-10 bg-black text-white"
                                  >
                                    X
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() =>
                                      handleAddToProgramList(order, item.design)
                                    } // Add to Program List
                                    className="ml-2 rounded-full w-10 h-10 bg-blue-500 active:bg-blue-500 visited:bg-blue-500 hover:bg-blue-500 text-lg"
                                  >
                                    P
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

export default PrintProgram;
