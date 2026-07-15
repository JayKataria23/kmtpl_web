import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "@/utils/supabase";
import { Share2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui";
import { Loader2, ArrowUpDown, ChevronUp, ChevronDown, Trash } from "lucide-react";
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

  const navigate = useNavigate();


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

  const groupedInvoices = useMemo(() => {
    const groups: { [yyyyMm: string]: ReceivableRow[] } = {};
    selectedPartyInvoices.forEach(inv => {
      const month = (inv.transaction_date || '').slice(0, 7);
      if (!groups[month]) groups[month] = [];
      groups[month].push(inv);
    });
    // Sort by oldest month first
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [selectedPartyInvoices]);

  const handleShare = async () => {
    if (!selectedParty) return;
    try {
      setIsLoadingDetails(true);
      const pdf = new jsPDF("p", "mm", "a4");
      
      pdf.setFontSize(18);
      pdf.text("Outstanding Statement", 14, 20);
      
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.text(`Party: ${selectedParty}`, 14, 28);
      
      const body: any[] = [];
      const formatCurrencyPDF = (n: number) => formatCurrency(n).replace('₹', 'Rs. ');
      
      groupedInvoices.forEach(([monthStr, invoices]) => {
        const monthTotal = invoices.reduce((sum, inv) => sum + (Number(inv.pending_amount) || 0), 0);
        
        // Month Header
        body.push([
          { content: formatMonth(monthStr), colSpan: 3, styles: { halign: 'center', fontStyle: 'bold', fillColor: [229, 231, 235], textColor: [0,0,0] } }
        ]);
        
        // Invoices
        invoices.forEach(inv => {
          body.push([
            new Date(inv.transaction_date).toLocaleDateString("en-GB"),
            inv.reference_number,
            { content: formatCurrencyPDF(inv.pending_amount), styles: { halign: 'right' } }
          ]);
        });
        
        // Month Total
        body.push([
          { content: `Total for ${formatMonth(monthStr)}:`, colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: formatCurrencyPDF(monthTotal), styles: { halign: 'right', fontStyle: 'bold' } }
        ]);
      });
      
      // Grand Total
      body.push([
        { content: "Grand Total Outstanding:", colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: [243, 244, 246] } },
        { content: formatCurrencyPDF(selectedPartyTotal), styles: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38], fillColor: [243, 244, 246] } }
      ]);
      
      autoTable(pdf, {
        startY: 35,
        head: [['Date', 'Reference', { content: 'Pending Amount', styles: { halign: 'right' } }]],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [243, 244, 246], textColor: [0,0,0], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 90 },
          2: { cellWidth: 50, halign: 'right' }
        },
        margin: { top: 35, right: 14, bottom: 20, left: 14 }
      });
      
      const pdfBlob = pdf.output("blob");
      const filename = `${selectedParty}_Outstanding.pdf`;
      const file = new File([pdfBlob], filename, { type: "application/pdf" });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Outstanding Report',
            text: `Outstanding report for ${selectedParty}`,
            files: [file]
          });
        } catch (shareError: any) {
          console.warn("Share API failed or user cancelled, falling back to download:", shareError);
          pdf.save(filename);
        }
      } else {
        // Fallback: download the file
        pdf.save(filename);
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Failed to generate PDF", description: err?.message || "Please try again", variant: "destructive" });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  return (
    <div className="container mx-auto mt-2 sm:mt-4 p-1 sm:p-2 max-w-md bg-white min-h-screen relative">
      <div className="flex items-center justify-between mb-2">
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>Home</Button>
        <h1 className="text-xl sm:text-2xl font-bold flex-1 text-center">Outstanding</h1>
        <div className="w-[52px]"></div>
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
              <thead className="bg-gray-50/50 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button className="inline-flex items-center gap-1 hover:text-gray-700" onClick={() => toggleSort("party")}
                      aria-label="Sort by party">
                      Party {sortBy === 'party' ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button className="inline-flex items-center gap-1 hover:text-gray-700" onClick={() => toggleSort("invoices")} aria-label="Sort by invoices">
                      Inv {sortBy === 'invoices' ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button className="inline-flex items-center gap-1 hover:text-gray-700" onClick={() => toggleSort("total")} aria-label="Sort by total">
                      Total {sortBy === 'total' ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredPartyTotals.map((p) => (
                  <tr
                    key={p.partyName}
                    className={`cursor-pointer transition-colors ${selectedParty === p.partyName ? "bg-blue-50/50" : "hover:bg-gray-50/80"}`}
                    onClick={() => loadPartyInvoices(p.partyName)}
                  >
                    <td className="px-3 py-4 text-sm sm:text-base font-medium text-gray-900 max-w-[140px] truncate" title={p.partyName}>{p.partyName}</td>
                    <td className="px-3 py-4 text-right text-sm sm:text-base text-gray-600 whitespace-nowrap">{p.invoiceCount}</td>
                    <td className="px-3 py-4 text-right text-sm sm:text-base font-bold text-gray-900" title={formatCurrency(p.totalPending)}>{formatCurrency(p.totalPending)}</td>
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
          <DrawerHeader className="flex flex-row items-center justify-between px-4">
            <DrawerTitle className="text-lg text-black font-semibold truncate flex-1">{selectedParty || "Party Details"}</DrawerTitle>
            {selectedParty && (
              <Button variant="outline" size="sm" onClick={handleShare} className="flex items-center gap-2 ml-2">
                <Share2 className="w-4 h-4" /> Share PDF
              </Button>
            )}
            <DrawerClose asChild>
              <button className="text-gray-400 hover:text-gray-600 text-2xl ml-4">&times;</button>
            </DrawerClose>
          </DrawerHeader>
          <div className="px-2 pb-4">
            {monthDrilldown ? (
              <>
                <div className="flex items-center mb-2">
                  <Button variant="ghost" className="mr-2 text-gray-500 hover:text-gray-700 text-lg px-2 py-1" onClick={() => setMonthDrilldown(null)}>&larr; Back</Button>
                  <span className="font-semibold text-base text-black">{formatMonth(monthDrilldown)}</span>
                </div>
                <div className="mb-2 text-right text-sm text-gray-500">
                  Total Pending: <span className="font-bold text-black">{formatCurrency(invoicesForMonth.reduce((sum, inv) => sum + inv.pending_amount, 0))}</span>
                </div>
                <div className="overflow-auto max-h-[60vh] custom-scrollbar mb-4">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
                      <tr>
                        <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Ref</th>
                        <th className="px-3 py-3 text-right text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending</th>
                        <th className="px-2 py-3 text-center text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Del</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {invoicesForMonth.map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">{inv.transaction_date ? new Date(inv.transaction_date).toLocaleDateString("en-GB") : ""}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 max-w-[100px] truncate" title={inv.reference_number}>{inv.reference_number}</td>
                          <td className="px-3 py-3 text-right text-sm font-bold text-gray-900 whitespace-nowrap">{formatCurrency(inv.pending_amount)}</td>
                          <td className="px-2 py-3 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteInvoiceById(inv.id)}
                              disabled={isLoadingDetails}
                              title="Delete invoice"
                              className="text-red-500 hover:bg-red-50 hover:text-red-700 h-8 w-8"
                            >
                              <Trash className="w-4 h-4" />
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
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-semibold flex items-center justify-center gap-2"
                  onClick={deleteInvoicesForMonth}
                  disabled={isLoadingDetails || invoicesForMonth.length === 0}
                >
                  <Trash className="w-5 h-5 mr-1" /> Delete All Invoices
                </Button>
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
                  <div className="overflow-auto max-h-[60vh] custom-scrollbar border rounded-lg shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Month</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Inv</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {monthWise.map((m) => (
                          <tr key={m.month} className="cursor-pointer hover:bg-gray-50/80 transition-colors" onClick={() => setMonthDrilldown(m.month)}>
                            <td className="px-4 py-4 text-sm font-medium text-gray-900">{formatMonth(m.month)}</td>
                            <td className="px-4 py-4 text-right text-sm text-gray-600">{m.count}</td>
                            <td className="px-4 py-4 text-right text-sm font-bold text-gray-900 whitespace-nowrap">{formatCurrency(m.total)}</td>
                          </tr>
                        ))}
                        {monthWise.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
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