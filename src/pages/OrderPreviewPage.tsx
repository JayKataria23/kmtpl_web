import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import supabase from "@/utils/supabase";
import { format, parseISO } from "date-fns";

interface OrderDetails {
  id: number;
  order_no: string;
  date: string;
  bill_to: { id: number; name: string } | null;
  ship_to: { id: number; name: string } | null;
  broker: { id: number; name: string } | null;
  transport: { id: number; name: string } | null;
  remark: string;
}

interface DesignEntry {
  id: string;
  design: string;
  price: string;
  remark: string;
  shades: string[];
}

function OrderPreviewPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [designEntries, setDesignEntries] = useState<DesignEntry[]>([]);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) return;

      try {
        const { data, error } = await supabase
          .from("orders")
          .select(`
            id,
            order_no,
            date,
            bill_to:bill_to_id(id, name),
            ship_to:ship_to_id(id, name),
            broker:broker_id(id, name),
            transport:transport_id(id, name),
            remark
          `)
          .eq("id", orderId)
          .single();

        if (error) throw error;

        setOrderDetails({
          ...data,
          bill_to: data.bill_to[0] || { id: 0, name: '' },
          ship_to: data.ship_to[0] || { id: 0, name: '' },
          broker: data.broker[0] || { id: 0, name: '' },
          transport: data.transport[0] || { id: 0, name: '' },
        });

        // Fetch design entries
        const { data: designData, error: designError } = await supabase
          .from("design_entries")
          .select("*")
          .eq("order_id", orderId);

        if (designError) throw designError;

        setDesignEntries(designData);
      } catch (error) {
        console.error("Error fetching order details:", error);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  if (!orderDetails) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Order Preview</h1>
      <div className="space-y-4">
        <p><strong>Order No:</strong> {orderDetails.order_no}</p>
        <p><strong>Date:</strong> {format(parseISO(orderDetails.date), "dd/MM/yyyy")}</p>
        <p><strong>Bill To:</strong> {orderDetails.bill_to?.name || "N/A"}</p>
        <p><strong>Ship To:</strong> {orderDetails.ship_to?.name || "N/A"}</p>
        <p><strong>Broker:</strong> {orderDetails.broker?.name || "N/A"}</p>
        <p><strong>Transport:</strong> {orderDetails.transport?.name || "N/A"}</p>
        <p><strong>Remark:</strong> {orderDetails.remark || "N/A"}</p>

        <h2 className="text-xl font-semibold mt-6 mb-2">Design Entries</h2>
        {designEntries.length > 0 ? (
          <ul className="space-y-4">
            {designEntries.map((entry) => (
              <li key={entry.id} className="border p-4 rounded">
                <p><strong>Design:</strong> {entry.design}</p>
                <p><strong>Price:</strong> {entry.price}</p>
                <p><strong>Remark:</strong> {entry.remark || "N/A"}</p>
                <details>
                  <summary className="cursor-pointer">Shades</summary>
                  <ul className="pl-4">
                    {entry.shades.map((shade, index) => (
                      shade && <li key={index}>Shade {index + 1}: {shade}</li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p>No design entries found.</p>
        )}
      </div>
    </div>
  );
}

export default OrderPreviewPage;
