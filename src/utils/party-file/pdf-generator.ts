import html2pdf from "html2pdf.js";
import { DesignDetail } from "@/types/party-file";
import { formatDate } from "./date-utils";

export const generatePartyReport = (party: string, orders: DesignDetail[]) => {
  if (!orders || orders.length === 0) return;

  const today = new Date().toLocaleDateString("en-GB");

  // Generate HTML content
  let html = `
    <html>
      <head>
        <style>
          @page {
            size: A4;
            margin: 1cm;
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
          }
          .header { 
            text-align: center; 
            margin-bottom: 20px; 
            page-break-inside: avoid;
          }
          .company-name { 
            font-size: 24px; 
            font-weight: bold; 
            margin-bottom: 10px; 
          }
          .report-title { 
            font-size: 18px; 
            margin-bottom: 20px; 
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px;
            page-break-inside: auto;
          }
          thead { 
            display: table-header-group;
            page-break-inside: avoid;
            page-break-after: avoid;
          }
          tr { 
            page-break-inside: avoid;
            page-break-after: auto;
          }
          th, td { 
            border: 1px solid #ccc; 
            padding: 8px; 
            text-align: left;
            vertical-align: top;
          }
          th { 
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .totals { 
            font-weight: bold; 
          }
          .shades { 
            margin: 0; 
            padding: 0; 
            list-style: none;
            page-break-inside: avoid;
          }
          .shades li { 
            margin-bottom: 4px; 
          }
          tbody {
            page-break-inside: avoid;
          }
          tfoot {
            display: table-footer-group;
            page-break-inside: avoid;
            page-break-after: avoid;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">K.M. TEXTILES PVT. LTD.</div>
          <div class="report-title">Party Report - ${party}</div>
          <div>Date: ${today}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Design</th>
              <th>Order No.</th>
              <th>Order Date</th>
              <th>Price</th>
              <th>Shades</th>
              <th>Status</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
  `;

  // Add order details
  orders.forEach((order) => {
    const status = order.canceled
      ? "Cancelled"
      : order.bhiwandi_date
      ? "In Bhiwandi"
      : "Active";

    const shadesList = order.shades
      .map((shade) => {
        const shadeName = Object.keys(shade)[0];
        const shadeValue = shade[shadeName];
        if (shadeValue === "" || shadeValue === "NaN") return null;
        return `<li>${shadeName}: ${shadeValue}m</li>`;
      })
      .filter(Boolean)
      .join("");

    html += `
      <tr>
        <td>${order.design}</td>
        <td>${order.order_no}</td>
        <td>${formatDate(order.order_date)}</td>
        <td>${order.price}</td>
        <td><ul class="shades">${shadesList}</ul></td>
        <td>${status}</td>
        <td>${order.remark || ""}</td>
      </tr>
    `;
  });

  // Add summary footer
  const totalOrders = orders.length;
  const activeOrders = orders.filter(
    (o) => !o.canceled && !o.bhiwandi_date
  ).length;
  const bhiwandiOrders = orders.filter((o) => o.bhiwandi_date).length;
  const cancelledOrders = orders.filter((o) => o.canceled).length;

  html += `
          </tbody>
          <tfoot>
            <tr>
              <td colspan="7" style="text-align: right; border: none; padding-top: 20px;">
                <strong>Summary:</strong> Total Orders: ${totalOrders} | 
                Active: ${activeOrders} | 
                In Bhiwandi: ${bhiwandiOrders} | 
                Cancelled: ${cancelledOrders}
              </td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;

  // Generate PDF with improved settings
  html2pdf(html, {
    margin: [15, 10, 15, 10],
    filename: `${party}_report_${today}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait",
      compress: true,
    },
  });
};
