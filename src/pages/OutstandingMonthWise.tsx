import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Trash } from "lucide-react";
import { Toaster } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/utils/supabase";
import { Share2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [lastUploadDate, setLastUploadDate] = useState<string>("");
  const navigate = useNavigate();

  const fetchRows = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("sales_receivables")
        .select("id,transaction_date,reference_number,party_name,pending_amount")
        .order("transaction_date", { ascending: true });
      if (error) throw error;
      setRows((data as ReceivableRow[]) || []);

      const { data: dateData, error: dateError } = await supabase
        .from("sales_receivables")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (!dateError && dateData?.created_at) {
        setLastUploadDate(new Date(dateData.created_at).toLocaleString("en-GB"));
      }
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

  const grandTotal = useMemo(() => {
    return monthTotals.reduce((sum, m) => sum + m.totalPending, 0);
  }, [monthTotals]);

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

  const handleShare = async () => {
    if (!selectedParty || !selectedMonth) return;
    try {
      setIsLoading(true);
      const pdf = new jsPDF("p", "mm", "a4");
      
      pdf.setFontSize(18);
      pdf.text("Outstanding Statement", 14, 20);
      
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.text(`Party: ${selectedParty}`, 14, 28);
      pdf.text(`Month: ${formatMonth(selectedMonth)}`, 14, 34);
      
      const body: any[] = [];
      const formatCurrencyPDF = (n: number) => formatCurrency(n).replace('₹', 'Rs. ');
      
      invoicesForSelectedParty.forEach(inv => {
        body.push([
          new Date(inv.transaction_date).toLocaleDateString("en-GB"),
          inv.reference_number,
          { content: formatCurrencyPDF(inv.pending_amount), styles: { halign: 'right', fontStyle: 'bold' } }
        ]);
      });
      
      body.push([
        { content: "Total Outstanding:", colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: formatCurrencyPDF(currentPartyTotal), styles: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38], fillColor: [249, 250, 251] } }
      ]);
      
      autoTable(pdf, {
        startY: 40,
        head: [['Date', 'Reference', { content: 'Pending Amount', styles: { halign: 'right' } }]],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [243, 244, 246], textColor: [0,0,0], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 90 },
          2: { cellWidth: 50, halign: 'right' }
        },
        margin: { top: 40, right: 14, bottom: 20, left: 14 }
      });
      
      const pdfBlob = pdf.output("blob");
      const filename = `${selectedParty}_Outstanding_${selectedMonth}.pdf`;
      const file = new File([pdfBlob], filename, { type: "application/pdf" });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Outstanding Report',
            text: `Outstanding report for ${selectedParty} - ${formatMonth(selectedMonth)}`,
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
      setIsLoading(false);
    }
  };

  const currentPartyTotal = useMemo(() => {
    return invoicesForSelectedParty.reduce((sum, inv) => sum + (Number(inv.pending_amount) || 0), 0);
  }, [invoicesForSelectedParty]);

  return (
    <div className="container mx-auto mt-2 sm:mt-4 p-1 sm:p-2 max-w-md bg-white min-h-screen relative">
      <div className="flex items-center justify-between mb-2">
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>Home</Button>
        <h1 className="text-xl sm:text-2xl font-bold text-center flex-1">Outstanding Month Wise</h1>
        <div className="w-[52px]"></div>
      </div>
      
      {lastUploadDate && (
        <div className="mb-2 text-xs text-gray-500 text-center">Last data upload: <span className="font-semibold">{lastUploadDate}</span></div>
      )}
      <div className="mb-3 text-sm text-gray-700 text-center">Grand Total: <span className="font-bold text-lg text-black">{formatCurrency(grandTotal)}</span></div>

      {!selectedMonth && (
        <div className="bg-white rounded-2xl shadow-sm p-2">
          <div className="px-2 py-2 border-b font-semibold text-base text-gray-800">Months (Oldest First)</div>
          <div className="max-h-[70vh] overflow-auto custom-scrollbar border rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-3 py-3 text-right text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Parties</th>
                  <th className="px-3 py-3 text-right text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {monthTotals.map((m) => (
                  <tr key={m.month} className="cursor-pointer hover:bg-gray-50/80 transition-colors" onClick={() => setSelectedMonth(m.month)}>
                    <td className="px-3 py-4 text-sm sm:text-base font-medium text-gray-900 whitespace-nowrap">{formatMonth(m.month)}</td>
                    <td className="px-3 py-4 text-right text-sm sm:text-base text-gray-600">{m.invoiceCount}</td>
                    <td className="px-3 py-4 text-right text-sm sm:text-base font-bold text-gray-900 whitespace-nowrap">{formatCurrency(m.totalPending)}</td>
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
            <Button variant="ghost" size="lg" className="px-4 text-base font-medium" onClick={() => setSelectedMonth(null)}>&larr; Back</Button>
            <div className="font-semibold text-base text-gray-800">{formatMonth(selectedMonth)}</div>
          </div>
          <div className="max-h-[70vh] overflow-auto custom-scrollbar border rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Party</th>
                  <th className="px-3 py-3 text-right text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Bills</th>
                  <th className="px-3 py-3 text-right text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {partiesForSelectedMonth.map((p) => (
                  <tr key={p.partyName} className="cursor-pointer hover:bg-gray-50/80 transition-colors" onClick={() => setSelectedParty(p.partyName)}>
                    <td className="px-3 py-4 text-sm sm:text-base font-medium text-gray-900 max-w-[140px] truncate" title={p.partyName}>{p.partyName}</td>
                    <td className="px-3 py-4 text-right text-sm sm:text-base text-gray-600">{p.invoiceCount}</td>
                    <td className="px-3 py-4 text-right text-sm sm:text-base font-bold text-gray-900 whitespace-nowrap">{formatCurrency(p.totalPending)}</td>
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
            <Button variant="ghost" size="lg" className="px-4 text-base font-medium" onClick={() => setSelectedParty(null)}>&larr; Back</Button>
            <div className="font-semibold text-base text-gray-800">{selectedParty}</div>
            <Button variant="outline" size="sm" onClick={handleShare} className="flex items-center gap-2">
              <Share2 className="w-4 h-4" /> Share PDF
            </Button>
          </div>
          <div className="max-h-[70vh] overflow-auto custom-scrollbar border rounded-lg shadow-sm">
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
                {invoicesForSelectedParty.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap">{new Date(inv.transaction_date).toLocaleDateString("en-GB")}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-[100px] truncate" title={inv.reference_number}>{inv.reference_number}</td>
                    <td className="px-3 py-3 text-right text-sm font-bold text-gray-900 whitespace-nowrap">{formatCurrency(inv.pending_amount)}</td>
                    <td className="px-2 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteInvoiceById(inv.id)}
                        disabled={isLoading}
                        title="Delete invoice"
                        className="text-red-500 hover:bg-red-50 hover:text-red-700 h-8 w-8"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-gray-100/80 font-bold border-t-2 border-gray-200">
                  <td colSpan={2} className="px-3 py-4 text-right text-sm uppercase text-gray-700">Total:</td>
                  <td className="px-3 py-4 text-right text-sm text-red-600">{formatCurrency(currentPartyTotal)}</td>
                  <td></td>
                </tr>
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
