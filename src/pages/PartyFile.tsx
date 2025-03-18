import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import supabase from "@/utils/supabase";
import { useToast } from "@/hooks/use-toast";
import { FileText } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerClose,
  DrawerTrigger,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Toaster } from "@/components/ui";
import AddPartOrder from "@/components/custom/AddPartOrder";
import {
  PartyCount,
  DesignDetail,
  SelectedDesignDetail,
} from "@/types/party-file";
import { generatePartyReport } from "@/utils/party-file/pdf-generator";
import { formatDate } from "@/utils/party-file/date-utils";
import {
  fetchPartyCounts,
  fetchOrderDetails,
} from "@/utils/party-file/data-fetching";
import {
  addToDrawer,
  removeFromDrawer,
  addToDrawerBhiwandi,
  removeFromDrawerBhiwandi,
  handleDispatch,
  handleSendAllToBhiwandi,
} from "@/utils/party-file/drawer-utils";

function PartyFile() {
  const [partyCounts, setPartyCounts] = useState<PartyCount[]>([]);
  const [partyOrders, setPartyOrders] = useState<{
    [key: string]: DesignDetail[];
  }>({});
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<
    SelectedDesignDetail[]
  >([]);
  const { toast } = useToast();
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  const [isAddPartOrderOpen, setIsAddPartOrderOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DesignDetail | null>(null);
  const [isSendToBhiwandiOpen, setIsSendToBhiwandiOpen] = useState(false);
  const [selectedBhiwandiEntries, setSelectedBhiwandiEntries] = useState<
    SelectedDesignDetail[]
  >([]);

  useEffect(() => {
    const loadPartyCounts = async () => {
      const counts = await fetchPartyCounts();
      setPartyCounts(counts);
    };
    loadPartyCounts();
  }, []);

  const handleFetchOrderDetails = async (party: string) => {
    const orders = await fetchOrderDetails(party);
    setPartyOrders((prev) => ({ ...prev, [party]: orders }));
  };

  const handleAddToDrawer = (entry: DesignDetail, party_name: string) => {
    setSelectedEntries((prev) => addToDrawer(entry, party_name, prev));
  };

  const handleRemoveFromDrawer = (entry: DesignDetail) => {
    setSelectedEntries((prev) => removeFromDrawer(entry, prev));
  };

  const handleAddToDrawerBhiwandi = (
    entry: DesignDetail,
    party_name: string
  ) => {
    setSelectedBhiwandiEntries((prev) =>
      addToDrawerBhiwandi(entry, party_name, prev)
    );
  };

  const handleRemoveFromDrawerBhiwandi = (entry: DesignDetail) => {
    setSelectedBhiwandiEntries((prev) => removeFromDrawerBhiwandi(entry, prev));
  };

  const onDispatch = async () => {
    const result = await handleDispatch(selectedEntries);
    if (result.success) {
      setSelectedEntries([]);
      setIsDrawerOpen(false);
      const counts = await fetchPartyCounts();
      setPartyCounts(counts);
      setOpenAccordionItems([]);
      toast({
        title: "Success",
        description: "Entries dispatched successfully",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Error sending entries to Dispatch. ${result.error}`,
      });
    }
  };

  const onSendToBhiwandi = async () => {
    const result = await handleSendAllToBhiwandi(selectedBhiwandiEntries);
    if (result.success) {
      const counts = await fetchPartyCounts();
      setPartyCounts(counts);
      setSelectedBhiwandiEntries([]);
      setIsSendToBhiwandiOpen(false);
      toast({
        title: "Success",
        description: `Successfully sent entries to Bhiwandi.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to send entries to Bhiwandi: ${result.error}`,
      });
    }
  };

  return (
    <div className="container mx-auto mt-10 p-4 relative">
      <AddPartOrder
        open={isAddPartOrderOpen}
        onClose={() => setIsAddPartOrderOpen(false)}
        design_entry_id={selectedOrder?.design_entry_id.toString() || ""}
        design_name={selectedOrder?.design || ""}
        party_name={selectedOrder?.party_name || ""}
        price={selectedOrder?.price || 0}
      />
      <div className="sticky top-0 bg-white z-10 p-4 border-b-2">
        <Button onClick={() => navigate("/")}>Home</Button>
        <Drawer
          open={isDrawerOpen}
          onOpenChange={() => {
            setIsDrawerOpen((open) => !open);
            setOpenAccordionItems([]);
          }}
        >
          <DrawerTrigger asChild>
            <Button className="mx-4">Dispatch</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Selected Entries</DrawerTitle>
              <DrawerDescription>
                Entries added to Dispatch list
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {selectedEntries.map((entry, index) => (
                <div key={index} className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">{entry.design}</h3>
                  <table className="w-full divide-y divide-gray-200">
                    <tbody>
                      <tr>
                        <td className="px-2 py-4 w-3/6 text-sm font-medium text-gray-900">
                          <div className="break-words">
                            {entry.party_name}
                            {entry.remark && (
                              <>
                                <br />
                                Remark: {entry.remark}
                              </>
                            )}
                            {entry.price && (
                              <>
                                <br />
                                Price: {entry.price}
                              </>
                            )}
                            <br />
                            <input
                              type="date"
                              className="mt-2 border rounded p-1"
                              value={entry.date}
                              onChange={(e) => {
                                const updatedDate = e.target.value;
                                setSelectedEntries((prev) =>
                                  prev.map((e) =>
                                    e.design_entry_id === entry.design_entry_id
                                      ? { ...e, date: updatedDate }
                                      : e
                                  )
                                );
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-2 py-4 w-2/6 text-sm text-gray-500">
                          {entry.shades &&
                            entry.shades.map((shade, idx) => {
                              const shadeName = Object.keys(shade)[0];
                              const shadeValue = shade[shadeName];
                              if (shadeValue === "" || shadeValue === "NaN") {
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
                          <Button
                            className="ml-2 rounded-full w-10 h-10 text-lg text-white my-1"
                            onClick={() => {
                              setIsAddPartOrderOpen(true);
                              setSelectedOrder(entry);
                            }}
                          >
                            P
                          </Button>
                          <Button
                            className="ml-2 my-1 bg-green-500 active:bg-green-500 visited:bg-green-500 hover:bg-green-500 rounded-full w-10 h-10 text-lg text-white"
                            onClick={() => handleRemoveFromDrawer(entry)}
                          >
                            X
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
            <DrawerFooter>
              <Button
                onClick={onDispatch}
                className="mr-2"
                disabled={selectedEntries.length === 0}
              >
                Dispatch
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
        <Drawer
          open={isSendToBhiwandiOpen}
          onOpenChange={setIsSendToBhiwandiOpen}
        >
          <DrawerTrigger asChild>
            <Button className="">Bhiwandi</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Send All Entries to Bhiwandi</DrawerTitle>
              <DrawerDescription>
                {selectedBhiwandiEntries.length > 0
                  ? selectedBhiwandiEntries.map((entry, index) => (
                      <div key={index}>
                        {entry.party_name}: {entry.design}
                      </div>
                    ))
                  : "No entries selected."}
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <Button onClick={onSendToBhiwandi} className="mr-2">
                Confirm
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
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
                  <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-gray-200">
                      <tbody>
                        {partyOrders[item.party_name]
                          ?.sort((a, b) => a.design.localeCompare(b.design))
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
                                    (entry) =>
                                      entry.design_entry_id ===
                                      order.design_entry_id
                                  ) ? (
                                    <Button
                                      className="ml-2 bg-red-500 active:bg-red-500 visited:bg-red-500 hover:bg-red-500 rounded-full w-10 h-10 text-lg text-white"
                                      onClick={() =>
                                        handleRemoveFromDrawer(order)
                                      }
                                    >
                                      X
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        className="ml-2 bg-green-500 active:bg-green-500 visited:bg-green-500 hover:bg-green-500 rounded-full w-10 h-10 text-lg text-white"
                                        onClick={() =>
                                          handleAddToDrawer(
                                            order,
                                            item.party_name
                                          )
                                        }
                                      >
                                        D
                                      </Button>
                                      <Button
                                        className="m-2 mt-8 bg-red-500 active:bg-red-500 visited:bg-red-500 hover:bg-red-500 rounded-full w-10 h-10 text-white text-xl"
                                        onClick={() => {
                                          const confirmDelete = window.confirm(
                                            `Are you sure you want to delete the entry from bhiwandi list for ${order.design} from ${item.party_name} with order number ${order.order_no}?`
                                          );
                                          if (confirmDelete) {
                                            const updateBhiwandiDate =
                                              async () => {
                                                try {
                                                  const { error } =
                                                    await supabase
                                                      .from("design_entries")
                                                      .update({
                                                        bhiwandi_date: null,
                                                      })
                                                      .eq(
                                                        "id",
                                                        order.design_entry_id
                                                      );
                                                  if (error) throw error;
                                                  toast({
                                                    title: "Success",
                                                    description:
                                                      "Bhiwandi date deleted successfully.",
                                                  });
                                                  const counts =
                                                    await fetchPartyCounts();
                                                  setPartyCounts(counts);
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
                                    (entry) =>
                                      entry.design_entry_id ===
                                      order.design_entry_id
                                  ) ? (
                                  <Button
                                    className="ml-2 bg-red-500 active:bg-red-500 visited:bg-red-500 hover:bg-red-500 rounded-full w-10 h-10 text-lg text-white"
                                    onClick={() =>
                                      handleRemoveFromDrawerBhiwandi(order)
                                    }
                                  >
                                    X
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      className="ml-2 bg-yellow-500 active:bg-yellow-500 visited:bg-yellow-500 hover:bg-yellow-500 rounded-full w-10 h-10 text-lg text-white"
                                      onClick={() =>
                                        handleAddToDrawerBhiwandi(
                                          order,
                                          item.party_name
                                        )
                                      }
                                    >
                                      B
                                    </Button>
                                    <Button
                                      className="m-2 mt-8 bg-red-500 active:bg-red-500 visited:bg-red-500 hover:bg-red-500 rounded-full w-10 h-10 text-xl text-white"
                                      onClick={() => {
                                        const confirmDelete = window.confirm(
                                          `Are you sure you want to cancel the entry for ${order.design} from ${item.party_name} with order number ${order.order_no}?`
                                        );
                                        if (confirmDelete) {
                                          const cancelEntry = async () => {
                                            try {
                                              const now =
                                                new Date().toISOString();
                                              const { error } = await supabase
                                                .from("design_entries")
                                                .update({
                                                  bhiwandi_date: now,
                                                  dispatch_date: now,
                                                  remark: "Entry Cancelled",
                                                })
                                                .eq(
                                                  "id",
                                                  order.design_entry_id
                                                );
                                              if (error) throw error;
                                              toast({
                                                title: "Success",
                                                description:
                                                  "Entry cancelled successfully.",
                                              });
                                              const counts =
                                                await fetchPartyCounts();
                                              setPartyCounts(counts);
                                            } catch (error) {
                                              console.error(
                                                "Error cancelling entry:",
                                                error
                                              );
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
                ) : (
                  <p>Loading order details...</p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>
      <Toaster />
    </div>
  );
}

export default PartyFile;
