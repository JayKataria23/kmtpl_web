declare module '../utils/generateHTML' {
  interface DesignEntry {
    id: string;
    design: string;
    price: string;
    remark: string;
    shades: string[];
  }

  interface OrderDetails {
    orderNo: string;
    date: string;
    billTo: number | null;
    shipTo: number | null;
    broker: number | null;
    transport: number | null;
    designs: DesignEntry[];
    remark: string;
    billToAddress?: string;
    shipToAddress?: string;
  }

  export function generateHTML(orderDetails: OrderDetails): string;
}