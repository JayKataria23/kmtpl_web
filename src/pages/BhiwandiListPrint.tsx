import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Share2 } from "lucide-react";
import supabase from "@/utils/supabase";

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

function BhiwandiListPrint() {
  const { date } = useParams<{ date: string }>();
  const [designEntries, setDesignEntries] = useState<GroupedOrder[]>([]);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);

  const formatDate = (dateString: string): string => {
    console.log(dateString);
    const date = new Date(dateString.substring(1));
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

  useEffect(() => {
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
    fetchDesignEntries(date as string); // Ensure fetchDesignEntries is defined in the scope
  }, [date]); // Added fetchDesignEntries to the dependency array

  useEffect(() => {
    const handleGenerateHTML = (designEntries: GroupedOrder[]) => {
      let html = `<div style="display: flex; justify-content: space-between; align-items: center; padding-right: 10px; ">
        <h1 style='font-size: 24px;'>Order Preview</h1>
        <p style='font-size: 18px; line-height: 0.5;'>${formatDate(
          date as string
        )}</p>
      </div>`;

      // Loop through designEntries to create HTML structure
      designEntries.forEach((entry: GroupedOrder, entryIndex: number) => {
        // Specify the type of entry
        html += `
        <div style="margin-bottom: 20px; background-color: ${
          entryIndex % 2 === 0 ? "#f9f9f9" : "#ffffff"
        }; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
          <p style="font-size: 18px; line-height: 0.5;"><strong>Bill To:</strong> ${
            entry.bill_to_party
          }</p>
          <p style="font-size: 18px; line-height: 0.5;"><strong>Ship To:</strong> ${
            entry.ship_to_party
          }</p>
          <p style="font-size: 18px; line-height: 0.5;"><strong>Broker:</strong> ${
            entry.broker_name
          }</p>
          <p style="font-size: 18px; line-height: 0.5;"><strong>Transport:</strong> ${
            entry.transporter_name
          }</p>
      `;

        // Loop through each design entry
        entry.entries.forEach((designEntry) => {
          html += `
          <div style="display: flex; justify-content: space-between; margin-top: 10px; border: 1px solid #ccc; padding: 10px; border-radius: 5px;">
            <div style="flex: 1;">
              <p style="font-size: 18px; line-height: 0.5;"><strong>Design:</strong> ${
                designEntry.design
              }</p>
              <p style="font-size: 18px; line-height: 0.5;"><strong>Price:</strong> ${
                designEntry.price
              }</p>
              <p style="font-size: 18px; line-height: 0.5;"><strong>Remark:</strong> ${
                designEntry.remark || "N/A"
              }</p>
            </div>
            <div style="flex: 1; text-align: left;">
              <p style="font-size: 18px; line-height: 0.5;"><strong>Shades:</strong></p>
              <div>
                ${designEntry.shades
                  .map((shade, idx) => {
                    return shade
                      ? `<div style="font-size: 16px; line-height: 1;">${
                          idx + 1
                        }: ${shade} m</div>`
                      : ""; // Return an empty string instead of null
                  })
                  .join("")}
              </div>
            </div>
          </div>
        `;
        });

        html += "</div>"; // Close the entry div
      });

      return html;
    };
    setGeneratedHtml(handleGenerateHTML(designEntries));
  }, [designEntries, date]);

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

  const handleShare = () => {
    const currentUrl = window.location.href; // Get the current page URL
    const message = `Bhiwandi List: ${currentUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="p-4">
      <Card className="max-w-md mx-auto shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Bhiwandi List Print</h1>
        <div className="flex justify-between mb-4">
          <Button
            onClick={() => {
              const iframe = document.querySelector("iframe");
              if (iframe) {
                iframe.contentWindow?.print();
              }
            }}
            className="flex-1 mr-2"
          >
            Print
          </Button>
          <Button onClick={handleShare} className="flex-1 ml-2">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </Card>
      {generatedHtml && (
        <iframe
          srcDoc={generatedHtml}
          title="Generated HTML Preview"
          style={{
            width: "100%",
            height: "950px",
            border: "1px solid #ccc",
            marginTop: "20px",
            display: "flex",
            zoom: 0.5,
          }}
        />
      )}
    </div>
  );
}

export default BhiwandiListPrint;
