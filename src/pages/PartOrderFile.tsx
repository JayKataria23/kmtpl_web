import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import supabase from "@/utils/supabase";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label, ScrollArea } from "@/components/ui";

import InputWithAutocomplete from "@/components/custom/InputWithAutocomplete";

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

interface Party {
  id: number;
  name: string;
  order_id: string;
  order_no: number;
}

interface Order {
  id: string;
  order_no: number;
}

interface PriceEntry {
  design: string;
  price: string;
}

function PartOrderFile() {
  const [designEntries, setDesignEntries] = useState<{
    [key: string]: DesignEntry[];
  }>({});
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [designs, setDesigns] = useState<string[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [partyOrders, setPartyOrders] = useState<Order[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [remark, setRemark] = useState<string>("");
  const [newCustomShade, setNewCustomShade] = useState<string>("");
  const [currentShades, setCurrentShades] = useState<
    { [key: string]: string }[]
  >([
    { "All Colours": "" },
    ...Array.from({ length: 30 }, (_, i) => ({ [`${i + 1}`]: "" })),
  ]);
  const [priceList, setPriceList] = useState<PriceEntry[]>([]);

  useEffect(() => {
    fetchPartDesignEntries();
  }, []);

  const fetchPartDesignEntries = async () => {
    try {
      const { data, error } = await supabase.rpc(
        "get_design_entries_with_part_true"
      );

      if (error) throw error;

      // Group entries by design_title
      const groupedEntries = data.reduce(
        (acc: { [key: string]: DesignEntry[] }, entry: DesignEntry) => {
          if (!acc[entry.design_title]) {
            acc[entry.design_title] = [];
          }
          acc[entry.design_title].push(entry);
          return acc;
        },
        {}
      );

      setDesignEntries(groupedEntries);
    } catch (error) {
      console.error("Error fetching part design entries:", error);
    }
  };

  const handleSendToBhiwandi = async (entryId: number) => {
    try {
      const today = new Date(
        new Date().getTime() + 5.5 * 60 * 60 * 1000
      ).toISOString();

      const { error } = await supabase
        .from("design_entries")
        .update({ bhiwandi_date: today })
        .eq("id", entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully sent to Bhiwandi",
      });

      fetchPartDesignEntries(); // Refresh the data
    } catch (error) {
      console.error("Error sending to Bhiwandi:", error);
      toast({
        title: "Error",
        description: "Failed to send to Bhiwandi",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrder = async (entryId: number) => {
    try {
      const { error } = await supabase
        .from("design_entries")
        .delete()
        .eq("id", entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order deleted successfully",
      });

      fetchPartDesignEntries(); // Refresh the data
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    }
  };

  const handleDispatch = async (entryId: number) => {
    try {
      const today = new Date(
        new Date().getTime() + 5.5 * 60 * 60 * 1000
      ).toISOString();

      const { error } = await supabase
        .from("design_entries")
        .update({ dispatch_date: today })
        .eq("id", entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully dispatched",
      });

      fetchPartDesignEntries();
    } catch (error) {
      console.error("Error dispatching:", error);
      toast({
        title: "Error",
        description: "Failed to dispatch",
        variant: "destructive",
      });
    }
  };

  const handleReverseBhiwandi = async (entryId: number) => {
    try {
      const { error } = await supabase
        .from("design_entries")
        .update({ bhiwandi_date: null })
        .eq("id", entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully reversed Bhiwandi status",
      });

      fetchPartDesignEntries();
    } catch (error) {
      console.error("Error reversing Bhiwandi status:", error);
      toast({
        title: "Error",
        description: "Failed to reverse Bhiwandi status",
        variant: "destructive",
      });
    }
  };

  const fetchParties = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("party_profiles")
        .select(`id, name`)
        .order("name");

      if (error) throw error;

      const partyData = data.map((party) => ({
        id: party.id,
        name: party.name,
        order_id: "",
        order_no: 0,
      }));

      setParties(partyData);
    } catch (error) {
      console.error("Error fetching parties:", error);
      toast({
        title: "Error",
        description: "Failed to fetch parties",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchDesigns = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("designs")
        .select("title")
        .order("title");

      if (error) throw error;

      const designTitles = data.map((design) => design.title);
      setDesigns(designTitles);
    } catch (error) {
      console.error("Error fetching designs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch designs",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleShadeIncrement = (index: number) => {
    setCurrentShades(
      currentShades.map((shade, i) => {
        if (i === index) {
          const currentValue = parseInt(shade[Object.keys(shade)[0]]) || 0;
          return { [Object.keys(shade)[0]]: (currentValue + 50).toString() };
        }
        return shade;
      })
    );
  };

  const handleShadeChange = (index: number, value: string) => {
    setCurrentShades(
      currentShades.map((shade, i) =>
        i === index ? { [Object.keys(shade)[0]]: value } : shade
      )
    );
  };

  const fetchPriceList = async (partyId: number) => {
    const { data, error } = await supabase.rpc(
      "get_latest_design_prices_by_party",
      {
        partyid: partyId,
      }
    );

    if (error) throw error;
    setPriceList(data);
  };

  const handlePartySelect = async (partyId: number) => {
    try {
      // Clear existing form data
      setSelectedDesign("");
      setPrice("");
      setRemark("");
      setCurrentShades([
        { "All Colours": "" },
        ...Array.from({ length: 30 }, (_, i) => ({ [`${i + 1}`]: "" })),
      ]);

      // Get all orders for this party
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id, order_no")
        .eq("bill_to_id", partyId)
        .order("order_no", { ascending: false });

      if (orderError) throw orderError;

      const party = parties.find((p) => p.id === partyId);
      if (party) {
        if (orderData && orderData.length > 0) {
          setPartyOrders(orderData);
          // Set the latest order as selected by default
          setSelectedParty({
            ...party,
            order_id: orderData[0].id,
            order_no: orderData[0].order_no,
          });
          // Fetch price list for the party
          await fetchPriceList(partyId);
        } else {
          setSelectedParty({
            ...party,
            order_id: "",
            order_no: 0,
          });
          setPartyOrders([]);
          toast({
            title: "Warning",
            description:
              "No orders found for this party. Cannot create part order.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching party order:", error);
      toast({
        title: "Error",
        description: "Failed to fetch party order details",
        variant: "destructive",
      });
    }
  };

  const handleOrderSelect = (orderId: string, orderNo: number) => {
    if (selectedParty) {
      setSelectedParty({
        ...selectedParty,
        order_id: orderId,
        order_no: orderNo,
      });
    }
  };

  const handleCreatePartOrder = async () => {
    if (!selectedParty || !selectedDesign || !price) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("design_entries").insert([
        {
          design: selectedDesign,
          order_id: selectedParty.order_id,
          part: true,
          price: parseFloat(price),
          remark: remark,
          shades: currentShades,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Part order created successfully",
      });

      // Reset form and refresh data
      setIsNewOrderDialogOpen(false);
      setSelectedParty(null);
      setSelectedDesign("");
      setPrice("");
      setRemark("");
      setCurrentShades([
        { "All Colours": "" },
        ...Array.from({ length: 30 }, (_, i) => ({ [`${i + 1}`]: "" })),
      ]);
      fetchPartDesignEntries();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to create part order: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchParties();
    fetchDesigns();
  }, [fetchParties, fetchDesigns]);

  return (
    <div className="container mx-auto mt-10 p-4">
      <div className="flex justify-between mb-4">
        <Button onClick={() => navigate("/")}>Back to Home</Button>
        <Button onClick={() => setIsNewOrderDialogOpen(true)}>
          New Part Order
        </Button>
      </div>

      <Dialog
        open={isNewOrderDialogOpen}
        onOpenChange={setIsNewOrderDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Part Order</DialogTitle>
            <DialogDescription>
              Fill in the details for the new part order.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Party</Label>
              <div className="col-span-3">
                <InputWithAutocomplete
                  id="party-select"
                  value={selectedParty?.name || ""}
                  onChange={(value) => {
                    const party = parties.find(
                      (p) => p.name.toLowerCase() === value.toLowerCase()
                    );
                    if (party) {
                      handlePartySelect(party.id);
                    }
                  }}
                  options={parties.map((party) => ({
                    id: party.id,
                    name: party.name,
                  }))}
                  placeholder="Select party"
                  label="Party"
                />
              </div>
            </div>

            {selectedParty && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Order No</Label>
                <div className="col-span-3">
                  {selectedParty.order_no ? (
                    <select
                      value={selectedParty.order_id}
                      onChange={(e) => {
                        const order = partyOrders.find(
                          (o) => o.id === e.target.value
                        );
                        if (order) {
                          handleOrderSelect(order.id, order.order_no);
                        }
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {partyOrders.map((order) => (
                        <option key={order.id} value={order.id}>
                          Order #{order.order_no}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-red-500">
                      No orders found for this party
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedParty && selectedParty.order_no ? (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="design" className="text-right">
                    Design
                  </Label>
                  <Input
                    id="design"
                    list="designs"
                    value={selectedDesign}
                    onChange={(e) => {
                      setSelectedDesign(e.target.value);
                      // Set the old price if available
                      const oldPrice = priceList.find(
                        (price) =>
                          price.design.split("-")[0] ===
                          e.target.value.split("-")[0]
                      )?.price;
                      if (oldPrice) {
                        setPrice(oldPrice);
                      } else {
                        setPrice("");
                      }
                    }}
                    className="col-span-3"
                    placeholder="Search for a design"
                  />
                  <datalist id="designs">
                    {designs.map((design) => (
                      <option key={design} value={design} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right">
                    Price
                  </Label>
                  <Input
                    id="price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="col-span-3"
                    placeholder={
                      priceList.find(
                        (price) =>
                          price.design.split("-")[0] ===
                          selectedDesign.split("-")[0]
                      )?.price
                        ? "Old Price: " +
                          priceList.find(
                            (price) =>
                              price.design.split("-")[0] ===
                              selectedDesign.split("-")[0]
                          )?.price
                        : "Enter Price"
                    }
                    type="number"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Remark</Label>
                  <Input
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="col-span-3"
                  />
                </div>

                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-5 items-center gap-2">
                      <Label className="text-right col-span-1">Custom</Label>
                      <Input
                        value={newCustomShade}
                        onChange={(e) =>
                          setNewCustomShade(e.target.value.toUpperCase())
                        }
                        className="col-span-3"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="col-span-1"
                        onClick={() => {
                          if (newCustomShade) {
                            setCurrentShades([
                              currentShades[0],
                              { [newCustomShade]: "" },
                              ...currentShades.slice(1),
                            ]);
                            setNewCustomShade("");
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>

                    {currentShades.map((shade, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-5 items-center gap-2"
                      >
                        <Label className="text-right col-span-1">
                          {Object.keys(shade)[0]}
                        </Label>
                        <Input
                          value={shade[Object.keys(shade)[0]]}
                          onChange={(e) =>
                            handleShadeChange(index, e.target.value)
                          }
                          type="number"
                          className="col-span-3"
                        />
                        <Button
                          onClick={() => handleShadeIncrement(index)}
                          variant="outline"
                          size="sm"
                          className="col-span-1"
                        >
                          +50
                        </Button>
                      </div>
                    ))}

                    <Button
                      onClick={() => {
                        // Find the maximum shade number from existing shades
                        const maxShadeNumber = Math.max(
                          ...currentShades.map(
                            (shade) => parseInt(Object.keys(shade)[0]) || 0
                          )
                        );

                        const newShades = Array.from(
                          { length: 10 },
                          (_, i) => ({
                            [`${maxShadeNumber + i + 1}`]: "",
                          })
                        );
                        setCurrentShades([...currentShades, ...newShades]);
                      }}
                      className="mt-4"
                    >
                      + 10
                    </Button>
                  </div>
                </ScrollArea>
              </>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              onClick={handleCreatePartOrder}
              disabled={!selectedParty?.order_no}
            >
              Create Part Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Accordion
        type="multiple"
        className="w-full"
        value={openAccordionItems}
        onValueChange={setOpenAccordionItems}
      >
        {Object.entries(designEntries).map(([design, entries], index) => (
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
                    {entries.map((entry, entryIndex) => (
                      <tr
                        key={entry.design_entry_id}
                        className={
                          entry.bhiwandi_date
                            ? "bg-yellow-100"
                            : entryIndex % 2 === 0
                            ? "bg-white"
                            : "bg-gray-50"
                        }
                      >
                        <td className="px-2 py-4 w-3/6 text-sm font-medium text-gray-900">
                          <div className="break-words text-red-500">
                            {entry.bill_to_party}
                          </div>
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
                          <div className="text-xs text-gray-500 mt-1">
                            Price: {entry.price}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Order No: {entry.order_no}
                          </div>
                          {entry.bhiwandi_date && (
                            <div className="text-xs text-gray-500 mt-1">
                              Bhiwandi Date:{" "}
                              {new Date(entry.bhiwandi_date).toLocaleDateString(
                                "en-GB"
                              )}
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
                              onClick={() =>
                                handleSendToBhiwandi(entry.design_entry_id)
                              }
                              className="ml-2 rounded-full w-8 h-8 bg-yellow-500 hover:bg-yellow-600"
                            >
                              B
                            </Button>
                            <Button
                              onClick={() =>
                                handleDeleteOrder(entry.design_entry_id)
                              }
                              className="ml-2 rounded-full w-8 h-8 bg-red-500 hover:bg-red-600"
                            >
                              X
                            </Button>
                          </td>
                        ) : (
                          <td className="px-2 py-4 w-1/6 text-right">
                            <Button
                              onClick={() =>
                                handleDispatch(entry.design_entry_id)
                              }
                              className="ml-2 rounded-full w-8 h-8 bg-green-500 hover:bg-green-600"
                            >
                              D
                            </Button>
                            <Button
                              onClick={() =>
                                handleReverseBhiwandi(entry.design_entry_id)
                              }
                              className="ml-2 rounded-full w-8 h-8 bg-blue-500 hover:bg-blue-600"
                            >
                              ↺
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export default PartOrderFile;
