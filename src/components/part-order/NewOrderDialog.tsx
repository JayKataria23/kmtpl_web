import { useState, useEffect, useCallback, useMemo } from "react";
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
  const [totalShadesCount, setTotalShadesCount] = useState<number | null>(null);
  const [isSavingTotalShades, setIsSavingTotalShades] = useState(false);

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

  const fetchTotalShadesForDesign = useCallback(
    async (design: string) => {
      try {
        const { data, error } = await supabase
          .from("designs")
          .select("total_shades")
          .eq("title", design)
          .single();

        if (error || !data || typeof data.total_shades !== "number") {
          setTotalShadesCount(null);
          return;
        }

        setTotalShadesCount(data.total_shades);
      } catch (error) {
        console.error("Error fetching total shades for design:", error);
        setTotalShadesCount(null);
      }
    },
    []
  );

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

  const allColoursValue = useMemo(() => {
    const item = currentShades.find(
      (shade) => Object.keys(shade)[0] === "All Colours"
    );
    if (!item) return "";
    return item["All Colours"];
  }, [currentShades]);

  const handleApplyAllColours = () => {
    if (!totalShadesCount || totalShadesCount < 1) return;
    const value = allColoursValue;
    if (!value || isNaN(Number(value))) return;

    setCurrentShades((prev) => {
      const maxTotal = totalShadesCount ?? 0;

      // Remove existing numeric shades in range 1..totalShadesCount
      const filtered = prev.filter((item) => {
        const key = Object.keys(item)[0];
        const n = Number(key);
        return isNaN(n) || n < 1 || n > maxTotal;
      });

      const newShades = [...filtered];
      for (let i = 1; i <= maxTotal; i++) {
        newShades.push({ [i.toString()]: value });
      }

      // Clear All Colours value after applying
      return newShades.map((item) =>
        Object.keys(item)[0] === "All Colours" ? { "All Colours": "" } : item
      );
    });
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
                    if (e.target.value && designs.includes(e.target.value)) {
                      fetchTotalShadesForDesign(e.target.value);
                    } else {
                      setTotalShadesCount(null);
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

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Total Colours</Label>
                <div className="col-span-3 flex flex-row flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={totalShadesCount ?? 0}
                    onChange={(e) =>
                      setTotalShadesCount(parseInt(e.target.value, 10) || 0)
                    }
                    className="w-20 h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSavingTotalShades || !selectedDesign}
                    onClick={async () => {
                      if (!selectedDesign) return;
                      try {
                        setIsSavingTotalShades(true);
                        const { error } = await supabase
                          .from("designs")
                          .update({ total_shades: totalShadesCount ?? 0 })
                          .eq("title", selectedDesign);
                        setIsSavingTotalShades(false);
                        if (error) {
                          console.error("Error updating total shades:", error);
                          return;
                        }
                        toast({
                          title: "Success",
                          description: "Total colours updated for this design.",
                        });
                      } catch (err) {
                        console.error("Error updating total shades:", err);
                        setIsSavingTotalShades(false);
                        toast({
                          title: "Error",
                          description:
                            "Failed to update total colours for this design.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    onClick={handleApplyAllColours}
                    disabled={
                      !totalShadesCount ||
                      totalShadesCount < 1 ||
                      !allColoursValue ||
                      isNaN(Number(allColoursValue))
                    }
                  >
                    Apply to All
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[240px] w-full rounded-md border bg-gray-50 px-3 py-2">
                <div className="grid gap-3">
                  <div className="grid grid-cols-[90px,minmax(0,1fr),auto] items-center gap-2">
                    <Label className="text-right text-sm font-medium text-gray-800">
                      Custom
                    </Label>
                    <Input
                      value={newCustomShade}
                      onChange={(e) =>
                        setNewCustomShade(e.target.value.toUpperCase())
                      }
                      className="w-full"
                      placeholder="Shade name (e.g. 101A)"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (newCustomShade.trim() !== "") {
                          setCurrentShades((prev) => [
                            prev[0],
                            { [newCustomShade]: "" },
                            ...prev.slice(1),
                          ]);
                          setNewCustomShade("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>

                  {currentShades.length > 0 &&
                    (() => {
                      const indexed = currentShades.map((shade, idx) => ({
                        shade,
                        index: idx,
                      }));

                      const allColours = indexed.filter(
                        ({ shade }) =>
                          Object.keys(shade)[0] === "All Colours"
                      );
                      const textShades = indexed.filter(({ shade }) => {
                        const key = Object.keys(shade)[0];
                        return key !== "All Colours" && isNaN(Number(key));
                      });
                      const numericShades = indexed
                        .filter(({ shade }) => {
                          const key = Object.keys(shade)[0];
                          return !isNaN(Number(key));
                        })
                        .sort((a, b) => {
                          const aKey = Object.keys(a.shade)[0];
                          const bKey = Object.keys(b.shade)[0];
                          return Number(aKey) - Number(bKey);
                        });

                      const ordered = [
                        ...allColours,
                        ...textShades,
                        ...numericShades,
                      ];

                      return ordered.map(({ shade, index }) => {
                        const shadeName = Object.keys(shade)[0];
                        const isAllColours = shadeName === "All Colours";
                        return (
                          <div
                            key={index}
                            className="grid grid-cols-[90px,minmax(0,1fr),auto,auto] items-center gap-2"
                          >
                            <Label
                              className={`text-right text-sm ${
                                isAllColours
                                  ? "font-semibold text-blue-700"
                                  : "text-gray-800"
                              }`}
                            >
                              {shadeName}
                            </Label>
                            <Input
                              value={shade[shadeName]}
                              onChange={(e) =>
                                handleShadeChange(index, e.target.value)
                              }
                              type="number"
                              className="w-full"
                            />
                            <Button
                              onClick={() => handleShadeIncrement(index)}
                              variant="outline"
                              size="sm"
                            >
                              +50
                            </Button>
                            {isAllColours && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-xs font-medium text-blue-700"
                                onClick={handleApplyAllColours}
                              >
                                Apply to All
                              </Button>
                            )}
                          </div>
                        );
                      });
                    })()}

                  <div className="flex justify-center pt-1">
                    <Button
                      onClick={() => {
                        // Find the maximum shade number from existing shades
                        const maxShadeNumber = Math.max(
                          ...currentShades.map((shade) => {
                            const key = Object.keys(shade)[0];
                            return parseInt(key) || 0;
                          })
                        );

                        const newShades = Array.from(
                          { length: 10 },
                          (_, i) => ({
                            [`${maxShadeNumber + i + 1}`]: "",
                          })
                        );
                        setCurrentShades((prev) => [...prev, ...newShades]);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      + 10 Shades
                    </Button>
                  </div>
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
