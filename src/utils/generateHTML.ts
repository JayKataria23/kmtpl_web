interface Design {
  design: string;
  shades: { [key: string]: string }[];
  price: string;
  remark: string;
}

interface Order {
  designs: Design[];
  orderNo: string;
  date: string;
  broker: string;
  transport: string;
  billTo: string;
  billToAddress: string;
  shipTo: string;
  shipToAddress: string;
  remark: string;
  created_by: string;
}

interface PageLayout {
  MAX_HEIGHT_PER_PAGE: number;
  HEADER_HEIGHT: number;
  FOOTER_HEIGHT: number;
  MIN_DESIGN_HEIGHT: number;
  SHADE_GROUP_ROW_HEIGHT: number;
  REMARK_HEIGHT: number;
  SHADE_GROUPS_PER_ROW: number;
  MIN_ROW_HEIGHT: number;
}

// Constants for page layout calculations - optimized for more entries
const PAGE_LAYOUT: PageLayout = {
  MAX_HEIGHT_PER_PAGE: 35, // Increased maximum logical rows per page
  HEADER_HEIGHT: 6.5, // Slightly reduced header height
  FOOTER_HEIGHT: 1, // Height taken by footer
  MIN_DESIGN_HEIGHT: 0.8, // Reduced minimum height for a design
  SHADE_GROUP_ROW_HEIGHT: 0.8, // Reduced height for each row of shade groups
  REMARK_HEIGHT: 0.4, // Reduced additional height for design remarks
  SHADE_GROUPS_PER_ROW: 3, // Increased shade groups per row for more compact display
  MIN_ROW_HEIGHT: 20, // Minimum height in pixels for each row
};

/**
 * Calculates the height a design will occupy on the page
 * @param design The design to calculate height for
 * @returns The logical row height the design will occupy
 */
function calculateDesignHeight(design: Design): number {
  // Start with minimum height
  let height = PAGE_LAYOUT.MIN_DESIGN_HEIGHT;

  // Get all non-empty shades
  const nonEmptyShades = design.shades.filter((shade) => {
    const key = Object.keys(shade)[0];
    return shade[key] && shade[key].trim() !== "";
  });

  // Group shades by their values for proper height calculation
  const shadeGroups = new Map<string, string[]>();
  for (const shade of nonEmptyShades) {
    const key = Object.keys(shade)[0];
    const value = shade[key];

    if (!shadeGroups.has(value)) {
      shadeGroups.set(value, [key]);
    } else {
      shadeGroups.get(value)?.push(key);
    }
  }

  // Calculate rows needed for shade groups - more compact layout
  if (shadeGroups.size > 0) {
    // More efficient calculation for compact layout
    const numGroups = shadeGroups.size;
    const rowsNeeded = Math.ceil(numGroups / PAGE_LAYOUT.SHADE_GROUPS_PER_ROW);
    height += rowsNeeded * PAGE_LAYOUT.SHADE_GROUP_ROW_HEIGHT;

    // Add slight adjustment for very short groups that can fit more compactly
    if (
      numGroups <= 2 &&
      Array.from(shadeGroups.values()).every((keys) => keys.length <= 2)
    ) {
      height -= 0.1; // Slight reduction for very simple shade groups
    }
  }

  // Add space for remark if present
  if (design.remark && design.remark.trim() !== "") {
    height += PAGE_LAYOUT.REMARK_HEIGHT;
  }

  return Math.max(height, PAGE_LAYOUT.MIN_DESIGN_HEIGHT);
}

/**
 * Determines if a design would fit on the current page
 * @param design The design to check
 * @param currentHeight Current height used on the page
 * @param availableHeight Total available height on the page
 * @returns Whether the design will fit
 */
function willDesignFit(
  design: Design,
  currentHeight: number,
  availableHeight: number
): boolean {
  const designHeight = calculateDesignHeight(design);

  // Add a small buffer to avoid pagination issues
  const heightWithBuffer = currentHeight + designHeight + 0.05;
  return heightWithBuffer <= availableHeight;
}

