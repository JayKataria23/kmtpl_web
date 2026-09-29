import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button, Toaster } from "@/components/ui";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/utils/supabase";

interface ComputerStockItem {
  id: number;
  particulars: string;
  quantity_mtrs: number;
}

const formatMeters = (quantity: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(quantity);

export default function ComputerStock() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stock, setStock] = useState<ComputerStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStock = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("computer_stock")
      .select("id, particulars, quantity_mtrs")
      .order("particulars");

    if (error) {
      toast({
        title: "Unable to load computer stock",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setStock(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchStock();
  }, []);

  const totalMeters = stock.reduce((total, item) => total + Number(item.quantity_mtrs), 0);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="outline" onClick={() => navigate("/")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Computer Stock</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Current design-wise stock uploaded from the Master page.
          </p>
        </div>
        <Button variant="outline" onClick={() => void fetchStock()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-4">
          <span className="font-semibold">Available stock</span>
          <span className="text-sm text-muted-foreground">{stock.length} designs</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/20 text-left text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">Particulars / Design Name</th>
                <th className="px-5 py-3 text-right font-medium">Quantity (Mtrs)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="px-5 py-12 text-center text-muted-foreground">Loading stock…</td></tr>
              ) : stock.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-12 text-center text-muted-foreground">No computer stock has been uploaded yet.</td></tr>
              ) : (
                stock.map((item, index) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-5 py-3 text-muted-foreground">{index + 1}</td>
                    <td className="px-5 py-3 font-medium">{item.particulars}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatMeters(Number(item.quantity_mtrs))}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && stock.length > 0 && (
              <tfoot className="border-t bg-muted/30 font-semibold">
                <tr>
                  <td colSpan={2} className="px-5 py-3">Total</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatMeters(totalMeters)} Mtrs</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
