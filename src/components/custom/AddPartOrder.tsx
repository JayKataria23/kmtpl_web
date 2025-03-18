import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button, Input, Label, ScrollArea, Toaster } from "../ui";
import supabase from "@/utils/supabase";
import { useToast } from "@/hooks/use-toast";

interface DesignEntry {
  id: string;
  design: string;
  price: string;
  remark: string;
  shades: { [key: string]: string }[];
}

interface AddPartOrderProps {
  open: boolean;
  onClose: () => void;
  design_entry_id: string;
  design_name: string;
  party_name: string;
  price: number;
}

function AddPartOrder({
  open,
  onClose,
  design_entry_id,
  design_name,
  party_name,
  price,
}: AddPartOrderProps) {
  const [currentEntry, setCurrentEntry] = useState<DesignEntry>();
  const { toast } = useToast();
  const [newCustomShade, setNewCustomShade] = useState<string>("");
  useEffect(() => {
    setCurrentEntry({
      id: design_entry_id,
      design: design_name,
      price: price.toString(),
      remark: "",
      shades: [
        { "All Colours": "" },
        ...Array.from({ length: 30 }, (_, i) => ({ [`${i + 1}`]: "" })),
      ],
    });
  }, [design_entry_id, design_name, price]);
  const handleShadeIncrement = (index: number) => {
    if (currentEntry) {
      setCurrentEntry({
        ...currentEntry,
        shades: currentEntry.shades.map((shade, i) => {
          if (i === index) {
            const currentValue = parseInt(shade[Object.keys(shade)[0]]) || 0; // Get the current value of the shade
            return { [Object.keys(shade)[0]]: (currentValue + 50).toString() }; // Increment by 50
          }
          return shade; // Return unchanged shade
        }),
      });
    }
  };
  const handleShadeChange = (index: number, value: string) => {
    if (currentEntry) {
      setCurrentEntry({
        ...currentEntry,
        shades: currentEntry.shades.map((shade, i) =>
          i === index ? { ...shade, [Object.keys(shade)[0]]: value } : shade
        ),
      });
    }
  };
  const handleSave = async () => {
    const { data: oldEntry, error: oldError } = await supabase
      .from("design_entries")
      .select("*")
      .eq("id", design_entry_id);

    if (oldError) {
      //toast
      toast({
        title: "Error",
        description: `Failed to create part order ${
          oldError instanceof Error ? oldError.message : "Unknown error"
        }`,
        variant: "destructive",
      });
      return;
    }

    if (oldEntry) {
      // Create new entry without modifying the old one
      const { error } = await supabase.from("design_entries").insert([
        {
          design: oldEntry[0].design,
          order_id: oldEntry[0].order_id,
          part: "true",
          price: oldEntry[0].price,
          remark: oldEntry[0].remark,
          shades: currentEntry?.shades,
        },
      ]);

      if (error) {
        toast({
          title: "Error",
          description: `Failed to create part order ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        });
      } else {
        onClose();
        toast({
          title: "Success",
          description: "Part order created successfully",
        });
      }

      setCurrentEntry({
        id: design_entry_id,
        design: design_name,
        price: price.toString(),
        remark: "",
        shades: [
          { "All Colours": "" },
          ...Array.from({ length: 30 }, (_, i) => ({ [`${i + 1}`]: "" })),
        ],
      });
    }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Part Order</DialogTitle>
          <DialogDescription>
            Review the details of the part order before closing.
          </DialogDescription>
        </DialogHeader>
        <div>
          <p>Design Name: {design_name}</p>
          <p>Party Name: {party_name}</p>
          <p>Price: {price.toFixed(2)}</p>
        </div>
        <ScrollArea className="h-[200px] w-full rounded-md border p-4">
          <div className="grid gap-4">
            <div className="grid grid-cols-5 items-center gap-2">
              <Label htmlFor={`shade-custom`} className="text-right col-span-1">
                Custom
              </Label>
              <Input
                value={newCustomShade} // Use the value of the shade object
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
                  if (currentEntry) {
                    const newShade = { [newCustomShade]: "" }; // Create new shade object
                    setCurrentEntry({
                      ...currentEntry,
                      shades: [
                        currentEntry.shades[0], // Keep the first shade
                        newShade, // Add the new shade at index 1
                        ...currentEntry.shades.slice(1), // Spread the rest of the shades
                      ],
                    });
                    setNewCustomShade(""); // Clear the input after adding
                  }
                }}
              >
                Add
              </Button>
            </div>
            {currentEntry &&
              currentEntry.shades.length > 0 && // Check if there are shades
              currentEntry.shades.map((shade, index) => (
                <div
                  key={index}
                  className="grid grid-cols-5 items-center gap-2"
                >
                  <Label
                    htmlFor={`shade-${index}`}
                    className="text-right col-span-1"
                  >
                    {Object.keys(shade)[0]}{" "}
                    {/* Use the key of the shade object */}
                  </Label>
                  <Input
                    id={`shade-${index}`}
                    value={shade[Object.keys(shade)[0]]} // Use the value of the shade object
                    onChange={(e) => handleShadeChange(index, e.target.value)}
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
                if (currentEntry) {
                  // Find the maximum shade number from existing shades
                  const maxShadeNumber = Math.max(
                    ...currentEntry.shades.map(
                      (shade) => parseInt(Object.keys(shade)[0]) || 0
                    )
                  );

                  const newShades = Array.from({ length: 10 }, (_, i) => ({
                    [`${maxShadeNumber + i + 1}`]: "",
                  }));
                  setCurrentEntry({
                    ...currentEntry,
                    shades: [...currentEntry.shades, ...newShades],
                  });
                }
              }}
              className="mt-4"
            >
              + 10
            </Button>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button color="primary" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
      <Toaster />
    </Dialog>
  );
}

export default AddPartOrder;
