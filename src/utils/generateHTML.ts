/* eslint-disable @typescript-eslint/no-unused-vars */
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
}

interface EntriesRowResult {
  rows: number;
  exceedingIndex: number;
}

function entriesRow(order: Order): EntriesRowResult {
  let rows = 0;
  let exceedingIndex = -1;

  for (let i = 0; i < order.designs.length; i++) {
    const nonEmptyShades = Object.values(order.designs[i].shades).filter(
      (shade) => shade !== ""
    ).length;
    if (nonEmptyShades > 0) {
      rows += Math.ceil(nonEmptyShades / 8);
    }
    if (rows > 12 && exceedingIndex === -1) {
      exceedingIndex = i;
    }
  }

  return { rows, exceedingIndex };
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

export function generateHTML(order: Order): string {
  const parts = splitOrder(order);

  const shadesRow = (design: Design): string => {
    return Object.entries(design.shades)
      .map(([index, shade]) => {
        if (shade) {
          return `<div style="width: 12.5%">
                    <div>${parseInt(index) + 1}</div>
                    <div>${shade}</div>
                  </div>`;
        }
        return "";
      })
      .join("");
  };

  const generatePartHTML = (part: Order, partIndex: number): string => {
    const designsHTML = part.designs
      .map((design, index) => {
        return `
        <div style="border-bottom: 1px solid #000; display: flex; flex-direction: row;">
          <div style="width: 5%; border-right: 1px solid #000; text-align: center; word-wrap: break-word;">
            <p>${index + 1}</p>
          </div>
          <div style="width: 12%; border-right: 1px solid #000; text-align: center; word-wrap: break-word;">
            <p>${design.design}</p>
          </div>
          <div style="width: 64%; border-right: 1px solid #000; text-align: center; display: flex; flex-direction: row; flex-wrap: wrap;">
            ${shadesRow(design)}
          </div>
          <div style="width: 4%; border-right: 1px solid #000; text-align: center; word-wrap: break-word;">
            <p>${Object.values(design.shades).filter((s) => s).length}</p>
          </div>
          <div style="width: 10%; border-right: 1px solid #000; text-align: center; word-wrap: break-word;">
            <p>${design.price}</p>
          </div>
          <div style="width: 5%">${design.remark}</div>
        </div>
        `;
      })
      .join("");

    return `
    <html>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      </head>
      <body style="margin: 2px">
        <div style="border: 2px solid #000">
          <div style="border-bottom: 1px solid #000; text-align: center; font-weight: bold;">ॐ</div>
          <div style="border-bottom: 1px solid #000; text-align: center; font-weight: bold; font-size: xx-large;">
            K.M. TEXTILES PVT. LTD.
          </div>
          <div style="border-bottom: 1px solid #000; display: flex; flex-direction: row;">
            <div style="border-right: 1px solid #000; width: 63%">
              47-SHANTI BHAVEN, 1ST FLOOR, ROOM NO. 1, 2, 3, 4 <br />
              OLD HANUMAN LANE, KALBADEVI ROAD, MUMBAI-400002 <br />
              TEL : 022 40225657 / 022 40641137
              <i class="fa fa-whatsapp" style="margin-left: 10px"></i>:+91 8097301148 <br />
              EMAIL : k.m.textilespvtltd@gmail.com
            </div>
            <div style="width: 38%; display: flex; flex-direction: row">
              <div style="width: 35%; text-align: right">
                Order No. :<br />
                Date : <br />
                Broker : <br />
                Transport :
              </div>
              <div style="width: 65%; text-align: left; padding-left: 2">
                ${part.orderNo} <br />
                ${part.date} <br />
                ${part.broker} <br />
                ${part.transport}
              </div>
            </div>
          </div>
          <div style="border-bottom: 1px solid #000; display: flex; flex-direction: row;">
            <div style="width: 55%; border-right: 1px solid #000">
              <b>To:</b> ${part.billTo}<br />
              ${part.billToAddress}<br />
            </div>
            <div style="width: 45%">
              <b>Delivery:</b> ${part.shipTo}<br />
              ${part.shipToAddress}<br />
            </div>
          </div>
          <div style="border-bottom: 1px solid #000; display: flex; flex-direction: row;">
            <div style="width: 10%">Remark:</div>
            <div style="width: 90%; word-wrap: break-word; font-weight: bold; color: red;">
              ${part.remark}
            </div>
          </div>
          <div style="height: 700px; overflow: hidden">
            <div style="border-bottom: 1px solid #000; display: flex; flex-direction: row; font-size: x-large;">
              <div style="width: 5%; border-right: 1px solid #000; font-weight: bold; text-align: center;">S/n.</div>
              <div style="width: 12%; border-right: 1px solid #000; font-weight: bold; text-align: center;">Design</div>
              <div style="width: 64%; border-right: 1px solid #000; font-weight: bold; text-align: center;">Shades</div>
              <div style="width: 4%; border-right: 1px solid #000; font-weight: bold; text-align: center;">Pc</div>
              <div style="width: 10%; border-right: 1px solid #000; font-weight: bold; text-align: center;">Price</div>
              <div style="width: 5%"></div>
            </div>
            ${designsHTML}
            <div style="display: flex; flex-direction: row; height: 100vh"></div>
          </div>
          <div style="display: flex; flex-direction: row; border-top: 1px solid #000; font-size: x-large;">
            <div style="width: 5%; border-right: 1px solid #000; text-align: center"></div>
            <div style="width: 12%; border-right: 1px solid #000; text-align: center"></div>
            <div style="width: 64%; border-right: 1px solid #000; font-weight: bold; text-align: right; padding-right: 2;">Total</div>
            <div style="width: 4%; border-right: 1px solid #000; font-weight: bold; text-align: center;">
              ${part.designs.reduce(
                (total, design) =>
                  total + Object.values(design.shades).filter((s) => s).length,
                0
              )}
            </div>
            <div style="width: 10%; border-right: 1px solid #000; text-align: center"></div>
            <div style="width: 5%"></div>
          </div>
        </div>
      </body>
    </html>`;
  };

  return parts.map((part, index) => generatePartHTML(part, index)).join("");
}
