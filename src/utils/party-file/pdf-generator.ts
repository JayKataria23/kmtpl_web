import html2pdf from "html2pdf.js";
import type { DesignDetail } from "@/types/party-file";

/**
 * Format shade data into grouped HTML elements
 */
const formatShades = (shades: Record<string, string>[]): string => {
  // Group shades by meter value for more efficient rendering
  const meterGroups = new Map<
    string,
    { shadeIndices: number[]; shadeNames: string[] }
  >();

  shades.forEach((shadeObj, index) => {
    const shadeName = Object.keys(shadeObj)[0];
    const meterValue = shadeObj[shadeName];

    if (!meterValue) return;

    const existingGroup = meterGroups.get(meterValue);
    if (existingGroup) {
      existingGroup.shadeIndices.push(index + 1);
      existingGroup.shadeNames.push(shadeName);
    } else {
      meterGroups.set(meterValue, {
        shadeIndices: [index + 1],
        shadeNames: [shadeName],
      });
    }
  });

  return Array.from(meterGroups.entries())
    .map(
      ([meters, { shadeNames }]) => `
      <div style="display: inline-block;">
        <div style="border-bottom: 1px solid #000; padding: 2px;">${shadeNames.join(
          " - "
        )}</div>
        <div style="border-top: 1px solid #000; padding: 2px;">${meters} mtr</div>
      </div>
    `
    )
    .join("");
};

/**
 * Generate report header with company information and party name
 */
const generateHeader = (party: string): string => `
  <div style="border-bottom: 1px solid #000; text-align: center; font-weight: bold;">ॐ</div>
  <div style="border-bottom: 1px solid #000; text-align: center; font-weight: bold; font-size: xx-large;">
    K.M. TEXTILES PVT. LTD.
  </div>
  <div style="border-bottom: 1px solid #000; text-align: center; font-size: small">
    47-SHANTI BHAVEN, 1ST FLOOR, ROOM NO. 1, 2, 3, 4 <br />
    OLD HANUMAN LANE, KALBADEVI ROAD, MUMBAI-400002 <br />
    TEL : 022 40225657 / 022 40116437 <br />
    EMAIL : k.m.textilespvtltd@gmail.com
  </div>
  <div style="border-bottom: 1px solid #000; text-align: center; font-size: large; font-weight: bold; padding: 8px;">
    ${party}
  </div>
`;

/**
 * Generate table header for report
 */
const generateTableHeader = (): string => `
  <div style="border-bottom: 1px solid #000; display: flex; flex-direction: row;">
    <div style="width: 5%; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: small; padding: 4px;">S/n.</div>
    <div style="width: 8%; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: small; padding: 4px;">Order No.</div>
    <div style="width: 12%; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: small; padding: 4px;">Design</div>
    <div style="width: 66%; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: small; padding: 4px;">Shades</div>
    <div style="width: 4%; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: small; padding: 4px;">Pc</div>
    <div style="width: 5%; font-weight: bold; text-align: center; font-size: small; padding: 4px;">Price</div>
  </div>
`;

/**
 * Generate and export a PDF report for a party's orders
 * @param party - The party name
 * @param orders - List of design details/orders
 */
export const generatePartyReport = (party: string, orders: DesignDetail[]) => {
  if (!orders || orders.length === 0) return;

  // Create a unique key combining party_name, order_no, and design to identify truly unique orders
  const getUniqueKey = (order: DesignDetail) =>
    `${order.party_name}_${order.order_no}_${order.design}_${order.design_entry_id}`;

  // Sort orders by order number, then design name
  const sortedOrders = [...orders].sort((a, b) => {
    if (a.order_no !== b.order_no) {
      return (a.order_no || 0) - (b.order_no || 0);
    }
    if (a.party_name !== b.party_name) {
      return a.party_name.localeCompare(b.party_name);
    }
    return a.design.localeCompare(b.design);
  });

  // Create a Map to track unique orders using the composite key
  const uniqueOrders = new Map<string, DesignDetail>();
  sortedOrders.forEach((order) => {
    const key = getUniqueKey(order);
    if (!uniqueOrders.has(key)) {
      uniqueOrders.set(key, order);
    }
  });

  // Convert back to array and calculate totals
  const finalOrders = Array.from(uniqueOrders.values());
  const totalPieces = finalOrders.reduce(
    (total, order) =>
      total +
      order.shades.filter((shade) => shade[Object.keys(shade)[0]] !== "")
        .length,
    0
  );

  const html = `
    <html>
      <head>
        <title>${party} Report</title>
        <style>
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
          }
          .container {
            border: 2px solid #000;
          }
          .order-row {
            page-break-inside: avoid;
          }
          .shade-container {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            justify-content: flex-start;
            align-items: center;
          }
          .shade-box {
            display: inline-flex;
            flex-direction: column;
            margin: 2px;
            min-width: 80px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${generateHeader(party)}
          ${generateTableHeader()}
          <div>
            ${finalOrders
              .map((order, index) => {
                const nonEmptyShades = order.shades.filter(
                  (shade) => shade[Object.keys(shade)[0]] !== ""
                );

                return `
                <div class="order-row" style="border-bottom: 1px solid #000; display: flex; flex-direction: row; ${
                  order.bhiwandi_date ? "background-color: #fef9c3;" : ""
                }">
                  <div style="width: 5%; border-right: 1px solid #000; text-align: center; font-size: small; padding: 4px;">
                    ${index + 1}
                  </div>
                  <div style="width: 8%; border-right: 1px solid #000; text-align: center; font-size: small; padding: 4px;">
                    ${order.order_no || "-"}
                  </div>
                  <div style="width: 12%; border-right: 1px solid #000; text-align: center; font-size: small; padding: 4px; font-weight: bold;">
                    ${order.design}
                  </div>
                  <div style="width: 67%; border-right: 1px solid #000; font-size: small; padding: 4px;">
                    <div class="shade-container">
                      ${formatShades(order.shades)}
                    </div>
                    ${
                      order.remark
                        ? `<div style="color: red; margin-top: 4px;">Remark: ${order.remark}</div>`
                        : ""
                    }
                  </div>
                  <div style="width: 4%; border-right: 1px solid #000; text-align: center; font-size: small; padding: 4px;">
                    ${nonEmptyShades.length}
                  </div>
                  <div style="width: 4%; text-align: center; font-size: small; padding: 4px;">
                    ${order.price || "-"}
                  </div>
                </div>
              `;
              })
              .join("")}
            <div style="display: flex; flex-direction: row; border-top: 1px solid #000;">
              <div style="width: 92%; border-right: 1px solid #000; text-align: right; padding: 4px; font-weight: bold;">
                Total
              </div>
              <div style="width: 4%; border-right: 1px solid #000; text-align: center; font-weight: bold; padding: 4px;">
                ${totalPieces}
              </div>
              <div style="width: 4%;"></div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const today = new Date().toLocaleDateString("en-GB");

  html2pdf()
    .from(html)
    .set({
      margin: 10,
      filename: `${party}_report_${today}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    })
    .save();
};
