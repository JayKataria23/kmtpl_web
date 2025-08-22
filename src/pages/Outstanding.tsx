import { useEffect, useMemo, useState } from "react";
import supabase from "@/utils/supabase";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui";
import { Loader2, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface ReceivableRow {
  id: number;
  transaction_date: string; // YYYY-MM-DD
  reference_number: string;
  party_name: string;
  pending_amount: number;
}

interface PartyTotal {
  partyName: string;
  totalPending: number;
  invoiceCount: number;
}

export default function Outstanding() {
  const { toast } = useToast();
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [partyTotals, setPartyTotals] = useState<PartyTotal[]>([]);
  const [search, setSearch] = useState("");

  const [selectedParty, setSelectedParty] = useState<string>("");
  const [selectedPartyInvoices, setSelectedPartyInvoices] = useState<ReceivableRow[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastUploadDate, setLastUploadDate] = useState<string>("");
  const [monthDrilldown, setMonthDrilldown] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"party" | "invoices" | "total">("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");


  useEffect(() => {
    const fetchPartyTotals = async () => {
      try {
        // Fetch minimal columns for totals
        const { data, error } = await supabase
          .from("sales_receivables")
          .select("party_name,pending_amount");
        if (error) throw error;

        const totalsMap = new Map<string, { total: number; count: number }>();
        (data as unknown as { party_name: string; pending_amount: number }[])
          .filter((r) => (r.party_name || "").trim() !== "")
          .forEach((row) => {
            const key = row.party_name.trim();
            const entry = totalsMap.get(key) || { total: 0, count: 0 };
            totalsMap.set(key, {
              total: entry.total + (Number(row.pending_amount) || 0),
              count: entry.count + 1,
            });
          });

        const totals: PartyTotal[] = Array.from(totalsMap.entries()).map(
          ([partyName, { total, count }]) => ({
            partyName,
            totalPending: total,
            invoiceCount: count,
          })
        );

        totals.sort((a, b) => b.totalPending - a.totalPending);
        setPartyTotals(totals);
      } catch (err: any) {
        console.error(err);
        toast({
          title: "Failed to load receivables",
          description: err?.message || "Please try again",
          variant: "destructive",
        });
      }
    };
    // Fetch latest created_at date
    const fetchLastUploadDate = async () => {
      const { data, error } = await supabase
        .from("sales_receivables")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (!error && data?.created_at) {
        setLastUploadDate(new Date(data.created_at).toLocaleString("en-GB"));
      }
    };
    fetchPartyTotals();
    fetchLastUploadDate();
  }, [toast]);

  const filteredPartyTotals = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = s
      ? partyTotals.filter((p) => p.partyName.toLowerCase().includes(s))
      : partyTotals;

    const sorted = [...filtered];
    const direction = sortDir === "asc" ? 1 : -1;
    if (sortBy === "party") {
      sorted.sort((a, b) => a.partyName.localeCompare(b.partyName) * direction);
    } else if (sortBy === "invoices") {
      sorted.sort((a, b) => (a.invoiceCount - b.invoiceCount) * direction);
    } else if (sortBy === "total") {
      sorted.sort((a, b) => (a.totalPending - b.totalPending) * direction);
    }
    return sorted;
  }, [partyTotals, search, sortBy, sortDir]);

  const selectedPartyTotal = useMemo(() => {
    if (!selectedParty) return 0;
    const found = partyTotals.find((p) => p.partyName === selectedParty);
    return found ? found.totalPending : 0;
  }, [partyTotals, selectedParty]);

  const monthWise = useMemo(() => {
    if (!selectedPartyInvoices.length) return [] as { month: string; total: number; count: number }[];
    const map = new Map<string, { total: number; count: number }>();
    selectedPartyInvoices.forEach((row) => {
      const month = (row.transaction_date || "").slice(0, 7); // YYYY-MM
      const current = map.get(month) || { total: 0, count: 0 };
      map.set(month, {
        total: current.total + (Number(row.pending_amount) || 0),
        count: current.count + 1,
      });
    });
    const arr = Array.from(map.entries()).map(([month, agg]) => ({ month, total: agg.total, count: agg.count }));
    arr.sort((a, b) => (a.month > b.month ? 1 : -1)); // oldest first
    return arr;
  }, [selectedPartyInvoices]);

  const loadPartyInvoices = async (partyName: string) => {
    try {
      setIsLoadingDetails(true);
      setSelectedParty(partyName);
      setDrawerOpen(true);
      const { data, error } = await supabase
        .from("sales_receivables")
        .select("id,transaction_date,reference_number,party_name,pending_amount")
        .eq("party_name", partyName)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      setSelectedPartyInvoices(data as ReceivableRow[]);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Failed to load party receivables",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const formatMonth = (yyyyMm: string) => {
    const [y, m] = yyyyMm.split("-");
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const grandTotal = useMemo(
    () => partyTotals.reduce((sum, p) => sum + p.totalPending, 0),
    [partyTotals]
  );

  // Filter invoices for the selected month
  const invoicesForMonth = useMemo(() => {
    if (!monthDrilldown) return [];
    return selectedPartyInvoices.filter((inv) => (inv.transaction_date || '').slice(0, 7) === monthDrilldown);
  }, [selectedPartyInvoices, monthDrilldown]);

  const toggleSort = (column: "party" | "invoices" | "total") => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      // Default directions per column
      if (column === "party") setSortDir("asc");
      if (column === "invoices") setSortDir("asc");
      if (column === "total") setSortDir("desc");
    }
  };

  // Helper to get last day of month
  const getLastDayOfMonth = (yyyyMm: string) => {
    const [year, month] = yyyyMm.split("-").map(Number);
    return new Date(year, month, 0).getDate();
  };

  const deleteInvoicesForMonth = async () => {
    if (!selectedParty || !monthDrilldown) return;
    const lastDay = getLastDayOfMonth(monthDrilldown);
    if (!window.confirm(`Delete ALL invoices for ${selectedParty} in ${formatMonth(monthDrilldown)}? This cannot be undone.`)) return;
    try {
      setIsLoadingDetails(true);
      const { error } = await supabase
        .from("sales_receivables")
        .delete()
        .eq("party_name", selectedParty)
        .gte("transaction_date", `${monthDrilldown}-01`)
        .lte("transaction_date", `${monthDrilldown}-${String(lastDay).padStart(2, '0')}`);
      if (error) throw error;
      toast({ title: "Deleted", description: `All invoices for ${formatMonth(monthDrilldown)} deleted.`, variant: "default" });
      // Refresh
      await loadPartyInvoices(selectedParty);
      setMonthDrilldown(null);
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message || "Please try again", variant: "destructive" });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const deleteInvoiceById = async (id: number) => {
    if (!window.confirm("Delete this invoice? This cannot be undone.")) return;
    try {
      setIsLoadingDetails(true);
      const { error } = await supabase
        .from("sales_receivables")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Invoice deleted", variant: "default" });
      // Refresh
      await loadPartyInvoices(selectedParty);
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message || "Please try again", variant: "destructive" });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  return (
    <div className="container mx-auto mt-2 sm:mt-4 p-1 sm:p-2 max-w-md bg-white min-h-screen">
      <div className="flex items-center mb-2">
       
        <h1 className="text-xl sm:text-2xl font-bold flex-1 text-center">Outstanding</h1>
      </div>
      {lastUploadDate && (
        <div className="mb-2 text-xs text-gray-500 text-center">Last data upload: <span className="font-semibold">{lastUploadDate}</span></div>
      )}
      <div className="mb-3 flex flex-col gap-2">
        <div className="text-sm text-gray-700 text-center">Grand Total: <span className="font-bold text-lg text-black">{formatCurrency(grandTotal)}</span></div>
        <div className="w-full relative">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party..."
            className="rounded-lg px-4 py-3 text-base border-2 border-gray-200 focus:border-yellow-400 focus:ring-0 shadow-sm pr-10 bg-white"
          />
          {search && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl focus:outline-none"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-2">
        <div className="sticky top-0 z-10 bg-white rounded-t-2xl">
          <div className="px-2 py-2 border-b font-semibold text-base text-gray-800">Party-wise Totals</div>
        </div>
        <div className="max-h-[60vh] overflow-auto custom-scrollbar">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-white sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button className="inline-flex items-center gap-1 hover:text-gray-700" onClick={() => toggleSort("party")}
                      aria-label="Sort by party">
                      Party {sortBy === 'party' ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button className="inline-flex items-center gap-1 hover:text-gray-700" onClick={() => toggleSort("invoices")} aria-label="Sort by invoices">
                      Invoices {sortBy === 'invoices' ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button className="inline-flex items-center gap-1 hover:text-gray-700" onClick={() => toggleSort("total")} aria-label="Sort by total">
                      Total {sortBy === 'total' ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPartyTotals.map((p) => (
                  <tr
                    key={p.partyName}
                    className={`cursor-pointer rounded-xl transition bg-white ${selectedParty === p.partyName ? "bg-gray-100" : "hover:bg-gray-50"}`}
                    onClick={() => loadPartyInvoices(p.partyName)}
                    style={{ height: 56 }}
                  >
                    <td className="px-2 py-2 text-base font-medium text-gray-900 max-w-[120px] truncate" title={p.partyName}>{p.partyName}</td>
                    <td className="px-2 py-2 text-right text-base text-gray-700 whitespace-nowrap">{p.invoiceCount}</td>
                    <td className="px-2 py-2 text-right text-base font-bold text-black" title={formatCurrency(p.totalPending)}>{formatCurrency(p.totalPending)}</td>
                  </tr>
                ))}
                {filteredPartyTotals.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-2 py-6 text-center text-sm text-gray-500">
                      No parties found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Drawer open={drawerOpen} onOpenChange={(open) => { setDrawerOpen(open); if (!open) setMonthDrilldown(null); }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-center text-lg text-black">{selectedParty || "Party Details"}</DrawerTitle>
            <DrawerClose asChild>
              <button className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </DrawerClose>
          </DrawerHeader>
          <div className="px-2 pb-4">
            {monthDrilldown ? (
              <>
                <div className="flex items-center mb-2">
                  <button className="mr-2 text-gray-500 hover:text-gray-700 text-lg" onClick={() => setMonthDrilldown(null)}>&larr; Back</button>
                  <span className="font-semibold text-base text-black">{formatMonth(monthDrilldown)}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="ml-auto"
                    onClick={deleteInvoicesForMonth}
                    disabled={isLoadingDetails || invoicesForMonth.length === 0}
                  >
                    Delete All Invoices
                  </Button>
                </div>
                <div className="mb-2 text-right text-sm text-gray-500">
                  Total Pending: <span className="font-bold text-black">{formatCurrency(invoicesForMonth.reduce((sum, inv) => sum + inv.pending_amount, 0))}</span>
                </div>
                <div className="overflow-auto max-h-[60vh] custom-scrollbar">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ref. No.</th>
                        <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Pending</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoicesForMonth.map((inv) => (
                        <tr key={inv.id}>
                          <td className="px-2 py-2 text-base text-gray-900">{inv.transaction_date ? new Date(inv.transaction_date).toLocaleDateString("en-GB") : ""}</td>
                          <td className="px-2 py-2 text-base text-gray-700">{inv.reference_number}</td>
                          <td className="px-2 py-2 text-right text-base font-bold text-black">{formatCurrency(inv.pending_amount)}</td>
                          <td className="px-2 py-2 text-center">
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => deleteInvoiceById(inv.id)}
                              disabled={isLoadingDetails}
                              title="Delete invoice"
                            >
                              🗑️
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {invoicesForMonth.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-2 py-6 text-center text-sm text-gray-500">
                            No data
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="mb-2 text-right text-sm text-gray-500">
                  Total Pending: <span className="font-bold text-black">{formatCurrency(selectedParty ? selectedPartyTotal : 0)}</span>
                </div>
                {isLoadingDetails ? (
                  <div className="p-6 flex items-center text-sm text-gray-600">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading party data...
                  </div>
                ) : !selectedParty ? (
                  <div className="p-6 text-sm text-gray-500">Select a party to view details</div>
                ) : (
                  <div className="overflow-auto max-h-[60vh] custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Month</th>
                          <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoices</th>
                          <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {monthWise.map((m) => (
                          <tr key={m.month} className="cursor-pointer hover:bg-gray-100 rounded-lg" onClick={() => setMonthDrilldown(m.month)}>
                            <td className="px-2 py-2 text-base text-gray-900">{formatMonth(m.month)}</td>
                            <td className="px-2 py-2 text-right text-base text-gray-700">{m.count}</td>
                            <td className="px-2 py-2 text-right text-base font-bold text-black">{formatCurrency(m.total)}</td>
                          </tr>
                        ))}
                        {monthWise.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-2 py-6 text-center text-sm text-gray-500">
                              No data
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
      <div className="sticky bottom-0 z-50 bg-white"><Toaster /></div>
    </div>
  );
} 