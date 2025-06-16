import { useCallback, memo } from "react";
import { Loader2 } from "lucide-react";
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
    const handleAccordionClick = useCallback(
      (partyName: string) => {
        handleFetchOrderDetails(partyName);
      },
      [handleFetchOrderDetails]
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
