import { useState, useEffect } from "react";
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
    // Create a print-friendly version of the content
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Flatten all entries and sort by design name
    const allEntries = Object.entries(designEntries)
      .flatMap(([design, entries]) =>
        entries.map((entry) => ({ ...entry, design_title: design }))
      )
      .sort((a, b) => a.design_title.localeCompare(b.design_title));

    // Generate the print content
    const printContent = `
      <html>
        <head>
          <title>Part Orders</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .shade-list { margin-left: 20px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <h1>Part Orders</h1>
          <table>
            <thead>
              <tr>
                <th style="width: 15%">Design</th>
                <th style="width: 15%">Party</th>
                <th style="width: 10%">Order No</th>
                <th style="width: 10%">Price</th>
                <th style="width: 50%">Shades</th>
              </tr>
            </thead>
            <tbody>
              ${allEntries
                .map(
                  (entry) => `
                <tr style="${
                  entry.bhiwandi_date ? "background-color: #fffde7;" : ""
                }">
                  <td>${entry.design_title}</td>
                  <td>${entry.bill_to_party}</td>
                  <td>${entry.order_no}</td>
                  <td>${entry.price}</td>
                  <td>
                    <div class="shade-list">
                      ${entry.shades
                        .map((shade) => {
                          const shadeName = Object.keys(shade)[0];
                          const shadeValue = shade[shadeName];
                          return shadeValue
                            ? `${shadeName}: ${shadeValue}m`
                            : "";
                        })
                        .filter(Boolean)
                        .join("<br>")}
                    </div>
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Automatically trigger print after a short delay to ensure content is loaded
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
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
