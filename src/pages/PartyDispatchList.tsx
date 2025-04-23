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
import { Printer } from "lucide-react";

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

  const generatePrintContentForParty = (party: PartyGroup) => {
    let content = `
      <div class="header">
        <h1>Dispatch List</h1>
        <h2>${party.party_name}</h2>
      </div>
    `;

    let totalMeters = 0;
    
    party.designs.forEach(design => {
      content += `
        <div class="design-section">
          <h3>${design.design} - Price: ${design.entries[0].price}</h3>
      `;

      design.entries.forEach(entry => {
        let entryMeters = 0;
        let shadesContent = '';
        
        entry.shades.forEach(shade => {
          const shadeName = Object.keys(shade)[0];
          const shadeValue = shade[shadeName];
          if (!shadeValue) return;
          
          const meters = parseFloat(shadeValue);
          entryMeters += meters;
          shadesContent += `
            <div class="shade-item">
              ${shadeName}: ${shadeValue}m
            </div>
          `;
        });
        
        totalMeters += entryMeters;
        
        content += `
          <div class="entry">
            <div class="entry-grid">
              <div>
                <p><strong>Order No:</strong> ${entry.order_no}</p>
                <p><strong>Ship To:</strong> ${entry.ship_to_party}</p>
                <p><strong>Broker:</strong> ${entry.broker_name}</p>
                <p><strong>Transporter:</strong> ${entry.transporter_name}</p>
                <p><strong>Dispatch Date:</strong> ${formatDate(entry.dispatch_date)}</p>
              </div>
              <div>
                <p><strong>Price:</strong> ${entry.price}</p>
                <p><strong>Remark:</strong> ${entry.remark || "N/A"}</p>
                <div>
                  <strong>Shades:</strong>
                  ${shadesContent}
                </div>
                <p><strong>Total Meters:</strong> ${entryMeters.toFixed(2)}m</p>
              </div>
            </div>
          </div>
        `;
      });
      
      content += `</div>`;
    });
    
    content += `
      <div class="footer">
        <p><strong>Total Entries:</strong> ${party.total_entries}</p>
        <p><strong>Total Meters:</strong> ${totalMeters.toFixed(2)}m</p>
      </div>
    `;
    
    return content;
  };

  return (
    <div className="container mx-auto mt-10 text-center">
      <h1 className="text-2xl font-bold mb-6">Party Dispatch List</h1>
      <Button onClick={() => navigate("/")} className="mb-6">
        Back to Home
      </Button>

      <div className="mt-6">
        <Accordion
          type="single"
          collapsible
          className="w-full"
          value={openAccordion as string | undefined}
          onValueChange={setOpenAccordion}
        >
          {partyGroups.map((party, partyIndex) => (
            <AccordionItem key={partyIndex} value={`party-${partyIndex}`}>
              <AccordionTrigger className="p-4">
                <div className="flex justify-between w-full">
                  <span className="text-lg font-semibold">
                    {party.party_name}
                  </span>
                  <div className="flex items-center gap-4">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrintParty(party);
                      }}
                    >
                      <Printer size={16} />
                      Print
                    </Button>
                    <span className="text-sm text-gray-500">
                      Designs: {party.total_entries}
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4">
                <Accordion
                  type="single"
                  collapsible
                  className="w-full"
                  value={openDesignAccordion as string | undefined}
                  onValueChange={setOpenDesignAccordion}
                >
                  {party.designs.map((design, designIndex) => (
                    <AccordionItem
                      key={designIndex}
                      value={`design-${partyIndex}-${designIndex}`}
                    >
                      <AccordionTrigger className="p-4 bg-gray-50">
                        <div className="flex justify-between w-full">
                          <span className="font-medium">{design.design}</span>
                          <span className="text-sm text-gray-500">
                            {design.entries[0].price}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {design.entries.map((entry, entryIndex) => (
                          <div
                            key={entryIndex}
                            className={`p-4 mb-4 rounded-lg border ${
                              entryIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }`}
                          >
                            <div className="grid grid-cols-2 gap-4 text-left">
                              <div>
                                <p>
                                  <strong>Order No:</strong> {entry.order_no}
                                </p>
                                <p>
                                  <strong>Ship To:</strong>{" "}
                                  {entry.ship_to_party}
                                </p>
                                <p>
                                  <strong>Broker:</strong> {entry.broker_name}
                                </p>
                                <p>
                                  <strong>Transporter:</strong>{" "}
                                  {entry.transporter_name}
                                </p>
                                <p>
                                  <strong>Dispatch Date:</strong>{" "}
                                  {formatDate(entry.dispatch_date)}
                                </p>
                              </div>
                              <div>
                                <p>
                                  <strong>Price:</strong> {entry.price}
                                </p>
                                <p>
                                  <strong>Remark:</strong>{" "}
                                  {entry.remark || "N/A"}
                                </p>
                                <div>
                                  <strong>Shades:</strong>
                                  {entry.shades.map((shade, idx) => {
                                    const shadeName = Object.keys(shade)[0];
                                    const shadeValue = shade[shadeName];
                                    if (!shadeValue) return null;
                                    return (
                                      <div key={idx} className="ml-2">
                                        {shadeName}: {shadeValue}m
                                      </div>
                                    );
                                  })}
                                </div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="mt-2"
                                  onClick={() =>
                                    handleRemoveDispatchDate(entry.id)
                                  }
                                >
                                  Remove from Dispatch
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          ))}
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
