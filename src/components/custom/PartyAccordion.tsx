import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
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

export function PartyAccordion({
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
}: PartyAccordionProps) {
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
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger
              className="text-md flex justify-between items-center w-full"
              onClick={() => handleFetchOrderDetails(item.party_name)}
            >
              <span className="text-left flex-grow">{item.party_name}</span>
              <Button
                variant="outline"
                size="sm"
                className="mx-2"
                onClick={(e) => {
                  e.stopPropagation();
                  generatePartyReport(
                    item.party_name,
                    partyOrders[item.party_name]
                  );
                }}
              >
                <FileText className="w-4 h-4 mr-1" />
                Report
              </Button>
              <span className="text-sm min-w-20 text-gray-500 ml-2">
                count: {item.design_entry_count}
              </span>
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
                <p>Loading order details...</p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
    </Accordion>
  );
}
