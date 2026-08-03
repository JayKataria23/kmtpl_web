import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import supabase from "@/utils/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Toaster } from "@/components/ui";
import { Printer, X, Calendar as CalendarIcon, ArrowLeft } from "lucide-react";

interface BhiwandiEntryResponse {
  id: number;
  title: string;
  price: string;
  design_remark: string;
  shades: { [key: string]: string }[];
  dispatch_date: string | null;
  order_no: number;
  bill_to_party: string;
  ship_to_party: string;
  broker: string;
  transport: string;
  part: boolean;
  bhiwandi_date: string;
  order_date: string;
}

interface DateGroup {
  bhiwandi_date: string;
  entries: BhiwandiEntryResponse[];
  total_entries: number;
  total_meters: number;
}

const DateBhiwandiList = () => {
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
  const [entriesCacheByDate, setEntriesCacheByDate] = useState<Record<string, BhiwandiEntryResponse[]>>({});
  const [loadingDates, setLoadingDates] = useState<Record<string, boolean>>({});
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const getBhiwandiDateKey = (dateString: string): string => {
    const date = new Date(dateString);
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    return formatter.format(date);
  };

  const getNextDateKey = (dateKey: string): string => {
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + 1);

    return date.toISOString().split("T")[0];
  };

  const fetchBhiwandiEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("design_entries")
        .select(`id, bhiwandi_date, shades, orders!inner(canceled)`)
        .not("bhiwandi_date", "is", null)
        .is("dispatch_date", null)
        .eq("orders.canceled", false)
        .order("bhiwandi_date", { ascending: false });

      if (error) throw error;
      
      const groupsMap = new Map<string, DateGroup>();

      (data || []).forEach((entry: any) => {
        const dateStr = getBhiwandiDateKey(entry.bhiwandi_date);
        if (!groupsMap.has(dateStr)) {
          groupsMap.set(dateStr, { bhiwandi_date: dateStr, entries: [], total_entries: 0, total_meters: 0 });
        }
        const group = groupsMap.get(dateStr)!;
        group.total_entries++;

        let entryMeters = 0;
        if (entry.shades) {
          entry.shades.forEach((shade: any) => {
            const value = Object.values(shade)[0] as string;
            entryMeters += value ? parseFloat(value) : 0;
          });
        }
        group.total_meters += entryMeters;
      });

      const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => {
        return new Date(b.bhiwandi_date).getTime() - new Date(a.bhiwandi_date).getTime();
      });

      setDateGroups(sortedGroups);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch bhiwandi dates: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  const fetchDateEntries = async (dateStr: string) => {
    try {
      setLoadingDates((prev) => ({ ...prev, [dateStr]: true }));
      const nextDateStr = getNextDateKey(dateStr);
      const { data, error } = await supabase
        .from("design_entries")
        .select(`
          id,
          price,
          remark,
          shades,
          design,
          dispatch_date,
          bhiwandi_date,
          part,
          orders!inner(
            order_no,
            date,
            canceled,
            bill_to:party_profiles!orders_bill_to_id_fkey(name),
            ship_to:party_profiles!orders_ship_to_id_fkey(name),
            brokers!orders_broker_id_fkey(name),
            transport_profiles!orders_transport_id_fkey(name)
          )
        `)
        .gte("bhiwandi_date", dateStr)
        .lt("bhiwandi_date", nextDateStr)
        .is("dispatch_date", null)
        .eq("orders.canceled", false);

      if (error) throw error;
      
      const formattedData: BhiwandiEntryResponse[] = sortEntriesByPartyAndOrder((data || []).map((row: any) => ({
        id: row.id,
        title: row.design,
        price: row.price?.toString() || "0",
        design_remark: row.remark || "",
        shades: row.shades || [],
        dispatch_date: row.dispatch_date,
        order_no: row.orders?.order_no || 0,
        bill_to_party: row.orders?.bill_to?.name || "Unknown Party",
        ship_to_party: row.orders?.ship_to?.name || "Unknown Party",
        broker: row.orders?.brokers?.name || "N/A",
        transport: row.orders?.transport_profiles?.name || "N/A",
        part: row.part || false,
        bhiwandi_date: row.bhiwandi_date,
        order_date: row.orders?.date
      })));
      setEntriesCacheByDate((prev) => ({ ...prev, [dateStr]: formattedData }));
      return formattedData;
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch entries: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
      return [];
    } finally {
      setLoadingDates((prev) => ({ ...prev, [dateStr]: false }));
    }
  };

  useEffect(() => {
    fetchBhiwandiEntries();
  }, []);

  const getISTDate = (): Date => {
    const now = new Date();
    return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  };

  const formatLongDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      weekday: 'short',
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  };

  const formatPrintedAtIST = (): string => {
    return new Date().toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
      timeZoneName: "short",
    });
  };

  const sortEntriesByPartyAndOrder = (entries: BhiwandiEntryResponse[]): BhiwandiEntryResponse[] => {
    return [...entries].sort((a, b) => {
      const partyCompare = a.bill_to_party.localeCompare(b.bill_to_party, undefined, { sensitivity: "base" });
      if (partyCompare !== 0) return partyCompare;

      const orderCompare = a.order_no - b.order_no;
      if (orderCompare !== 0) return orderCompare;

      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    });
  };

  const groupEntriesByOrder = (entries: BhiwandiEntryResponse[]): BhiwandiEntryResponse[][] => {
    const sorted = sortEntriesByPartyAndOrder(entries);
    const groups: BhiwandiEntryResponse[][] = [];

    sorted.forEach((entry) => {
      const lastGroup = groups[groups.length - 1];
      if (
        lastGroup &&
        lastGroup[0].order_no === entry.order_no &&
        lastGroup[0].bill_to_party.trim().toLowerCase() === entry.bill_to_party.trim().toLowerCase()
      ) {
        lastGroup.push(entry);
      } else {
        groups.push([entry]);
      }
    });

    return groups;
  };

  const getGroupedShades = (shades: { [key: string]: string }[]) => {
    const formattedShades: { meters: string; keys: string[] }[] = [];
    (shades || []).forEach((shadeObj) => {
      const shadeName = Object.keys(shadeObj)[0];
      const shadeValue = shadeObj[shadeName];
      if (shadeValue) {
        const existing = formattedShades.find((g) => g.meters === shadeValue);
        if (existing) {
          existing.keys.push(shadeName);
        } else {
          formattedShades.push({ meters: shadeValue, keys: [shadeName] });
        }
      }
    });
    return formattedShades;
  };

  const handleCancelEntry = async (id: number, dateStr: string) => {
    if (
      !window.confirm(
        "Are you sure you want to cancel this entry?"
      )
    ) {
      return;
    }

    try {
      setEntriesCacheByDate((prev) => ({
        ...prev,
        [dateStr]: (prev[dateStr] || []).filter(e => e.id !== id)
      }));
      setDateGroups(prev => prev.map(g => g.bhiwandi_date === dateStr ? { ...g, total_entries: Math.max(0, g.total_entries - 1) } : g).filter(g => g.total_entries > 0));

      const today = getISTDate().toISOString().split("T")[0];
      const { error } = await supabase
        .from("design_entries")
        .update({ dispatch_date: today, remark: "Entry Cancelled" })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Entry cancelled successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to cancel entry: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  const formatShadesPrint = (shades: { [key: string]: string }[]): string => {
    const formattedShades = getGroupedShades(shades);
    if (formattedShades.length === 0) return '<span style="color:#64748b; font-style:italic;">No shades</span>';

    return `
      <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
        ${formattedShades
          .map(
            (g) => `
            <div style="display:inline-block; border-radius:4px; text-align:center; background:#ffffff; overflow:hidden;">
              <div style="font-weight:900; font-size:12px; color:#000000; padding:2px 8px; border-bottom:1.5px solid #000000; background:#f8fafc;">${g.keys.join(" - ")}</div>
              <div style="font-weight:900; font-size:12px; color:#1e40af; padding:2px 8px; background:#ffffff;">${g.meters} mtr</div>
            </div>
          `
          )
          .join("")}
      </div>
    `;
  };

  const handlePrintDateClick = async (group: DateGroup) => {
    let entries = entriesCacheByDate[group.bhiwandi_date];
    if (!entries) {
      entries = await fetchDateEntries(group.bhiwandi_date) || [];
    }
    handlePrintDate({ ...group, entries });
  };

  const handlePrintDate = (group: DateGroup) => {
    const orderGroups = groupEntriesByOrder(group.entries);
    let totalMetersAll = 0;
    let globalOrderIndex = 1;
    
    let tableRowsHtml = "";

    orderGroups.forEach((entriesForOrder, groupIdx) => {
      const firstEntry = entriesForOrder[0];
      const orderRowSpan = entriesForOrder.length;
      const groupBg = groupIdx % 2 === 0 ? "#ffffff" : "#f8fafc";

      entriesForOrder.forEach((entry, indexWithinOrder) => {
        let entryMeters = 0;
        if (entry.shades) {
          entry.shades.forEach((s) => {
            const v = Object.values(s)[0];
            entryMeters += v ? parseFloat(v) : 0;
          });
        }
        totalMetersAll += entryMeters;
        
        const partBadge = entry.part
          ? `<span style="background:#d97706; color:#ffffff; font-size:11px; font-weight:900; padding:2px 6px; border-radius:3px; border:1px solid #92400e;">PART</span>`
          : `<span style="color:#94a3b8;">-</span>`;

        const isLastInOrderGroup = indexWithinOrder === orderRowSpan - 1;
        const borderBottomStyle = isLastInOrderGroup ? "border-bottom:2.5px solid #000000;" : "border-bottom:1px solid #cbd5e1;";

        const orderNoAndPartyCell = indexWithinOrder === 0 ? `
          <td rowspan="${orderRowSpan}" style="border:1.5px solid #000000; padding:8px 4px; text-align:center; font-weight:bold; font-size:13px; color:#000000; vertical-align:top; background:${groupBg}; border-bottom:2.5px solid #000000;">${globalOrderIndex++}</td>
          <td rowspan="${orderRowSpan}" style="border:1.5px solid #000000; padding:8px 6px; font-size:13px; color:#000000; vertical-align:top; background:${groupBg}; border-bottom:2.5px solid #000000;">
            <div style="font-weight:900; font-size:13px; color:#1e1b4b; margin-bottom:3px;">ORDER #${firstEntry.order_no}</div>
            <div style="font-weight:800; font-size:13.5px; color:#000000;">${firstEntry.bill_to_party}</div>
            ${firstEntry.ship_to_party && firstEntry.ship_to_party !== firstEntry.bill_to_party ? `<div style="font-size:11.5px; color:#334155; margin-top:2px;">Ship: ${firstEntry.ship_to_party}</div>` : ""}
          </td>
        ` : "";

        tableRowsHtml += `
          <tr style="background:${groupBg}; ${borderBottomStyle}">
            ${orderNoAndPartyCell}
            <td style="border:1.5px solid #000000; padding:3px 6px; font-size:13px; font-weight:800; color:#1e40af;">${entry.title}</td>
            <td style="border:1.5px solid #000000; padding:3px 3px; text-align:center; font-size:13px;">${partBadge}</td>
            <td style="border:1.5px solid #000000; padding:3px 3px; font-size:13px; color:#000000;">
              ${formatShadesPrint(entry.shades)}
              ${entry.design_remark ? `<div style="font-size:11px; color:#1e293b; margin-top:4px; font-style:italic;"><strong>Remark:</strong> ${entry.design_remark}</div>` : ""}
            </td>
            <td style="border:1.5px solid #000000; padding:3px 3px; text-align:center; font-weight:bold; font-size:13px; color:#000000;">₹${entry.price}</td>
          </tr>
        `;
      });
    });

    const content = `
      <div style="text-align: center; margin-bottom: 16px; border-bottom: 3px solid #000000; padding-bottom: 12px;">
        <h1 style="font-size:1.7em; margin:0 0 4px; font-weight:900; letter-spacing:0.5px; text-transform:uppercase; color:#000000;">BHIWANDI DISPATCH LIST</h1>
        <h2 style="margin:0 0 6px; font-size:1.15em; font-weight:800; color:#1e40af;">${formatLongDate(group.bhiwandi_date)}</h2>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; font-size:12px; font-weight:bold; color:#000000; background:#f1f5f9; padding:8px 12px; border:2px solid #000000; border-radius:6px;">
          <span>TOTAL ORDERS: ${orderGroups.length}</span>
          <span>TOTAL ITEMS: ${group.entries.length}</span>
          <span>TOTAL METERS: ${totalMetersAll.toFixed(2)} mtr</span>
          <span>PRINTED: ${formatPrintedAtIST()}</span>
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:13px; font-family: Arial, sans-serif; table-layout:fixed; border:2.5px solid #000000;">
        <colgroup>
          <col style="width: 5%" />
          <col style="width: 25%" />
          <col style="width: 17%" />
          <col style="width: 8%" />
          <col style="width: 35%" />
          <col style="width: 10%" />
        </colgroup>
        <thead>
          <tr style="background:#0f172a; color:#ffffff;">
            <th style="border:1.5px solid #000000; padding:10px 4px; font-size:12px; font-weight:900; text-align:center; text-transform:uppercase;">SR.</th>
            <th style="border:1.5px solid #000000; padding:10px 6px; font-size:12px; font-weight:900; text-align:left; text-transform:uppercase;">ORDER # & PARTY NAME</th>
            <th style="border:1.5px solid #000000; padding:10px 6px; font-size:12px; font-weight:900; text-align:left; text-transform:uppercase;">DESIGN</th>
            <th style="border:1.5px solid #000000; padding:10px 4px; font-size:12px; font-weight:900; text-align:center; text-transform:uppercase;">PART</th>
            <th style="border:1.5px solid #000000; padding:10px 6px; font-size:12px; font-weight:900; text-align:left; text-transform:uppercase;">SHADES & METERS</th>
            <th style="border:1.5px solid #000000; padding:10px 4px; font-size:12px; font-weight:900; text-align:center; text-transform:uppercase;">PRICE</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
        <tfoot>
          <tr style="background:#e2e8f0; border-top:2.5px solid #000000; font-weight:900; font-size:13px; color:#000000;">
            <td colspan="4" style="border:1.5px solid #000000; padding:10px; text-align:right; text-transform:uppercase;">Grand Totals:</td>
            <td style="border:1.5px solid #000000; padding:10px; font-weight:900; color:#1e40af;">${totalMetersAll.toFixed(2)} mtr</td>
            <td style="border:1.5px solid #000000; padding:10px; text-align:center;">${group.entries.length} Items</td>
          </tr>
        </tfoot>
      </table>
    `;

    const iframe = printFrameRef.current;
    if (!iframe) return;
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) return;
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bhiwandi List - ${group.bhiwandi_date}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
            @media print { body { margin: 0; padding: 15px; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    iframeDoc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 500);
  };

  return (
    <div className="container mx-auto max-w-6xl mt-8 p-4 sm:p-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 bg-slate-900 text-white p-5 rounded-2xl border-2 border-slate-800 shadow-lg">
        <Button 
          onClick={() => navigate("/")} 
          variant="outline" 
          className="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-white border-slate-600 hover:text-white font-semibold"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
        </Button>
        <div className="text-center md:text-left flex-1 md:ml-4">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Date Wise Bhiwandi List</h1>
          <p className="text-xs md:text-sm text-slate-300 mt-1 font-medium">All Bhiwandi dispatch items clubbed by Order Number & Party Name per date</p>
        </div>
        {dateGroups.length > 0 && (
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 shrink-0">
            <div className="bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-200 shadow-2xs">
              Total Entries: <span className="text-amber-400 font-extrabold text-sm ml-1">{dateGroups.reduce((acc, g) => acc + g.total_entries, 0)}</span>
            </div>
            <div className="bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-200 shadow-2xs">
              Total Meters: <span className="text-cyan-400 font-extrabold text-sm ml-1">{dateGroups.reduce((acc, g) => acc + g.total_meters, 0).toFixed(2)}m</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Main Content Accordion */}
      <div className="mt-4">
        <Accordion
          type="single"
          collapsible
          className="w-full space-y-4"
          value={openAccordion as string | undefined}
          onValueChange={(val) => {
            setOpenAccordion(val);
            if (val) {
              const index = Number(val.replace("date-", ""));
              const dateStr = dateGroups[index]?.bhiwandi_date;
              if (dateStr && !entriesCacheByDate[dateStr] && !loadingDates[dateStr]) {
                fetchDateEntries(dateStr);
              }
            }
          }}
        >
          {dateGroups.length === 0 ? (
            <div className="text-center text-slate-500 py-16 bg-white border-2 border-slate-300 rounded-2xl shadow-sm font-semibold">
              No bhiwandi entries found.
            </div>
          ) : (
            dateGroups.map((group, dateIndex) => (
              <AccordionItem 
                key={dateIndex} 
                value={`date-${dateIndex}`} 
                className="rounded-xl border-2 border-slate-700 shadow-md bg-white overflow-hidden transition-all"
              >
                <div className="flex items-center justify-between px-5 py-3.5 bg-slate-100 hover:bg-slate-200/80 transition-colors border-b-2 border-slate-300">
                  <AccordionTrigger className="text-lg flex items-center gap-3 w-full font-extrabold border-none hover:no-underline py-0 text-slate-900">
                    <div className="flex items-center gap-3 text-left">
                      <div className="bg-slate-900 p-2 rounded-lg text-white shadow-xs flex items-center justify-center">
                        <CalendarIcon className="h-5 w-5 text-indigo-300" />
                      </div>
                      <span className="text-slate-900 font-black text-lg">{formatLongDate(group.bhiwandi_date)}</span>
                    </div>
                    <div className="ml-auto mr-4 flex items-center gap-2">
                      <span className="text-xs font-black bg-indigo-900 text-indigo-100 px-3 py-1 rounded-lg border border-indigo-700 shadow-2xs">
                        {group.total_entries} Items • {group.total_meters.toFixed(2)}m
                      </span>
                    </div>
                  </AccordionTrigger>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-shrink-0 bg-slate-900 hover:bg-slate-800 text-white border-2 border-slate-800 shadow-xs font-bold text-xs h-9 px-3 transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrintDateClick(group);
                    }}
                    title="Print Daily Bhiwandi List"
                  >
                    <Printer className="h-4 w-4 mr-1.5" /> Print List
                  </Button>
                </div>

                <AccordionContent className="p-4 sm:p-5 bg-slate-50">
                  {loadingDates[group.bhiwandi_date] ? (
                    <div className="text-center text-slate-500 py-8 font-bold">Loading entries for {formatDate(group.bhiwandi_date)}...</div>
                  ) : ((entriesCacheByDate[group.bhiwandi_date] || []).length === 0) ? (
                    <div className="text-center text-slate-500 py-8 font-bold">No entries found for this date.</div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border-2 border-slate-800 shadow-md bg-white">
                      <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className="bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider">
                            <th className="p-3 text-center border-r border-slate-700 w-12">Sr.</th>
                            <th className="p-3 border-r border-slate-700 w-48">Order # & Party Name</th>
                            <th className="p-3 border-r border-slate-700 w-40">Design</th>
                            <th className="p-3 text-center border-r border-slate-700 w-24">Part</th>
                            <th className="p-3 border-r border-slate-700">Shades Breakdown & Meters</th>
                            <th className="p-3 text-center border-r border-slate-700 w-24">Price (₹/m)</th>
                            <th className="p-3 text-center w-28">Action</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {(() => {
                            const orderGroups = groupEntriesByOrder(entriesCacheByDate[group.bhiwandi_date] || []);
                            let globalOrderIdx = 1;

                            return orderGroups.map((entriesForOrder, groupIdx) => {
                              const firstEntry = entriesForOrder[0];
                              const orderRowSpan = entriesForOrder.length;
                              const currentOrderIdx = globalOrderIdx++;
                              const isEvenGroup = groupIdx % 2 === 0;
                              const groupBgClass = isEvenGroup ? "bg-white" : "bg-slate-50/70";

                              return entriesForOrder.map((entry, indexWithinOrder) => {
                                const entryMeters = (entry.shades || []).reduce((acc, s) => {
                                  const v = Object.values(s)[0];
                                  return acc + (v ? parseFloat(v) : 0);
                                }, 0);

                                const isLastInOrder = indexWithinOrder === orderRowSpan - 1;
                                const borderBottomClass = isLastInOrder 
                                  ? "border-b-2 border-slate-800" 
                                  : "border-b border-slate-200";

                                return (
                                  <tr 
                                    key={entry.id} 
                                    className={`${groupBgClass} hover:bg-amber-50/60 transition-colors ${borderBottomClass}`}
                                  >
                                    {indexWithinOrder === 0 && (
                                      <>
                                        <td 
                                          rowSpan={orderRowSpan} 
                                          className="p-3 text-center font-black text-slate-900 border-r-2 border-slate-700 align-top bg-slate-100/50"
                                        >
                                          {currentOrderIdx}
                                        </td>
                                        <td 
                                          rowSpan={orderRowSpan} 
                                          className="p-3 border-r-2 border-slate-700 align-top bg-slate-100/50"
                                        >
                                          <div className="flex flex-col gap-1 sticky top-2">
                                            <span className="font-black text-indigo-800 text-xs bg-indigo-100 border border-indigo-300 px-2.5 py-0.5 rounded-md w-fit shadow-2xs">
                                              Order #{firstEntry.order_no}
                                            </span>
                                            <span className="font-black text-slate-900 text-base leading-snug">
                                              {firstEntry.bill_to_party}
                                            </span>
                                            {firstEntry.ship_to_party && firstEntry.ship_to_party !== firstEntry.bill_to_party && (
                                              <span className="text-xs text-slate-600 font-semibold">
                                                Ship: {firstEntry.ship_to_party}
                                              </span>
                                            )}
                                            {orderRowSpan > 1 && (
                                              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded w-fit mt-1">
                                                {orderRowSpan} Designs Clubbed
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                      </>
                                    )}

                                    <td className="p-3 border-r border-slate-300 font-extrabold text-blue-700 text-base">
                                      {entry.title}
                                    </td>
                                    <td className="p-3 text-center border-r border-slate-300">
                                      {entry.part ? (
                                        <span className="px-2.5 py-1 bg-amber-500 text-white text-[11px] font-black rounded-md uppercase shadow-xs border border-amber-600">
                                          PART
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 font-medium">-</span>
                                      )}
                                    </td>
                                    <td className="p-3 border-r border-slate-300">
                                      <div className="flex flex-wrap gap-2 mb-1.5">
                                        {getGroupedShades(entry.shades).length > 0 ? (
                                          getGroupedShades(entry.shades).map((shadeGroup, sIdx) => (
                                            <div 
                                              key={sIdx} 
                                              className="inline-flex flex-col text-center border-2 border-slate-800 rounded-md bg-white overflow-hidden shadow-2xs"
                                            >
                                              <div className="bg-slate-100 px-2.5 py-0.5 border-b-2 border-slate-800 text-slate-900 font-black text-xs">
                                                {shadeGroup.keys.join(" - ")}
                                              </div>
                                              <div className="px-2.5 py-0.5 text-blue-700 font-black text-xs bg-white">
                                                {shadeGroup.meters} mtr
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <span className="text-slate-400 text-xs italic">No shades</span>
                                        )}
                                      </div>
                                      <div className="flex items-center justify-between mt-1 text-xs">
                                        {entry.design_remark ? (
                                          <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 italic font-medium">
                                            <span className="font-bold text-slate-900">Remark:</span> {entry.design_remark}
                                          </span>
                                        ) : <span />}
                                        <span className="font-black text-slate-800 ml-auto">
                                          Total: {entryMeters.toFixed(2)}m
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-center border-r border-slate-300 font-extrabold text-slate-900 text-base">
                                      ₹{entry.price}
                                    </td>
                                    <td className="p-3 text-center">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-2 border-red-300 font-bold text-xs h-8 px-2.5 shadow-2xs transition-colors"
                                        onClick={() => handleCancelEntry(entry.id, group.bhiwandi_date)}
                                        title="Cancel Entry"
                                      >
                                        <X className="h-3.5 w-3.5 mr-1" /> Cancel
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              });
                            });
                          })()}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-900 text-white font-extrabold text-xs">
                            <td colSpan={4} className="p-3 text-right uppercase tracking-wider border-r border-slate-700">
                              Grand Total ({entriesCacheByDate[group.bhiwandi_date]?.length || 0} Items):
                            </td>
                            <td className="p-3 border-r border-slate-700 font-black text-amber-300 text-sm">
                              {(entriesCacheByDate[group.bhiwandi_date] || []).reduce((acc, entry) => {
                                const entrySum = (entry.shades || []).reduce((sAcc, s) => {
                                  const val = Object.values(s)[0];
                                  return sAcc + (val ? parseFloat(val) : 0);
                                }, 0);
                                return acc + entrySum;
                              }, 0).toFixed(2)}m Total
                            </td>
                            <td colSpan={2} className="p-3 text-center"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))
          )}
        </Accordion>
      </div>
      <iframe 
        ref={printFrameRef}
        style={{ 
          position: "absolute", 
          height: "0", 
          width: "0", 
          border: "none",
          visibility: "hidden" 
        }}
        title="Print Frame"
      />
      <Toaster />
    </div>
  );
};

export default DateBhiwandiList;
