import { useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  PartyCount,
  DesignDetail,
  SelectedDesignDetail,
} from "@/types/party-file";
import { generatePartyReport } from "@/utils/party-file/pdf-generator";
import { PartyOrderTable } from "./PartyOrderTable";

interface PartyAccordionProps {
  partyCounts: PartyCount[];
  partyOrders: { [key: string]: DesignDetail[] };
  openAccordionItems: string[];
  setOpenAccordionItems: (items: string[]) => void;
  handleFetchOrderDetails: (party: string) => void;
  handleAddToDrawer: (entry: DesignDetail, party_name: string) => void;
  handleRemoveFromDrawer: (entry: DesignDetail) => void;
  handleAddToDrawerBhiwandi: (entry: DesignDetail, party_name: string) => void;
  handleRemoveFromDrawerBhiwandi: (entry: DesignDetail) => void;
  selectedEntries: SelectedDesignDetail[];
  selectedBhiwandiEntries: SelectedDesignDetail[];
  setIsAddPartOrderOpen: (open: boolean) => void;
  setSelectedOrder: (order: DesignDetail | null) => void;
  setPartyCounts: (counts: PartyCount[]) => void;
}

export const PartyAccordion = memo(
  ({
    partyCounts,
    partyOrders,
    openAccordionItems,
    setOpenAccordionItems,
    handleFetchOrderDetails,
    handleAddToDrawer,
    handleRemoveFromDrawer,
    handleAddToDrawerBhiwandi,
    handleRemoveFromDrawerBhiwandi,
    selectedEntries,
    selectedBhiwandiEntries,
    setIsAddPartOrderOpen,
    setSelectedOrder,
    setPartyCounts,
  }: PartyAccordionProps) => {
    const [generatingReport, setGeneratingReport] = useState<string | null>(
      null
    );

    const handleGenerateReport = useCallback(
      async (partyName: string) => {
        try {
          setGeneratingReport(partyName);
          const htmlReport = generatePartyReport(
            partyName,
            partyOrders[partyName]
          );

          const printWindow = window.open("", "_blank");
          if (!printWindow) {
            throw new Error(
              "Could not open print window. Please check your popup settings."
            );
          }

          printWindow.document.write(htmlReport);
          printWindow.document.close();

          // Wait for resources to load before printing
          printWindow.onload = () => {
            printWindow.print();
            printWindow.focus();
          };
        } catch (error) {
          console.error("Error generating report:", error);
        } finally {
          setGeneratingReport(null);
        }
      },
      [partyOrders]
    );

    const handleAccordionClick = useCallback(
      (partyName: string) => {
        if (!partyOrders[partyName]) {
          handleFetchOrderDetails(partyName);
        }
      },
      [partyOrders, handleFetchOrderDetails]
    );

    return (
      <Accordion
        type="multiple"
        value={openAccordionItems}
        onValueChange={setOpenAccordionItems}
        className="w-full"
      >
        {partyCounts
          .sort((a, b) => a.party_name.localeCompare(b.party_name))
          .map((item, index) => (
            <AccordionItem key={item.party_name} value={`item-${index}`}>
              <AccordionTrigger
                className="text-md flex justify-between items-center w-full px-4"
                onClick={() => handleAccordionClick(item.party_name)}
              >
                <span className="text-left flex-grow font-medium">
                  {item.party_name}
                </span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateReport(item.party_name);
                    }}
                    disabled={generatingReport === item.party_name}
                  >
                    {generatingReport === item.party_name ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 mr-1" />
                    )}
                    Report
                  </Button>
                  <span className="text-sm text-gray-500 min-w-20 text-right">
                    count: {item.design_entry_count}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {partyOrders[item.party_name] ? (
                  <PartyOrderTable
                    orders={partyOrders[item.party_name]}
                    partyName={item.party_name}
                    handleAddToDrawer={handleAddToDrawer}
                    handleRemoveFromDrawer={handleRemoveFromDrawer}
                    handleAddToDrawerBhiwandi={handleAddToDrawerBhiwandi}
                    handleRemoveFromDrawerBhiwandi={
                      handleRemoveFromDrawerBhiwandi
                    }
                    selectedEntries={selectedEntries}
                    selectedBhiwandiEntries={selectedBhiwandiEntries}
                    setIsAddPartOrderOpen={setIsAddPartOrderOpen}
                    setSelectedOrder={setSelectedOrder}
                    setPartyCounts={setPartyCounts}
                  />
                ) : (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    <p>Loading order details...</p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        {partyCounts.length === 0 && (
          <div className="text-center p-6 text-gray-500">
            No party records found
          </div>
        )}
      </Accordion>
    );
  }
);

PartyAccordion.displayName = "PartyAccordion";
