import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import DesignEntryRow from "./DesignEntryRow";

interface DesignEntry {
  design_entry_id: number;
  design_title: string;
  price: string;
  design_remark: string;
  shades: { [key: string]: string }[];
  order_id: string;
  order_no: number;
  order_remark: string;
  bhiwandi_date: string | null;
  dispatch_date: string | null;
  bill_to_party: string;
}

interface DesignEntriesTableProps {
  designEntries: { [key: string]: DesignEntry[] };
  openAccordionItems: string[];
  onOpenAccordionItemsChange: (items: string[]) => void;
  onSendToBhiwandi: (entryId: number) => void;
  onDeleteOrder: (entryId: number) => void;
  onDispatch: (entryId: number) => void;
  onReverseBhiwandi: (entryId: number) => void;
}

export default function DesignEntriesTable({
  designEntries,
  openAccordionItems,
  onOpenAccordionItemsChange,
  onSendToBhiwandi,
  onDeleteOrder,
  onDispatch,
  onReverseBhiwandi,
}: DesignEntriesTableProps) {
  // Convert designEntries to an array of [design, entries] pairs and sort them alphabetically
  const sortedDesignEntries = Object.entries(designEntries).sort(
    ([designA], [designB]) => designA.localeCompare(designB)
  );

  return (
    <Accordion
      type="multiple"
      className="w-full"
      value={openAccordionItems}
      onValueChange={onOpenAccordionItemsChange}
    >
      {sortedDesignEntries.map(([design, entries], index) => (
        <AccordionItem key={index} value={`item-${index}`}>
          <AccordionTrigger className="text-lg flex justify-between items-center w-full">
            <span className="text-left flex-grow">{design}</span>
            <span className="text-sm text-gray-500 ml-2 mr-3">
              count: {entries.length}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <tbody>
                  {entries.map((entry) => (
                    <DesignEntryRow
                      key={entry.design_entry_id}
                      entry={entry}
                      onSendToBhiwandi={onSendToBhiwandi}
                      onDeleteOrder={onDeleteOrder}
                      onDispatch={onDispatch}
                      onReverseBhiwandi={onReverseBhiwandi}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
