import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Shade {
  shade: string;
  takas: number;
}

interface ShadesSelectorProps {
  shades: Shade[];
  onChange: (shades: Shade[]) => void;
}

export function ShadesSelector({ shades, onChange }: ShadesSelectorProps) {
  const [newShades, setNewShades] = useState("");
  const [commonTakas, setCommonTakas] = useState("");

  const handleAddShades = () => {
    if (newShades && commonTakas) {
      const shadeNames = newShades
        .split(",")
        .map((shade) => shade.trim())
        .filter((shade) => shade.length > 0);

      const newShadeEntries = shadeNames.map((shade) => ({
        shade,
        takas: parseFloat(commonTakas),
      }));

      onChange([...shades, ...newShadeEntries]);
      setNewShades("");
      setCommonTakas("");
    }
  };

  const handleRemoveShade = (index: number) => {
    onChange(shades.filter((_, i) => i !== index));
  };

  const handleUpdateShade = (
    index: number,
    field: keyof Shade,
    value: string
  ) => {
    const updatedShades = [...shades];
    updatedShades[index] = {
      ...updatedShades[index],
      [field]: field === "takas" ? parseFloat(value) : value,
    };
    onChange(updatedShades);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[1fr,1fr,auto] gap-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="newShades" className="text-sm font-medium">
            Shade Names (comma-separated)
          </Label>
          <Input
            id="newShades"
            value={newShades}
            onChange={(e) => setNewShades(e.target.value)}
            placeholder="Enter shade names (e.g., Shade1, Shade2, Shade3)"
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="commonTakas" className="text-sm font-medium">
            Common Takas
          </Label>
          <Input
            id="commonTakas"
            type="number"
            value={commonTakas}
            onChange={(e) => setCommonTakas(e.target.value)}
            placeholder="Enter takas value"
            className="h-10"
          />
        </div>
        <Button
          onClick={handleAddShades}
          disabled={!newShades || !commonTakas}
          className="h-10 w-10"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[200px] w-full rounded-md border">
        <div className="p-4 space-y-3">
          {shades.map((shade, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr,1fr,auto] gap-4 items-center"
            >
              <div className="space-y-1.5">
                <Input
                  value={shade.shade}
                  onChange={(e) =>
                    handleUpdateShade(index, "shade", e.target.value)
                  }
                  placeholder="Shade name"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Input
                  type="number"
                  value={shade.takas}
                  onChange={(e) =>
                    handleUpdateShade(index, "takas", e.target.value)
                  }
                  placeholder="Takas"
                  className="h-9"
                />
              </div>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => handleRemoveShade(index)}
                className="h-9 w-9"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
