import html2pdf from "html2pdf.js";
import type { DesignDetail } from "@/types/party-file";
import { formatDate } from "@/utils/party-file/date-utils";

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
      <div style="display: inline-block; margin: 2px;">
        <div style="border-bottom: 1px solid #000; text-align: center;">${shadeNames.join(
          " - "
        )}</div>
        <div style="border-top: 1px solid #000; text-align: center;">${meters} mtr</div>
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
  <div style="border-bottom: 1px solid #000; text-align: center; font-weight: bold; font-size: large; padding: 2px;">
    K.M. TEXTILES PVT. LTD.
  </div>
  <div style="border-bottom: 1px solid #000; text-align: center; font-size: x-small; padding: 2px">
    47-SHANTI BHAVEN, 1ST FLOOR, ROOM NO. 1, 2, 3, 4 <br />
    OLD HANUMAN LANE, KALBADEVI ROAD, MUMBAI-400002 <br />
    TEL : 022 40225657 / 022 40116437 EMAIL : k.m.textilespvtltd@gmail.com
  </div>
  <div style="border-bottom: 1px solid #000; text-align: center; font-size: medium; font-weight: bold; padding: 2px;">
    ${party}
  </div>
`;

/**
 * Generate table header for report
 */
const generateTableHeader = (): string => `
  <div style="border-bottom: 1px solid #000; display: flex; flex-direction: row;">
    <div style="width: 5%; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: small; padding: 2px;">S/n.</div>
    <div style="width: 8%; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: small; padding: 2px;">Order No.</div>
    <div style="width: 12%; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: small; padding: 2px;">Design</div>
    <div style="width: 66%; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: small; padding: 2px;">Shades</div>
    <div style="width: 4%; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: small; padding: 2px;">Pc</div>
    <div style="width: 5%; font-weight: bold; text-align: center; font-size: small; padding: 2px;">Price</div>
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
      <div style="width: 5%; border-right: 1px solid #000; text-align: center; font-size: small; padding: 2px;">${
        index + 1
      }</div>
      <div style="width: 8%; border-right: 1px solid #000; text-align: center; font-size: small; padding: 2px;">${
        order.order_no || "-"
      } <br/> <p style="font-size: 11px">${formatDate(order.order_date) || "-"}</p></div>
      <div style="width: 12%; border-right: 1px solid #000; text-align: center; font-size: small; padding: 2px; font-weight: bold; word-break: break-word;">${
        order.design
      }</div>
      <div style="width: 66%; border-right: 1px solid #000; font-size: small; padding: 2px;">
        <div style="display: flex; flex-wrap: wrap; gap: 4px; ">
          ${formatShades(order.shades)}
        </div>
        ${
          order.remark
            ? `<div style="color: red; margin-top: 4px;">Remark: ${order.remark}</div>`
            : ""
        }
      </div>
      <div style="width: 4%; border-right: 1px solid #000; text-align: center; font-size: small; padding: 2px;">${
        nonEmptyShades.length
      }</div>
      <div style="width: 5%; text-align: center; font-size: small; padding: 2px;">${
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
    <div style="width: 91%; border-right: 1px solid #000; text-align: right; padding: 2px; font-weight: bold;">Total</div>
    <div style="width: 4%; border-right: 1px solid #000; text-align: center; font-weight: bold; padding: 2px;">
      ${totalPieces}
    </div>
    <div style="width: 5%;"></div>
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
            margin: 0.5cm;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
          }
          .container {
            border: 2px solid #000;
          }
          .header {
            max-height: 20%; /* Limit header height */
          }
          .order-row {
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${generateHeader(party)}
          </div>
          ${generateTableHeader()}
            ${sortedOrders
              .map((order, index) => generateOrderRow(order, index))
              .join("")}
          ${generateFooter(totalPieces)}
        </div>
      </body>
    </html>
  `;

  // Generate PDF with optimized settings
  html2pdf()
    .from(html)
    .set({
      margin: 5,
      filename: `${party}_report_${today}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false, // Disable logging
        letterRendering: true, // Improve text rendering
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
        compress: true, // Compress the PDF
        hotfixes: ["px_scaling"], // Fix scaling issues
      },
      pagebreak: { mode: ["avoid-all"] },
    })
    .save();
};
