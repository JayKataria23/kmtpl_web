import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";

interface Shade {
  shade: string;
  takas: number;
}

interface ShadesSelectorProps {
  shades: Shade[];
  onChange: (shades: Shade[]) => void;
}

export function ShadesSelector({ shades, onChange }: ShadesSelectorProps) {
  const [newShade, setNewShade] = useState("");
  const [newTakas, setNewTakas] = useState("");

  const handleAddShade = () => {
    if (newShade && newTakas) {
      onChange([...shades, { shade: newShade, takas: parseFloat(newTakas) }]);
      setNewShade("");
      setNewTakas("");
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
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="newShade">Shade Name</Label>
          <Input
            id="newShade"
            value={newShade}
            onChange={(e) => setNewShade(e.target.value)}
            placeholder="Enter shade name"
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="newTakas">Takas</Label>
          <Input
            id="newTakas"
            type="number"
            value={newTakas}
            onChange={(e) => setNewTakas(e.target.value)}
            placeholder="Enter takas"
          />
        </div>
        <Button
          onClick={handleAddShade}
          className="self-end"
          disabled={!newShade || !newTakas}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {shades.map((shade, index) => (
          <div key={index} className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>Shade Name</Label>
              <Input
                value={shade.shade}
                onChange={(e) =>
                  handleUpdateShade(index, "shade", e.target.value)
                }
              />
            </div>
            <div className="flex-1">
              <Label>Takas</Label>
              <Input
                type="number"
                value={shade.takas}
                onChange={(e) =>
                  handleUpdateShade(index, "takas", e.target.value)
                }
              />
            </div>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => handleRemoveShade(index)}
              className="self-end"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
