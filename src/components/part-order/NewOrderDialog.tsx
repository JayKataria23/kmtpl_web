import { useState, useEffect, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import supabase from "@/utils/supabase";

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

interface NewOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated: () => void;
}

export default function NewOrderDialog({
  isOpen,
  onOpenChange,
  onOrderCreated,
}: NewOrderDialogProps) {
  const { toast } = useToast();
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
      onOpenChange(false);
      setSelectedParty(null);
      setSelectedDesign("");
      setPrice("");
      setRemark("");
      setCurrentShades([
        { "All Colours": "" },
        ...Array.from({ length: 30 }, (_, i) => ({ [`${i + 1}`]: "" })),
      ]);
      onOrderCreated();
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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

                      const newShades = Array.from({ length: 10 }, (_, i) => ({
                        [`${maxShadeNumber + i + 1}`]: "",
                      }));
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
  );
}
