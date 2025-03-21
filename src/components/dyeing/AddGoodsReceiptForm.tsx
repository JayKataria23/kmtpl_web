import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/utils/supabase";
import { DyeingProgram } from "@/pages/DyeingBook";
import { GoodsReceipt } from "@/pages/DyeingBook";

interface Props {
  program: DyeingProgram | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddGoodsReceiptForm({ program, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    grn_number: "",
    meters_received: "",
    taka_received: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!program) return;

    try {
      const { error } = await supabase.from("goods_receipts").insert({
        dyeing_program_id: program.id,
        grn_number: formData.grn_number,
        meters_received: parseFloat(formData.meters_received),
        taka_received: parseFloat(formData.taka_received) || null,
      });

      if (error) throw error;

      const totalReceived =
        (program.goods_receipts?.reduce(
          (sum: number, receipt: GoodsReceipt) => sum + receipt.meters_received,
          0
        ) || 0) + parseFloat(formData.meters_received);

      if (totalReceived >= program.total_meters) {
        await supabase
          .from("dyeing_programs")
          .update({ status: "Completed" })
          .eq("id", program.id);
      }

      toast({
        title: "Success",
        description: "Goods receipt added successfully",
      });
      onSuccess();
    } catch (error) {
      console.error("Error adding receipt:", error);
      toast({
        title: "Error",
        description: "Failed to add goods receipt",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="grn_number">GRN Number</Label>
        <Input
          id="grn_number"
          value={formData.grn_number}
          onChange={(e) =>
            setFormData({ ...formData, grn_number: e.target.value })
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="meters_received">Meters Received</Label>
        <Input
          id="meters_received"
          type="number"
          value={formData.meters_received}
          onChange={(e) =>
            setFormData({ ...formData, meters_received: e.target.value })
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="taka_received">Takas Received</Label>
        <Input
          id="taka_received"
          type="number"
          value={formData.taka_received}
          onChange={(e) =>
            setFormData({ ...formData, taka_received: e.target.value })
          }
          placeholder="Optional"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Add Receipt</Button>
      </div>
    </form>
  );
}
