import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Share2, Printer } from "lucide-react";
import { Slider } from "@/components/ui/slider";
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
  const [printMode, setPrintMode] = useState<"compact" | "standard">("compact");
  const [fontSize, setFontSize] = useState<number>(11);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString.substring(1));
    const optionsDate: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    const optionsTime: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    };

    const formattedDate = date.toLocaleDateString("en-US", optionsDate);
    const formattedTime = date.toLocaleTimeString("en-US", optionsTime);

    return `${formattedDate} ${formattedTime}`;
  };

  useEffect(() => {
    const fetchDesignEntries = async (date: string) => {
      try {
        const { data, error } = await supabase.rpc(
          "get_design_entries_by_bhiwandi_date",
          { input_date: date }
        );

        if (error) throw error;
        const groupedEntries = groupByOrderId(data);
        setDesignEntries(groupedEntries);
      } catch (error) {
        console.error("Error fetching design entries:", error);
      }
    };
    fetchDesignEntries(date as string);
  }, [date]);

  useEffect(() => {
    // Set default font size based on print mode
    if (printMode === "compact" && fontSize > 12) {
      setFontSize(11);
    } else if (printMode === "standard" && fontSize < 12) {
      setFontSize(14);
    }
  }, [printMode]);

  useEffect(() => {
    const handleGenerateHTML = (designEntries: GroupedOrder[]) => {
      // Base font size from slider
      const baseFontSize = fontSize;
      const headerFontSize = baseFontSize + 5;
      const shadeFontSize = Math.max(baseFontSize - 1, 8);

      // CSS for the print layout
      const css = `
        @page {
          size: A4;
          margin: 0.5cm;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: ${baseFontSize}px;
          line-height: 1.2;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          border-bottom: 1px solid #ccc;
          padding-bottom: 5px;
        }
        .order-container {
          page-break-inside: avoid;
          margin-bottom: ${printMode === "compact" ? "10px" : "15px"};
          border: 1px solid #ccc;
          border-radius: 3px;
        }
        .order-header {
          display: grid;
          grid-template-columns: 2fr 2fr 1fr;
          gap: 5px;
          padding: 5px;
          background-color: #f0f0f0;
          border-bottom: 1px solid #ccc;
        }
        .order-info {
          font-weight: bold;
        }
        .order-remark {
          color: red;
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 4px;
          text-align: left;
          vertical-align: top;
        }
        th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        .shade-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(${
            printMode === "compact" ? "120px" : "180px"
          }, 1fr));
          gap: 3px;
        }
        .shade-box {
          border: 1px solid #ddd;
          text-align: center;
          background-color: #f9f9f9;
          padding: 2px;
        }
        .shade-names {
          border-bottom: 1px solid #ddd;
          font-size: ${shadeFontSize}px;
          word-break: break-word;
        }
        .shade-meters {
          font-weight: bold;
          font-size: ${shadeFontSize}px;
        }
      `;

      let html = `
      <html>
      <head>
        <style>${css}</style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; font-size: ${headerFontSize}px;">Bhiwandi Dispatch List</h1>
          <p style="margin: 0;">${formatDate(date as string)}</p>
        </div>
      `;

      // Sort by bill_to_party
      designEntries
        .sort((a, b) => a.bill_to_party.localeCompare(b.bill_to_party))
        .forEach((order) => {
          html += `
          <div class="order-container">
            <div class="order-header">
              <div>
                <div><strong>Bill To:</strong> ${order.bill_to_party}</div>
                <div><strong>Ship To:</strong> ${order.ship_to_party}</div>
              </div>
              <div>
                <div><strong>Transport:</strong> ${order.transporter_name}</div>
                <div><strong>Broker:</strong> ${
                  order.broker_name || "N/A"
                }</div>
              </div>
              <div>
                <div><strong>Order No:</strong> ${order.order_no}</div>
                <div class="order-remark">${order.order_remark || ""}</div>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th style="width: ${
                    printMode === "compact" ? "18%" : "20%"
                  };">Design</th>
                  <th style="width: ${
                    printMode === "compact" ? "7%" : "8%"
                  };">Price</th>
                  <th style="width: ${
                    printMode === "compact" ? "12%" : "12%"
                  };">Remark</th>
                  <th style="width: ${
                    printMode === "compact" ? "63%" : "60%"
                  };">Shades</th>
                </tr>
              </thead>
              <tbody>
          `;

          order.entries.forEach((entry) => {
            html += `
                <tr>
                  <td>${entry.design}</td>
                  <td>${entry.price}</td>
                  <td>${entry.remark || "N/A"}</td>
                  <td>
                    <div class="shade-grid">
                      ${formatShadesCompact(entry.shades)}
                    </div>
                  </td>
                </tr>
            `;
          });

          html += `
              </tbody>
            </table>
          </div>
          `;
        });

      html += `
        </body>
        </html>
      `;

      return html;
    };

    setGeneratedHtml(handleGenerateHTML(designEntries));
  }, [designEntries, date, printMode, fontSize]);

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

      if (!grouped.has(order_id)) {
        grouped.set(order_id, {
          order_id,
          order_no,
          order_remark,
          bill_to_party,
          ship_to_party,
          broker_name,
          transporter_name,
          entries: [],
        });
      }

      const group = grouped.get(order_id)!;
      group.entries.push({ design, price, remark, shades, design_entry_id });
    });

    return Array.from(grouped.values());
  }

  const formatShadesCompact = (shades: { [key: string]: string }[]): string => {
    const formattedShades: {
      meters: string;
      shades: number[];
      keys: string[];
    }[] = [];

    shades.forEach((shadeObj, index) => {
      const shadeName = Object.keys(shadeObj)[0];
      const shadeValue = shadeObj[shadeName];

      if (shadeValue) {
        const existingGroup = formattedShades.find(
          (group) => group.meters === shadeValue
        );
        if (existingGroup) {
          existingGroup.shades.push(index + 1);
          existingGroup.keys.push(shadeName);
        } else {
          formattedShades.push({
            meters: shadeValue,
            shades: [index + 1],
            keys: [shadeName],
          });
        }
      }
    });

    return formattedShades
      .map((group) => {
        return `
          <div class="shade-box">
            <div class="shade-names">${group.keys.join(" - ")}</div>
            <div class="shade-meters">${group.meters} mtr</div>
          </div>
        `;
      })
      .join("");
  };

  const handleShare = () => {
    const currentUrl = window.location.href;
    const message = `Bhiwandi List ${formatDate(
      date as string
    )}: ${currentUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handlePrint = () => {
    const iframe = document.querySelector("iframe");
    if (iframe) {
      iframe.contentWindow?.print();
    }
  };

  const handleExportPDF = async () => {
    if (generatedHtml && date) {
      const options = {
        margin: 5,
        filename: `Bhiwandi List ${formatDate(date as string)}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      html2pdf().set(options).from(generatedHtml).save();
    }
  };

  return (
    <div className="p-4">
      <Card className="max-w-md mx-auto shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Bhiwandi List Print</h1>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Layout Mode:</label>
            <div className="flex space-x-2">
              <Button
                variant={printMode === "compact" ? "default" : "outline"}
                size="sm"
                onClick={() => setPrintMode("compact")}
              >
                Compact
              </Button>
              <Button
                variant={printMode === "standard" ? "default" : "outline"}
                size="sm"
                onClick={() => setPrintMode("standard")}
              >
                Standard
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">
                Font Size: {fontSize}px
              </label>
            </div>
            <Slider
              value={[fontSize]}
              min={8}
              max={18}
              step={1}
              onValueChange={(value) => setFontSize(value[0])}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Small</span>
              <span>Medium</span>
              <span>Large</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={handlePrint}
            className="flex items-center justify-center"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button
            onClick={handleShare}
            className="flex items-center justify-center"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button
            onClick={handleExportPDF}
            className="flex items-center justify-center"
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
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
            zoom: 0.75,
          }}
        />
      )}
    </div>
  );
}

export default BhiwandiListPrint;
