import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import supabase from "@/utils/supabase";
import { useToast } from "@/hooks/use-toast";
import html2pdf from "html2pdf.js";
import { FileText } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerClose,
  DrawerTrigger,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Toaster } from "@/components/ui";
import AddPartOrder from "@/components/custom/AddPartOrder";
interface PartyCount {
  party_name: string; // Changed from 'party' to 'party_name'
  design_entry_count: number; // Changed from 'count' to 'design_entry_count'
}

interface DesignDetail {
  order_date: string;
  design: string;
  shades: { [key: string]: string }[];
  totalMeters: number;
  remark: string;
  canceled: boolean;
  bhiwandi_date: string;
  price: number;
  design_entry_id: number;
  party_name: string;
  order_no: number;
}

interface SelectedDesignDetail extends DesignDetail {
  date: string; // New date attribute
}

function PartyFile() {
  const [partyCounts, setPartyCounts] = useState<PartyCount[]>([]);
  const [partyOrders, setPartyOrders] = useState<{
    [key: string]: DesignDetail[];
  }>({});
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // Add state for drawer visibility
  const [selectedEntries, setSelectedEntries] = useState<
    SelectedDesignDetail[]
  >([]);
  const { toast } = useToast();
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  const [isAddPartOrderOpen, setIsAddPartOrderOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DesignDetail | null>(null);
  const [isSendToBhiwandiOpen, setIsSendToBhiwandiOpen] = useState(false); // State for the new drawer
  const [selectedBhiwandiEntries, setSelectedBhiwandiEntries] = useState<
    SelectedDesignDetail[]
  >([]); // New state for selected Bhiwandi entries

  useEffect(() => {
    fetchPartyCounts();
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

  const fetchPartyCounts = async () => {
    try {
      const { data, error } = await supabase.rpc(
        "get_party_design_entry_count"
      );

      if (error) throw error;

      setPartyCounts(data); // Directly set the data without mapping
    } catch (error) {
      console.error("Error fetching party counts:", error);
    }
  };

  const fetchOrderDetails = async (party: string) => {
    try {
      const { data, error } = await supabase.rpc("get_designs_by_party", {
        party_name_input: party, // Changed from party_input to party_name_input
      });

      if (error) throw error;

      const designDetails: DesignDetail[] = data.map(
        (entry: {
          design_name: string;
          shades: string;
          remark: string;
          canceled: boolean;
          bhiwandi_date: string;
          price: number;
          design_entry_id: number;
          order_date: string;
          order_no: number;
        }) => ({
          design: entry.design_name,
          shades: entry.shades,
          totalMeters: entry.shades,
          remark: entry.remark,
          canceled: entry.canceled,
          bhiwandi_date: entry.bhiwandi_date,
          price: entry.price,
          design_entry_id: entry.design_entry_id,
          order_date: entry.order_date,
          order_no: entry.order_no,
        })
      );

      setPartyOrders((prev) => ({ ...prev, [party]: designDetails }));
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  };

  // Function to toggle the drawer

  const addToDrawer = (entry: DesignDetail, party_name: string) => {
    const lastEntryDate =
      selectedEntries.length > 0
        ? selectedEntries[selectedEntries.length - 1].date
        : new Date().toISOString().split("T")[0]; // Use today's date if no entries

    setSelectedEntries((prev) => [
      ...prev,
      { ...entry, date: lastEntryDate, party_name: party_name },
    ]);
  };

  // Function to remove an entry from the drawer
  const removeFromDrawer = (entry: DesignDetail) => {
    setSelectedEntries((prev) =>
      prev.filter((e) => e.design_entry_id !== entry.design_entry_id)
    );
  };

  // Function to remove an entry from the Bhiwandi drawer
  const removeFromDrawerBhiwandi = (entry: DesignDetail) => {
    setSelectedBhiwandiEntries((prev) =>
      prev.filter((e) => e.design_entry_id !== entry.design_entry_id)
    );
  };

  const handleDispatch = async () => {
    try {
      const updates = selectedEntries.map((entry) => ({
        id: entry.design_entry_id,
        dispatch_date: entry.date,
      }));
      const { error } = await supabase.rpc(
        "update_design_entries_dispatch_date",
        {
          dispatch_info: updates,
        }
      );
      if (error) throw error;
      setSelectedEntries([]);
      setIsDrawerOpen(false);
      fetchPartyCounts();
      setOpenAccordionItems([]); // Close all accordions
      toast({
        title: "Success",
        description: "Entries dispatched successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Error sending entries to Dispatch. ${
          (error as Error).message
        }`,
      });
    }
  };

  // Function to handle sending all entries to Bhiwandi
  const handleSendAllToBhiwandi = async () => {
    try {
      if (selectedBhiwandiEntries.length === 0) {
        toast({
          title: "Error",
          description: "No entries to send to Bhiwandi",
        });
        return;
      }

      const today = new Date(
        new Date().getTime() + 5.5 * 60 * 60 * 1000
      ).toISOString();

      const idsToUpdate = selectedBhiwandiEntries.map(
        (entry) => entry.design_entry_id
      );

      // Update bhiwandi date for design entries
      const { error } = await supabase
        .from("design_entries")
        .update({ bhiwandi_date: today })
        .in("id", idsToUpdate);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully sent ${idsToUpdate.length} entries to Bhiwandi.`,
      });
      fetchPartyCounts();
      setSelectedBhiwandiEntries([]); // Clear the selected entries
      setIsSendToBhiwandiOpen(false); // Close the drawer
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

  // Function to add an entry to the Bhiwandi selected entries
  const addToDrawerBhiwandi = (entry: DesignDetail, party_name: string) => {
    const lastEntryDate =
      selectedBhiwandiEntries.length > 0
        ? selectedBhiwandiEntries[selectedBhiwandiEntries.length - 1].date
        : new Date().toISOString().split("T")[0]; // Use today's date if no entries

    setSelectedBhiwandiEntries((prev) => [
      ...prev,
      { ...entry, date: lastEntryDate, party_name: party_name },
    ]);
  };

  const generatePartyReport = (party: string) => {
    const orders = partyOrders[party];
    if (!orders || orders.length === 0) return;

    const today = new Date().toLocaleDateString("en-GB");

    // Generate HTML content
    let html = `
      <html>
        <head>
          <style>
            @page {
              size: A4;
              margin: 1cm;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
              page-break-inside: avoid;
            }
            .company-name { 
              font-size: 24px; 
              font-weight: bold; 
              margin-bottom: 10px; 
            }
            .report-title { 
              font-size: 18px; 
              margin-bottom: 20px; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
              page-break-inside: auto;
            }
            thead { 
              display: table-header-group;
              page-break-inside: avoid;
              page-break-after: avoid;
            }
            tr { 
              page-break-inside: avoid;
              page-break-after: auto;
            }
            th, td { 
              border: 1px solid #ccc; 
              padding: 8px; 
              text-align: left;
              vertical-align: top;
            }
            th { 
              background-color: #f0f0f0;
              font-weight: bold;
            }
            .totals { 
              font-weight: bold; 
            }
            .shades { 
              margin: 0; 
              padding: 0; 
              list-style: none;
              page-break-inside: avoid;
            }
            .shades li { 
              margin-bottom: 4px; 
            }
            tbody {
              page-break-inside: avoid;
            }
            tfoot {
              display: table-footer-group;
              page-break-inside: avoid;
              page-break-after: avoid;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">K.M. TEXTILES PVT. LTD.</div>
            <div class="report-title">Party Report - ${party}</div>
            <div>Date: ${today}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Design</th>
                <th>Order No.</th>
                <th>Order Date</th>
                <th>Price</th>
                <th>Shades</th>
                <th>Status</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
    `;

    // Add order details
    orders.forEach((order) => {
      const status = order.canceled
        ? "Cancelled"
        : order.bhiwandi_date
        ? "In Bhiwandi"
        : "Active";

      const shadesList = order.shades
        .map((shade) => {
          const shadeName = Object.keys(shade)[0];
          const shadeValue = shade[shadeName];
          if (shadeValue === "" || shadeValue === "NaN") return null;
          return `<li>${shadeName}: ${shadeValue}m</li>`;
        })
        .filter(Boolean)
        .join("");

      html += `
        <tr>
          <td>${order.design}</td>
          <td>${order.order_no}</td>
          <td>${formatDate(order.order_date)}</td>
          <td>${order.price}</td>
          <td><ul class="shades">${shadesList}</ul></td>
          <td>${status}</td>
          <td>${order.remark || ""}</td>
        </tr>
      `;
    });

    // Add summary footer
    const totalOrders = orders.length;
    const activeOrders = orders.filter(
      (o) => !o.canceled && !o.bhiwandi_date
    ).length;
    const bhiwandiOrders = orders.filter((o) => o.bhiwandi_date).length;
    const cancelledOrders = orders.filter((o) => o.canceled).length;

    html += `
            </tbody>
            <tfoot>
              <tr>
                <td colspan="7" style="text-align: right; border: none; padding-top: 20px;">
                  <strong>Summary:</strong> Total Orders: ${totalOrders} | 
                  Active: ${activeOrders} | 
                  In Bhiwandi: ${bhiwandiOrders} | 
                  Cancelled: ${cancelledOrders}
                </td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `;

    // Generate PDF with improved settings
    html2pdf(html, {
      margin: [15, 10, 15, 10],
      filename: `${party}_report_${today}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
        compress: true,
      },
    });
  };

  return (
    <div className="container mx-auto mt-10 p-4 relative">
      <AddPartOrder
        open={isAddPartOrderOpen}
        onClose={() => setIsAddPartOrderOpen(false)}
        design_entry_id={selectedOrder?.design_entry_id.toString() || ""}
        design_name={selectedOrder?.design || ""}
        party_name={selectedOrder?.party_name || ""}
        price={selectedOrder?.price || 0}
        setSelectedEntries={setSelectedEntries}
        selectedEntries={selectedEntries}
      />
      <div className="sticky top-0 bg-white z-10 p-4 border-b-2">
        <Button onClick={() => navigate("/")}>Home</Button>
        <Drawer
          open={isDrawerOpen}
          onOpenChange={() => {
            setIsDrawerOpen((open) => !open);
            setOpenAccordionItems([]);
          }}
        >
          <DrawerTrigger asChild>
            <Button className="mx-4">Dispatch</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Selected Entries</DrawerTitle>
              <DrawerDescription>
                Entries added to Dispatch list
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {selectedEntries.map((entry, index) => (
                <div key={index} className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">{entry.design}</h3>
                  <table className="w-full divide-y divide-gray-200">
                    <tbody>
                      <tr>
                        <td className="px-2 py-4 w-3/6 text-sm font-medium text-gray-900">
                          <div className="break-words">
                            {entry.party_name}
                            {entry.remark && (
                              <>
                                <br />
                                Remark: {entry.remark}
                              </>
                            )}
                            {entry.price && (
                              <>
                                <br />
                                Price: {entry.price}
                              </>
                            )}
                            <br />
                            <input
                              type="date"
                              className="mt-2 border rounded p-1"
                              value={entry.date}
                              onChange={(e) => {
                                const updatedDate = e.target.value;
                                setSelectedEntries((prev) =>
                                  prev.map((e) =>
                                    e.design_entry_id === entry.design_entry_id
                                      ? { ...e, date: updatedDate }
                                      : e
                                  )
                                );
                              }} // Update the date in selected entries
                            />
                          </div>
                        </td>
                        <td className="px-2 py-4 w-2/6 text-sm text-gray-500">
                          {entry.shades &&
                            entry.shades.map((shade, idx) => {
                              const shadeName = Object.keys(shade)[0];
                              const shadeValue = shade[shadeName];
                              if (shadeValue == "" || shadeValue == "NaN") {
                                return;
                              }
                              return (
                                <div key={idx}>
                                  {shadeName}: {shadeValue}m{" "}
                                </div>
                              );
                            })}
                        </td>
                        <td className="px-2 py-4 w-1/6 text-sm text-gray-500">
                          <Button
                            className="ml-2 rounded-full w-10 h-10 text-lg text-white my-1"
                            onClick={() => {
                              setIsAddPartOrderOpen(true);
                              setSelectedOrder(entry);
                              console.log(entry);
                              console.log();
                            }}
                          >
                            P
                          </Button>
                          <Button
                            className="ml-2 my-1 bg-green-500 active:bg-green-500 visited:bg-green-500 hover:bg-green-500 rounded-full w-10 h-10 text-lg text-white"
                            onClick={() => removeFromDrawer(entry)} // Add function to remove entry from drawer
                          >
                            X
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
            <DrawerFooter>
              <Button
                onClick={handleDispatch} // Call the function when clicked
                className="mr-2" // Optional: Add some margin
                disabled={selectedEntries.length === 0} // Disable if no items in drawer
              >
                Dispatch
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
        <Drawer
          open={isSendToBhiwandiOpen}
          onOpenChange={setIsSendToBhiwandiOpen}
        >
          <DrawerTrigger asChild>
            <Button className="">Bhiwandi</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Send All Entries to Bhiwandi</DrawerTitle>
              <DrawerDescription>
                {selectedBhiwandiEntries.length > 0
                  ? selectedBhiwandiEntries.map((entry, index) => (
                      <div key={index}>
                        {entry.party_name}: {entry.design}
                      </div>
                    ))
                  : "No entries selected."}
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <Button onClick={handleSendAllToBhiwandi} className="mr-2">
                Confirm
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
      <Accordion
        type="multiple"
        value={openAccordionItems}
        onValueChange={setOpenAccordionItems}
        className="w-full"
      >
        {partyCounts
          .sort((a, b) => a.party_name.localeCompare(b.party_name))
          .map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger
                className="text-md flex justify-between items-center w-full"
                onClick={() => fetchOrderDetails(item.party_name)}
              >
                <span className="text-left flex-grow">{item.party_name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="mx-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    generatePartyReport(item.party_name);
                  }}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Report
                </Button>
                <span className="text-sm min-w-20 text-gray-500 ml-2">
                  count: {item.design_entry_count}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                {partyOrders[item.party_name] ? (
                  <div className="overflow-x-auto ">
                    <table className="w-full divide-y divide-gray-200">
                      <tbody>
                        {partyOrders[item.party_name]
                          ?.sort((a, b) => {
                            return a.design.localeCompare(b.design);
                          })
                          .map((order, orderIndex) => (
                            <tr
                              key={order.design_entry_id}
                              className={
                                order.bhiwandi_date
                                  ? "bg-yellow-100"
                                  : order.canceled
                                  ? "bg-red-100"
                                  : orderIndex % 2 === 0
                                  ? "bg-white"
                                  : "bg-gray-50"
                              }
                            >
                              <td className="px-2 py-4 w-3/6 text-sm font-medium text-gray-900">
                                <div className="break-words">
                                  {order.design}
                                  {order.remark && (
                                    <>
                                      <br />
                                      Remark: {order.remark}
                                    </>
                                  )}
                                  {order.price && (
                                    <>
                                      <br />
                                      Price: {order.price}
                                    </>
                                  )}
                                  {order.order_date && (
                                    <>
                                      <br />
                                      {formatDate(order.order_date)}
                                    </>
                                  )}
                                  {order.bhiwandi_date && (
                                    <span className="text-red-600">
                                      <br />
                                      {formatDate(order.bhiwandi_date)}
                                    </span>
                                  )}
                                  {order.order_no && (
                                    <>
                                      <br />
                                      Order No. :{order.order_no}
                                    </>
                                  )}
                                </div>
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
                              <td className="px-2 py-4 w-1/6 text-sm text-gray-500">
                                {order.bhiwandi_date ? (
                                  selectedEntries.some(
                                    (entry) =>
                                      entry.design_entry_id ===
                                      order.design_entry_id
                                  ) ? (
                                    <Button
                                      className="ml-2 bg-red-500 active:bg-red-500 visited:bg-red-500 hover:bg-red-500 rounded-full w-10 h-10 text-lg text-white"
                                      onClick={() => removeFromDrawer(order)} // Remove entry from drawer on click
                                    >
                                      X
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        className="ml-2 bg-green-500 active:bg-green-500 visited:bg-green-500 hover:bg-green-500 rounded-full w-10 h-10 text-lg text-white"
                                        onClick={() =>
                                          addToDrawer(order, item.party_name)
                                        }
                                      >
                                        D
                                      </Button>
                                      <Button
                                        className="m-2 mt-8 bg-red-500 active:bg-red-500 visited:bg-red-500 hover:bg-red-500 rounded-full w-10 h-10 text-white text-xl"
                                        onClick={() => {
                                          // Confirmation popup
                                          const confirmDelete = window.confirm(
                                            `Are you sure you want to delete the entry from bhiwandi list for ${order.design} from ${item.party_name} with order number ${order.order_no}?`
                                          );
                                          if (confirmDelete) {
                                            const updateBhiwandiDate =
                                              async () => {
                                                try {
                                                  const { error } =
                                                    await supabase
                                                      .from("design_entries")
                                                      .update({
                                                        bhiwandi_date: null,
                                                      })
                                                      .eq(
                                                        "id",
                                                        order.design_entry_id
                                                      );
                                                  if (error) throw error;
                                                  toast({
                                                    title: "Success",
                                                    description:
                                                      "Bhiwandi date deleted successfully.",
                                                  });
                                                  fetchPartyCounts();
                                                } catch (error) {
                                                  console.error(
                                                    "Error deleting Bhiwandi date:",
                                                    error
                                                  );
                                                  toast({
                                                    title: "Error",
                                                    description: `Failed to delete Bhiwandi date: ${
                                                      error instanceof Error
                                                        ? error.message
                                                        : "Unknown error"
                                                    }`,
                                                    variant: "destructive",
                                                  });
                                                }
                                              };
                                            updateBhiwandiDate();
                                          }
                                        }}
                                      >
                                        ↩︎
                                      </Button>
                                    </>
                                  )
                                ) : selectedBhiwandiEntries.some(
                                    (entry) =>
                                      entry.design_entry_id ===
                                      order.design_entry_id
                                  ) ? (
                                  <Button
                                    className="ml-2 bg-red-500 active:bg-red-500 visited:bg-red-500 hover:bg-red-500 rounded-full w-10 h-10 text-lg text-white"
                                    onClick={() =>
                                      removeFromDrawerBhiwandi(order)
                                    } // Remove entry from drawer on click
                                  >
                                    X
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      className="ml-2 bg-yellow-500 active:bg-yellow-500 visited:bg-yellow-500 hover:bg-yellow-500 rounded-full w-10 h-10 text-lg text-white"
                                      onClick={
                                        () =>
                                          addToDrawerBhiwandi(
                                            order,
                                            item.party_name
                                          ) // Add entry to Bhiwandi drawer on click
                                      }
                                    >
                                      B
                                    </Button>
                                    <Button
                                      className="m-2 mt-8 bg-red-500 active:bg-red-500 visited:bg-red-500 hover:bg-red-500 rounded-full w-10 h-10 text-xl text-white"
                                      onClick={() => {
                                        // Confirmation popup
                                        const confirmDelete = window.confirm(
                                          `Are you sure you want to cancel the entry for ${order.design} from ${item.party_name} with order number ${order.order_no}?`
                                        );
                                        if (confirmDelete) {
                                          const cancelEntry = async () => {
                                            try {
                                              const now =
                                                new Date().toISOString(); // Get current date and time
                                              const { error } = await supabase
                                                .from("design_entries")
                                                .update({
                                                  bhiwandi_date: now, // Set Bhiwandi date to now
                                                  dispatch_date: now, // Set dispatch date to now
                                                  remark: "Entry Cancelled", // Set remark to "Entry Cancelled"
                                                })
                                                .eq(
                                                  "id",
                                                  order.design_entry_id
                                                );
                                              if (error) throw error;
                                              toast({
                                                title: "Success",
                                                description:
                                                  "Entry cancelled successfully.",
                                              });
                                              fetchPartyCounts();
                                            } catch (error) {
                                              console.error(
                                                "Error cancelling entry:",
                                                error
                                              );
                                              toast({
                                                title: "Error",
                                                description: `Failed to cancel entry: ${
                                                  error instanceof Error
                                                    ? error.message
                                                    : "Unknown error"
                                                }`,
                                                variant: "destructive",
                                              });
                                            }
                                          };
                                          cancelEntry();
                                        }
                                      }}
                                    >
                                      X
                                    </Button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
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

export default PartyFile;
