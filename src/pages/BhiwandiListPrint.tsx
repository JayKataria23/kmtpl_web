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
  part: boolean | string;
}

interface GroupedEntry {
  design: string;
  price: string;
  remark: string;
  shades: { [key: string]: string }[];
  design_entry_id: number;
  part: boolean | string;
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

// One row in the "group by design" view
interface DesignRow {
  design_entry_id: number;
  bill_to_party: string;
  ship_to_party: string;
  transporter_name: string;
  order_no: number;
  order_remark: string;
  price: string;
  remark: string;
  shades: { [key: string]: string }[];
  part: boolean | string;
}

interface DesignGroup {
  design: string;
  rows: DesignRow[];
}

const PRINT_REMARK_STYLE =
  "color: #008000; border: 1px solid #000; padding: 1px 6px; font-weight: bold; display: inline-block; line-height: 1.2; print-color-adjust: exact; -webkit-print-color-adjust: exact;";

const PART_BADGE =
  '<span style="background: #eab308; color: #fff; font-size: 12px; border-radius: 4px; padding: 2px 6px; margin-left: 8px;">PART</span>';

const isPart = (part: boolean | string) => part === true || part === "true";

function BhiwandiListPrint() {
  const { date } = useParams<{ date: string }>();
  const [designEntries, setDesignEntries] = useState<GroupedOrder[]>([]);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [groupByDesign, setGroupByDesign] = useState<boolean>(false);

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
    const headerHtml = () => `<div style="display: flex; justify-content: space-between; align-items: center; padding-right: 10px;">
        <h1 style='font-size: 24px;'>Order Preview</h1>
        <p style='font-size: 18px; line-height: 0.5;'>${formatDate(
          date as string
        )}</p>
      </div>`;

    // ---------- Existing view: grouped by party / order ----------
    const handlePartyViewHTML = (designEntries: GroupedOrder[]) => {
      let html = headerHtml();

      [...designEntries]
        .sort((a, b) => a.bill_to_party.localeCompare(b.bill_to_party))
        .forEach((entry: GroupedOrder, entryIndex: number) => {
          html += `
        <div style="page-break-inside:avoid; page-break-after:auto; margin-bottom: 20px; background-color: ${
          entryIndex % 2 === 0 ? "#f9f9f9" : "#ffffff"
        }; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
          <div style="page-break-inside:avoid;page-break-after:auto">
            <p style="font-size: 18px; line-height: 0.5;"><strong>Bill To:</strong> ${entry.bill_to_party}</p>
            <p style="font-size: 18px; line-height: 0.5;"><strong>Ship To:</strong> ${entry.ship_to_party}</p>
            <p style="font-size: 18px; line-height: 0.5;">
            <span><strong>Order No.:</strong> ${entry.order_no}
            </span>
            <span style="margin:5px; margin-left:40px;">${
              entry.order_remark && entry.order_remark !== "N/A"
                ? `<strong style="${PRINT_REMARK_STYLE}">${entry.order_remark}</strong>`
                : ""
            }</span>
            <span></p>
            <p style="font-size: 18px; line-height: 0.5"><strong>Transport:</strong> ${entry.transporter_name}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; page-break-inside:avoid;">
            <thead style="break-inside:avoid;">
              <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #ccc; padding-left: 8px; text-align: left; width: 22%;">Design</th>
                <th style="border: 1px solid #ccc; padding-left: 8px; text-align: left; width: 10%;">Price</th>
                <th style="border: 1px solid #ccc; padding-left: 8px; text-align: left; width: 55%;">Shades</th>
              </tr>
            </thead>
            <tbody style="break-inside:avoid;">`;

          entry.entries.forEach((order) => {
            html += `
            <tr style="page-break-inside:avoid;">
              <td style="border: 1px solid #ccc; padding-left: 8px; width: 22%;">
                ${order.design}
                ${isPart(order.part) ? PART_BADGE : ""}
              </td>
              <td style="border: 1px solid #ccc; padding-left: 8px; width: 10%;">${order.price}</td>
              <td style="border: 1px solid #ccc; padding-left: 8px; width: 55%; ">
              <div style="width: 100%; text-align: center; display: flex; flex-direction: row; flex-wrap: wrap;">
              ${formatShades(order.shades)}
              </div>  ${
                order.remark && order.remark !== "N/A"
                  ? `<strong style="${PRINT_REMARK_STYLE}">${order.remark}</strong>`
                  : ""
              }
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

    // ---------- New view: grouped by design name ----------
    const handleDesignViewHTML = (designEntries: GroupedOrder[]) => {
      let html = headerHtml();

      groupByDesignName(designEntries).forEach(
        (group: DesignGroup, groupIndex: number) => {
          html += `
        <div style="page-break-inside:avoid; page-break-after:auto; margin-bottom: 20px; background-color: ${
          groupIndex % 2 === 0 ? "#f9f9f9" : "#ffffff"
        }; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
          <p style="font-size: 18px; margin: 0 0 6px 0;"><strong>Design:</strong> ${group.design}</p>

          <table style="width: 100%; border-collapse: collapse; page-break-inside:avoid;">
            <thead style="break-inside:avoid;">
              <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #ccc; padding-left: 8px; text-align: left; width: 16%;">Bill To</th>
                <th style="border: 1px solid #ccc; padding-left: 8px; text-align: left; width: 16%;">Ship To</th>
                <th style="border: 1px solid #ccc; padding-left: 8px; text-align: left; width: 12%;">Transport</th>
                <th style="border: 1px solid #ccc; padding-left: 8px; text-align: left; width: 12%;">Order No.</th>
                <th style="border: 1px solid #ccc; padding-left: 8px; text-align: left; width: 8%;">Price</th>
                <th style="border: 1px solid #ccc; padding-left: 8px; text-align: left; width: 36%;">Shades</th>
              </tr>
            </thead>
            <tbody style="break-inside:avoid;">`;

          group.rows.forEach((row) => {
            html += `
            <tr style="page-break-inside:avoid;">
              <td style="border: 1px solid #ccc; padding: 2px 8px; width: 16%;">
                ${row.bill_to_party}
                ${isPart(row.part) ? PART_BADGE : ""}
              </td>
              <td style="border: 1px solid #ccc; padding: 2px 8px; width: 16%;">${row.ship_to_party}</td>
              <td style="border: 1px solid #ccc; padding: 2px 8px; width: 12%;">${row.transporter_name}</td>
              <td style="border: 1px solid #ccc; padding: 2px 8px; width: 12%;">
                ${row.order_no}
                ${
                  row.order_remark && row.order_remark !== "N/A"
                    ? `<div style="margin-top: 3px;"><strong style="${PRINT_REMARK_STYLE}">${row.order_remark}</strong></div>`
                    : ""
                }
              </td>
              <td style="border: 1px solid #ccc; padding: 2px 8px; width: 8%;">${row.price}</td>
              <td style="border: 1px solid #ccc; padding: 2px 8px; width: 36%;">
                <div style="width: 100%; text-align: center; display: flex; flex-direction: row; flex-wrap: wrap;">
                ${formatShades(row.shades)}
                </div>
                ${
                  row.remark && row.remark !== "N/A"
                    ? `<strong style="${PRINT_REMARK_STYLE}">${row.remark}</strong>`
                    : ""
                }
              </td>
            </tr>`;
          });

          html += `
            </tbody>
          </table>
        </div>`;
        }
      );

      return html;
    };

    setGeneratedHtml(
      groupByDesign
        ? handleDesignViewHTML(designEntries)
        : handlePartyViewHTML(designEntries)
    );
  }, [designEntries, date, groupByDesign]);

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
        part,
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
      group.entries.push({ design, price, remark, shades, design_entry_id, part });
    });

    return Array.from(grouped.values());
  }

  // Regroup the same orders by design name (designs A→Z, parties A→Z inside each)
  function groupByDesignName(orders: GroupedOrder[]): DesignGroup[] {
    const grouped = new Map<string, DesignGroup>();

    orders.forEach((order) => {
      order.entries.forEach((e) => {
        if (!grouped.has(e.design)) {
          grouped.set(e.design, { design: e.design, rows: [] });
        }
        grouped.get(e.design)!.rows.push({
          design_entry_id: e.design_entry_id,
          bill_to_party: order.bill_to_party,
          ship_to_party: order.ship_to_party,
          transporter_name: order.transporter_name,
          order_no: order.order_no,
          order_remark: order.order_remark,
          price: e.price,
          remark: e.remark,
          shades: e.shades,
          part: e.part,
        });
      });
    });

    const groups = Array.from(grouped.values());
    groups.forEach((g) =>
      g.rows.sort((a, b) => a.bill_to_party.localeCompare(b.bill_to_party))
    );
    return groups.sort((a, b) => a.design.localeCompare(b.design));
  }

  const formatShades = (shades: { [key: string]: string }[]): string => {
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
    const currentUrl = window.location.href;
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

        {/* Checkbox: party view <-> design view */}
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="groupByDesign"
            checked={groupByDesign}
            onChange={(e) => setGroupByDesign(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="groupByDesign" className="text-sm">
            Group by design name
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
