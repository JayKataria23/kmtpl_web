/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Toaster } from "@/components/ui";
import { Input } from "@/components/ui";
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
  canceled: boolean;
}

interface OrderFromDB {
  id: number;
  order_no: number;
  date: string;
  remark: string | null;
  bill_to: { name: string } | null;
  canceled: boolean;
}

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

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
          canceled, 
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
          canceled: order.canceled, // Include canceled in the formatted orders
          party_name: order.bill_to?.name || "N/A",
        })
      );
      setOrders(formattedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: `Failed to fetch orders: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
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

  

  const handleOrderUpdated = () => {
    fetchOrders();
  };

  const handleOpenPDF = (orderId: number) => {
    // Accept orderId as a parameter
    navigate(`/order-preview/${orderId}`); // Navigate to OpenPreviewPage with orderId
  };

  // Compute which orders match and the total matches for highlighting
  const matchingOrderIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [] as number[];
    return orders
      .filter((o) => {
        const fields = [
          String(o.order_no),
          o.date ? format(new Date(o.date), "dd/MM/yyyy") : "",
          o.party_name || "",
          o.remark || "",
        ]
          .join(" | ")
          .toLowerCase();
        return fields.includes(q);
      })
      .map((o) => o.id);
  }, [orders, searchQuery]);

  // Scroll to current match when query or index changes
  useEffect(() => {
    if (!searchQuery) return;
    if (matchingOrderIds.length === 0) return;
    const clampedIdx = Math.max(0, Math.min(currentMatchIdx, matchingOrderIds.length - 1));
    const id = matchingOrderIds[clampedIdx];
    const el = itemRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [searchQuery, currentMatchIdx, matchingOrderIds]);

  // Reset current match when query changes
  useEffect(() => {
    setCurrentMatchIdx(0);
  }, [searchQuery]);

  const goToNext = () => {
    if (matchingOrderIds.length === 0) return;
    setCurrentMatchIdx((idx) => (idx + 1) % matchingOrderIds.length);
  };

  const goToPrev = () => {
    if (matchingOrderIds.length === 0) return;
    setCurrentMatchIdx((idx) => (idx - 1 + matchingOrderIds.length) % matchingOrderIds.length);
  };

  const handleSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        goToPrev();
      } else {
        goToNext();
      }
    }
  };

  const highlightText = (text: string) => {
    const q = searchQuery.trim();
    if (!q) return text;
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|\[\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\-\uFFFF]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  const isCurrentCard = (orderId: number) => {
    if (!searchQuery || matchingOrderIds.length === 0) return false;
    return matchingOrderIds[currentMatchIdx] === orderId;
  };

  

  return (
    <div className="container mx-auto mt-8 p-4 max-w-4xl pb-28 md:pb-0">
      <Button onClick={() => navigate("/")} className="mb-6">
        Back to Home
      </Button>
      <h1 className="text-3xl font-bold mb-4">Order List</h1>
      <div className="md:mb-6 mb-0 fixed md:static bottom-4 left-1/2 -translate-x-1/2 md:translate-x-0 z-50 w-[calc(100%-2rem)] md:w-auto max-w-2xl bg-white/90 md:bg-transparent backdrop-blur rounded-md shadow-lg md:shadow-none border md:border-0 px-3 py-2 flex items-center gap-2">
        <Input
          placeholder="Find in list (Enter=Next, Shift+Enter=Prev)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
        <Button variant="outline" onClick={goToPrev} disabled={!searchQuery || matchingOrderIds.length === 0}>
          Prev
        </Button>
        <Button onClick={goToNext} disabled={!searchQuery || matchingOrderIds.length === 0}>
          Next
        </Button>
        <span className="text-sm text-gray-600 ml-2">
          {searchQuery && matchingOrderIds.length > 0
            ? `${currentMatchIdx + 1} of ${matchingOrderIds.length}`
            : searchQuery
            ? "0 results"
            : ""}
        </span>
      </div>
      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            ref={(el) => (itemRefs.current[order.id] = el)}
            className={`p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 ${
              order.canceled ? "bg-red-100" : "bg-white"
            } ${isCurrentCard(order.id) ? "ring-2 ring-yellow-400" : ""}`}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-4">
                <span className="text-lg font-semibold">
                  {highlightText(`#${String(order.order_no)}`)}
                </span>
                <span className="text-sm text-gray-500">
                  {highlightText(format(new Date(order.date), "dd/MM/yyyy"))}
                </span>
              </div>
              <div className="space-x-2">
                <Button onClick={() => handleOpenPDF(order.id)} size="sm">
                  Open PDF
                </Button>
                <Button
                  onClick={() => handleEdit(order.id)}
                  variant="outline"
                  size="sm"
                >
                  Edit
                </Button>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-700">
              {highlightText(order.party_name)}
            </div>
            {order.remark && (
              <div className="text-sm text-gray-500 mt-1">{highlightText(order.remark)}</div>
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
