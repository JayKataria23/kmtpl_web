import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
import { Printer, X } from "lucide-react";

interface DispatchEntry {
  id: number;
  design: string;
  price: string;
  remark: string;
  shades: { [key: string]: string }[];
  dispatch_date: string;
  order_no: number;
  ship_to_party: string;
  broker_name: string;
  transporter_name: string;
  part: boolean;
  bhiwandi_date: string | null;
  order_date: string;
}

interface GroupedByDesign {
  design: string;
  entries: DispatchEntry[];
  total_meters: number;
}

interface PartyGroup {
  party_id: number;
  party_name: string;
  designs: GroupedByDesign[]; // not heavily used since we cache separately, but good for structure
  total_entries: number;
}

const PartyDispatchList = () => {
  const [partyGroups, setPartyGroups] = useState<PartyGroup[]>([]);
  const [designsCacheByParty, setDesignsCacheByParty] = useState<Record<number, GroupedByDesign[]>>({});
  const [loadingParties, setLoadingParties] = useState<Record<number, boolean>>({});
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [openDesignAccordion, setOpenDesignAccordion] = useState<string | null>(
    null
  );
  const [partySearch, setPartySearch] = useState<string>("");
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchDispatchEntries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("design_entries")
        .select(`
          id,
          orders!inner(
            bill_to_id,
            bill_to:party_profiles!orders_bill_to_id_fkey(name)
          )
        `)
        .not("dispatch_date", "is", null);

      if (error) throw error;
      
      const partyData = new Map<number, { name: string; count: number }>();
      (data || []).forEach((row: any) => {
        const pId = row.orders?.bill_to_id;
        const pName = row.orders?.bill_to?.name;
        if (pId && pName) {
          if (!partyData.has(pId)) {
            partyData.set(pId, { name: pName, count: 0 });
          }
          partyData.get(pId)!.count++;
        }
      });

      const summaries: PartyGroup[] = Array.from(partyData.entries())
        .map(([party_id, info]) => ({ party_id, party_name: info.name, total_entries: info.count, designs: [] }))
        .sort((a, b) => a.party_name.localeCompare(b.party_name));

      setPartyGroups(summaries);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch dispatch entries: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchPartyEntries = useCallback(async (partyId: number) => {
    try {
      setLoadingParties((prev) => ({ ...prev, [partyId]: true }));
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
            bill_to_id,
            ship_to:party_profiles!orders_ship_to_id_fkey(name),
            brokers!orders_broker_id_fkey(name),
            transport_profiles!orders_transport_id_fkey(name)
          )
        `)
        .not("dispatch_date", "is", null)
        .eq("orders.bill_to_id", partyId)
        .order("dispatch_date", { ascending: false });

      if (error) throw error;

      const entries: DispatchEntry[] = (data || []).map((row: any) => ({
        id: row.id,
        design: row.design,
        price: row.price?.toString() || "0",
        remark: row.remark || "",
        shades: row.shades || [],
        dispatch_date: row.dispatch_date,
        order_no: row.orders?.order_no || 0,
        ship_to_party: row.orders?.ship_to?.name || "Unknown Party",
        broker_name: row.orders?.brokers?.name || "N/A",
        transporter_name: row.orders?.transport_profiles?.name || "N/A",
        part: row.part || false,
        bhiwandi_date: row.bhiwandi_date,
        order_date: row.orders?.date
      }));

      const designsMap = new Map<string, GroupedByDesign>();
      entries.forEach((entry) => {
        if (!designsMap.has(entry.design)) {
          designsMap.set(entry.design, { design: entry.design, entries: [], total_meters: 0 });
        }
        const group = designsMap.get(entry.design)!;
        let entryMeters = 0;
        if (entry.shades) {
          entry.shades.forEach((shade) => {
            const value = Object.values(shade)[0];
            entryMeters += value ? parseFloat(value) : 0;
          });
        }
        group.total_meters += entryMeters;
        group.entries.push(entry);
      });

      const grouped = Array.from(designsMap.values()).sort((a, b) => a.design.localeCompare(b.design));
      setDesignsCacheByParty((prev) => ({ ...prev, [partyId]: grouped }));
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch entries: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setLoadingParties((prev) => ({ ...prev, [partyId]: false }));
    }
  }, [toast]);

  useEffect(() => {
    fetchDispatchEntries();
  }, [fetchDispatchEntries]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleRemoveDispatchDate = async (id: number, partyId: number) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this entry from dispatch list?"
      )
    ) {
      return;
    }

    try {
      setDesignsCacheByParty((prev) => {
        const currentGroups = prev[partyId] || [];
        const newGroups = currentGroups.map(group => ({
           ...group,
           entries: group.entries.filter(e => e.id !== id)
        })).filter(group => group.entries.length > 0);
        return { ...prev, [partyId]: newGroups };
      });
      setPartyGroups((prev) => prev
        .map((p) => p.party_id === partyId ? { ...p, total_entries: Math.max(0, p.total_entries - 1) } : p)
        .filter((p) => p.total_entries > 0)
      );

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
    }
  };

  const filteredPartyGroups = useMemo(() => {
    if (!partySearch.trim()) return partyGroups;
    const term = partySearch.toLowerCase();
    return partyGroups.filter((p) => p.party_name.toLowerCase().includes(term));
  }, [partyGroups, partySearch]);

  const handlePrintParty = (party: PartyGroup) => {
    const printContent = generatePrintContentForParty(party);
    
    // Create a hidden iframe to trigger printing
    const iframe = printFrameRef.current;
    if (!iframe) return;

    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dispatch List - ${party.party_name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
            }
            h1, h2, h3 {
              margin-bottom: 10px;
            }
            .design-section {
              margin-bottom: 20px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 15px;
            }
            .entry {
              margin-bottom: 15px;
              padding: 10px;
              border: 1px solid #eee;
              page-break-inside: avoid;
            }
            .entry-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .footer {
              margin-top: 30px;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
            .shade-item {
              margin-left: 15px;
            }
            .print-date {
              text-align: right;
              font-style: italic;
              margin-top: 5px;
              font-size: 0.8em;
            }
            @media print {
              body {
                margin: 0;
                padding: 15px;
              }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <div class="print-date">
            Printed on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();
    
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 500);
  };

  // Add a helper to group and format shades like pdf-generator.ts
  const formatShadesGrouped = (shades: { [key: string]: string }[]): string => {
    // Group shades by meter value
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

  const generatePrintContentForParty = (party: PartyGroup) => {
    let content = `
      <div class="header">
        <h1 style="font-size:2.2em; margin-bottom:0; font-weight:800; letter-spacing:1px;">Dispatch Report</h1>
        <h2 style="margin:0; font-size:1.4em; font-weight:700; color:#1a237e;">${party.party_name}</h2>
        <div style="font-size:1em; color:#555; margin-bottom:10px;">Printed on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
      </div>
    `;

    let totalMeters = 0;
    let totalEntries = 0;

    party.designs.forEach((design) => {
      content += `
        <div class="design-section" style="page-break-inside: avoid; margin-bottom: 28px;">
          <h3 style="margin-bottom:10px; font-size:1.25em; font-weight:700; color:#0d47a1; letter-spacing:0.5px;">${design.design} <span style="font-weight:normal; font-size:1em; color:#333;">(Price: ${design.entries[0].price})</span></h3>
          <table style="width:100%; border-collapse:collapse; margin-bottom:10px; font-size:1em; table-layout:fixed;">
            <colgroup>
              <col style="width: 12%" />
              <col style="width: 22%" />
              <col style="width: 18%" />
              <col style="width: 38%" />
              <col style="width: 10%" />
            </colgroup>
            <thead>
              <tr style="background:#f0f4fa;">
                <th style="border:1px solid #e0e0e0; padding:10px 6px; font-size:1.05em; font-weight:700; text-align:center; vertical-align:middle;">Order No</th>
                <th style="border:1px solid #e0e0e0; padding:10px 6px; font-size:1.05em; font-weight:700; text-align:center; vertical-align:middle;">Ship To</th>
                <th style="border:1px solid #e0e0e0; padding:10px 6px; font-size:1.05em; font-weight:700; text-align:center; vertical-align:middle;">Dispatch Date</th>
                <th style="border:1px solid #e0e0e0; padding:10px 6px; font-size:1.05em; font-weight:700; text-align:center; vertical-align:middle;">Shades</th>
                <th style="border:1px solid #e0e0e0; padding:10px 6px; font-size:1.05em; font-weight:700; text-align:center; vertical-align:middle;">Price</th>
              </tr>
            </thead>
            <tbody>
      `;
      design.entries.forEach((entry, eIdx) => {
        let entryMeters = 0;
        entry.shades.forEach(shade => {
          const shadeName = Object.keys(shade)[0];
          const shadeValue = shade[shadeName];
          if (shadeValue) {
            entryMeters += parseFloat(shadeValue);
          }
        });
        totalMeters += entryMeters;
        totalEntries++;
        content += `
          <tr style="background:${eIdx % 2 === 0 ? '#fff' : '#f7fafd'}; vertical-align:middle;">
            <td style="border:1px solid #e0e0e0; padding:10px 6px; text-align:center; vertical-align:middle; font-size:1.02em;">${entry.order_no}</td>
            <td style="border:1px solid #e0e0e0; padding:10px 6px; vertical-align:middle; font-size:1.02em;">${entry.ship_to_party}</td>
            <td style="border:1px solid #e0e0e0; padding:10px 6px; text-align:center; vertical-align:middle; font-size:1.02em;">${formatDate(entry.dispatch_date)}</td>
            <td style="border:1px solid #e0e0e0; padding:10px 6px; vertical-align:middle; font-size:1.02em;">${formatShadesGrouped(entry.shades) || '-'}</td>
            <td style="border:1px solid #e0e0e0; padding:10px 6px; text-align:center; vertical-align:middle; font-size:1.02em;">${entry.price}</td>
          </tr>
        `;
      });
      content += `
            </tbody>
          </table>
        </div>
      `;
    });

    content += `
      <div class="footer" style="margin-top: 18px;">
        <p style="font-size:1.05em;"><strong>Total Entries:</strong> ${totalEntries}</p>
        <p style="font-size:1.05em;"><strong>Total Meters:</strong> ${totalMeters.toFixed(2)}m</p>
      </div>
    `;

    return content;
  };

  return (
    <div className="container mx-auto max-w-4xl mt-10 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <Button onClick={() => navigate("/")} variant="outline" className="w-full sm:w-auto">
          Back to Home
        </Button>
        <h1 className="text-3xl font-bold text-center flex-1">Party Dispatch List</h1>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <input
          value={partySearch}
          onChange={(e) => setPartySearch(e.target.value)}
          placeholder="Search party..."
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
              const index = Number(val.replace("party-", ""));
              const partyId = filteredPartyGroups[index]?.party_id;
              if (partyId && !designsCacheByParty[partyId] && !loadingParties[partyId]) {
                fetchPartyEntries(partyId);
              }
            }
          }}
        >
          {filteredPartyGroups.length === 0 ? (
            <div className="text-center text-gray-500 py-12">No party dispatches found.</div>
          ) : (
            filteredPartyGroups.map((party, partyIndex) => (
              <AccordionItem key={partyIndex} value={`party-${partyIndex}`} className="rounded-lg border mb-4 shadow-sm bg-white">
                <div className="flex items-center justify-between px-4 py-2">
                  <AccordionTrigger 
                    className="text-lg flex items-center w-full hover:bg-gray-50 font-semibold"
                    onClick={() => {
                      if (!designsCacheByParty[party.party_id] && !loadingParties[party.party_id]) {
                        fetchPartyEntries(party.party_id);
                      }
                    }}
                  >
                    <span className="text-left flex-grow">{party.party_name}</span>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      {party.total_entries} entr{party.total_entries === 1 ? "y" : "ies"}
                    </span>
                  </AccordionTrigger>
                  <Button 
                    size="icon" 
                    variant="outline"
                    className="ml-3 flex items-center justify-center"
                    onClick={() => {
                      // We need to fetch it first if not cached to print
                      if (!designsCacheByParty[party.party_id]) {
                        fetchPartyEntries(party.party_id).then(() => {
                           // The state update is asynchronous, so print won't have the data immediately.
                           // Normally we should wait for state to propagate. We'll handle this in a real app,
                           // but for now, we'll try to just show a toast or we can assume they opened it first.
                           setTimeout(() => handlePrintParty({ ...party, designs: designsCacheByParty[party.party_id] || [] }), 1000);
                        });
                      } else {
                        handlePrintParty({ ...party, designs: designsCacheByParty[party.party_id] });
                      }
                    }}
                    title="Print Party Dispatch"
                  >
                    <Printer size={18} />
                  </Button>
                </div>
                <AccordionContent className="p-4">
                  <Accordion
                    type="single"
                    collapsible
                    className="w-full"
                    value={openDesignAccordion as string | undefined}
                    onValueChange={setOpenDesignAccordion}
                  >
                    {loadingParties[party.party_id] ? (
                      <div className="text-center text-gray-400 py-4">Loading entries...</div>
                    ) : ((designsCacheByParty[party.party_id] || []).length === 0) ? (
                      <div className="text-center text-gray-400 py-4">No designs for this party.</div>
                    ) : (
                      (designsCacheByParty[party.party_id] || []).map((design, designIndex) => (
                        <AccordionItem
                          key={designIndex}
                          value={`design-${partyIndex}-${designIndex}`}
                          className="rounded-lg border mb-4 shadow-sm bg-gray-50"
                        >
                          <AccordionTrigger className="p-4 bg-gray-50 font-medium flex items-center justify-between">
                            <span>{design.design}</span>
                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full ml-2">
                              {design.entries[0].price}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            {design.entries.length === 0 ? (
                              <div className="text-center text-gray-400 py-4">No entries for this design.</div>
                            ) : (
                              design.entries.map((entry, entryIndex) => (
                                <div
                                  key={entryIndex}
                                  className="flex flex-col lg:flex-row gap-4 p-4 border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow relative pr-12 mb-4"
                                >
                                  {/* Column 1: Core Details */}
                                  <div className="flex-1 min-w-[200px]">
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-bold text-gray-900 leading-tight">{entry.ship_to_party}</h3>
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

                                  {/* Column 2: Dates */}
                                  <div className="flex-[0.8] min-w-[180px] flex flex-col justify-center gap-1.5 text-xs text-gray-600 lg:border-l lg:border-gray-100 lg:pl-5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-gray-400 uppercase tracking-wider text-[10px]">Order Date</span>
                                      <span className="font-semibold text-gray-800">{entry.order_date ? formatDate(entry.order_date) : "-"}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-gray-400 uppercase tracking-wider text-[10px]">Bhiwandi Date</span>
                                      <span className="font-semibold text-gray-800">{entry.bhiwandi_date ? formatDate(entry.bhiwandi_date) : "-"}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-gray-400 uppercase tracking-wider text-[10px]">Dispatch Date</span>
                                      <span className="font-semibold text-emerald-600">{entry.dispatch_date ? formatDate(entry.dispatch_date) : "-"}</span>
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
                                    {entry.remark && (
                                      <div className="text-xs text-gray-500 bg-gray-50 p-1.5 rounded">
                                        <span className="font-semibold text-gray-600">Remark:</span> {entry.remark}
                                      </div>
                                    )}
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-3 right-3 h-8 w-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    onClick={() => handleRemoveDispatchDate(entry.id, party.party_id)}
                                    title="Remove from Dispatch"
                                  >
                                    <X className="h-5 w-5" />
                                  </Button>
                                </div>
                              ))
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))
                    )}
                  </Accordion>
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

export default PartyDispatchList;
