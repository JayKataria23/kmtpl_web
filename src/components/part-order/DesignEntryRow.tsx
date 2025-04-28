import { Button } from "@/components/ui/button";

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

interface DesignEntryRowProps {
  entry: DesignEntry;
  onSendToBhiwandi: (entryId: number) => void;
  onDeleteOrder: (entryId: number) => void;
  onDispatch: (entryId: number) => void;
  onReverseBhiwandi: (entryId: number) => void;
}

export default function DesignEntryRow({
  entry,
  onSendToBhiwandi,
  onDeleteOrder,
  onDispatch,
  onReverseBhiwandi,
}: DesignEntryRowProps) {
  return (
    <tr className={entry.bhiwandi_date ? "bg-yellow-100" : "bg-white"}>
      <td className="px-2 py-4 w-3/6 text-sm font-medium text-gray-900">
        <div className="break-words text-red-500">{entry.bill_to_party}</div>
        {entry.order_remark && (
          <div className="text-xs text-gray-500 mt-1">
            Order Remark: {entry.order_remark}
          </div>
        )}
        {entry.design_remark && (
          <div className="text-xs text-gray-500 mt-1">
            Design Remark: {entry.design_remark}
          </div>
        )}
        <div className="text-xs text-gray-500 mt-1">Price: {entry.price}</div>
        <div className="text-xs text-gray-500 mt-1">
          Order No: {entry.order_no}
        </div>
        {entry.bhiwandi_date && (
          <div className="text-xs text-gray-500 mt-1">
            Bhiwandi Date:{" "}
            {new Date(entry.bhiwandi_date).toLocaleDateString("en-GB")}
          </div>
        )}
      </td>
      <td className="px-2 py-4 w-3/6 text-sm text-gray-500">
        {entry.shades &&
          entry.shades.map((shade, idx) => {
            const shadeName = Object.keys(shade)[0];
            const shadeValue = shade[shadeName];
            if (shadeValue === "") return null;
            return (
              <div key={idx}>
                {shadeName}: {shadeValue}m
              </div>
            );
          })}
      </td>
      {!entry.bhiwandi_date ? (
        <td className="px-2 py-4 w-1/6 text-right">
          <Button
            onClick={() => onSendToBhiwandi(entry.design_entry_id)}
            className="ml-2 rounded-full w-8 h-8 bg-yellow-500 hover:bg-yellow-600"
          >
            B
          </Button>
          <Button
            onClick={() => onDeleteOrder(entry.design_entry_id)}
            className="ml-2 rounded-full w-8 h-8 bg-red-500 hover:bg-red-600"
          >
            X
          </Button>
        </td>
      ) : (
        <td className="px-2 py-4 w-1/6 text-right">
          <Button
            onClick={() => onDispatch(entry.design_entry_id)}
            className="ml-2 rounded-full w-8 h-8 bg-green-500 hover:bg-green-600"
          >
            D
          </Button>
          <Button
            onClick={() => onReverseBhiwandi(entry.design_entry_id)}
            className="ml-2 rounded-full w-8 h-8 bg-blue-500 hover:bg-blue-600"
          >
            ↺
          </Button>
        </td>
      )}
    </tr>
  );
}
