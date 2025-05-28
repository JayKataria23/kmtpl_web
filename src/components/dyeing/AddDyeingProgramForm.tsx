import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/utils/supabase";
import { ShadesSelector } from "./ShadesSelector";
import { DyeingProgram } from "@/pages/DyeingBook";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  initialData?: DyeingProgram | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface SupplierName {
  id: number;
  supplier_name: string;
}
interface DyeingUnit {
  id: number;
  dyeing_unit: string;
}

export function AddDyeingProgramForm({
  initialData,
  onClose,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [supplierNames, setSupplierNames] = useState<SupplierName[]>([]);
  const [dyeingUnits, setDyeingUnits] = useState<DyeingUnit[]>([]);
  const [formData, setFormData] = useState({
    supplier_name: initialData?.supplier_name || "",
    slip_number: initialData?.slip_number || "",
    total_takas: initialData?.total_takas?.toString() || "",
    total_meters: initialData?.total_meters?.toString() || "",
    design_name: initialData?.design_name || "",
    shades_details: initialData?.shades_details || [],
    dyeing_unit: initialData?.dyeing_unit || "",
  });

  // Fetch supplier names when component mounts
  useEffect(() => {

    const fetchSupplierNames = async () => {
      try {
        const { data, error } = await supabase
          .from("supplier_names")
          .select("*")
          .order("supplier_name");

        if (error) throw error;
        setSupplierNames(data || []);
      } catch (error) {
        console.error("Error fetching supplier names:", error);
        toast({
          title: "Error",
          description: "Failed to fetch supplier names",
          variant: "destructive",
        });
      }
    };

    const fetchDyeingUnits = async () => {
      try {
        const { data, error } = await supabase
          .from("dyeing_units")
          .select("*")
          .order("dyeing_unit");

        if (error) throw error;
        setDyeingUnits(data || []);
      } catch (error) {
        console.error("Error fetching dyeing units:", error);
        toast({
          title: "Error",
          description: "Failed to fetch dyeing units",
          variant: "destructive",
        });
      }
    };

    fetchSupplierNames();
    fetchDyeingUnits();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (initialData) {
        // Update existing program
        const { error } = await supabase
          .from("dyeing_programs")
          .update({
            ...formData,
            total_takas: parseInt(formData.total_takas),
            total_meters: parseFloat(formData.total_meters),
            shades_details: formData.shades_details,
          })
          .eq("id", initialData.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Dyeing program updated successfully",
        });
      } else {
        // Add new program
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
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving program:", error);
      toast({
        title: "Error",
        description: `Failed to ${
          initialData ? "update" : "add"
        } dyeing program`,
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="supplier_name">Supplier Name</Label>
          <Select
            value={formData.supplier_name}
            onValueChange={(value) =>
              setFormData({ ...formData, supplier_name: value })
            }
            required
          >
            <SelectTrigger id="supplier_name">
              <SelectValue placeholder="Select a supplier" />
            </SelectTrigger>
            <SelectContent>
              {supplierNames.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.supplier_name}>
                  {supplier.supplier_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Select
            value={formData.dyeing_unit}
            onValueChange={(value) =>
              setFormData({ ...formData, dyeing_unit: value })
            }
            required
          >
            <SelectTrigger id="dyeing_unit">
              <SelectValue placeholder="Select a dyeing unit" />
            </SelectTrigger>
            <SelectContent>
              {dyeingUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.dyeing_unit}>
                  {unit.dyeing_unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <Button type="submit">
          {initialData ? "Update Program" : "Add Program"}
        </Button>
      </div>
    </form>
  );
}
