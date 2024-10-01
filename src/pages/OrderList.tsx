/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Toaster } from "@/components/ui";
import supabase from "@/utils/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { EditOrderModal } from "@/components/custom/EditOrderModal";

interface Order {
  id: number;
  order_no: number;
  date: string;
  party_name: string;
  remark: string | null;
}

interface OrderFromDB {
  id: number;
  order_no: number;
  date: string;
  remark: string | null;
  bill_to: { name: string } | null;
}

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id, 
          order_no, 
          date, 
          remark,
          bill_to:bill_to_id(name)
        `
        )
        .order("date", { ascending: false })
        .order("order_no", { ascending: false });

      if (error) throw error;

      const formattedOrders = (data as unknown as OrderFromDB[]).map(
        (order) => ({
          id: order.id,
          order_no: order.order_no,
          date: order.date,
          remark: order.remark,
          party_name: order.bill_to?.name || "N/A",
        })
      );
      setOrders(formattedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleEdit = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Order deleted successfully",
      });
      fetchOrders();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    }
  };

  const handleOrderUpdated = () => {
    fetchOrders();
  };

  return (
    <div className="container mx-auto mt-8 p-4 max-w-4xl">
      <Button onClick={() => navigate("/")} className="mb-6">
        Back to Home
      </Button>
      <h1 className="text-3xl font-bold mb-6">Order List</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-4">
                <span className="text-lg font-semibold">#{order.order_no}</span>
                <span className="text-sm text-gray-500">
                  {format(new Date(order.date), "dd/MM/yyyy")}
                </span>
              </div>
              <div className="space-x-2">
                <Button
                  onClick={() => handleEdit(order.id)}
                  variant="outline"
                  size="sm"
                >
                  Edit
                </Button>
                <Button
                  onClick={() => handleDelete(order.id)}
                  variant="destructive"
                  size="sm"
                >
                  Delete
                </Button>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-700">
              {order.party_name}
            </div>
            {order.remark && (
              <div className="text-sm text-gray-500 mt-1">{order.remark}</div>
            )}
          </div>
        ))}
      </div>
      <EditOrderModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        orderId={selectedOrderId}
        onOrderUpdated={handleOrderUpdated}
      />
      <Toaster />
    </div>
  );
}
