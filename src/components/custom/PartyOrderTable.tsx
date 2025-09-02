import { Button } from "@/components/ui/button";
import { DesignDetail } from "@/types/party-file";
import { formatDate } from "@/utils/party-file/date-utils";
import { fetchPartyCounts } from "@/utils/party-file/data-fetching";
import supabase from "@/utils/supabase";
import { SelectedDesignDetail, PartyCount } from "@/types/party-file";
import { useToast } from "@/hooks/use-toast";

interface PartyOrderTableProps {
  orders: DesignDetail[];
  partyName: string;
  handleAddToDrawer: (entry: DesignDetail, party_name: string) => void;
  handleRemoveFromDrawer: (entry: DesignDetail) => void;
  handleAddToDrawerBhiwandi: (entry: DesignDetail, party_name: string) => void;
  handleRemoveFromDrawerBhiwandi: (entry: DesignDetail) => void;
  selectedEntries: SelectedDesignDetail[];
  selectedBhiwandiEntries: SelectedDesignDetail[];
  setIsAddPartOrderOpen: (open: boolean) => void;
  setSelectedOrder: (order: DesignDetail | null) => void;
  setPartyCounts: (counts: PartyCount[]) => void;
  refreshPartyOrders: (parties: string[]) => Promise<void>;
}

