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
import { useToast } from "@/hooks/use-toast";

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

  return (
    <div className="container mx-auto mt-10 p-4">
      <Button onClick={() => navigate("/")} className="mb-4">
        Back to Home
      </Button>

      <Accordion
        type="multiple"
        className="w-full"
        value={openAccordionItems}
        onValueChange={setOpenAccordionItems}
      >
        {Object.entries(designEntries).map(([design, entries], index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger className="text-lg flex justify-between items-center w-full">
              <span className="text-left flex-grow">{design}</span>
              <span className="text-sm text-gray-500 ml-2 mr-3">
                count: {entries.length}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <tbody>
                    {entries.map((entry, entryIndex) => (
                      <tr
                        key={entry.design_entry_id}
                        className={
                          entry.bhiwandi_date
                            ? "bg-yellow-100"
                            : entryIndex % 2 === 0
                            ? "bg-white"
                            : "bg-gray-50"
                        }
                      >
                        <td className="px-2 py-4 w-3/6 text-sm font-medium text-gray-900">
                          <div className="break-words text-red-500">
                            {entry.bill_to_party}
                          </div>
                          {entry.order_remark && (
                            <div className="text-xs text-gray-500 mt-1">
                              Order Remark: {entry.order_remark}
                            </div>
                          )}
                          {entry.design_remark && (
                            <div className="text-xs text-gray-500 mt-1">
                              Design Remark: {entry.design_remark}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Price: {entry.price}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Order No: {entry.order_no}
                          </div>
                          {entry.bhiwandi_date && (
                            <div className="text-xs text-gray-500 mt-1">
                              Bhiwandi Date:{" "}
                              {new Date(entry.bhiwandi_date).toLocaleDateString(
                                "en-GB"
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-4 w-3/6 text-sm text-gray-500">
                          {entry.shades &&
                            entry.shades.map((shade, idx) => {
                              const shadeName = Object.keys(shade)[0];
                              const shadeValue = shade[shadeName];
                              if (shadeValue === "") return null;
                              return (
                                <div key={idx}>
                                  {shadeName}: {shadeValue}m
                                </div>
                              );
                            })}
                        </td>
                        {!entry.bhiwandi_date ? (
                          <td className="px-2 py-4 w-1/6 text-right">
                            <Button
                              onClick={() =>
                                handleSendToBhiwandi(entry.design_entry_id)
                              }
                              className="ml-2 rounded-full w-8 h-8 bg-yellow-500 hover:bg-yellow-600"
                            >
                              B
                            </Button>
                            <Button
                              onClick={() =>
                                handleDeleteOrder(entry.design_entry_id)
                              }
                              className="ml-2 rounded-full w-8 h-8 bg-red-500 hover:bg-red-600"
                            >
                              X
                            </Button>
                          </td>
                        ) : (
                          <td className="px-2 py-4 w-1/6 text-right">
                            <Button
                              onClick={() =>
                                handleDispatch(entry.design_entry_id)
                              }
                              className="ml-2 rounded-full w-8 h-8 bg-green-500 hover:bg-green-600"
                            >
                              D
                            </Button>
                            <Button
                              onClick={() =>
                                handleReverseBhiwandi(entry.design_entry_id)
                              }
                              className="ml-2 rounded-full w-8 h-8 bg-blue-500 hover:bg-blue-600"
                            >
                              ↺
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export default PartOrderFile;
