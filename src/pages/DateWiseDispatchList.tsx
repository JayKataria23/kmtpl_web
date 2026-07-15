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
import { Printer, X, Calendar as CalendarIcon } from "lucide-react";

interface DispatchEntryResponse {
  id: number;
  title: string;
  price: string;
  design_remark: string;
  shades: { [key: string]: string }[];
  dispatch_date: string;
  order_no: number;
  bill_to_party: string;
  ship_to_party: string;
  broker: string;
  transport: string;
  part: boolean;
  bhiwandi_date: string | null;
  order_date: string;
}

interface DateGroup {
  dispatch_date: string;
  entries: DispatchEntryResponse[];
  total_entries: number;
  total_meters: number;
}

const DateWiseDispatchList = () => {
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
  const [entriesCacheByDate, setEntriesCacheByDate] = useState<Record<string, DispatchEntryResponse[]>>({});
  const [loadingDates, setLoadingDates] = useState<Record<string, boolean>>({});
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchDispatchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("design_entries")
        .select(`id, dispatch_date, shades`)
        .not("dispatch_date", "is", null)
        .order("dispatch_date", { ascending: false });

      if (error) throw error;
      
      const groupsMap = new Map<string, DateGroup>();

      (data || []).forEach((entry: any) => {
        const dateStr = entry.dispatch_date;
        if (!groupsMap.has(dateStr)) {
          groupsMap.set(dateStr, { dispatch_date: dateStr, entries: [], total_entries: 0, total_meters: 0 });
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
        return new Date(b.dispatch_date).getTime() - new Date(a.dispatch_date).getTime();
      });

      setDateGroups(sortedGroups);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch dispatch dates: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  const fetchDateEntries = async (dateStr: string) => {
    try {
      setLoadingDates((prev) => ({ ...prev, [dateStr]: true }));
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
            bill_to:party_profiles!orders_bill_to_id_fkey(name),
            ship_to:party_profiles!orders_ship_to_id_fkey(name),
            brokers!orders_broker_id_fkey(name),
            transport_profiles!orders_transport_id_fkey(name)
          )
        `)
        .eq("dispatch_date", dateStr);

      if (error) throw error;
      
      const formattedData: DispatchEntryResponse[] = (data || []).map((row: any) => ({
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
      }));
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
    fetchDispatchEntries();
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatLongDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: 'short',
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleRemoveDispatchDate = async (id: number, dateStr: string) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this entry from dispatch list?"
      )
    ) {
      return;
    }

    try {
      setEntriesCacheByDate((prev) => ({
        ...prev,
        [dateStr]: (prev[dateStr] || []).filter(e => e.id !== id)
      }));
      setDateGroups(prev => prev.map(g => g.dispatch_date === dateStr ? { ...g, total_entries: Math.max(0, g.total_entries - 1) } : g).filter(g => g.total_entries > 0));

      const { error } = await supabase
        .from("design_entries")
        .update({ dispatch_date: null })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Entry removed from dispatch list",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to remove entry: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
      // Rollback on error
      fetchDateEntries(dateStr);
      fetchDispatchEntries();
    }
  };

  // Add a helper to group and format shades like pdf-generator.ts
  const formatShadesGrouped = (shades: { [key: string]: string }[]): string => {
    const meterGroups = new Map<string, { shadeNames: string[] }>();
    shades.forEach((shadeObj) => {
      const shadeName = Object.keys(shadeObj)[0];
      const meterValue = shadeObj[shadeName];
      if (!meterValue) return;
      if (!meterGroups.has(meterValue)) {
        meterGroups.set(meterValue, { shadeNames: [shadeName] });
      } else {
        meterGroups.get(meterValue)!.shadeNames.push(shadeName);
      }
    });
    return Array.from(meterGroups.entries())
      .map(
        ([meters, { shadeNames }]) => `
          <span style="display:inline-block; margin:2px 8px 2px 0; padding:6px 10px; background:#f5f7fa; border-radius:12px; border:1px solid #d1d5db; min-width:70px; text-align:center; font-size:0.98em; vertical-align:middle;">
            <div style="font-weight:600; color:#222;">${shadeNames.join(", ")}</div>
            <div style="font-size:0.97em; color:#444;">${meters} mtr</div>
          </span>
        `
      )
      .join("");
  };

  const handlePrintDateClick = async (group: DateGroup) => {
    let entries = entriesCacheByDate[group.dispatch_date];
    if (!entries) {
      entries = await fetchDateEntries(group.dispatch_date) || [];
    }
    handlePrintDate({ ...group, entries });
  };

  const handlePrintDate = (group: DateGroup) => {
    let content = `
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
        <h1 style="font-size:2.2em; margin-bottom:0; font-weight:800; letter-spacing:1px;">Daily Dispatch Report</h1>
        <h2 style="margin:0; font-size:1.4em; font-weight:700; color:#1a237e;">${formatLongDate(group.dispatch_date)}</h2>
        <div style="font-size:1em; color:#555; margin-bottom:10px;">Printed on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
      </div>
    `;

    content += `
      <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:1em; table-layout:fixed;">
        <colgroup>
          <col style="width: 12%" />
          <col style="width: 22%" />
          <col style="width: 15%" />
          <col style="width: 41%" />
          <col style="width: 10%" />
        </colgroup>
        <thead>
          <tr style="background:#f0f4fa;">
            <th style="border:1px solid #e0e0e0; padding:10px 6px; font-size:1.05em; font-weight:700; text-align:center;">Order No</th>
            <th style="border:1px solid #e0e0e0; padding:10px 6px; font-size:1.05em; font-weight:700; text-align:center;">Bill To Party</th>
            <th style="border:1px solid #e0e0e0; padding:10px 6px; font-size:1.05em; font-weight:700; text-align:center;">Design</th>
            <th style="border:1px solid #e0e0e0; padding:10px 6px; font-size:1.05em; font-weight:700; text-align:center;">Shades</th>
            <th style="border:1px solid #e0e0e0; padding:10px 6px; font-size:1.05em; font-weight:700; text-align:center;">Price</th>
          </tr>
        </thead>
        <tbody>
    `;

    group.entries.forEach((entry, eIdx) => {
      content += `
        <tr style="background:${eIdx % 2 === 0 ? '#fff' : '#f7fafd'}; vertical-align:middle;">
          <td style="border:1px solid #e0e0e0; padding:10px 6px; text-align:center; font-size:1.02em;">${entry.order_no}</td>
          <td style="border:1px solid #e0e0e0; padding:10px 6px; font-size:1.02em;">${entry.bill_to_party}</td>
          <td style="border:1px solid #e0e0e0; padding:10px 6px; text-align:center; font-size:1.02em;">${entry.title}</td>
          <td style="border:1px solid #e0e0e0; padding:10px 6px; font-size:1.02em;">${formatShadesGrouped(entry.shades) || '-'}</td>
          <td style="border:1px solid #e0e0e0; padding:10px 6px; text-align:center; font-size:1.02em;">${entry.price}</td>
        </tr>
      `;
    });

    content += `
        </tbody>
      </table>
      <div style="margin-top: 18px; border-top: 1px solid #ddd; padding-top: 10px;">
        <p style="font-size:1.05em;"><strong>Total Entries:</strong> ${group.total_entries}</p>
        <p style="font-size:1.05em;"><strong>Total Meters:</strong> ${group.total_meters.toFixed(2)}m</p>
      </div>
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
          <title>Daily Dispatch List - ${group.dispatch_date}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
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
    <div className="container mx-auto max-w-4xl mt-10 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <Button onClick={() => navigate("/")} variant="outline" className="w-full sm:w-auto">
          Back to Home
        </Button>
        <h1 className="text-3xl font-bold text-center flex-1">Date Wise Dispatch List</h1>
      </div>
      
      <div className="border-b mb-6" />
      <div className="mt-6">
        <Accordion
          type="single"
          collapsible
          className="w-full"
          value={openAccordion as string | undefined}
          onValueChange={(val) => {
            setOpenAccordion(val);
            if (val) {
              const index = Number(val.replace("date-", ""));
              const dateStr = dateGroups[index]?.dispatch_date;
              if (dateStr && !entriesCacheByDate[dateStr] && !loadingDates[dateStr]) {
                fetchDateEntries(dateStr);
              }
            }
          }}
        >
          {dateGroups.length === 0 ? (
            <div className="text-center text-gray-500 py-12">No dispatches found.</div>
          ) : (
            dateGroups.map((group, dateIndex) => (
              <AccordionItem key={dateIndex} value={`date-${dateIndex}`} className="rounded-lg border mb-4 shadow-sm bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <AccordionTrigger className="text-lg flex items-center gap-3 w-full font-semibold border-none hover:no-underline py-0">
                    <div className="flex items-center gap-3 text-left">
                      <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
                        <CalendarIcon className="h-5 w-5 text-indigo-600" />
                      </div>
                      <span className="text-gray-900">{formatLongDate(group.dispatch_date)}</span>
                    </div>
                    <div className="ml-auto mr-4 flex items-center gap-2">
                      <span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full">
                        {group.total_meters.toFixed(2)}m
                      </span>
                    </div>
                  </AccordionTrigger>
                  <Button 
                    size="icon" 
                    variant="outline"
                    className="flex-shrink-0 bg-white shadow-sm hover:bg-gray-50 text-gray-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrintDateClick(group);
                    }}
                    title="Print Daily Dispatch"
                  >
                    <Printer size={18} />
                  </Button>
                </div>
                <AccordionContent className="p-4 bg-gray-50 border-t">
                  {loadingDates[group.dispatch_date] ? (
                    <div className="text-center text-gray-400 py-4">Loading entries...</div>
                  ) : ((entriesCacheByDate[group.dispatch_date] || []).length === 0) ? (
                    <div className="text-center text-gray-400 py-4">No entries for this date.</div>
                  ) : (
                    <div className="space-y-4">
                      {(entriesCacheByDate[group.dispatch_date] || []).map((entry) => (
                        <div
                          key={entry.id}
                          className="flex flex-col lg:flex-row gap-4 p-4 border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow relative pr-12"
                        >
                          {/* Column 1: Core Details */}
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-bold text-gray-900 leading-tight">
                                  <span className="text-indigo-600 mr-2">[{entry.title}]</span>
                                  {entry.bill_to_party}
                                </h3>
                                {entry.part && (
                                  <span className="shrink-0 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded border border-amber-200 uppercase tracking-wider">
                                    Part Order
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">Order #{entry.order_no}</span>
                                <span className="font-semibold text-gray-700 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">₹{entry.price}/m</span>
                              </div>
                            </div>
                          </div>

                          {/* Column 2: Dates & Delivery */}
                          <div className="flex-[0.8] min-w-[180px] flex flex-col justify-center gap-1.5 text-xs text-gray-600 lg:border-l lg:border-gray-100 lg:pl-5">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-400 uppercase tracking-wider text-[10px]">Order Date</span>
                              <span className="font-semibold text-gray-800">{entry.order_date ? formatDate(entry.order_date) : "-"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-400 uppercase tracking-wider text-[10px]">Bhiwandi Date</span>
                              <span className="font-semibold text-gray-800">{entry.bhiwandi_date ? formatDate(entry.bhiwandi_date) : "-"}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-gray-100 pt-1.5 mt-1.5">
                              <span className="font-medium text-gray-400 uppercase tracking-wider text-[10px]">Ship To</span>
                              <span className="font-semibold text-gray-800 truncate max-w-[120px]" title={entry.ship_to_party}>{entry.ship_to_party}</span>
                            </div>
                          </div>

                          {/* Column 3: Shades & Remarks */}
                          <div className="flex-[1.2] min-w-[200px] lg:border-l lg:border-gray-100 lg:pl-5">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2 block">Shades Breakdown</span>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {entry.shades && entry.shades.length > 0 ? (
                                entry.shades.map((shade, idx) => {
                                  const shadeName = Object.keys(shade)[0];
                                  const shadeValue = shade[shadeName];
                                  if (!shadeValue) return null;
                                  return (
                                    <span
                                      key={idx}
                                      className="bg-gray-50 text-gray-700 border border-gray-200 px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1"
                                    >
                                      {shadeName}: <span className="text-blue-600">{shadeValue}m</span>
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-gray-400 text-xs italic">No shades</span>
                              )}
                            </div>
                            {entry.design_remark && (
                              <div className="text-xs text-gray-500 bg-gray-50 p-1.5 rounded">
                                <span className="font-semibold text-gray-600">Remark:</span> {entry.design_remark}
                              </div>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-3 right-3 h-8 w-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            onClick={() => handleRemoveDispatchDate(entry.id, group.dispatch_date)}
                            title="Remove from Dispatch"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))
          )}
        </Accordion>
      </div>
      {/* Hidden iframe for printing */}
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

export default DateWiseDispatchList;