export function PartyOrderTable({
  orders,
  partyName,
  handleAddToDrawer,
  handleRemoveFromDrawer,
  handleAddToDrawerBhiwandi,
  handleRemoveFromDrawerBhiwandi,
  selectedEntries,
  selectedBhiwandiEntries,
  setPartyCounts,
  refreshPartyOrders,
}: PartyOrderTableProps) {
  const { toast } = useToast();
  return (
    <div className="overflow-x-auto">
      <table className="w-full divide-y divide-gray-200">
        <tbody>
          {orders
            .sort((a, b) => a.design.localeCompare(b.design))
            .map((order, orderIndex) => (
              <tr
                key={order.design_entry_id}
                className={
                  order.bhiwandi_date
                    ? "bg-yellow-100"
                    : order.canceled
                    ? "bg-red-100"
                    : orderIndex % 2 === 0
                    ? "bg-white"
                    : "bg-gray-50"
                }
              >
                <td className="px-2 py-4 w-3/6 text-sm font-medium text-gray-900">
                  <div className="break-words">
                    {order.design}
                    {order.remark && (
                      <>
                        <br />
                        Remark: {order.remark}
                      </>
                    )}
                    {order.price && (
                      <>
                        <br />
                        Price: {order.price}
                      </>
                    )}
                    {order.order_date && (
                      <>
                        <br />
                        {formatDate(order.order_date)}
                      </>
                    )}
                    {order.bhiwandi_date && (
                      <span className="text-red-600">
                        <br />
                        {formatDate(order.bhiwandi_date)}
                      </span>
                    )}
                    {order.order_no && (
                      <>
                        <br />
                        Order No. :{order.order_no}
                      </>
                    )}
                  </div>
                </td>
                <td className="px-2 py-4 w-2/6 text-sm text-gray-500">
                  {order.shades &&
                    order.shades.map((shade, idx) => {
                      const shadeName = Object.keys(shade)[0];
                      const shadeValue = shade[shadeName];
                      if (shadeValue === "") {
                        return null;
                      }
                      return (
                        <div key={idx}>
                          {shadeName}: {shadeValue}m{" "}
                        </div>
                      );
                    })}
                </td>
                <td className="px-2 py-4 w-1/6 text-sm text-gray-500">
                  {order.bhiwandi_date ? (
                    selectedEntries.some(
                      (entry) => entry.design_entry_id === order.design_entry_id
                    ) ? (
                      <Button
                        className="ml-2 bg-red-500 active:bg-red-500 visited:bg-red-500 hover:bg-red-500 rounded-full w-10 h-10 text-lg text-white"
                        onClick={() => handleRemoveFromDrawer(order)}
                      >
                        X
                      </Button>
                    ) : (
                      <>
                        <Button
                          className="ml-2 bg-green-500 active:bg-green-500 visited:bg-green-500 hover:bg-green-500 rounded-full w-10 h-10 text-lg text-white"
                          onClick={() => handleAddToDrawer(order, partyName)}
                        >
                          D
                        </Button>
                        <Button
                          className="m-2 mt-8 bg-red-500 active:bg-red-500 visited:bg-red-500 hover:bg-red-500 rounded-full w-10 h-10 text-white text-xl"
                          onClick={() => {
                            const confirmDelete = window.confirm(
                              `Are you sure you want to delete the entry from bhiwandi list for ${order.design} from ${partyName} with order number ${order.order_no}?`
                            );
                            if (confirmDelete) {
                              const updateBhiwandiDate = async () => {
                                try {
                                  const { error } = await supabase
                                    .from("design_entries")
                                    .update({
                                      bhiwandi_date: null,
                                    })
                                    .eq("id", order.design_entry_id);
                                  if (error) throw error;
                                  toast({
                                    title: "Success",
                                    description:
                                      "Bhiwandi date deleted successfully.",
                                  });
                                  const counts = await fetchPartyCounts();
                                  setPartyCounts(counts);
                                  await refreshPartyOrders([partyName]);
                                } catch (error) {
                                  console.error(
                                    "Error deleting Bhiwandi date:",
                                    error
                                  );
                                  toast({
                                    title: "Error",
                                    description: `Failed to delete Bhiwandi date: ${
                                      error instanceof Error
                                        ? error.message
                                        : "Unknown error"
                                    }`,
                                    variant: "destructive",
                                  });
                                }
                              };
                              updateBhiwandiDate();
                            }
                          }}
                        >
                          ↩︎
                        </Button>
                      </>
                    )
                  ) : selectedBhiwandiEntries.some(
                      (entry) => entry.design_entry_id === order.design_entry_id
                    ) ? (
                    <Button
                      className="ml-2 bg-red-500 active:bg-red-500 visited:bg-red-500 hover:bg-red-500 rounded-full w-10 h-10 text-lg text-white"
                      onClick={() => handleRemoveFromDrawerBhiwandi(order)}
                    >
                      X
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="ml-2 bg-yellow-500 active:bg-yellow-500 visited:bg-yellow-500 hover:bg-yellow-500 rounded-full w-10 h-10 text-lg text-white"
                        onClick={() =>
                          handleAddToDrawerBhiwandi(order, partyName)
                        }
                      >
                        B
                      </Button>
                      <Button
                        className="m-2 mt-8 bg-red-500 active:bg-red-500 visited:bg-red-500 hover:bg-red-500 rounded-full w-10 h-10 text-xl text-white"
                        onClick={() => {
                          const confirmDelete = window.confirm(
                            `Are you sure you want to cancel the entry for ${order.design} from ${partyName} with order number ${order.order_no}?`
                          );
                          if (confirmDelete) {
                            const cancelEntry = async () => {
                              try {
                                const now = new Date().toISOString();
                                const { error } = await supabase
                                  .from("design_entries")
                                  .update({
                                    bhiwandi_date: now,
                                    dispatch_date: now,
                                    remark: "Entry Cancelled",
                                  })
                                  .eq("id", order.design_entry_id);
                                if (error) throw error;
                                toast({
                                  title: "Success",
                                  description: "Entry cancelled successfully.",
                                });
                                const counts = await fetchPartyCounts();
                                setPartyCounts(counts);
                                await refreshPartyOrders([partyName]);
                              } catch (error) {
                                console.error("Error cancelling entry:", error);
                                toast({
                                  title: "Error",
                                  description: `Failed to cancel entry: ${
                                    error instanceof Error
                                      ? error.message
                                      : "Unknown error"
                                  }`,
                                  variant: "destructive",
                                });
                              }
                            };
                            cancelEntry();
                          }
                        }}
                      >
                        X
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
