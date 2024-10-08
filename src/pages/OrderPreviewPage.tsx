import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import supabase from "@/utils/supabase";
import { format, parseISO } from "date-fns";


interface RelatedEntity {
  name: string;
}

interface DesignEntry {
  id: string;
  design: string;
  price: string;
  remark: string;
  shades: string[];
}

interface OrderData {
  id: number;
  order_no: string;
  date: string;
  bill_to: string;
  ship_to: string;
  broker: string;
  transport: string;
  remark: string;
}

function OrderPreviewPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [orderDetails, setOrderDetails] = useState<OrderData | null>(null);
  const [designEntries, setDesignEntries] = useState<DesignEntry[]>([]);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) return;

      try {
        const { data, error } = await supabase
          .from("orders")
          .select(
            `
            id,
            order_no,
            date,
            bill_to:orders_bill_to_id_fkey (name),
            ship_to:orders_ship_to_id_fkey (name),
            broker:orders_broker_id_fkey (name),
            transport:orders_transport_id_fkey (name),
            remark
          `
          )
          .eq("id", orderId)
          .single();

        if (error) throw error;

        console.log("Fetched order details:", data);

        setOrderDetails({
          id: data.id,
          order_no: data.order_no,
          date: data.date,
          bill_to: (data.bill_to as unknown as RelatedEntity)?.name || "N/A",
          ship_to: (data.ship_to as unknown as RelatedEntity)?.name || "N/A",
          broker: (data.broker as unknown as RelatedEntity)?.name || "N/A",
          transport: (data.transport as unknown as RelatedEntity)?.name || "N/A",
          remark: data.remark || "N/A",
        });

        const { data: designData, error: designError } = await supabase
          .from("design_entries")
          .select("*")
          .eq("order_id", orderId);

        if (designError) throw designError;

        console.log("Fetched design entries:", designData);

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
        <p>
          <strong>Order No:</strong> {orderDetails.order_no}
        </p>
        <p>
          <strong>Date:</strong>{" "}
          {format(parseISO(orderDetails.date), "dd/MM/yyyy")}
        </p>
        <p>
          <strong>Bill To:</strong> {orderDetails.bill_to}
        </p>
        <p>
          <strong>Ship To:</strong> {orderDetails.ship_to}
        </p>
        <p>
          <strong>Broker:</strong> {orderDetails.broker}
        </p>
        <p>
          <strong>Transport:</strong> {orderDetails.transport}
        </p>
        <p>
          <strong>Remark:</strong> {orderDetails.remark}
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">Design Entries</h2>
        {designEntries.length > 0 ? (
          <ul className="space-y-4">
            {designEntries.map((entry) => (
              <li key={entry.id} className="border p-4 rounded">
                <p>
                  <strong>Design:</strong> {entry.design}
                </p>
                <p>
                  <strong>Price:</strong> {entry.price}
                </p>
                <p>
                  <strong>Remark:</strong> {entry.remark || "N/A"}
                </p>
                <details>
                  <summary className="cursor-pointer">Shades</summary>
                  <ul className="pl-4">
                    {entry.shades.map(
                      (shade, index) =>
                        shade && (
                          <li key={index}>
                            Shade {index + 1}: {shade}
                          </li>
                        )
                    )}
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
