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
import { Printer, X, Loader2, RefreshCw } from "lucide-react";

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

interface DesignSummary {
  design: string;
  price: string;
  total_meters: number;
  entry_count: number;
}

interface PartySummary {
  party_id: number;
  party_name: string;
  total_entries: number;
}

const BATCH_SIZE = 1000;

const PartyDispatchList = () => {
  // Level 1: List of Party Summaries
  const [partyGroups, setPartyGroups] = useState<PartySummary[]>([]);
  const [loadingPartiesList, setLoadingPartiesList] = useState<boolean>(true);

  // Level 2: Map of Party ID -> List of Design Summaries
  const [designsCacheByParty, setDesignsCacheByParty] = useState<
    Record<number, DesignSummary[]>
  >({});
  const [loadingDesignsForParty, setLoadingDesignsForParty] = useState<
    Record<number, boolean>
  >({});

  // Level 3: Map of `${partyId}_${designName}` -> List of Dispatch Entries
  const [entriesCacheByPartyDesign, setEntriesCacheByPartyDesign] = useState<
    Record<string, DispatchEntry[]>
  >({});
  const [loadingEntriesForDesign, setLoadingEntriesForDesign] = useState<
    Record<string, boolean>
  >({});

  // UI accordion state
  const [openPartyAccordion, setOpenPartyAccordion] = useState<string | null>(
    null
  );
  const [openDesignAccordions, setOpenDesignAccordions] = useState<
    Record<number, string | null>
  >({});

  const [partySearch, setPartySearch] = useState<string>("");
  const [printingPartyId, setPrintingPartyId] = useState<number | null>(null);

  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // LEVEL 1: Fetch Party Names only (incorporating full pagination to prevent missing data)
  const fetchPartiesList = useCallback(async () => {
    setLoadingPartiesList(true);
    try {
      const partyData = new Map<number, { name: string; count: number }>();
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from("design_entries")
          .select(`
            id,
            orders!inner(
              bill_to_id,
              bill_to:party_profiles!orders_bill_to_id_fkey(name)
            )
          `)
          .not("dispatch_date", "is", null)
          .range(from, from + BATCH_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        data.forEach((row: any) => {
          const pId = row.orders?.bill_to_id;
          const pName = row.orders?.bill_to?.name;
          if (pId && pName) {
            if (!partyData.has(pId)) {
              partyData.set(pId, { name: pName, count: 0 });
            }
            partyData.get(pId)!.count++;
          }
        });

        if (data.length < BATCH_SIZE) break;
        from += BATCH_SIZE;
      }

      const summaries: PartySummary[] = Array.from(partyData.entries())
        .map(([party_id, info]) => ({
          party_id,
          party_name: info.name,
          total_entries: info.count,
        }))
        .sort((a, b) => a.party_name.localeCompare(b.party_name));

      setPartyGroups(summaries);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch parties list: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setLoadingPartiesList(false);
    }
  }, [toast]);

  // LEVEL 2: Fetch Designs for a specific Party (incorporating full pagination)
  const fetchDesignsForParty = useCallback(
    async (partyId: number) => {
      setLoadingDesignsForParty((prev) => ({ ...prev, [partyId]: true }));
      try {
        let allData: any[] = [];
        let from = 0;

        while (true) {
          const { data, error } = await supabase
            .from("design_entries")
            .select(`
              id,
              design,
              price,
              shades,
              orders!inner(
                bill_to_id
              )
            `)
            .not("dispatch_date", "is", null)
            .eq("orders.bill_to_id", partyId)
            .range(from, from + BATCH_SIZE - 1);

          if (error) throw error;
          if (!data || data.length === 0) break;
          allData.push(...data);
          if (data.length < BATCH_SIZE) break;
          from += BATCH_SIZE;
        }

        const designsMap = new Map<string, DesignSummary>();

        allData.forEach((row: any) => {
          const dName = row.design;
          if (!dName) return;

          if (!designsMap.has(dName)) {
            designsMap.set(dName, {
              design: dName,
              price: row.price?.toString() || "0",
              total_meters: 0,
              entry_count: 0,
            });
          }

          const group = designsMap.get(dName)!;
          group.entry_count++;
          let entryMeters = 0;
          if (row.shades && Array.isArray(row.shades)) {
            row.shades.forEach((shade: any) => {
              const val = Object.values(shade)[0];
              entryMeters += val ? parseFloat(val as string) : 0;
            });
          }
          group.total_meters += entryMeters;
        });

        const grouped = Array.from(designsMap.values()).sort((a, b) =>
          a.design.localeCompare(b.design)
        );

        setDesignsCacheByParty((prev) => ({ ...prev, [partyId]: grouped }));
        return grouped;
      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to fetch designs for party: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        });
        return [];
      } finally {
        setLoadingDesignsForParty((prev) => ({ ...prev, [partyId]: false }));
      }
    },
    [toast]
  );

  // LEVEL 3: Fetch Entries within a Design for a specific Party (incorporating full pagination)
  const fetchEntriesForDesign = useCallback(
    async (partyId: number, designName: string) => {
      const cacheKey = `${partyId}_${designName}`;
      setLoadingEntriesForDesign((prev) => ({ ...prev, [cacheKey]: true }));
      try {
        let allData: any[] = [];
        let from = 0;

        while (true) {
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
            .eq("design", designName)
            .order("dispatch_date", { ascending: false })
            .range(from, from + BATCH_SIZE - 1);

          if (error) throw error;
          if (!data || data.length === 0) break;
          allData.push(...data);
          if (data.length < BATCH_SIZE) break;
          from += BATCH_SIZE;
        }

        const entries: DispatchEntry[] = allData.map((row: any) => ({
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
          order_date: row.orders?.date,
        }));

        setEntriesCacheByPartyDesign((prev) => ({
          ...prev,
          [cacheKey]: entries,
        }));
        return entries;
      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to fetch dispatch entries for design: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        });
        return [];
      } finally {
        setLoadingEntriesForDesign((prev) => ({ ...prev, [cacheKey]: false }));
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchPartiesList();
  }, [fetchPartiesList]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleRemoveDispatchDate = async (
    id: number,
    partyId: number,
    designName: string
  ) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this entry from dispatch list?"
      )
    ) {
      return;
    }

    const cacheKey = `${partyId}_${designName}`;

    try {
      // Optimistic update for Level 3 cache
      setEntriesCacheByPartyDesign((prev) => {
        const currentEntries = prev[cacheKey] || [];
        return {
          ...prev,
          [cacheKey]: currentEntries.filter((e) => e.id !== id),
        };
      });

      // Optimistic update for Level 2 cache
      setDesignsCacheByParty((prev) => {
        const currentDesigns = prev[partyId] || [];
        return {
          ...prev,
          [partyId]: currentDesigns
            .map((d) =>
              d.design === designName
                ? { ...d, entry_count: Math.max(0, d.entry_count - 1) }
                : d
            )
            .filter((d) => d.entry_count > 0),
        };
      });

      // Optimistic update for Level 1 cache
      setPartyGroups((prev) =>
        prev
          .map((p) =>
            p.party_id === partyId
              ? { ...p, total_entries: Math.max(0, p.total_entries - 1) }
              : p
          )
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
      // Re-fetch to sync
      fetchEntriesForDesign(partyId, designName);
      fetchDesignsForParty(partyId);
    }
  };

  const filteredPartyGroups = useMemo(() => {
    if (!partySearch.trim()) return partyGroups;
    const term = partySearch.toLowerCase();
    return partyGroups.filter((p) =>
      p.party_name.toLowerCase().includes(term)
    );
  }, [partyGroups, partySearch]);

  // Handle printing: load all designs and entries for the party if not yet fully cached
  const handlePrintParty = async (party: PartySummary) => {
    setPrintingPartyId(party.party_id);
    try {
      let partyDesigns = designsCacheByParty[party.party_id];
      if (!partyDesigns) {
        partyDesigns = await fetchDesignsForParty(party.party_id);
      }

      // Ensure entries for all designs in this party are loaded
      const designsWithEntries: Array<{
        design: string;
        price: string;
        entries: DispatchEntry[];
      }> = [];

      for (const d of partyDesigns) {
        const cacheKey = `${party.party_id}_${d.design}`;
        let entries = entriesCacheByPartyDesign[cacheKey];
        if (!entries) {
          entries = await fetchEntriesForDesign(party.party_id, d.design);
        }
        designsWithEntries.push({
          design: d.design,
          price: d.price,
          entries: entries || [],
        });
      }

      const printContent = generatePrintContentForParty(
        party.party_name,
        designsWithEntries
      );
      executePrint(party.party_name, printContent);
    } catch (error) {
      toast({
        title: "Print Error",
        description: `Failed to prepare print report: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setPrintingPartyId(null);
    }
  };

  const executePrint = (partyName: string, printContent: string) => {
    const iframe = printFrameRef.current;
    if (!iframe) return;

    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dispatch List - ${partyName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2, h3 { margin-bottom: 10px; }
            .design-section { margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 15px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
            .print-date { text-align: right; font-style: italic; margin-top: 5px; font-size: 0.8em; }
            @media print { body { margin: 0; padding: 15px; } }
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

  const generatePrintContentForParty = (
    partyName: string,
    designs: Array<{ design: string; price: string; entries: DispatchEntry[] }>
  ) => {
    let content = `
      <div class="header">
        <h1 style="font-size:2.2em; margin-bottom:0; font-weight:800; letter-spacing:1px;">Dispatch Report</h1>
        <h2 style="margin:0; font-size:1.4em; font-weight:700; color:#1a237e;">${partyName}</h2>
        <div style="font-size:1em; color:#555; margin-bottom:10px;">Printed on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
      </div>
    `;

    let totalMeters = 0;
    let totalEntries = 0;

    designs.forEach((designObj) => {
      content += `
        <div class="design-section" style="page-break-inside: avoid; margin-bottom: 28px;">
          <h3 style="margin-bottom:10px; font-size:1.25em; font-weight:700; color:#0d47a1; letter-spacing:0.5px;">${designObj.design} <span style="font-weight:normal; font-size:1em; color:#333;">(Price: ${designObj.price})</span></h3>
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
      designObj.entries.forEach((entry, eIdx) => {
        let entryMeters = 0;
        entry.shades.forEach((shade) => {
          const shadeName = Object.keys(shade)[0];
          const shadeValue = shade[shadeName];
          if (shadeValue) {
            entryMeters += parseFloat(shadeValue);
          }
        });
        totalMeters += entryMeters;
        totalEntries++;
        content += `
          <tr style="background:${eIdx % 2 === 0 ? "#fff" : "#f7fafd"}; vertical-align:middle;">
            <td style="border:1px solid #e0e0e0; padding:10px 6px; text-align:center; vertical-align:middle; font-size:1.02em;">${entry.order_no}</td>
            <td style="border:1px solid #e0e0e0; padding:10px 6px; vertical-align:middle; font-size:1.02em;">${entry.ship_to_party}</td>
            <td style="border:1px solid #e0e0e0; padding:10px 6px; text-align:center; vertical-align:middle; font-size:1.02em;">${formatDate(entry.dispatch_date)}</td>
            <td style="border:1px solid #e0e0e0; padding:10px 6px; vertical-align:middle; font-size:1.02em;">${formatShadesGrouped(entry.shades) || "-"}</td>
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
        <Button
          onClick={() => navigate("/")}
          variant="outline"
          className="w-full sm:w-auto"
        >
          Back to Home
        </Button>
        <h1 className="text-3xl font-bold text-center flex-1">
          Party Dispatch List
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchPartiesList}
          title="Refresh Parties"
          disabled={loadingPartiesList}
        >
          <RefreshCw
            className={`h-5 w-5 ${loadingPartiesList ? "animate-spin" : ""}`}
          />
        </Button>
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
        {loadingPartiesList ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-sm font-medium">Loading party names...</span>
          </div>
        ) : (
          <Accordion
            type="single"
            collapsible
            className="w-full"
            value={openPartyAccordion || undefined}
            onValueChange={(val) => {
              setOpenPartyAccordion(val);
              if (val) {
                const partyIdStr = val.replace("party-", "");
                const partyId = Number(partyIdStr);
                if (
                  partyId &&
                  !designsCacheByParty[partyId] &&
                  !loadingDesignsForParty[partyId]
                ) {
                  // LEVEL 2: Trigger fetching designs for this party on click
                  fetchDesignsForParty(partyId);
                }
              }
            }}
          >
            {filteredPartyGroups.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                No party dispatches found.
              </div>
            ) : (
              filteredPartyGroups.map((party) => (
                <AccordionItem
                  key={party.party_id}
                  value={`party-${party.party_id}`}
                  className="rounded-lg border mb-4 shadow-sm bg-white overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                    <AccordionTrigger className="text-lg flex items-center w-full font-semibold py-2 hover:no-underline">
                      <span className="text-left flex-grow">
                        {party.party_name}
                      </span>
                      <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full border border-blue-100 mr-2">
                        {party.total_entries} entr
                        {party.total_entries === 1 ? "y" : "ies"}
                      </span>
                    </AccordionTrigger>
                    <Button
                      size="icon"
                      variant="outline"
                      className="ml-2 shrink-0 flex items-center justify-center"
                      disabled={printingPartyId === party.party_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrintParty(party);
                      }}
                      title="Print Party Dispatch Report"
                    >
                      {printingPartyId === party.party_id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      ) : (
                        <Printer size={18} />
                      )}
                    </Button>
                  </div>

                  <AccordionContent className="px-4 pb-4 pt-2 border-t bg-gray-50/50">
                    {loadingDesignsForParty[party.party_id] ? (
                      <div className="flex items-center justify-center py-6 text-gray-500 gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span>Loading designs for {party.party_name}...</span>
                      </div>
                    ) : (designsCacheByParty[party.party_id] || []).length ===
                      0 ? (
                      <div className="text-center text-gray-400 py-4 text-sm">
                        No designs found for this party.
                      </div>
                    ) : (
                      <Accordion
                        type="single"
                        collapsible
                        className="w-full space-y-2 mt-2"
                        value={
                          openDesignAccordions[party.party_id] || undefined
                        }
                        onValueChange={(val) => {
                          setOpenDesignAccordions((prev) => ({
                            ...prev,
                            [party.party_id]: val,
                          }));
                          if (val) {
                            const designName = val.replace("design-", "");
                            const cacheKey = `${party.party_id}_${designName}`;
                            if (
                              !entriesCacheByPartyDesign[cacheKey] &&
                              !loadingEntriesForDesign[cacheKey]
                            ) {
                              // LEVEL 3: Trigger fetching entry details for this design on click
                              fetchEntriesForDesign(party.party_id, designName);
                            }
                          }
                        }}
                      >
                        {(designsCacheByParty[party.party_id] || []).map(
                          (designSummary) => {
                            const cacheKey = `${party.party_id}_${designSummary.design}`;
                            const designEntries =
                              entriesCacheByPartyDesign[cacheKey] || [];
                            const isLoadingEntries =
                              loadingEntriesForDesign[cacheKey];

                            return (
                              <AccordionItem
                                key={designSummary.design}
                                value={`design-${designSummary.design}`}
                                className="rounded-lg border bg-white shadow-xs overflow-hidden"
                              >
                                <AccordionTrigger className="px-4 py-3 bg-white hover:bg-gray-50 font-medium text-sm flex items-center justify-between hover:no-underline">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900">
                                      {designSummary.design}
                                    </span>
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                                      ₹{designSummary.price}/m
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-gray-500 mr-2">
                                    <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-100">
                                      {designSummary.total_meters.toFixed(1)}m
                                      total
                                    </span>
                                    <span className="text-gray-400">
                                      {designSummary.entry_count} item
                                      {designSummary.entry_count === 1
                                        ? ""
                                        : "s"}
                                    </span>
                                  </div>
                                </AccordionTrigger>

                                <AccordionContent className="p-4 bg-gray-50 border-t">
                                  {isLoadingEntries ? (
                                    <div className="flex items-center justify-center py-6 text-gray-500 gap-2 text-sm">
                                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                      <span>
                                        Loading entry details for design{" "}
                                        {designSummary.design}...
                                      </span>
                                    </div>
                                  ) : designEntries.length === 0 ? (
                                    <div className="text-center text-gray-400 py-4 text-sm">
                                      No dispatch entries found for this design.
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {designEntries.map((entry) => (
                                        <div
                                          key={entry.id}
                                          className="flex flex-col lg:flex-row gap-4 p-4 border border-gray-200 rounded-xl bg-white shadow-xs hover:shadow-sm transition-shadow relative pr-12"
                                        >
                                          {/* Column 1: Core Details */}
                                          <div className="flex-1 min-w-[200px]">
                                            <div className="flex flex-col gap-2">
                                              <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-bold text-gray-900 leading-tight">
                                                  {entry.ship_to_party}
                                                </h3>
                                                {entry.part && (
                                                  <span className="shrink-0 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded border border-amber-200 uppercase tracking-wider">
                                                    Part Order
                                                  </span>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-3 text-sm">
                                                <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                                                  Order #{entry.order_no}
                                                </span>
                                                <span className="font-semibold text-gray-700 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                                                  ₹{entry.price}/m
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Column 2: Dates */}
                                          <div className="flex-[0.8] min-w-[180px] flex flex-col justify-center gap-1.5 text-xs text-gray-600 lg:border-l lg:border-gray-100 lg:pl-5">
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium text-gray-400 uppercase tracking-wider text-[10px]">
                                                Order Date
                                              </span>
                                              <span className="font-semibold text-gray-800">
                                                {entry.order_date
                                                  ? formatDate(entry.order_date)
                                                  : "-"}
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium text-gray-400 uppercase tracking-wider text-[10px]">
                                                Bhiwandi Date
                                              </span>
                                              <span className="font-semibold text-gray-800">
                                                {entry.bhiwandi_date
                                                  ? formatDate(
                                                      entry.bhiwandi_date
                                                    )
                                                  : "-"}
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium text-gray-400 uppercase tracking-wider text-[10px]">
                                                Dispatch Date
                                              </span>
                                              <span className="font-semibold text-emerald-600">
                                                {entry.dispatch_date
                                                  ? formatDate(
                                                      entry.dispatch_date
                                                    )
                                                  : "-"}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Column 3: Shades & Remarks */}
                                          <div className="flex-[1.2] min-w-[200px] lg:border-l lg:border-gray-100 lg:pl-5">
                                            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2 block">
                                              Shades Breakdown
                                            </span>
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                              {entry.shades &&
                                              entry.shades.length > 0 ? (
                                                entry.shades.map((shade, idx) => {
                                                  const shadeName =
                                                    Object.keys(shade)[0];
                                                  const shadeValue =
                                                    shade[shadeName];
                                                  if (!shadeValue) return null;
                                                  return (
                                                    <span
                                                      key={idx}
                                                      className="bg-gray-50 text-gray-700 border border-gray-200 px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1"
                                                    >
                                                      {shadeName}:{" "}
                                                      <span className="text-blue-600">
                                                        {shadeValue}m
                                                      </span>
                                                    </span>
                                                  );
                                                })
                                              ) : (
                                                <span className="text-gray-400 text-xs italic">
                                                  No shades
                                                </span>
                                              )}
                                            </div>
                                            {entry.remark && (
                                              <div className="text-xs text-gray-500 bg-gray-50 p-1.5 rounded">
                                                <span className="font-semibold text-gray-600">
                                                  Remark:
                                                </span>{" "}
                                                {entry.remark}
                                              </div>
                                            )}
                                          </div>

                                          {/* Action button: Remove from dispatch */}
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-3 right-3 h-8 w-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            onClick={() =>
                                              handleRemoveDispatchDate(
                                                entry.id,
                                                party.party_id,
                                                designSummary.design
                                              )
                                            }
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
                            );
                          }
                        )}
                      </Accordion>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))
            )}
          </Accordion>
        )}
      </div>

      {/* Hidden iframe for printing */}
      <iframe
        ref={printFrameRef}
        style={{
          position: "absolute",
          height: "0",
          width: "0",
          border: "none",
          visibility: "hidden",
        }}
        title="Print Frame"
      />
      <Toaster />
    </div>
  );
};

export default PartyDispatchList;

