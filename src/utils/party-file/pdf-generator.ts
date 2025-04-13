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
 * Generate a single order row
 */
const generateOrderRow = (order: DesignDetail, index: number): string => {
  const nonEmptyShades = order.shades.filter(
    (shade) => shade[Object.keys(shade)[0]] !== ""
  );

  return `
    <div class="order-row" style="border-bottom: 1px solid #000; display: flex; flex-direction: row; ${
      order.bhiwandi_date ? "background-color: #fef9c3;" : ""
    }">
      <div style="width: 5%; border-right: 1px solid #000; text-align: center; font-size: small; padding: 4px;">${
        index + 1
      }</div>
      <div style="width: 8%; border-right: 1px solid #000; text-align: center; font-size: small; padding: 4px;">${
        order.order_no || "-"
      }</div>
      <div style="width: 12%; border-right: 1px solid #000; text-align: center; font-size: small; padding: 4px; font-weight: bold;">${
        order.design
      }</div>
      <div style="width: 66%; border-right: 1px solid #000; font-size: small; padding: 4px;">
        <div style="display: flex; flex-wrap: wrap; gap: 4px; ">
          ${formatShades(order.shades)}
        </div>
        ${
          order.remark
            ? `<div style="color: red; margin-top: 4px;">Remark: ${order.remark}</div>`
            : ""
        }
      </div>
      <div style="width: 4%; border-right: 1px solid #000; text-align: center; font-size: small; padding: 4px;">${
        nonEmptyShades.length
      }</div>
      <div style="width: 5%; text-align: center; font-size: small; padding: 4px;">${
        order.price || "-"
      }</div>
    </div>
  `;
};

/**
 * Generate the footer with totals
 */
const generateFooter = (totalPieces: number): string => `
  <div style="display: flex; flex-direction: row; border-top: 1px solid #000;">
    <div style="width: 91%; border-right: 1px solid #000; text-align: right; padding: 4px; font-weight: bold;">Total</div>
    <div style="width: 5%; border-right: 1px solid #000; text-align: center; font-weight: bold; padding: 4px;">
      ${totalPieces}
    </div>
    <div style="width: 4%;"></div>
  </div>
`;

/**
 * Generate and export a PDF report for a party's orders
 * @param party - The party name
 * @param orders - List of design details/orders
 */
export const generatePartyReport = (
  party: string,
  orders: DesignDetail[]
): void => {
  if (!orders?.length) return;

  // Sort orders by design name for better organization
  const sortedOrders = [...orders].sort((a, b) =>
    a.design.localeCompare(b.design)
  );
  const today = new Date().toLocaleDateString("en-GB");

  // Calculate total pieces once instead of in template
  const totalPieces = sortedOrders.reduce(
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
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
          }
          .container {
            border: 2px solid #000;
            display: flex;
            flex-direction: column;
          }
          .order-row {
            page-break-inside: avoid;
          }
          .content {
            flex-grow: 0;
            flex-shrink: 0;
          }
          .footer {
            flex-grow: 0;
            flex-shrink: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${generateHeader(party)}
          ${generateTableHeader()}
          <div class="content">
            ${sortedOrders
              .map((order, index) => generateOrderRow(order, index))
              .join("")}
          </div>
          <div>
            ${generateFooter(totalPieces)}
          </div>
        </div>
      </body>
    </html>
  `;

  // Generate PDF with optimized settings
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
