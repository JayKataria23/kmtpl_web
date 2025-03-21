import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/utils/supabase";
import { ShadesSelector } from "./ShadesSelector";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddDyeingProgramForm({ onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    supplier_name: "",
    slip_number: "",
    total_takas: "",
    total_meters: "",
    design_name: "",
    shades_details: [] as { shade: string; takas: number }[],
    dyeing_unit: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from("dyeing_programs").insert({
        ...formData,
        total_takas: parseInt(formData.total_takas),
        total_meters: parseFloat(formData.total_meters),
        shades_details: formData.shades_details,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Dyeing program added successfully",
      });
      onSuccess();
    } catch (error) {
      console.error("Error adding program:", error);
      toast({
        title: "Error",
        description: "Failed to add dyeing program",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="supplier_name">Supplier Name</Label>
          <Input
            id="supplier_name"
            value={formData.supplier_name}
            onChange={(e) =>
              setFormData({ ...formData, supplier_name: e.target.value })
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slip_number">Slip Number</Label>
          <Input
            id="slip_number"
            value={formData.slip_number}
            onChange={(e) =>
              setFormData({ ...formData, slip_number: e.target.value })
            }
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="total_takas">Total Takas</Label>
          <Input
            id="total_takas"
            type="number"
            value={formData.total_takas}
            onChange={(e) =>
              setFormData({ ...formData, total_takas: e.target.value })
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="total_meters">Total Meters</Label>
          <Input
            id="total_meters"
            type="number"
            step="0.01"
            value={formData.total_meters}
            onChange={(e) =>
              setFormData({ ...formData, total_meters: e.target.value })
            }
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="design_name">Design Name</Label>
          <Input
            id="design_name"
            value={formData.design_name}
            onChange={(e) =>
              setFormData({ ...formData, design_name: e.target.value })
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dyeing_unit">Dyeing Unit</Label>
          <Input
            id="dyeing_unit"
            value={formData.dyeing_unit}
            onChange={(e) =>
              setFormData({ ...formData, dyeing_unit: e.target.value })
            }
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Shades Details</Label>
        <ShadesSelector
          shades={formData.shades_details}
          onChange={(shades) =>
            setFormData({ ...formData, shades_details: shades })
          }
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Add Program</Button>
      </div>
    </form>
  );
}
