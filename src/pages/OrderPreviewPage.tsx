import { useParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import supabase from "@/utils/supabase";
import { generateHTML } from "@/utils/generateHTML"; // Import the ge
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/card";
import { Share2 } from "lucide-react";

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
  created_by: string;
}

function OrderPreviewPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [orderDetails, setOrderDetails] = useState<OrderData | null>(null);
  const [designEntries, setDesignEntries] = useState<DesignEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null); // State to hold generated HTML

  const handleGenerateHTML = useCallback(() => {
    if (!orderDetails) return;

    const orderForPreview = {
      designs: designEntries,
      orderNo: orderDetails.order_no,
      date: orderDetails.date,
      broker: orderDetails.broker,
      transport: orderDetails.transport,
      billTo: orderDetails.bill_to,
      billToAddress: "",
      shipTo: orderDetails.ship_to,
      shipToAddress: "",
      remark: orderDetails.remark,
      created_by: orderDetails.created_by,
    };

    const html = generateHTML(orderForPreview);
    setGeneratedHtml(html);

    // Store generated HTML in state
  }, [orderDetails, designEntries]);

  const handlePrint = () => {
    if (!generatedHtml) return;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(generatedHtml);
      printWindow.document.close();
      printWindow.print(); // Trigger the print dialog
    }
  };

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setError("No order ID provided");
        setIsLoading(false);
        return;
      }

      try {
        const [orderResponse, designResponse] = await Promise.all([
          supabase
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
              remark,
              created_by
            `
            )
            .eq("id", orderId)
            .single(),
          supabase.from("design_entries").select("*").eq("order_id", orderId),
        ]);

        if (orderResponse.error) throw orderResponse.error;
        if (designResponse.error) throw designResponse.error;

        const orderData = orderResponse.data;
        setOrderDetails({
          id: orderData.id,
          order_no: orderData.order_no,
          date: orderData.date,
          bill_to:
            (orderData.bill_to as unknown as RelatedEntity)?.name || "N/A",
          ship_to:
            (orderData.ship_to as unknown as RelatedEntity)?.name || "N/A",
          broker: (orderData.broker as unknown as RelatedEntity)?.name || "N/A",
          transport:
            (orderData.transport as unknown as RelatedEntity)?.name || "N/A",
          remark: orderData.remark || "N/A",
          created_by: orderData.created_by || "N/A",
        });

        setDesignEntries(designResponse.data);
      } catch (error) {
        console.error("Error fetching order details:", error);
        setError("Failed to fetch order details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  useEffect(() => {
    if (orderDetails && designEntries.length > 0) {
      handleGenerateHTML();
    }
  }, [orderDetails, designEntries, handleGenerateHTML]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  const handleShare = async () => {
    if (!orderDetails) return;
    const message = `K. M. Textiles Pvt. Ltd.\nOrder No. : ${orderDetails.order_no}\n https://kmtpl.netlify.app/order-preview/${orderId}`; // Updated share link format
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`; // WhatsApp API URL
    window.open(url, "_blank"); // Open in a new tab
  };

  return (
    <div className="p-4">
      <Card className="max-w-md mx-auto shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Order Preview</h1>
        {orderDetails && (
          <div className="mb-4 text-lg font-semibold">
            {orderDetails.bill_to}
          </div>
        )}
        <div className="flex space-x-2"> {/* Added a flex container with spacing */}
          <Button onClick={handlePrint} disabled={!generatedHtml}>
            Print Order Form
          </Button>
          <Button onClick={handleShare} className="flex items-center">
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
        </div>
      </Card>
      {generatedHtml && (
        <iframe
          srcDoc={generatedHtml}
          title="Generated HTML Preview"
          style={{
            width: "100%",
            height: "800px",
            border: "1px solid #ccc",
            marginTop: "20px",
            display: "flex",
            zoom: 0.65,
          }}
        />
      )}
    </div>
  );
}

export default OrderPreviewPage;
