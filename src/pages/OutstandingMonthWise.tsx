import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash } from "lucide-react";
import { Toaster } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/utils/supabase";

interface ReceivableRow {
  id: number;
  transaction_date: string;
  reference_number: string;
  party_name: string;
  pending_amount: number;
}

interface MonthTotal {
  month: string;
  totalPending: number;
  invoiceCount: number;
}

interface PartyMonthTotal {
  partyName: string;
  totalPending: number;
  invoiceCount: number;
}

export default function OutstandingMonthWise() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ReceivableRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedParty, setSelectedParty] = useState<string | null>(null);

  const fetchRows = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("sales_receivables")
        .select("id,transaction_date,reference_number,party_name,pending_amount")
        .order("transaction_date", { ascending: true });
      if (error) throw error;
      setRows((data as ReceivableRow[]) || []);
    } catch (err: any) {
      toast({
        title: "Failed to load outstanding",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const formatMonth = (yyyyMm: string) => {
    const [y, m] = yyyyMm.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  const monthTotals = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    rows.forEach((row) => {
      const month = (row.transaction_date || "").slice(0, 7);
      if (!month) return;
      const current = map.get(month) || { total: 0, count: 0 };
      map.set(month, {
        total: current.total + (Number(row.pending_amount) || 0),
        count: current.count + 1,
      });
    });

    const data: MonthTotal[] = Array.from(map.entries()).map(([month, v]) => ({
      month,
      totalPending: v.total,
      invoiceCount: v.count,
    }));

    data.sort((a, b) => (a.month > b.month ? 1 : -1));
    return data;
  }, [rows]);

  const partiesForSelectedMonth = useMemo(() => {
    if (!selectedMonth) return [] as PartyMonthTotal[];
    const map = new Map<string, { total: number; count: number }>();
    rows
      .filter((r) => (r.transaction_date || "").slice(0, 7) === selectedMonth)
      .forEach((row) => {
        const party = (row.party_name || "").trim();
        if (!party) return;
        const current = map.get(party) || { total: 0, count: 0 };
        map.set(party, {
          total: current.total + (Number(row.pending_amount) || 0),
          count: current.count + 1,
        });
      });

    return Array.from(map.entries())
      .map(([partyName, v]) => ({
        partyName,
        totalPending: v.total,
        invoiceCount: v.count,
      }))
      .sort((a, b) => b.totalPending - a.totalPending);
  }, [rows, selectedMonth]);

  const invoicesForSelectedParty = useMemo(() => {
    if (!selectedMonth || !selectedParty) return [] as ReceivableRow[];
    return rows.filter(
      (r) =>
        (r.transaction_date || "").slice(0, 7) === selectedMonth &&
        (r.party_name || "").trim() === selectedParty
    );
  }, [rows, selectedMonth, selectedParty]);

  const deleteInvoiceById = async (id: number) => {
    if (!window.confirm("Delete this invoice? This cannot be undone.")) return;
    try {
      setIsLoading(true);
      const { error } = await supabase.from("sales_receivables").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Invoice deleted" });
      await fetchRows();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message || "Please try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto mt-2 sm:mt-4 p-1 sm:p-2 max-w-md bg-white min-h-screen">
      <h1 className="text-xl sm:text-2xl font-bold text-center mb-3">Outstanding Month Wise</h1>

      {!selectedMonth && (
        <div className="bg-white rounded-2xl shadow-sm p-2">
          <div className="px-2 py-2 border-b font-semibold text-base text-gray-800">Months (Oldest First)</div>
          <div className="max-h-[70vh] overflow-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-white sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Month</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Parties</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Outstanding</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthTotals.map((m) => (
                  <tr key={m.month} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedMonth(m.month)}>
                    <td className="px-2 py-2 text-base">{formatMonth(m.month)}</td>
                    <td className="px-2 py-2 text-right text-base">{m.invoiceCount}</td>
                    <td className="px-2 py-2 text-right text-base font-bold">{formatCurrency(m.totalPending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedMonth && !selectedParty && (
        <div className="bg-white rounded-2xl shadow-sm p-2">
          <div className="flex items-center justify-between px-2 py-2 border-b">
            <Button variant="ghost" className="px-2" onClick={() => setSelectedMonth(null)}>&larr; Back</Button>
            <div className="font-semibold text-base text-gray-800">{formatMonth(selectedMonth)}</div>
          </div>
          <div className="max-h-[70vh] overflow-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-white sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Party</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Bills</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Outstanding</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {partiesForSelectedMonth.map((p) => (
                  <tr key={p.partyName} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedParty(p.partyName)}>
                    <td className="px-2 py-2 text-base">{p.partyName}</td>
                    <td className="px-2 py-2 text-right text-base">{p.invoiceCount}</td>
                    <td className="px-2 py-2 text-right text-base font-bold">{formatCurrency(p.totalPending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedMonth && selectedParty && (
        <div className="bg-white rounded-2xl shadow-sm p-2">
          <div className="flex items-center justify-between px-2 py-2 border-b">
            <Button variant="ghost" className="px-2" onClick={() => setSelectedParty(null)}>&larr; Back</Button>
            <div className="font-semibold text-base text-gray-800">{selectedParty}</div>
          </div>
          <div className="max-h-[70vh] overflow-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-white sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Ref</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Pending</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Delete</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoicesForSelectedParty.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-2 py-2 text-base">{new Date(inv.transaction_date).toLocaleDateString("en-GB")}</td>
                    <td className="px-2 py-2 text-base">{inv.reference_number}</td>
                    <td className="px-2 py-2 text-right text-base font-bold">{formatCurrency(inv.pending_amount)}</td>
                    <td className="px-2 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteInvoiceById(inv.id)}
                        disabled={isLoading}
                        className="text-red-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash className="w-5 h-5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center">
          <div className="bg-white p-3 rounded-lg shadow flex items-center text-sm text-gray-700">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
          </div>
        </div>
      )}

      <div className="sticky bottom-0 z-50 bg-white"><Toaster /></div>
    </div>
  );
}