/**
 * Handles the special case of an overly large design that won't fit on a single page
 * @param design The large design
 * @param order The parent order
 * @returns An order part containing just this design
 */
function createSingleDesignOrder(design: Design, order: Order): Order {
  return {
    ...order,
    designs: [design],
    remark: `${
      order.remark || ""
    } (Oversize design - may appear cropped)`.trim(),
  };
}

/**
 * Efficiently packs designs onto pages
 * @param designs Array of designs to pack
 * @param order The parent order
 * @param availableHeight Available height per page
 * @returns Array of order parts, each representing a page
 */
function packDesignsOntoPages(
  designs: Design[],
  order: Order,
  availableHeight: number
): Order[] {
  const parts: Order[] = [];
  let currentPart: Order = { ...order, designs: [] };
  let currentHeight = 0;

  // Check if single design is too large for standard calculation
  const checkAndProcessLargeDesign = (design: Design): boolean => {
    const designHeight = calculateDesignHeight(design);
    if (designHeight > availableHeight) {
      // If current part has designs, add it to parts
      if (currentPart.designs.length > 0) {
        parts.push(currentPart);
        currentPart = { ...order, designs: [] };
        currentHeight = 0;
      }

      // Create special page for this design
      parts.push(createSingleDesignOrder(design, order));
      return true;
    }
    return false;
  };

  // Try to optimally fill pages with designs
  for (const design of designs) {
    // Skip if design is too large for standard calculation
    if (checkAndProcessLargeDesign(design)) {
      continue;
    }

    const designHeight = calculateDesignHeight(design);

    // Check if design fits on current page
    if (!willDesignFit(design, currentHeight, availableHeight)) {
      // Add current part to parts and create a new one
      parts.push(currentPart);
      currentPart = { ...order, designs: [] };
      currentHeight = 0;
    }

    // Add design to current page
    currentPart.designs.push(design);
    currentHeight += designHeight;
  }

  // Add the last part if it has any designs
  if (currentPart.designs.length > 0) {
    parts.push(currentPart);
  }

  return parts;
}

/**
 * Splits an order into multiple pages with optimized design placement
 * @param order The original order to split
 * @returns Array of order parts, each representing a page
 */
function splitOrder(order: Order): Order[] {
  // Calculate available height on page
  const AVAILABLE_HEIGHT =
    PAGE_LAYOUT.MAX_HEIGHT_PER_PAGE -
    PAGE_LAYOUT.HEADER_HEIGHT -
    PAGE_LAYOUT.FOOTER_HEIGHT;

  // Sort designs to optimize page usage (smaller designs first can allow better packing)
  const sortedDesigns = [...order.designs].sort((a, b) => {
    // First sort by design type (using the existing compare logic)
    const typeComparison = compareDesigns(a, b);
    if (typeComparison !== 0) return typeComparison;

    // If same type, try to group by similar height for better packing
    return calculateDesignHeight(a) - calculateDesignHeight(b);
  });

  return packDesignsOntoPages(sortedDesigns, order, AVAILABLE_HEIGHT);
}

/**
 * Format a date string to DD-MM-YYYY format
 * @param dateString Input date string
 * @returns Formatted date string
 */
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Return original if invalid date
      return dateString;
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error("Date formatting error:", error);
    return dateString; // Return original on error
  }
};

/**
 * Compare function for design sorting
 * @param a First design to compare
 * @param b Second design to compare
 * @returns Sort comparison result
 */
