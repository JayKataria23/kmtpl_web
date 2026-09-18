import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
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

const getShadePairs = (shades: Record<string, string>[]) =>
  shades.flatMap((shade) => Object.entries(shade).filter(([, meters]) => meters));

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
  const [isBhiwandiDrawerOpen, setIsBhiwandiDrawerOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [openMonth, setOpenMonth] = useState("");
  const [programEntry, setProgramEntry] = useState<PendingOrderEntry | null>(null);
  const [programInput, setProgramInput] = useState("");
  const [savingProgram, setSavingProgram] = useState(false);

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

  const filteredGroups = useMemo(() => {
    const matchesFilter = (design: string) => {
      const isNumeric = !isNaN(Number(design));
      const isDigital = design.includes("D-") || design.includes("DDBY-");
      const isPrint = (design.includes("-") && /^\d{3,4}$/.test(design.split("-").pop() || ""));

      if (filter === "regular") return !isNumeric && !isDigital && !isPrint;
      if (filter === "print") return isPrint;
      if (filter === "digital") return isDigital;
      if (filter === "designs") return isNumeric;
      return true;
    };

    return groups
      .map(([key, monthEntries]) => [key, monthEntries.filter((entry) => matchesFilter(entry.design))] as const)
      .filter(([, monthEntries]) => monthEntries.length > 0);
  }, [filter, groups]);

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
      setIsBhiwandiDrawerOpen(false);
      toast({ title: "Success", description: `Successfully sent ${selectedIds.size} entries to Bhiwandi.` });
    } catch (error) {
      toast({ title: "Error", description: `Failed to send entries to Bhiwandi: ${error instanceof Error ? error.message : "Unknown error"}`, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openProgramDialog = (entry: PendingOrderEntry) => {
    setProgramEntry(entry);
    setProgramInput(entry.program);
  };

  const saveProgram = async () => {
    if (!programEntry) return;
    setSavingProgram(true);
    try {
      const { error } = await supabase
        .from("design_entries")
        .update({ program: programInput })
        .eq("id", programEntry.id);
      if (error) throw error;
      setEntries((current) => current.map((entry) =>
        entry.id === programEntry.id ? { ...entry, program: programInput } : entry
      ));
      toast({ title: "Success", description: "Program updated." });
      setProgramEntry(null);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update program: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setSavingProgram(false);
    }
  };

  return (
    <div className="container relative mx-auto mt-4 max-w-6xl p-2 sm:p-4">
      <div className="sticky top-0 z-10 mb-4 bg-white p-2 shadow-sm">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <Button onClick={() => navigate("/")} className="w-full sm:w-auto">
            Back to Home
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Date Wise Pending Orders</h1>
            <p className="text-sm text-muted-foreground">Orders without a Bhiwandi or dispatch date, grouped by order month.</p>
          </div>
          <Sheet open={isBhiwandiDrawerOpen} onOpenChange={setIsBhiwandiDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative w-full sm:w-auto">
                Bhiwandi List
                {selectedEntries.length > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-xs text-white">
                    {selectedEntries.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader><SheetTitle>Bhiwandi List</SheetTitle></SheetHeader>
              {selectedEntries.length > 0 && (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700" htmlFor="bhiwandi-date">Bhiwandi Date</label>
                    <Input id="bhiwandi-date" type="date" value={bhiwandiDate} onChange={(event) => setBhiwandiDate(event.target.value)} className="w-full" />
                  </div>
                  <Button className="w-full bg-yellow-500 hover:bg-yellow-600" disabled={!bhiwandiDate || saving} onClick={sendToBhiwandi}>
                    {saving ? "Sending..." : "Send to Bhiwandi"}
                  </Button>
                </div>
              )}
              <div className="mt-4 max-h-[calc(100vh-220px)] space-y-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {selectedEntries.length === 0 ? <p className="text-center text-gray-500">No entries selected</p> : selectedEntries.map((entry) => (
                  <div key={entry.id} className="relative mb-2 rounded-lg border bg-white p-4">
                    <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={() => toggleEntry(entry)} aria-label={`Remove ${entry.design} from Bhiwandi list`}>
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="pr-8 font-medium">{entry.partyName}</div>
                    <div className="mt-1 text-xs text-gray-500">Design: {entry.design}</div>
                    <div className="mt-1 text-xs text-gray-500">Order No: {entry.orderNo}</div>
                    <div className="mt-1 text-xs text-gray-500">Order Date: {formatDate(entry.orderDate)}</div>
                    <div className="mt-1 text-xs text-gray-500">Price: ₹{entry.price}</div>
                    <div className="mt-2">
                      <h4 className="text-xs font-medium">Shades:</h4>
                      <div className="flex flex-wrap gap-2">
                        {getShadePairs(entry.shades).map(([name, meters], index) => (
                          <span key={`${name}-${index}`} className="rounded bg-gray-100 px-2 py-1 text-xs">{name}: {meters}m</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <ToggleGroup
          variant="outline"
          type="single"
          value={filter}
          onValueChange={(value) => {
            if (value) setFilter(value);
            setOpenMonth("");
          }}
          className="mt-2 flex w-full flex-wrap justify-start"
        >
          <ToggleGroupItem value="all" aria-label="Show all designs">ALL</ToggleGroupItem>
          <ToggleGroupItem value="regular" aria-label="Show regular designs">REGULAR</ToggleGroupItem>
          <ToggleGroupItem value="print" aria-label="Show print designs">PRINT</ToggleGroupItem>
          <ToggleGroupItem value="digital" aria-label="Show digital designs">DIGITAL</ToggleGroupItem>
          <ToggleGroupItem value="designs" aria-label="Show numbered designs">DESIGNS</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {loading ? (
        <p className="py-10 text-center text-muted-foreground">Loading pending orders...</p>
      ) : filteredGroups.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No pending orders found for this filter.</p>
      ) : (
        <Accordion type="single" collapsible className="w-full" value={openMonth} onValueChange={setOpenMonth}>
          {filteredGroups.map(([key, monthEntries]) => (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger className="w-full text-lg hover:bg-gray-50 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="text-left font-medium">{formatMonth(key)}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-sm text-gray-500">{monthEntries.length} entries</span>
                </div>
              </AccordionTrigger>
              <AccordionContent><div className="space-y-2">{monthEntries.map((entry) => {
                const selected = selectedEntries.some((item) => item.id === entry.id);
                const shadePairs = getShadePairs(entry.shades);
                return <article key={entry.id} className={`relative mb-2 rounded-lg border p-4 ${selected ? "border-yellow-400 bg-yellow-50" : "bg-white"}`}><div className="flex flex-col gap-4 sm:flex-row"><div className="min-w-0 flex-1"><div className="mb-2"><h2 className="text-base font-bold">{entry.design}</h2><div className="mt-1 flex flex-wrap items-center gap-2"><p className="text-base font-normal">{entry.partyName}</p>{entry.part && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Part</span>}</div></div><div className="space-y-1 text-sm text-gray-600"><p><span className="font-medium">Order No:</span> {entry.orderNo}</p><p><span className="font-medium">Order Date:</span> {formatDate(entry.orderDate)}</p><p><span className="font-medium">Price:</span> ₹{entry.price}</p>{entry.entryRemark && <p><span className="font-medium">Remark:</span> {entry.entryRemark}</p>}{entry.orderRemark && <p><span className="font-medium">Order Remark:</span> {entry.orderRemark}</p>}{entry.program && <p className="text-blue-600"><span className="font-medium">Program:</span> {entry.program}</p>}</div></div><div className="rounded-lg bg-gray-50 p-2 sm:w-48"><h4 className="mb-2 text-sm font-medium">Shades</h4><div className="space-y-1">{shadePairs.length > 0 ? shadePairs.map(([name, meters], index) => <div key={`${name}-${index}`} className="text-sm"><span className="font-medium">{name}:</span> {meters}m</div>) : <span className="text-sm text-gray-400">No shades</span>}</div></div></div><div className="mt-4 flex flex-wrap justify-end gap-2"><Button variant="outline" size="sm" onClick={() => openProgramDialog(entry)}>Program</Button><Button className={selected ? "bg-red-500 hover:bg-red-600" : "bg-yellow-500 hover:bg-yellow-600"} size="sm" onClick={() => toggleEntry(entry)}>{selected ? "Remove from Bhiwandi" : "Add to Bhiwandi"}</Button><Button variant="destructive" size="sm" onClick={() => cancelEntry(entry)}>Cancel</Button></div></article>;
              })}</div></AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
      <Dialog open={programEntry !== null} onOpenChange={(open) => !open && setProgramEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Program Entry No.</DialogTitle>
            <DialogDescription>Enter or update the program entry number for {programEntry?.design}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Enter program entry no." value={programInput} onChange={(event) => setProgramInput(event.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setProgramEntry(null)}>Cancel</Button>
              <Button onClick={saveProgram} disabled={savingProgram}>{savingProgram ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  );
}
