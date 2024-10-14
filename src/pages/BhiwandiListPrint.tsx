import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface GroupedEntry {
  design: string;
  price: string;
  remark: string;
  shades: string[];
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
  const location = useLocation();
  const { designEntries } = location.state || { designEntries: [] };
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);

  // Log all design entries
  useEffect(() => {
    handleGenerateHTML(designEntries);
  }, [designEntries]);

  const handleGenerateHTML = (designEntries: GroupedOrder[]) => {
    let html = "<h1 style='font-size: 24px; margin-bottom: 20px;'>Order Preview</h1>";

    // Loop through designEntries to create HTML structure
    designEntries.forEach((entry: GroupedOrder, entryIndex: number) => {
      // Specify the type of entry
      html += `
        <div style="margin-bottom: 20px; background-color: ${
          entryIndex % 2 === 0 ? "#f9f9f9" : "#ffffff"
        }; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
          <p style="font-size: 18px; line-height: 0.5;"><strong>Bill To:</strong> ${entry.bill_to_party}</p>
          <p style="font-size: 18px; line-height: 0.5;"><strong>Ship To:</strong> ${entry.ship_to_party}</p>
          <p style="font-size: 18px; line-height: 0.5;"><strong>Broker:</strong> ${entry.broker_name}</p>
          <p style="font-size: 18px; line-height: 0.5;"><strong>Transport:</strong> ${entry.transporter_name}</p>
      `;

      // Loop through each design entry
      entry.entries.forEach((designEntry) => {
        html += `
          <div style="display: flex; justify-content: space-between; margin-top: 10px; border: 1px solid #ccc; padding: 10px; border-radius: 5px;">
            <div style="flex: 1;">
              <p style="font-size: 18px; line-height: 0.5;"><strong>Design:</strong> ${designEntry.design}</p>
              <p style="font-size: 18px; line-height: 0.5;"><strong>Price:</strong> ${designEntry.price}</p>
              <p style="font-size: 18px; line-height: 0.5;"><strong>Remark:</strong> ${designEntry.remark || "N/A"}</p>
            </div>
            <div style="flex: 1; text-align: left;">
              <p style="font-size: 18px; line-height: 0.5;"><strong>Shades:</strong></p>
              <div>
                ${designEntry.shades
                  .filter(shade => shade) // Filter out empty shades
                  .map((shade, idx) => `<div style="font-size: 16px; line-height: 1;">${idx + 1}: ${shade} m</div>`)
                  .join("")}
              </div>
            </div>
          </div>
        `;
      });

      html += "</div>"; // Close the entry div
    });

    setGeneratedHtml(html);
  };

  return (
    <div className="p-4">
      <Card className="max-w-md mx-auto shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Bhiwandi List Print</h1>
        <Button onClick={() => {
          const iframe = document.querySelector('iframe');
          if (iframe) {
            iframe.contentWindow?.print();
          }
        }} className="mb-4">
          Print
        </Button>
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