function compareDesigns(a: Design, b: Design): number {
  // Extract design names
  const designA = a.design;
  const designB = b.design;

  // Helper function to extract parts of design names
  const extractParts = (design: string) => {
    const match = design.match(/^([A-Za-z-]+)(\d*)/);
    return match
      ? {
          prefix: match[1],
          numericPart: match[2] ? parseInt(match[2]) : null,
        }
      : { prefix: design, numericPart: null };
  };

  const aDetails = extractParts(designA);
  const bDetails = extractParts(designB);

  // Category 1: Designs with less than 3 digits
  const isAShort = !designA.match(/\d{3,}/);
  const isBShort = !designB.match(/\d{3,}/);

  if (isAShort && isBShort) {
    return aDetails.prefix.localeCompare(bDetails.prefix);
  }
  if (isAShort) return -1;
  if (isBShort) return 1;

  // Category 2: Designs with - and 3-4 numeric digits
  const isADashNumeric = designA.match(/^[A-Za-z]+-\d{3,4}$/);
  const isBDashNumeric = designB.match(/^[A-Za-z]+-\d{3,4}$/);

  if (isADashNumeric && isBDashNumeric) {
    const aNumeric = parseInt(designA.split("-")[1]);
    const bNumeric = parseInt(designB.split("-")[1]);
    return aNumeric - bNumeric;
  }
  if (isADashNumeric) return -1;
  if (isBDashNumeric) return 1;

  // Category 3: Purely numeric designs
  const isANumeric = !isNaN(Number(designA));
  const isBNumeric = !isNaN(Number(designB));

  if (isANumeric && isBNumeric) {
    return Number(designA) - Number(designB);
  }
  if (isANumeric) return 1;
  if (isBNumeric) return -1;

  // For designs with same prefix, sort by numeric part
  if (aDetails.prefix === bDetails.prefix) {
    if (aDetails.numericPart !== null && bDetails.numericPart !== null) {
      return aDetails.numericPart - bDetails.numericPart;
    }
  }

  // Fallback to alphabetical sorting
  return aDetails.prefix.localeCompare(bDetails.prefix);
}

/**
 * Format shades into more compact HTML
 * @param design The design containing shades
 * @returns HTML string for shades section
 */
