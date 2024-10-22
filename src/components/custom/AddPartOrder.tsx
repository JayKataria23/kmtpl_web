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
  shades: string[];
}

interface SelectedDesignDetail {
  design: string;
  shades: number[];
  totalMeters: number;
  remark: string;
  canceled: boolean;
  bhiwandi_date: string;
  price: number;
  design_entry_id: number;
  party_name: string;
  date: string; // New date attribute
}

interface AddPartOrderProps {
  open: boolean;
  onClose: () => void;
  design_entry_id: string;
  design_name: string;
  party_name: string;
  price: number;
  setSelectedEntries: (entries: SelectedDesignDetail[]) => void;
  selectedEntries: SelectedDesignDetail[];
}


function AddPartOrder({
  open,
  onClose,
  design_entry_id,
  design_name,
  party_name,
  price,
  setSelectedEntries,
  selectedEntries,
}: AddPartOrderProps) {
  const [currentEntry, setCurrentEntry] = useState<DesignEntry>();
  const { toast } = useToast();
  useEffect(() => {
    setCurrentEntry({
      id: design_entry_id,
      design: design_name,
      price: price.toString(),
      remark: "",
      shades: Array(51).fill(""),
    });
  }, [design_entry_id, design_name, price]);
  const handleShadeIncrement = (index: number) => {
    if (currentEntry) {
      setCurrentEntry({
        ...currentEntry,
        shades: currentEntry.shades.map((shade, i) => {
          if (i === index) {
            const currentValue = parseInt(shade) || 0;
            return (currentValue + 50).toString();
          }
          return shade;
        }),
      });
    }
  };
  const handleShadeChange = (index: number, value: string) => {
    if (currentEntry) {
      setCurrentEntry({
        ...currentEntry,
        shades: currentEntry.shades.map((shade, i) =>
          i === index ? value : shade
        ),
      });
    }
  };
  const handleSave = async () => {
    // Change to async function
    const { error } = await supabase.rpc(
      "create_design_entry_with_updated_shades",
      {
        design_entry_id: currentEntry?.id,
        new_shades: currentEntry?.shades,
      }
    );

      setSelectedEntries(
        selectedEntries.map((entry) => ({
          ...entry,
          shades:
            entry.design_entry_id === parseInt(currentEntry?.id || "0")
              ? entry.shades.map((shade, index) =>
                  Math.max(
                    shade - (parseInt(currentEntry?.shades[index] || "0") || 0),
                    0
                  )
                )
              : entry.shades,
        }))
    );
    setCurrentEntry({
      id: design_entry_id,
      design: design_name,
      price: price.toString(),
      remark: "",
      shades: Array(51).fill(""),
    });

    if (error) {
      //toast
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
            <div
              key={"allColour"}
              className="grid grid-cols-5 items-center gap-2"
            >
              <Label htmlFor={`allColour`} className="text-right col-span-1">
                All Colours
              </Label>
              <Input
                id={`allColours`}
                value={currentEntry?.shades[50]}
                onChange={(e) => {
                  handleShadeChange(50, e.target.value);
                }}
                type="number"
                className="col-span-3"
              />
              <Button
                onClick={() => handleShadeIncrement(50)}
                variant="outline"
                size="sm"
                className="col-span-1"
              >
                +50
              </Button>
            </div>
            {currentEntry?.shades[50] == "" &&
              Array.from({ length: 50 }, (_, i) => (
                <div key={i} className="grid grid-cols-5 items-center gap-2">
                  <Label
                    htmlFor={`shade-${i}`}
                    className="text-right col-span-1"
                  >
                    Shade {i + 1}
                  </Label>
                  <Input
                    id={`shade-${i}`}
                    value={currentEntry.shades[i]}
                    onChange={(e) => handleShadeChange(i, e.target.value)}
                    type="number"
                    className="col-span-3"
                  />
                  <Button
                    onClick={() => handleShadeIncrement(i)}
                    variant="outline"
                    size="sm"
                    className="col-span-1"
                  >
                    +50
                  </Button>
                </div>
              ))}
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
