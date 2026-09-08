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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Toaster } from "@/components/ui";
import { Printer, X, Loader2, RefreshCw, Users, Calendar } from "lucide-react";

interface DesignSummary {
  design: string;
  count: number;
  total_meters: number;
}

interface PartySummaryForDesign {
  party_id: number;
  party_name: string;
  entry_count: number;
  total_meters: number;
}

interface DesignEntry {
  id: number;
  design: string;
  party_name: string;
  party_id?: number;
  shades: { [key: string]: string }[];
  order_remark: string;
  price: string;
  dispatch_date: string;
  order_no: number;
  part: boolean;
  bhiwandi_date: string | null;
  order_date: string;
}

const BATCH_SIZE = 1000;

function DispatchList() {
  // Level 1: List of Design Summaries
  const [designCounts, setDesignCounts] = useState<DesignSummary[]>([]);
  const [loadingDesignsList, setLoadingDesignsList] = useState<boolean>(true);

  // Level 2 (Party Wise): Map of Design Name -> List of Party Summaries
  const [partiesCacheByDesign, setPartiesCacheByDesign] = useState<
    Record<string, PartySummaryForDesign[]>
  >({});
  const [loadingPartiesForDesign, setLoadingPartiesForDesign] = useState<
    Record<string, boolean>
  >({});

  // Level 3 (Party Wise): Map of `${designName}_${partyId}` -> List of Detailed Entries
  const [entriesCacheByDesignParty, setEntriesCacheByDesignParty] = useState<
    Record<string, DesignEntry[]>
  >({});
  const [loadingEntriesForDesignParty, setLoadingEntriesForDesignParty] = useState<
    Record<string, boolean>
  >({});

  // Date Wise View Cache: Map of `designName` -> List of All Entries sorted by dispatch date
  const [entriesCacheByDesign, setEntriesCacheByDesign] = useState<
    Record<string, DesignEntry[]>
  >({});
  const [loadingEntriesForDesign, setLoadingEntriesForDesign] = useState<
    Record<string, boolean>
  >({});

  // View switch state: "party" (Party Wise) | "date" (Date Wise)
  const [viewType, setViewType] = useState<"party" | "date">("party");

  // UI state
  const [filter, setFilter] = useState<string>("all");
  const [designSearch, setDesignSearch] = useState<string>("");
  const [openDesignAccordion, setOpenDesignAccordion] = useState<string | null>(null);
  const [openPartyAccordions, setOpenPartyAccordions] = useState<
    Record<string, string | null>
  >({});
  const [printingDesign, setPrintingDesign] = useState<string | null>(null);

  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const optionsDate: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    return date.toLocaleDateString("en-US", optionsDate);
  };

  // LEVEL 1: Fetch Design Names & Counts (incorporating full pagination to prevent missing data)
  const fetchDesignCountsList = useCallback(async () => {
    setLoadingDesignsList(true);
    try {
      const countsMap = new Map<string, { count: number; meters: number }>();
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from("design_entries")
          .select("design, shades")
          .not("dispatch_date", "is", null)
          .range(from, from + BATCH_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        data.forEach((entry: any) => {
          const dName = entry.design;
          if (dName) {
            if (!countsMap.has(dName)) {
              countsMap.set(dName, { count: 0, meters: 0 });
            }
            const item = countsMap.get(dName)!;
            item.count += 1;

            if (entry.shades && Array.isArray(entry.shades)) {
              entry.shades.forEach((shade: any) => {
                const val = Object.values(shade)[0];
                item.meters += val ? parseFloat(val as string) : 0;
              });
            }
          }
        });

        if (data.length < BATCH_SIZE) break;
        from += BATCH_SIZE;
      }

      const formattedData: DesignSummary[] = Array.from(countsMap.entries())
        .map(([design, info]) => ({
          design,
          count: info.count,
          total_meters: info.meters,
        }))
        .sort((a, b) => a.design.localeCompare(b.design));

      setDesignCounts(formattedData);
    } catch (error) {
      console.error("Error fetching design counts:", error);
      toast({
        title: "Error",
        description: "Failed to fetch design list.",
        variant: "destructive",
      });
    } finally {
      setLoadingDesignsList(false);
    }
  }, [toast]);

  // LEVEL 2: Fetch Parties for a specific Design (incorporating full pagination)
  const fetchPartiesForDesign = useCallback(
    async (designName: string) => {
      setLoadingPartiesForDesign((prev) => ({ ...prev, [designName]: true }));
      try {
        let allData: any[] = [];
        let from = 0;

        while (true) {
          const { data, error } = await supabase
            .from("design_entries")
            .select(`
              id,
              price,
              shades,
              orders!inner(
                bill_to_id,
                bill_to:party_profiles!orders_bill_to_id_fkey(name)
              )
            `)
            .eq("design", designName)
            .not("dispatch_date", "is", null)
            .range(from, from + BATCH_SIZE - 1);

          if (error) throw error;
          if (!data || data.length === 0) break;
          allData.push(...data);
          if (data.length < BATCH_SIZE) break;
          from += BATCH_SIZE;
        }

        const partyMap = new Map<number, PartySummaryForDesign>();

        allData.forEach((row: any) => {
          const pId = row.orders?.bill_to_id || 0;
          const pName = row.orders?.bill_to?.name || "Unknown Party";

          if (!partyMap.has(pId)) {
            partyMap.set(pId, {
              party_id: pId,
              party_name: pName,
              entry_count: 0,
              total_meters: 0,
            });
          }

          const partyObj = partyMap.get(pId)!;
          partyObj.entry_count += 1;

          if (row.shades && Array.isArray(row.shades)) {
            row.shades.forEach((shade: any) => {
              const val = Object.values(shade)[0];
              partyObj.total_meters += val ? parseFloat(val as string) : 0;
            });
          }
        });

        const parties = Array.from(partyMap.values()).sort((a, b) =>
          a.party_name.localeCompare(b.party_name)
        );

        setPartiesCacheByDesign((prev) => ({
          ...prev,
          [designName]: parties,
        }));
        return parties;
      } catch (error) {
        console.error("Error fetching parties for design:", error);
        toast({
          title: "Error",
          description: `Failed to fetch parties for design ${designName}.`,
          variant: "destructive",
        });
        return [];
      } finally {
        setLoadingPartiesForDesign((prev) => ({ ...prev, [designName]: false }));
      }
    },
    [toast]
  );

  // LEVEL 3: Fetch Entries for a specific Design and Party (incorporating full pagination)
  const fetchEntriesForDesignAndParty = useCallback(
    async (designName: string, partyId: number) => {
      const cacheKey = `${designName}_${partyId}`;
      setLoadingEntriesForDesignParty((prev) => ({ ...prev, [cacheKey]: true }));

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
              dispatch_date,
              bhiwandi_date,
              part,
              design,
              orders!inner(
                order_no,
                date,
                remark,
                bill_to_id,
                party_profiles!orders_bill_to_id_fkey(name)
              )
            `)
            .eq("design", designName)
            .eq("orders.bill_to_id", partyId)
            .not("dispatch_date", "is", null)
            .order("dispatch_date", { ascending: false })
            .range(from, from + BATCH_SIZE - 1);

          if (error) throw error;
          if (!data || data.length === 0) break;
          allData.push(...data);
          if (data.length < BATCH_SIZE) break;
          from += BATCH_SIZE;
        }

        const entries: DesignEntry[] = allData.map((row: any) => ({
          id: row.id,
          design: row.design,
          party_name: row.orders?.party_profiles?.name || "Unknown Party",
          party_id: row.orders?.bill_to_id || partyId,
          shades: row.shades || [],
          order_remark: row.orders?.remark || row.remark || "",
          price: row.price?.toString() || "0",
          dispatch_date: row.dispatch_date,
          order_no: row.orders?.order_no || 0,
          part: row.part || false,
          bhiwandi_date: row.bhiwandi_date,
          order_date: row.orders?.date,
        }));

        setEntriesCacheByDesignParty((prev) => ({
          ...prev,
          [cacheKey]: entries,
        }));
        return entries;
      } catch (error) {
        console.error("Error fetching design entries:", error);
        toast({
          title: "Error",
          description: "Failed to fetch design entries.",
          variant: "destructive",
        });
        return [];
      } finally {
        setLoadingEntriesForDesignParty((prev) => ({
          ...prev,
          [cacheKey]: false,
        }));
      }
    },
    [toast]
  );

  // DATE-WISE: Fetch All Entries within a Design sorted by dispatch_date DESC
  const fetchEntriesForDesign = useCallback(
    async (designName: string) => {
      setLoadingEntriesForDesign((prev) => ({ ...prev, [designName]: true }));
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
              dispatch_date,
              bhiwandi_date,
              part,
              design,
              orders!inner(
                order_no,
                date,
                remark,
                bill_to_id,
                party_profiles!orders_bill_to_id_fkey(name)
              )
            `)
            .eq("design", designName)
            .not("dispatch_date", "is", null)
            .order("dispatch_date", { ascending: false })
            .order("id", { ascending: false })
            .range(from, from + BATCH_SIZE - 1);

          if (error) throw error;
          if (!data || data.length === 0) break;
          allData.push(...data);
          if (data.length < BATCH_SIZE) break;
          from += BATCH_SIZE;
        }

        const entries: DesignEntry[] = allData.map((row: any) => ({
          id: row.id,
          design: row.design,
          party_name: row.orders?.party_profiles?.name || "Unknown Party",
          party_id: row.orders?.bill_to_id || 0,
          shades: row.shades || [],
          order_remark: row.orders?.remark || row.remark || "",
          price: row.price?.toString() || "0",
          dispatch_date: row.dispatch_date,
          order_no: row.orders?.order_no || 0,
          part: row.part || false,
          bhiwandi_date: row.bhiwandi_date,
          order_date: row.orders?.date,
        }));

        setEntriesCacheByDesign((prev) => ({
          ...prev,
          [designName]: entries,
        }));
        return entries;
      } catch (error) {
        console.error("Error fetching date-wise design entries:", error);
        toast({
          title: "Error",
          description: `Failed to fetch dispatch entries for design ${designName}.`,
          variant: "destructive",
        });
        return [];
      } finally {
        setLoadingEntriesForDesign((prev) => ({
          ...prev,
          [designName]: false,
        }));
      }
    },
    [toast]
  );

  const handleViewTypeChange = (newViewType: "party" | "date") => {
    setViewType(newViewType);
    if (openDesignAccordion) {
      const designName = openDesignAccordion.replace("design-", "");
      if (designName) {
        if (newViewType === "party") {
          if (
            !partiesCacheByDesign[designName] &&
            !loadingPartiesForDesign[designName]
          ) {
            fetchPartiesForDesign(designName);
          }
        } else {
          if (
            !entriesCacheByDesign[designName] &&
            !loadingEntriesForDesign[designName]
          ) {
            fetchEntriesForDesign(designName);
          }
        }
      }
    }
  };

  useEffect(() => {
    fetchDesignCountsList();
  }, [fetchDesignCountsList]);

  const filteredDesignCounts = useMemo(() => {
    let counts = [...designCounts];

    if (designSearch.trim()) {
      const term = designSearch.toLowerCase();
      counts = counts.filter((item) =>
        item.design.toLowerCase().includes(term)
      );
    }

    if (filter === "all") {
      return counts;
    } else if (filter === "regular") {
      return counts
        .filter(
          (item) =>
            !(
              item.design.includes("-") &&
              /^\d{4}$/.test(item.design.slice(-4))
            ) &&
            !(
              item.design.includes("-") &&
              /^\d{3}$/.test(item.design.slice(-3))
            ) &&
            isNaN(Number(item.design))
        )
        .sort((a, b) => a.design.localeCompare(b.design));
    } else if (filter === "Design No.") {
      return counts
        .filter((item) => !isNaN(Number(item.design)))
        .sort((a, b) => Number(a.design) - Number(b.design));
    } else {
      // print filter
      return counts
        .filter(
          (item) =>
            (item.design.includes("-") &&
              /^\d{4}$/.test(item.design.slice(-4))) ||
            (item.design.includes("-") &&
              /^\d{3}$/.test(item.design.slice(-3)))
        )
        .sort((a, b) => {
          const numA = Number(a.design.split("-").pop());
          const numB = Number(b.design.split("-").pop());
          return numA - numB;
        });
    }
  }, [designCounts, filter, designSearch]);

  const handleRemoveDispatchDate = async (
    id: number,
    designName: string,
    partyId: number
  ) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this entry from dispatch list?"
      )
    ) {
      return;
    }

    const cacheKey = `${designName}_${partyId}`;

    try {
      // Optimistic update Level 3 Party-Wise cache
      setEntriesCacheByDesignParty((prev) => {
        const current = prev[cacheKey] || [];
        return { ...prev, [cacheKey]: current.filter((e) => e.id !== id) };
      });

      // Optimistic update Date-Wise cache
      setEntriesCacheByDesign((prev) => {
        const current = prev[designName] || [];
        return { ...prev, [designName]: current.filter((e) => e.id !== id) };
      });

      // Optimistic update Level 2 cache
      setPartiesCacheByDesign((prev) => {
        const currentParties = prev[designName] || [];
        return {
          ...prev,
          [designName]: currentParties
            .map((p) =>
              p.party_id === partyId
                ? { ...p, entry_count: Math.max(0, p.entry_count - 1) }
                : p
            )
            .filter((p) => p.entry_count > 0),
        };
      });

      // Optimistic update Level 1 cache
      setDesignCounts((prev) =>
        prev
          .map((d) =>
            d.design === designName
              ? { ...d, count: Math.max(0, d.count - 1) }
              : d
          )
          .filter((d) => d.count > 0)
      );

      const { error } = await supabase
        .from("design_entries")
        .update({ dispatch_date: null })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Entry removed from dispatch list.",
      });
    } catch (error) {
      console.error("Error removing dispatch date:", error);
      toast({
        title: "Error",
        description: "Failed to remove dispatch date.",
        variant: "destructive",
      });
      // Rollback by refetching
      if (partyId) fetchEntriesForDesignAndParty(designName, partyId);
      fetchEntriesForDesign(designName);
      fetchPartiesForDesign(designName);
    }
  };


  // Print helper for Design dispatch report
  const handlePrintDesign = async (designName: string) => {
    setPrintingDesign(designName);
    try {
      let parties = partiesCacheByDesign[designName];
      if (!parties) {
        parties = await fetchPartiesForDesign(designName);
      }

      const partiesWithEntries: Array<{
        party_name: string;
        entries: DesignEntry[];
      }> = [];

      for (const p of parties) {
        const cacheKey = `${designName}_${p.party_id}`;
        let entries = entriesCacheByDesignParty[cacheKey];
        if (!entries) {
          entries = await fetchEntriesForDesignAndParty(designName, p.party_id);
        }
        partiesWithEntries.push({
          party_name: p.party_name,
          entries: entries || [],
        });
      }

      const printContent = generatePrintContentForDesign(
        designName,
        partiesWithEntries
      );
      executePrint(designName, printContent);
    } catch (error) {
      toast({
        title: "Print Error",
        description: `Failed to prepare print report: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setPrintingDesign(null);
    }
  };

  const executePrint = (designName: string, printContent: string) => {
    const iframe = printFrameRef.current;
    if (!iframe) return;

    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dispatch List - Design ${designName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2, h3 { margin-bottom: 10px; }
            .party-section { margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 15px; }
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

  const generatePrintContentForDesign = (
    designName: string,
    parties: Array<{ party_name: string; entries: DesignEntry[] }>
  ) => {
    let content = `
      <div class="header">
        <h1 style="font-size:2.2em; margin-bottom:0; font-weight:800; letter-spacing:1px;">Design Dispatch Report</h1>
        <h2 style="margin:0; font-size:1.4em; font-weight:700; color:#0d47a1;">Design: ${designName}</h2>
        <div style="font-size:1em; color:#555; margin-bottom:10px;">Printed on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
      </div>
    `;

    let totalMeters = 0;
    let totalEntries = 0;

    parties.forEach((pObj) => {
      content += `
        <div class="party-section" style="page-break-inside: avoid; margin-bottom: 28px;">
          <h3 style="margin-bottom:10px; font-size:1.2em; font-weight:700; color:#1a237e;">Party: ${pObj.party_name}</h3>
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
                <th style="border:1px solid #e0e0e0; padding:10px 6px; font-size:1.05em; font-weight:700; text-align:center; vertical-align:middle;">Party</th>
                <th style="border:1px solid #e0e0e0; padding:10px 6px; font-size:1.05em; font-weight:700; text-align:center; vertical-align:middle;">Dispatch Date</th>
                <th style="border:1px solid #e0e0e0; padding:10px 6px; font-size:1.05em; font-weight:700; text-align:center; vertical-align:middle;">Shades</th>
                <th style="border:1px solid #e0e0e0; padding:10px 6px; font-size:1.05em; font-weight:700; text-align:center; vertical-align:middle;">Price</th>
              </tr>
            </thead>
            <tbody>
      `;
      pObj.entries.forEach((entry, eIdx) => {
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
            <td style="border:1px solid #e0e0e0; padding:10px 6px; vertical-align:middle; font-size:1.02em;">${entry.party_name}</td>
            <td style="border:1px solid #e0e0e0; padding:10px 6px; text-align:center; vertical-align:middle; font-size:1.02em;">${formatDate(entry.dispatch_date)}</td>
            <td style="border:1px solid #e0e0e0; padding:10px 6px; vertical-align:middle; font-size:1.02em;">${formatShadesGrouped(entry.shades) || "-"}</td>
            <td style="border:1px solid #e0e0e0; padding:10px 6px; text-align:center; vertical-align:middle; font-size:1.02em;">₹${entry.price}</td>
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
          Dispatch List (Design Wise)
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchDesignCountsList}
          title="Refresh Designs"
          disabled={loadingDesignsList}
        >
          <RefreshCw
            className={`h-5 w-5 ${loadingDesignsList ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {/* View Mode Switch (Party Wise vs Date Wise) */}
      <div className="flex items-center justify-between gap-4 mb-4 bg-gray-100 p-1.5 rounded-lg border border-gray-200">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider pl-2">
          View Mode:
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={viewType === "party" ? "default" : "outline"}
            onClick={() => handleViewTypeChange("party")}
            className="text-xs h-8 gap-1.5 font-semibold"
          >
            <Users className="h-3.5 w-3.5" />
            Party Wise
          </Button>
          <Button
            size="sm"
            variant={viewType === "date" ? "default" : "outline"}
            onClick={() => handleViewTypeChange("date")}
            className="text-xs h-8 gap-1.5 font-semibold"
          >
            <Calendar className="h-3.5 w-3.5" />
            Date Wise
          </Button>
        </div>
      </div>

      {/* Filter Toggle Group */}
      <div className="flex flex-wrap gap-2 mb-4 justify-center">
        <ToggleGroup
          variant="outline"
          type="single"
          value={filter}
          onValueChange={(val) => val && setFilter(val)}
          className="flex-wrap justify-center"
        >
          <ToggleGroupItem value="all" aria-label="Show all">
            ALL
          </ToggleGroupItem>
          <ToggleGroupItem value="regular" aria-label="Show regular">
            Regular
          </ToggleGroupItem>
          <ToggleGroupItem value="print" aria-label="Show print">
            Print
          </ToggleGroupItem>
          <ToggleGroupItem value="Design No." aria-label="Show Design No.">
            Design No.
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-2 mb-4">
        <input
          value={designSearch}
          onChange={(e) => setDesignSearch(e.target.value)}
          placeholder="Search design..."
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="border-b mb-6" />

      <div className="mt-6">
        {loadingDesignsList ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-sm font-medium">Loading design list...</span>
          </div>
        ) : (
          <Accordion
            type="single"
            collapsible
            className="w-full"
            value={openDesignAccordion || undefined}
            onValueChange={(val) => {
              setOpenDesignAccordion(val);
              if (val) {
                const designName = val.replace("design-", "");
                if (designName) {
                  if (viewType === "party") {
                    if (
                      !partiesCacheByDesign[designName] &&
                      !loadingPartiesForDesign[designName]
                    ) {
                      // LEVEL 2: Trigger fetching parties for this design on click
                      fetchPartiesForDesign(designName);
                    }
                  } else {
                    if (
                      !entriesCacheByDesign[designName] &&
                      !loadingEntriesForDesign[designName]
                    ) {
                      // DATE-WISE: Trigger fetching date-wise entries for this design on click
                      fetchEntriesForDesign(designName);
                    }
                  }
                }
              }
            }}
          >
            {filteredDesignCounts.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                No designs found in dispatch list.
              </div>
            ) : (
              filteredDesignCounts.map((item) => (
                <AccordionItem
                  key={item.design}
                  value={`design-${item.design}`}
                  className="rounded-lg border mb-4 shadow-sm bg-white overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                    <AccordionTrigger className="text-lg flex items-center w-full font-semibold py-2 hover:no-underline">
                      <span className="text-left flex-grow font-bold text-gray-900">
                        {item.design}
                      </span>
                      <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full border border-emerald-100 mr-2">
                        {item.total_meters.toFixed(1)}m total
                      </span>
                      <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full border border-blue-100 mr-2">
                        {item.count} entr{item.count === 1 ? "y" : "ies"}
                      </span>
                    </AccordionTrigger>
                    <Button
                      size="icon"
                      variant="outline"
                      className="ml-2 shrink-0 flex items-center justify-center"
                      disabled={printingDesign === item.design}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrintDesign(item.design);
                      }}
                      title="Print Design Report"
                    >
                      {printingDesign === item.design ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      ) : (
                        <Printer size={18} />
                      )}
                    </Button>
                  </div>

                  <AccordionContent className="px-4 pb-4 pt-2 border-t bg-gray-50/50">
                    {viewType === "date" ? (
                      loadingEntriesForDesign[item.design] ? (
                        <div className="flex items-center justify-center py-6 text-gray-500 gap-2 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          <span>
                            Loading dispatch entries for design {item.design}...
                          </span>
                        </div>
                      ) : (entriesCacheByDesign[item.design] || []).length ===
                        0 ? (
                        <div className="text-center text-gray-400 py-4 text-sm">
                          No dispatch entries found for this design.
                        </div>
                      ) : (
                        <div className="space-y-3 mt-2">
                          {(entriesCacheByDesign[item.design] || []).map(
                            (entry) => (
                              <div
                                key={entry.id}
                                className="flex flex-col lg:flex-row gap-4 p-4 border border-gray-200 rounded-xl bg-white shadow-xs hover:shadow-sm transition-shadow relative pr-12"
                              >
                                {/* Column 1: Core Details */}
                                <div className="flex-1 min-w-[200px]">
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <h3 className="font-bold text-gray-900 leading-tight text-base">
                                        {entry.party_name}
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
                                        ? formatDate(entry.bhiwandi_date)
                                        : "-"}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-400 uppercase tracking-wider text-[10px]">
                                      Dispatch Date
                                    </span>
                                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                      {entry.dispatch_date
                                        ? formatDate(entry.dispatch_date)
                                        : "-"}
                                    </span>
                                  </div>
                                </div>

                                {/* Column 3: Shades Breakdown */}
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
                                        const shadeValue = shade[shadeName];
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
                                  {entry.order_remark && (
                                    <div className="text-xs text-gray-500 bg-gray-50 p-1.5 rounded">
                                      <span className="font-semibold text-gray-600">
                                        Remark:
                                      </span>{" "}
                                      {entry.order_remark}
                                    </div>
                                  )}
                                </div>

                                {/* Action button: Remove */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-3 right-3 h-8 w-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  onClick={() =>
                                    handleRemoveDispatchDate(
                                      entry.id,
                                      item.design,
                                      entry.party_id || 0
                                    )
                                  }
                                  title="Remove from Dispatch"
                                >
                                  <X className="h-5 w-5" />
                                </Button>
                              </div>
                            )
                          )}
                        </div>
                      )
                    ) : loadingPartiesForDesign[item.design] ? (
                      <div className="flex items-center justify-center py-6 text-gray-500 gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span>
                          Loading parties for design {item.design}...
                        </span>
                      </div>
                    ) : (partiesCacheByDesign[item.design] || []).length ===
                      0 ? (
                      <div className="text-center text-gray-400 py-4 text-sm">
                        No parties found for this design.
                      </div>
                    ) : (
                      <Accordion
                        type="single"
                        collapsible
                        className="w-full space-y-2 mt-2"
                        value={
                          openPartyAccordions[item.design] || undefined
                        }
                        onValueChange={(val) => {
                          setOpenPartyAccordions((prev) => ({
                            ...prev,
                            [item.design]: val,
                          }));
                          if (val) {
                            const partyId = Number(
                              val.replace("party-", "")
                            );
                            const cacheKey = `${item.design}_${partyId}`;
                            if (
                              !entriesCacheByDesignParty[cacheKey] &&
                              !loadingEntriesForDesignParty[cacheKey]
                            ) {
                              // LEVEL 3: Trigger fetching entry details for this design & party on click
                              fetchEntriesForDesignAndParty(
                                item.design,
                                partyId
                              );
                            }
                          }
                        }}
                      >
                        {(partiesCacheByDesign[item.design] || []).map(
                          (partySummary) => {
                            const cacheKey = `${item.design}_${partySummary.party_id}`;
                            const partyEntries =
                              entriesCacheByDesignParty[cacheKey] || [];
                            const isLoadingEntries =
                              loadingEntriesForDesignParty[cacheKey];

                            return (
                              <AccordionItem
                                key={partySummary.party_id}
                                value={`party-${partySummary.party_id}`}
                                className="rounded-lg border bg-white shadow-xs overflow-hidden"
                              >
                                <AccordionTrigger className="px-4 py-3 bg-white hover:bg-gray-50 font-medium text-sm flex items-center justify-between hover:no-underline">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900">
                                      {partySummary.party_name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-gray-500 mr-2">
                                    <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-100">
                                      {partySummary.total_meters.toFixed(1)}m
                                      total
                                    </span>
                                    <span className="text-gray-400">
                                      {partySummary.entry_count} item
                                      {partySummary.entry_count === 1
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
                                        Loading dispatches for{" "}
                                        {partySummary.party_name}...
                                      </span>
                                    </div>
                                  ) : partyEntries.length === 0 ? (
                                    <div className="text-center text-gray-400 py-4 text-sm">
                                      No dispatch entries found for this party.
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {partyEntries.map((entry) => (
                                        <div
                                          key={entry.id}
                                          className="flex flex-col lg:flex-row gap-4 p-4 border border-gray-200 rounded-xl bg-white shadow-xs hover:shadow-sm transition-shadow relative pr-12"
                                        >
                                          {/* Column 1: Core Details */}
                                          <div className="flex-1 min-w-[200px]">
                                            <div className="flex flex-col gap-2">
                                              <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-bold text-gray-900 leading-tight">
                                                  {entry.party_name}
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

                                          {/* Column 3: Shades Breakdown */}
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
                                            {entry.order_remark && (
                                              <div className="text-xs text-gray-500 bg-gray-50 p-1.5 rounded">
                                                <span className="font-semibold text-gray-600">
                                                  Remark:
                                                </span>{" "}
                                                {entry.order_remark}
                                              </div>
                                            )}
                                          </div>

                                          {/* Remove button */}
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-3 right-3 h-8 w-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            onClick={() =>
                                              handleRemoveDispatchDate(
                                                entry.id,
                                                item.design,
                                                partySummary.party_id
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
}

export default DispatchList;