function shadesRow(design: Design): string {
  // Group shades by their values
  const formattedShades: {
    meters: string;
    shades: number[];
    keys: string[];
  }[] = [];

  design.shades.forEach((shadeObj, index) => {
    const shadeName = Object.keys(shadeObj)[0];
    const shadeValue = shadeObj[shadeName];

    if (shadeValue && shadeValue.trim() !== "") {
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

  // Generate more compact HTML for shade groups
  return formattedShades
    .map((group) => {
      return `<div class="shade-group">
        <div style='border-bottom: 1px solid #000; font-size: 14px;'>${group.keys.join(
          " - "
        )}</div>
        <div style='border-top: 1px solid #000; font-size: 14px;'>${
          group.meters
        } mtr</div>
      </div>`;
    })
    .join("<div style='padding-left: 10px;'></div>");
}

/**
 * Calculate total meters for a design
 * @param design The design to calculate meters for
 * @returns Total meters as a number
 */
function calculateTotalMeters(design: Design): number {
  let totalMeters = 0;
  design.shades.forEach((shade) => {
    const key = Object.keys(shade)[0];
    const value = shade[key];
    if (value && value.trim() !== "") {
      const meters = parseFloat(value);
      if (!isNaN(meters)) {
        totalMeters += meters;
      }
    }
  });
  return totalMeters;
}

/**
 * Generate HTML for a single order part (page) with optimized layout
 * @param part Order part to generate HTML for
 * @param startIndex Starting index for design numbering
 * @param isLastPage Whether this is the last page
 * @returns HTML string for the order part
 */
function generatePartHTML(
  part: Order,
  startIndex: number,
  isLastPage: boolean
): string {
  const designsHTML = part.designs
    .map((design, index) => {
      const currentIndex = startIndex + index;
      const totalMeters = calculateTotalMeters(design);
      const hasRemark = design.remark && design.remark.trim() !== "";

      // Calculate optimal row height based on content
      const minHeight = hasRemark ? "28px" : "22px";

      return `
      <div style="border-bottom: 1px solid #000;">
        <div style="display: flex; flex-direction: row;">
          <div style="width: 5%; border-right: 1px solid #000; text-align: center; display: flex; align-items: center; justify-content: center; min-height: ${minHeight};">
            ${currentIndex + 1}
          </div>
          <div style="width: 12%; border-right: 1px solid #000; text-align: center; display: flex; align-items: center; justify-content: center; font-weight: bold; padding: 2px; word-break: break-word; font-size: 15px; min-height: ${minHeight};">
            ${design.design}
          </div>
          <div style="width: 69%; border-right: 1px solid #000; text-align: center;">
            <div style="width: 100%; font-size: 15px; text-align: center; display: flex; flex-direction: row; flex-wrap: wrap; padding: 1px; padding-left: 6px; justify-content: start;">
              ${shadesRow(design)}
            </div>
            ${
              hasRemark
                ? `<div style="text-align: center; width: 100%; color: #f00; font-weight: bold; font-size: 14px;">${design.remark}</div>`
                : ""
            }
          </div>
          <div style="width: 6%; border-right: 1px solid #000; text-align: center; display: flex; align-items: center; justify-content: center; min-height: ${minHeight}; padding: 0 4px;">
            ${Math.round(totalMeters)}
          </div>
          <div style="width: 8%; text-align: center; display: flex; align-items: center; justify-content: center; font-weight: bold; min-height: ${minHeight};">
            ${design.price}
          </div>
        </div>
      </div>`;
    })
    .join("");

  // Calculate total meters for this page
  const totalMeters = part.designs.reduce(
    (total, design) => total + calculateTotalMeters(design),
    0
  );

  return `
  <html>
    <head>
      <title>OrderForm</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <style>
        @page {
          size: A4;
          margin: 1cm;
        }
        @media print {
          .page-break {
            page-break-after: always;
          }
        }
        body {
          margin: 0;
          padding: 2px;
          font-family: Arial, sans-serif;
        }
        .order-container {
          min-height: 27cm;
          position: relative;
          box-sizing: border-box;
        }
        .designs-container {
          flex: 1;
        }
        .footer {
          position: absolute;
          bottom: 0;
          width: 100%;
          box-sizing: border-box;
        }
        .shade-group {
          display: inline-block;
          margin-right: 3px;
          margin-bottom: 3px;
        }
      </style>
    </head>
    <body>
      <div class="order-container" style="border: 2px solid #000">
        <div style="border-bottom: 1px solid #000; text-align: center; font-weight: bold;">ॐ</div>
        <div style="border-bottom: 1px solid #000; text-align: center; font-weight: bold; font-size: xx-large; padding: 2px;">
          K.M. TEXTILES PVT. LTD.
        </div>
        <div style="border-bottom: 1px solid #000; display: flex; flex-direction: row;">
          <div style="border-right: 1px solid #000; width: 55%; font-size: small; padding: 2px;">
            47-SHANTI BHAVEN, 1ST FLOOR, ROOM NO. 1, 2, 3, 4 <br />
            OLD HANUMAN LANE, KALBADEVI ROAD, MUMBAI-400002 <br />
            TEL : 022 40225657 / 022 40116437
            <i class="fa fa-whatsapp" style="margin-left: 10px"></i>:+91 8097301148 <br />
            EMAIL : k.m.textilespvtltd@gmail.com
          </div>
          <div style="width: 45%; padding: 2px;">
            <div style="display: flex; justify-content: space-around; font-size: 18px;">
              <span>Order No.: <b>${part.orderNo}</b></span>
              <span>Date: <b>${formatDate(part.date)}</b></span>
            </div>
            <div style="display: flex; flex-direction: row; font-size: small">
              <div style="width: 25%; text-align: right">
                Broker : <br />
                Transport :
              </div>
              <div style="width: 75%; text-align: left; padding-left: 2px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${part.broker || "N/A"} <br />
                ${part.transport || "N/A"}
              </div>
            </div>
          </div>
        </div>
        <div style="border-bottom: 1px solid #000; display: flex; flex-direction: row;">
          <div style="width: 55%; border-right: 1px solid #000; font-size: small; min-height: 40px; align-content: center; padding: 2px;">
            <b>To: <span style="font-size: large">${
              part.billTo
            }</span></b><br />
            ${part.billToAddress || ""}
          </div>
          <div style="width: 45%; font-size: small; min-height: 40px; align-content: center; padding: 2px;">
            <b>Delivery: <span style="font-size: large">${
              part.shipTo
            }</span></b><br />
            ${part.shipToAddress || ""}
          </div>
        </div>
        <div style="border-bottom: 1px solid #000; display: flex; flex-direction: row; min-height: 22px;">
          <div style="width: 10%; text-align: center; align-content: center; display: flex; align-items: center; justify-content: center;">Remark:</div>
          <div style="width: 90%; word-wrap: break-word; font-weight: bold; color: red; align-content: center; display: flex; align-items: center;">
            ${part.remark || "N/A"}
          </div>
        </div>
        <div class="designs-container">
          <div>
            <div style="border-bottom: 1px solid #000; display: flex; flex-direction: row;">
              <div style="width: 5%; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: small; padding: 2px;">S/n.</div>
              <div style="width: 12%; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: small; padding: 2px;">Design</div>
              <div style="width: 69%; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: small; padding: 2px;">Shades</div>
              <div style="width: 6%; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: small; padding: 2px;">Meter</div>
              <div style="width: 8%; font-weight: bold; text-align: center; font-size: small; padding: 2px;">Price</div>
            </div>
            ${designsHTML}
          </div>
        </div>
        <div class="footer" style="border-top: 1px solid #000;">
          <div style="display: flex; flex-direction: row;">
            <div style="width: 5%; border-right: 1px solid #000; text-align: center"></div>
            <div style="width: 12%; border-right: 1px solid #000; text-align: center; font-size: 0.875rem; display: flex; align-items: center; padding-left: 2px;"></div>
            <div style="width: 69%; border-right: 1px solid #000; display: flex; justify-content: space-between; padding-right: 2px; padding-left: 2px;">
              <span style="font-weight: normal; font-size: medium; align-items: center; display: flex;">Prepared By: ${
                part.created_by || ""
              }</span>
              <span style="font-weight: bold; font-size: x-large">Total</span>
            </div>
            <div style="width: 6%; border-right: 1px solid #000; font-weight: bold; text-align: center; display: flex; align-items: center; justify-content: center; font-size: large; padding: 0 4px;">
              ${Math.round(totalMeters)}
            </div>
            <div style="width: 8%; text-align: center"></div>
          </div>
        </div>
      </div>
      ${!isLastPage ? '<div class="page-break"></div>' : ""}
    </body>
  </html>`;
}

/**
 * Main function to generate HTML for an order with optimized pagination
 * @param order The order to generate HTML for
 * @returns HTML string for the complete order
 */
export function generateHTML(order: Order): string {
  try {
    // Make a deep copy to avoid modifying the original order
    const orderCopy = JSON.parse(JSON.stringify(order));

    // Sort designs according to the specified rules
    orderCopy.designs.sort(compareDesigns);

    // Split the order into pages with improved pagination
    const parts = splitOrder(orderCopy);

    let overallIndex = 0;

    // Generate HTML for each part
    const htmlParts = parts.map((part, partIndex) => {
      const isLastPage = partIndex === parts.length - 1;
      const partHTML = generatePartHTML(part, overallIndex, isLastPage);
      overallIndex += part.designs.length;
      return partHTML;
    });

    // Join all the HTML parts
    return htmlParts.join("");
  } catch (error) {
    console.error("Error generating HTML:", error);
    return `<html><body><h1>Error generating order form</h1><p>${error}</p></body></html>`;
  }
}
