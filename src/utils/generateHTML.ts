interface Shade {
  [key: number]: string;
}

interface Design {
  design: string;
  shades: Shade;
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
  let currentRows = 0;

  for (let i = 0; i < order.designs.length; i++) {
    const design = order.designs[i];
    const nonEmptyShades = Object.values(design.shades).filter(
      (shade) => shade !== ""
    ).length;
    const designRows = Math.ceil(nonEmptyShades / 8);

    if (currentRows + designRows > 12) {
      parts.push(currentPart);
      currentPart = { ...order, designs: [] };
      currentRows = 0;
    }

    currentPart.designs.push(design);
    currentRows += designRows;
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
  const parts = splitOrder(order);

  const shadesRow = (design: Design): string => {
    console.log(design.shades);

    // Create a new variable to convert design.shades into the desired format
    const formattedShades: { meters: string; shades: number[] }[] = [];

    // Group shades by their values
    Object.entries(design.shades).forEach(([index, shade]: [string, string]) => { // Use Object.entries to iterate
      if (shade) {
        const existingGroup = formattedShades.find(
          (group) => group.meters === shade
        );
        if (existingGroup) {
          existingGroup.shades.push(Number(index) + 1); // Add the index to the existing group
        } else {
          formattedShades.push({ meters: shade, shades: [Number(index) + 1] }); // Create a new group
        }
      }
    });

    console.log(formattedShades); // Log the new variable

    // return Object.entries(design.shades)
    //   .map(([index, shade]) => {
    //     if (shade) {
    //       return `<div style="width: 12.5%">
    //                 <div>${parseInt(index) + 1}</div>
    //                 <div>${shade}</div>
    //               </div>`;
    //     }
    //     return "";
    //   })
    //   .join("");

    const shadesHTML = formattedShades
      .map((group) => {
        return ` <div><div style='border-bottom: 1px solid #000;'>${group.shades.join(" - ")}</div><div style='border-top: 1px solid #000;'>${group.meters} mtr</div></div>`;
      })
      .join("<div style='padding-left: 20px;'></div>"); // Join with line breaks for each group

    return shadesHTML;
  };

  const generatePartHTML = (part: Order): string => {
    const designsHTML = part.designs
      .map((design, index) => {
        return `
        <div style="border-bottom: 1px solid #000;">
          <div style="display: flex; flex-direction: row;">
            <div style="width: 5%; border-right: 1px solid #000; text-align: center; word-wrap: break-word;">
              <p>${index + 1}</p>
            </div>
            <div style="width: 12%; border-right: 1px solid #000; text-align: center; word-wrap: break-word; font-weight: bold;">
              <p>${design.design}</p>
            </div>
            <div style="width: 71%; border-right: 1px solid #000; text-align: center; display: flex; flex-direction: row; flex-wrap: wrap;">
            <div style="width: 100%; font-size: 16px; text-align: center; display: flex; flex-direction: row; flex-wrap: wrap; padding-left: 8px;">
              ${shadesRow(design)}
              
            </div>
            <div style="text-align: center; width: 100%;">
              <b style="color: red; font-size: 16px;">${design.remark}</b>
            </div>
            </div>
            <div style="width: 4%; border-right: 1px solid #000; text-align: center; word-wrap: break-word;">
              <p>${Object.values(design.shades).filter((s) => s).length}</p>
            </div>
            <div style="width: 8%; text-align: center; word-wrap: break-word; font-weight: bold;">
              <p>${design.price}</p>
            </div>
          </div>
          
        </div>
        `;
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
              TEL : 022 40225657 / 022 40641137
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
              
              <div style="width: 75%; text-align: left; padding-left: 2; font-weight: bold">
              
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
                  total + Object.values(design.shades).filter((s) => s).length,
                0
              )}
            </div>
            <div style="width: 8%; text-align: center"></div>
          </div>
        </div>
      </body>
    </html>`;
  };

  return parts.map((part) => generatePartHTML(part)).join("");
}
