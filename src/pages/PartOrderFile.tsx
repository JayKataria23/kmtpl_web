import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import supabase from "@/utils/supabase";
import { useToast } from "@/hooks/use-toast";
import NewOrderDialog from "@/components/part-order/NewOrderDialog";
import DesignEntriesTable from "@/components/part-order/DesignEntriesTable";

interface DesignEntry {
  design_entry_id: number;
  design_title: string;
  price: string;
  design_remark: string;
  shades: { [key: string]: string }[];
  order_id: string;
  order_no: number;
  order_remark: string;
  bhiwandi_date: string | null;
  dispatch_date: string | null;
  bill_to_party: string;
}

function PartOrderFile() {
  const [designEntries, setDesignEntries] = useState<{
    [key: string]: DesignEntry[];
  }>({});
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetchPartDesignEntries();
  }, []);

  const fetchPartDesignEntries = async () => {
    try {
      const { data, error } = await supabase.rpc(
        "get_design_entries_with_part_true"
      );

      if (error) throw error;

      // Group entries by design_title
      const groupedEntries = data.reduce(
        (acc: { [key: string]: DesignEntry[] }, entry: DesignEntry) => {
          if (!acc[entry.design_title]) {
            acc[entry.design_title] = [];
          }
          acc[entry.design_title].push(entry);
          return acc;
        },
        {}
      );

      setDesignEntries(groupedEntries);
    } catch (error) {
      console.error("Error fetching part design entries:", error);
    }
  };

  const handleSendToBhiwandi = async (entryId: number) => {
    try {
      const today = new Date(
        new Date().getTime() + 5.5 * 60 * 60 * 1000
      ).toISOString();

      const { error } = await supabase
        .from("design_entries")
        .update({ bhiwandi_date: today })
        .eq("id", entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully sent to Bhiwandi",
      });

      fetchPartDesignEntries(); // Refresh the data
    } catch (error) {
      console.error("Error sending to Bhiwandi:", error);
      toast({
        title: "Error",
        description: "Failed to send to Bhiwandi",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrder = async (entryId: number) => {
    try {
      const { error } = await supabase
        .from("design_entries")
        .delete()
        .eq("id", entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order deleted successfully",
      });

      fetchPartDesignEntries(); // Refresh the data
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    }
  };

  const handleDispatch = async (entryId: number) => {
    try {
      const today = new Date(
        new Date().getTime() + 5.5 * 60 * 60 * 1000
      ).toISOString();

      const { error } = await supabase
        .from("design_entries")
        .update({ dispatch_date: today })
        .eq("id", entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully dispatched",
      });

      fetchPartDesignEntries();
    } catch (error) {
      console.error("Error dispatching:", error);
      toast({
        title: "Error",
        description: "Failed to dispatch",
        variant: "destructive",
      });
    }
  };

  const handleReverseBhiwandi = async (entryId: number) => {
    try {
      const { error } = await supabase
        .from("design_entries")
        .update({ bhiwandi_date: null })
        .eq("id", entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully reversed Bhiwandi status",
      });

      fetchPartDesignEntries();
    } catch (error) {
      console.error("Error reversing Bhiwandi status:", error);
      toast({
        title: "Error",
        description: "Failed to reverse Bhiwandi status",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    // Create a hidden iframe for printing
    if (!printFrameRef.current) return;

    // Flatten all entries and sort by design name
    const allEntries = Object.entries(designEntries)
      .flatMap(([design, entries]) =>
        entries.map((entry) => ({ ...entry, design_title: design }))
      )
      .sort((a, b) => a.design_title.localeCompare(b.design_title));

    // Format date for the header
    const currentDate = new Date();
    const formattedDate = new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(currentDate);

    // Generate the print content with improved styling and layout
    const printContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Part Orders Report</title>
          <style>
            @page {
              size: A4;
              margin: 1cm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 15px;
              font-size: 12px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 1px solid #333;
            }
            .report-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .report-date {
              font-size: 12px;
              color: #555;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 6px 8px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            .shade-item {
              margin: 3px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 10px;
              color: #777;
              position: fixed;
              bottom: 10px;
              left: 0;
              right: 0;
            }
            .has-bhiwandi {
              background-color: #ffff99; /* Yellow background */
            }
            @media print {
              .no-print {
                display: none;
              }
              .has-bhiwandi {
                background-color: #ffff99 !important; /* Ensure yellow background prints */
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="report-title">Part Orders Report</div>
            <div class="report-date">Generated on ${formattedDate}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 15%">Design</th>
                <th style="width: 15%">Party</th>
                <th style="width: 10%">Order No</th>
                <th style="width: 10%">Price</th>
                <th style="width: 40%">Shades</th>
              </tr>
            </thead>
            <tbody>
              ${allEntries
                .map((entry) => {
                  // Determine if the entry has a Bhiwandi date
                  const hasBhiwandi = entry.bhiwandi_date !== null;
                  const rowClass = hasBhiwandi ? "has-bhiwandi" : "";

                  // Group shades by meter value
                  const meterGroups = new Map<
                    string,
                    { shadeNames: string[] }
                  >();

                  entry.shades.forEach((shade) => {
                    const shadeName = Object.keys(shade)[0];
                    const shadeValue = shade[shadeName];

                    if (shadeValue) {
                      if (!meterGroups.has(shadeValue)) {
                        meterGroups.set(shadeValue, { shadeNames: [] });
                      }
                      meterGroups.get(shadeValue)?.shadeNames.push(shadeName);
                    }
                  });

                  // Format the grouped shades for HTML
                  const shadesHtml =
                    Array.from(meterGroups.entries())
                      .map(
                        ([meters, { shadeNames }]) => `
                      <div style="display: inline-block; margin: 2px;">
                        <div style="border-bottom: 1px solid #000; text-align: center;">${shadeNames.join(
                          " - "
                        )}</div>
                        <div style="border-top: 1px solid #000; text-align: center;">${meters} mtr</div>
                      </div>
                    `
                      )
                      .join("") || "No shades specified";

                  return `
                    <tr class="${rowClass}">
                      <td>${entry.design_title}</td>
                      <td>${entry.bill_to_party}</td>
                      <td>${entry.order_no}</td>
                      <td>${entry.price}</td>
                      <td>${shadesHtml}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
          
          <div class="footer">
            Page 1 of 1 • Part Orders System • Printed from Management System
          </div>
          
          <script>
            // Print automatically when loaded
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    const iframe = printFrameRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printContent);
      iframeDoc.close();
    }
  };

  return (
    <div className="container mx-auto mt-10 p-4">
      <div className="flex justify-between mb-4">
        <Button onClick={() => navigate("/")}>Back to Home</Button>
        <div className="flex gap-2">
          <Button onClick={handlePrint}>Print All Orders</Button>
          <Button onClick={() => setIsNewOrderDialogOpen(true)}>
            New Part Order
          </Button>
        </div>
      </div>

      {/* Hidden iframe for printing */}
      <iframe
        ref={printFrameRef}
        style={{ display: "none", width: "0", height: "0" }}
        title="Print Frame"
      />

      <NewOrderDialog
        isOpen={isNewOrderDialogOpen}
        onOpenChange={setIsNewOrderDialogOpen}
        onOrderCreated={fetchPartDesignEntries}
      />

      <DesignEntriesTable
        designEntries={designEntries}
        openAccordionItems={openAccordionItems}
        onOpenAccordionItemsChange={setOpenAccordionItems}
        onSendToBhiwandi={handleSendToBhiwandi}
        onDeleteOrder={handleDeleteOrder}
        onDispatch={handleDispatch}
        onReverseBhiwandi={handleReverseBhiwandi}
      />
    </div>
  );
}

export default PartOrderFile;
