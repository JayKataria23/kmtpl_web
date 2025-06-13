import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Share2 } from "lucide-react";
import supabase from "@/utils/supabase";
import html2pdf from "html2pdf.js";

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
  order_remark: string;
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
  order_remark: string;
}

function BhiwandiListPrint() {
  const { date } = useParams<{ date: string }>();
  const [designEntries, setDesignEntries] = useState<GroupedOrder[]>([]);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [hideDetails, setHideDetails] = useState<boolean>(false);

  const formatDate = (dateString: string): string => {
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
      let html = `<div style="display: flex; justify-content: space-between; align-items: center; padding-right: 10px;">
        <h1 style='font-size: 24px;'>Order Preview</h1>
        <p style='font-size: 18px; line-height: 0.5;'>${formatDate(
          date as string
        )}</p>
      </div>`;

      // Loop through designEntries to create HTML structure
      designEntries
        .sort((a, b) => a.bill_to_party.localeCompare(b.bill_to_party))
        .forEach((entry: GroupedOrder, entryIndex: number) => {
          html += `
        <div style="page-break-inside:avoid; page-break-after:auto; margin-bottom: 20px; background-color: ${
          entryIndex % 2 === 0 ? "#f9f9f9" : "#ffffff"
        }; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
          <div style="page-break-inside:avoid;page-break-after:auto">
            ${!hideDetails ? `<p style="font-size: 18px; line-height: 0.5;"><strong>Bill To:</strong> ${entry.bill_to_party}</p>` : ''}
            ${!hideDetails ? `<p style="font-size: 18px; line-height: 0.5;"><strong>Ship To:</strong> ${entry.ship_to_party}</p>` : ''}
            <p style="font-size: 18px; line-height: 0.5;">
            <span><strong>Order No.:</strong> ${entry.order_no}
            </span>
            <span><strong style="color: red; margin:5px; margin-left:40px; line-height:1">${
              entry.order_remark && entry.order_remark !== "N/A"
                ? entry.order_remark
                : ""
            }</strong></span>
            <span></p>
            ${!hideDetails ? `<p style="font-size: 18px; line-height: 0.5"><strong>Transport:</strong> ${entry.transporter_name}</p>` : ''}
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; page-break-inside:avoid;">
            <thead style="break-inside:avoid;">
              <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #ccc; padding-left: 8px; text-align: left; width: ${hideDetails ? '32%' : '22%'};">Design</th>
                ${!hideDetails ? `<th style="border: 1px solid #ccc; padding-left: 8px; text-align: left; width: 10%;">Price</th>` : ''}
                <th style="border: 1px solid #ccc; padding-left: 8px; text-align: left; width: ${hideDetails ? '68%' : '55%'};">Shades</th>
              </tr>
            </thead>
            <tbody style="break-inside:avoid;">`;

          // Loop through each design entry
          entry.entries.forEach((order) => {
            html += `
            <tr style="page-break-inside:avoid;">
              <td style="border: 1px solid #ccc; padding-left: 8px; width: ${hideDetails ? '32%' : '22%'};">${
                order.design
              }</td>
              ${!hideDetails ? `<td style="border: 1px solid #ccc; padding-left: 8px; width: 10%;">${order.price}</td>` : ''}
              <td style="border: 1px solid #ccc; padding-left: 8px; width: ${hideDetails ? '68%' : '55%'}; ">
              <div style="width: 100%; text-align: center; display: flex; flex-direction: row; flex-wrap: wrap;">
              ${formatShades(order.shades)}
              </div>  <strong style="color: red;">${
                order.remark && order.remark !== "N/A" ? order.remark : ""
              }</strong>
              </td>
            </tr>`;
          });

          html += `
            </tbody>
          </table>
        </div>`;
        });

      return html;
    };
    setGeneratedHtml(handleGenerateHTML(designEntries));
  }, [designEntries, date, hideDetails]);

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
        order_remark,
      } = entry;

      // Check if the order_id already exists in the map
      if (!grouped.has(order_id)) {
        // Create a new GroupedOrder if it doesn't exist
        grouped.set(order_id, {
          order_id,
          order_no,
          order_remark,
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

  const formatShades = (shades: { [key: string]: string }[]): string => {
    // Group shades by their values
    const formattedShades: {
      meters: string;
      shades: number[];
      keys: string[];
    }[] = [];

    shades.forEach((shadeObj, index) => {
      const shadeName = Object.keys(shadeObj)[0]; // Get the shade name
      const shadeValue = shadeObj[shadeName]; // Get the shade value

      if (shadeValue) {
        // Only process non-empty values
        const existingGroup = formattedShades.find(
          (group) => group.meters === shadeValue
        );
        if (existingGroup) {
          existingGroup.shades.push(index + 1); // Add the index to the existing group
          existingGroup.keys.push(shadeName); // Add the key to the existing group
        } else {
          formattedShades.push({
            meters: shadeValue,
            shades: [index + 1],
            keys: [shadeName], // Create a new group with the key
          });
        }
      }
    });

    return formattedShades
      .map((group) => {
        return `<div>
          <div style='border-bottom: 1px solid #000;'>${group.keys.join(
            " - "
          )}</div>
          <div style='border-top: 1px solid #000;'>${group.meters} mtr</div>
        </div>`;
      })
      .join("<div style='padding-left: 20px;'></div>");
  };

  const handleShare = () => {
    const currentUrl = window.location.href; // Get the current page URL
    const message = `Bhiwandi List ${formatDate(
      date as string
    )}: ${currentUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="p-4">
      <Card className="max-w-md mx-auto shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Bhiwandi List Print</h1>
        
        {/* Checkbox to hide details */}
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="hideDetails"
            checked={hideDetails}
            onChange={(e) => setHideDetails(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="hideDetails" className="text-sm">
            Hide party names, price & transport details
          </label>
        </div>

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
          <Button onClick={handleShare} className="flex-1 mx-2">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button
            onClick={async () => {
              if (generatedHtml && date) {
                html2pdf(
                  generatedHtml.replace(
                    /font-size: 18px; line-height: 0.5;/g,
                    "font-size: 18px; line-height: 1.5;"
                  ),
                  {
                    margin: 5,
                    filename: `Bhiwandi List ${formatDate(date as string)}.pdf`,
                  }
                );
              }
            }}
            className="flex items-center ml-2"
          >
            <FileText className="mr-2 h-4 w-4" /> PDF
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
