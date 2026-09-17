import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/utils/supabase";

interface PendingOrderEntry {
  id: number;
  partyName: string;
  orderNo: number;
  orderDate: string;
  design: string;
  entryRemark: string;
  orderRemark: string;
  price: number;
  shades: Record<string, string>[];
  part: boolean;
  program: string;
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const monthKey = (date: string) => date.slice(0, 7);

const formatMonth = (key: string) =>
  new Date(`${key}-01T00:00:00`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

export default function DateWisePendingOrders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entries, setEntries] = useState<PendingOrderEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<PendingOrderEntry[]>([]);
  const [bhiwandiDate, setBhiwandiDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const rows: Record<string, unknown>[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("design_entries")
          .select(`
            id, design, price, remark, shades, part, program,
            orders!inner(order_no, date, remark, canceled, party_profiles!orders_bill_to_id_fkey(name))
          `)
          .is("bhiwandi_date", null)
          .is("dispatch_date", null)
          .eq("orders.canceled", false)
          .range(from, from + 999);
        if (error) throw error;
        rows.push(...((data || []) as Record<string, unknown>[]));
        if (!data || data.length < 1000) break;
      }

      const formatted = rows.map((row) => {
        const order = row.orders as {
          order_no?: number;
          date?: string;
          remark?: string;
          party_profiles?: { name?: string } | null;
        } | null;
        return {
          id: row.id as number,
          partyName: order?.party_profiles?.name || "Unknown Party",
          orderNo: order?.order_no || 0,
          orderDate: order?.date || "",
          design: (row.design as string) || "-",
          entryRemark: (row.remark as string) || "",
          orderRemark: order?.remark || "",
          price: (row.price as number) || 0,
          shades: (row.shades as Record<string, string>[]) || [],
          part: Boolean(row.part),
          program: (row.program as string) || "",
        };
      }).filter((entry) => entry.orderDate);

      formatted.sort((a, b) =>
        a.orderDate.localeCompare(b.orderDate) || a.orderNo - b.orderNo
      );
      setEntries(formatted);
    } catch (error) {
      console.error("Error loading pending orders:", error);
      toast({
        title: "Error",
        description: `Failed to load pending orders: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const groups = useMemo(() => {
    const byMonth = new Map<string, PendingOrderEntry[]>();
    entries.forEach((entry) => {
      const key = monthKey(entry.orderDate);
      byMonth.set(key, [...(byMonth.get(key) || []), entry]);
    });
    return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [entries]);

  const toggleEntry = (entry: PendingOrderEntry) => {
    setSelectedEntries((current) =>
      current.some((item) => item.id === entry.id)
        ? current.filter((item) => item.id !== entry.id)
        : [...current, entry]
    );
  };

  const cancelEntry = async (entry: PendingOrderEntry) => {
    if (!window.confirm(`Are you sure you want to cancel the entry for ${entry.design} from ${entry.partyName} with order number ${entry.orderNo}?`)) return;
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("design_entries")
        .update({ bhiwandi_date: now, dispatch_date: now, remark: "Entry Cancelled" })
        .eq("id", entry.id);
      if (error) throw error;
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      setSelectedEntries((current) => current.filter((item) => item.id !== entry.id));
      toast({ title: "Success", description: "Entry cancelled successfully." });
    } catch (error) {
      toast({ title: "Error", description: `Failed to cancel entry: ${error instanceof Error ? error.message : "Unknown error"}`, variant: "destructive" });
    }
  };

  const sendToBhiwandi = async () => {
    if (!bhiwandiDate || selectedEntries.length === 0) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("design_entries")
        .update({ bhiwandi_date: new Date(`${bhiwandiDate}T00:00:00`).toISOString() })
        .in("id", selectedEntries.map((entry) => entry.id));
      if (error) throw error;
      const selectedIds = new Set(selectedEntries.map((entry) => entry.id));
      setEntries((current) => current.filter((entry) => !selectedIds.has(entry.id)));
      setSelectedEntries([]);
      toast({ title: "Success", description: `Successfully sent ${selectedIds.size} entries to Bhiwandi.` });
    } catch (error) {
      toast({ title: "Error", description: `Failed to send entries to Bhiwandi: ${error instanceof Error ? error.message : "Unknown error"}`, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-4 md:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Date Wise Pending Orders</h1>
          <p className="text-sm text-muted-foreground">Orders without a Bhiwandi or dispatch date, grouped by order month.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/")}>Home</Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button className="relative bg-yellow-500 hover:bg-yellow-600">Bhiwandi {selectedEntries.length > 0 && <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs text-yellow-700">{selectedEntries.length}</span>}</Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg">
              <SheetHeader><SheetTitle>Bhiwandi List</SheetTitle></SheetHeader>
              <div className="mt-5 space-y-4">
                <div><label className="mb-1 block text-sm font-medium" htmlFor="bhiwandi-date">Bhiwandi date</label><Input id="bhiwandi-date" type="date" value={bhiwandiDate} onChange={(event) => setBhiwandiDate(event.target.value)} /></div>
                <Button className="w-full" disabled={!bhiwandiDate || selectedEntries.length === 0 || saving} onClick={sendToBhiwandi}>{saving ? "Sending..." : "Send to Bhiwandi"}</Button>
                {selectedEntries.length === 0 ? <p className="text-sm text-muted-foreground">No entries selected.</p> : selectedEntries.map((entry) => <div key={entry.id} className="rounded border p-3"><p className="font-semibold">{entry.design} · {entry.partyName}</p><p className="text-sm text-muted-foreground">Order #{entry.orderNo} · {formatDate(entry.orderDate)}</p><Button className="mt-2" size="sm" variant="outline" onClick={() => toggleEntry(entry)}>Remove</Button></div>)}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {loading ? <p className="py-10 text-center text-muted-foreground">Loading pending orders...</p> : groups.length === 0 ? <p className="py-10 text-center text-muted-foreground">No pending orders found.</p> : <Accordion type="multiple" className="rounded-lg border bg-white">
        {groups.map(([key, monthEntries]) => <AccordionItem key={key} value={key} className="px-4 last:border-b-0"><AccordionTrigger className="text-base font-semibold hover:no-underline"><span>{formatMonth(key)} <span className="ml-2 text-sm font-normal text-muted-foreground">({monthEntries.length})</span></span></AccordionTrigger><AccordionContent><div className="space-y-3">{monthEntries.map((entry) => {
          const selected = selectedEntries.some((item) => item.id === entry.id);
          return <article key={entry.id} className={`rounded-lg border p-4 ${selected ? "border-yellow-400 bg-yellow-50" : "bg-white"}`}><div className="flex flex-col justify-between gap-3 md:flex-row"><div className="space-y-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{entry.design}</h2>{entry.part && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Part</span>}</div><p><span className="font-medium">Party:</span> {entry.partyName}</p><p><span className="font-medium">Order No:</span> {entry.orderNo} <span className="ml-3 font-medium">Order Date:</span> {formatDate(entry.orderDate)}</p><p><span className="font-medium">Price:</span> ₹{entry.price}</p>{entry.entryRemark && <p><span className="font-medium">Design Remark:</span> {entry.entryRemark}</p>}{entry.orderRemark && <p><span className="font-medium">Order Remark:</span> {entry.orderRemark}</p>}{entry.program && <p><span className="font-medium">Program:</span> {entry.program}</p>}</div><div className="min-w-48 rounded bg-slate-50 p-3 text-sm"><p className="mb-1 font-medium">Order Shades</p>{entry.shades.length === 0 ? <p className="text-muted-foreground">No shades</p> : entry.shades.map((shade, index) => Object.entries(shade).filter(([, meters]) => meters !== "").map(([name, meters]) => <p key={`${index}-${name}`}>{name}: {meters}m</p>))}</div></div><div className="mt-3 flex gap-2"><Button className={selected ? "bg-red-500 hover:bg-red-600" : "bg-yellow-500 hover:bg-yellow-600"} onClick={() => toggleEntry(entry)}>{selected ? "Remove" : "B"}</Button><Button variant="destructive" onClick={() => cancelEntry(entry)}>Cancel</Button></div></article>;
        })}</div></AccordionContent></AccordionItem>)}
      </Accordion>}
      <Toaster />
    </div>
  );
}
