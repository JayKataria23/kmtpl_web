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

function splitOrder(order: Order): Order[] {
  const parts: Order[] = [];
  let currentPart: Order = { ...order, designs: [] };
  let currentHeight = 0;
  // Reserve space for header and footer (in pixels)
  const headerHeight = 250; // Height for logo, address, order details
  const footerHeight = 50; // Height for total row
  const pageHeight = 1123; // A4 height in pixels at 96 DPI
  const availableHeight = pageHeight - headerHeight - footerHeight;
  const designBaseHeight = 40; // Base height for each design row
  const shadeRowHeight = 25; // Height for each row of shades

  for (let i = 0; i < order.designs.length; i++) {
    const design = order.designs[i];
    const nonEmptyShades = design.shades.reduce(
      (count, shade) => (shade[Object.keys(shade)[0]] ? count + 1 : count),
      0
    );

    // Calculate exact height needed for this design
    const shadeRows = Math.ceil(nonEmptyShades / 8);
    const remarkHeight = design.remark ? 20 : 0;
    const designHeight =
      designBaseHeight + shadeRows * shadeRowHeight + remarkHeight;

    if (currentHeight + designHeight > availableHeight) {
      parts.push(currentPart);
      currentPart = { ...order, designs: [] };
      currentHeight = 0;
    }

    currentPart.designs.push(design);
    currentHeight += designHeight;
  }

  if (currentPart.designs.length > 0) {
    parts.push(currentPart);
  }

  return parts;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export function generateHTML(order: Order): string {
  order.designs.sort((a, b) => {
    // Helper function to extract numeric parts
    const extractNumericPart = (design: string) => {
      const match = design.match(/^([A-Za-z-]+)(\d*)/);
      return match
        ? {
            prefix: match[1],
            numericPart: match[2] ? parseInt(match[2]) : null,
          }
        : { prefix: design, numericPart: null };
    };

    const aDetails = extractNumericPart(a.design);
    const bDetails = extractNumericPart(b.design);

    // Category 1: Designs with less than 3 digits, sorted alphabetically
    const isAShort = !a.design.match(/\d{3,}/);
    const isBShort = !b.design.match(/\d{3,}/);

    if (isAShort && isBShort) {
      return aDetails.prefix.localeCompare(bDetails.prefix);
    }
    if (isAShort) return -1;
    if (isBShort) return 1;

    // Category 2: Designs with - and 3-4 numeric digits
    const isADashNumeric = a.design.match(/^[A-Za-z]+-\d{3,4}$/);
    const isBDashNumeric = b.design.match(/^[A-Za-z]+-\d{3,4}$/);

    if (isADashNumeric && isBDashNumeric) {
      const aNumeric = parseInt(a.design.split("-")[1]);
      const bNumeric = parseInt(b.design.split("-")[1]);
      return aNumeric - bNumeric;
    }
    if (isADashNumeric) return -1;
    if (isBDashNumeric) return 1;

    // Category 3: Purely numeric designs
    const isANumeric = !isNaN(Number(a.design));
    const isBNumeric = !isNaN(Number(b.design));

    if (isANumeric && isBNumeric) {
      return Number(a.design) - Number(b.design);
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
  });

  // Rest of the generateHTML function remains the same...
  const parts = splitOrder(order);
  let overallIndex = 0;

  const shadesRow = (design: Design): string => {
    // Create a new variable to convert design.shades into the desired format
    const formattedShades: {
      meters: string;
      shades: number[];
      keys: string[];
    }[] = [];

    // Group shades by their values
    design.shades.forEach((shadeObj, index) => {
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

    const shadesHTML = formattedShades
      .map((group) => {
        return `<div style="display: inline-block;"><div style='border-bottom: 1px solid #000; line-height: 1;'>${group.keys.join(
          " - "
        )}</div><div style='border-top: 1px solid #000; line-height: 1; text-align: center; '>${
          group.meters
        } mtr</div></div>`;
      })
      .join("<span style='padding: 0 4px;'></span>");

    return shadesHTML;
  };

  const generatePartHTML = (part: Order, startIndex: number): string => {
    const designsHTML = part.designs
      .map((design, index) => {
        const currentIndex = startIndex + index;
        return `
        <div style="border-bottom: 1px solid #000;">
          <div style="display: flex; flex-direction: row; height: 38px;">
            <div style="width: 5%; border-right: 1px solid #000; text-align: center; display: flex; align-items: center; justify-content: center;">
              <span style="line-height: 1;">${currentIndex + 1}</span>
            </div>
            <div style="width: 12%; border-right: 1px solid #000; text-align: center; display: flex; align-items: center; justify-content: center; font-weight: bold;">
              <span style="line-height: 1;">${design.design}</span>
            </div>
            <div style="width: 71%; border-right: 1px solid #000; display: flex; align-items: center;">
              <div style="width: 100%; display: flex; align-items: center; padding: 0 8px;">
                ${shadesRow(design)}
              </div>
              ${
                design.remark
                  ? `<div style="color: #f00; font-weight: bold;">
                ${design.remark}
              </div>`
                  : ""
              }
            </div>
            <div style="width: 4%; border-right: 1px solid #000; text-align: center; display: flex; align-items: center; justify-content: center;">
              <span style="line-height: 1;">${
                Object.values(design.shades).filter(
                  (s) => s[Object.keys(s)[0]] !== ""
                ).length
              }</span>
            </div>
            <div style="width: 8%; text-align: center; display: flex; align-items: center; justify-content: center; font-weight: bold;">
              <span style="line-height: 1;">${design.price}</span>
            </div>
          </div>
        </div>`;
      })
      .join("");

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
        </style>
      </head>
      <body style="margin: 2px">
        <div style="border: 2px solid #000">
          <div style="border-bottom: 1px solid #000; text-align: center; font-weight: bold;">ॐ</div>
          <div style="border-bottom: 1px solid #000; text-align: center; font-weight: bold; font-size: xx-large;">
            K.M. TEXTILES   PVT. LTD.
          </div>
          <div style="border-bottom: 1px solid #000; display: flex; flex-direction: row;">
            <div style="border-right: 1px solid #000; width: 55%; font-size: small">
              47-SHANTI BHAVEN, 1ST FLOOR, ROOM NO. 1, 2, 3, 4 <br />
              OLD HANUMAN LANE, KALBADEVI ROAD, MUMBAI-400002 <br />
              TEL : 022 40225657 / 022 40116437
              <i class="fa fa-whatsapp" style="margin-left: 10px"></i>:+91 8097301148 <br />
              EMAIL : k.m.textilespvtltd@gmail.com
            </div>
            <div style="width: 45%; ">
            <div style="  display: flex; justify-content: space-around; font-size: 20px;">
                <span>Order No.: <b>${part.orderNo}</b></span>
                <span>Date: <b>${formatDate(part.date)}</b></span>
              </div>
              <div style="display: flex; flex-direction: row; font-size: small">
              <div style="width: 25%; text-align: right">
                Broker : <br />
                Transport :
              </div>
              
              <div style="width: 75%; text-align: left; padding-left: 2; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${part.broker} <br />
                ${part.transport}
              </div>
              </div>
            </div>
          </div>
          <div style="border-bottom: 1px solid #000; display: flex; flex-direction: row;  ">
            <div style="width: 55%; border-right: 1px solid #000; font-size: small;min-height:50px;align-content: center;">
              <b>To: <span style="font-size: large">${
                part.billTo
              }</span></b><br />
            </div>
            <div style="width: 45%; font-size: small;min-height:50px;align-content: center;">
              <b>Delivery: <span style="font-size: large">${
                part.shipTo
              }</span></b><br />
            </div>
          </div>
          <div style="border-bottom: 1px solid #000; display: flex; flex-direction: row; min-height: 30px;">
            <div style="width: 10%; text-align: center; align-content: center">Remark:</div>
            <div style="width: 90%; word-wrap: break-word; font-weight: bold; color: red; align-content: center;">
              ${part.remark}
            </div>
          </div>
          <div style="height: 800px; overflow: hidden">
            <div style="border-bottom: 1px solid #000; display: flex; flex-direction: row; font-size: x-large;">
              <div style="width: 5%; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: small">S/n.</div>
              <div style="width: 12%; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: small">Design</div>
              <div style="width: 71%; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: small">Shades</div>
              <div style="width: 4%; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: small">Pc</div>
              <div style="width: 8%; font-weight: bold; text-align: center; font-size: small">Price</div>
            </div>
            ${designsHTML}
            <div style="display: flex; flex-direction: row; height: 100vh"></div>
          </div>
          <div style="display: flex; flex-direction: row; border-top: 1px solid #000; font-size: x-large;">
            <div style="width: 5%; border-right: 1px solid #000; text-align: center"></div>
            <div style="width: 12%; border-right: 1px solid #000; text-align: center; font-size: 0.875rem; display: flex; align-items: center; padding-left: 2px;"></div>
            <div style="width: 71%; border-right: 1px solid #000;  display: flex; justify-content: space-between; padding-right: 2; ">
            <span style="font-weight: normal; font-size: medium; align-items: center; display: flex; padding-left: 2px;">Prepared By: ${
              part.created_by
            }</span><span style="font-weight: bold; font-size: x-large">Total</span></div>
            <div style="width: 4%; border-right: 1px solid #000; font-weight: bold; text-align: center;">
              ${part.designs.reduce(
                (total, design) =>
                  total +
                  Object.values(design.shades).filter(
                    (s) => s[Object.keys(s)[0]] !== ""
                  ).length,
                0
              )}
            </div>
            <div style="width: 8%; text-align: center"></div>
          </div>
        </div>
      </body>
    </html>`;
  };

  return parts
    .map((part) => {
      const partHTML = generatePartHTML(part, overallIndex);
      overallIndex += part.designs.length;
      return partHTML;
    })
    .join("");
}
