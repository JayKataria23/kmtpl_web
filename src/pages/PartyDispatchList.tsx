import { useEffect, useState, useCallback, useRef } from "react";
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
}

interface GroupedByDesign {
  design: string;
  entries: DispatchEntry[];
  total_meters: number;
}

interface PartyGroup {
  party_name: string;
  designs: GroupedByDesign[];
  total_entries: number;
}

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
}

const PartyDispatchList = () => {
  const [partyGroups, setPartyGroups] = useState<PartyGroup[]>([]);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [openDesignAccordion, setOpenDesignAccordion] = useState<string | null>(
    null
  );
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchDispatchEntries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc("get_design_entries_details_with_dispatch")
        .order("dispatch_date", { ascending: false });

      if (error) throw error;

      // Transform and group the data by party and then by design
      const groupedByParty: { [key: string]: PartyGroup } = {};

      data.forEach((entry: DispatchEntryResponse) => {
        const partyName = entry.bill_to_party;
        const designName = entry.title;

        if (!groupedByParty[partyName]) {
          groupedByParty[partyName] = {
            party_name: partyName,
            designs: [],
            total_entries: 0,
          };
        }

        const party = groupedByParty[partyName];
        party.total_entries++;

        let designGroup = party.designs.find((d) => d.design === designName);
        if (!designGroup) {
          designGroup = {
            design: designName,
            entries: [],
            total_meters: 0,
          };
          party.designs.push(designGroup);
        }

        // Calculate total meters for this entry
        let entryMeters = 0;
        if (entry.shades) {
          entry.shades.forEach((shade: { [key: string]: string }) => {
            const value = Object.values(shade)[0];
            entryMeters += value ? parseFloat(value) : 0;
          });
        }

        designGroup.total_meters += entryMeters;
        designGroup.entries.push({
          id: entry.id,
          design: entry.title,
          price: entry.price,
          remark: entry.design_remark,
          shades: entry.shades || [],
          dispatch_date: entry.dispatch_date,
          order_no: entry.order_no,
          ship_to_party: entry.ship_to_party,
          broker_name: entry.broker,
          transporter_name: entry.transport,
        });
      });

      // Sort parties alphabetically
      const sortedParties = Object.values(groupedByParty).sort((a, b) =>
        a.party_name.localeCompare(b.party_name)
      );

      // Sort designs within each party
      sortedParties.forEach((party) => {
        party.designs.sort((a, b) => a.design.localeCompare(b.design));
      });

      setPartyGroups(sortedParties);
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

  const handleRemoveDispatchDate = async (id: number) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this entry from dispatch list?"
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("design_entries")
        .update({ dispatch_date: null })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Entry removed from dispatch list",
      });

      fetchDispatchEntries(); // Refresh the data
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
      <div className="border-b mb-6" />
      <div className="mt-6">
        <Accordion
          type="single"
          collapsible
          className="w-full"
          value={openAccordion as string | undefined}
          onValueChange={setOpenAccordion}
        >
          {partyGroups.length === 0 ? (
            <div className="text-center text-gray-500 py-12">No party dispatches found.</div>
          ) : (
            partyGroups.map((party, partyIndex) => (
              <AccordionItem key={partyIndex} value={`party-${partyIndex}`} className="rounded-lg border mb-4 shadow-sm bg-white">
                <div className="flex items-center justify-between px-4 py-2">
                  <AccordionTrigger className="text-lg flex items-center w-full hover:bg-gray-50 font-semibold">
                    <span className="text-left flex-grow">{party.party_name}</span>
                    <div className="flex items-center gap-4">
                      <Button 
                        size="icon" 
                        variant="outline"
                        className="flex items-center justify-center"
                        onClick={e => { e.stopPropagation(); handlePrintParty(party); }}
                        title="Print Party Dispatch"
                      >
                        <Printer size={18} />
                      </Button>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                        {party.total_entries} entr{party.total_entries === 1 ? "y" : "ies"}
                      </span>
                    </div>
                  </AccordionTrigger>
                </div>
                <AccordionContent className="p-4">
                  <Accordion
                    type="single"
                    collapsible
                    className="w-full"
                    value={openDesignAccordion as string | undefined}
                    onValueChange={setOpenDesignAccordion}
                  >
                    {party.designs.length === 0 ? (
                      <div className="text-center text-gray-400 py-4">No designs for this party.</div>
                    ) : (
                      party.designs.map((design, designIndex) => (
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
                                  className={`p-4 mb-4 rounded-lg border bg-white relative ${
                                    entryIndex % 2 === 0 ? "" : "bg-gray-50"
                                  }`}
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                    <div>
                                      <p><strong>Order No:</strong> {entry.order_no}</p>
                                      <p><strong>Ship To:</strong> {entry.ship_to_party}</p>
                                      <p><strong>Dispatch Date:</strong> {formatDate(entry.dispatch_date)}</p>
                                    </div>
                                    <div>
                                      <p><strong>Price:</strong> {entry.price}</p>
                                      <p><strong>Remark:</strong> {entry.remark || "N/A"}</p>
                                      <div>
                                        <strong>Shades:</strong>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {entry.shades && entry.shades.length > 0 ? (
                                            entry.shades.map((shade, idx) => {
                                              const shadeName = Object.keys(shade)[0];
                                              const shadeValue = shade[shadeName];
                                              if (!shadeValue) return null;
                                              return (
                                                <span
                                                  key={idx}
                                                  className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium"
                                                >
                                                  {shadeName}: {shadeValue}m
                                                </span>
                                              );
                                            })
                                          ) : (
                                            <span className="text-gray-400">No shades</span>
                                          )}
                                        </div>
                                      </div>
                                      <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2"
                                        onClick={() => handleRemoveDispatchDate(entry.id)}
                                        title="Remove from Dispatch"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
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
