import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import supabase from "@/utils/supabase";

interface AddNewDesignProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  designs: string[];
  val?: string | null;
}

export function AddNewDesign({
  isOpen,
  onClose,
  onSuccess,
  designs,
  val,
}: AddNewDesignProps) {
  const [newDesignInput, setNewDesignInput] = useState<string>(val ?? "");

  const handleAddDesign = async (newDesign: string) => {
    if (newDesign.trim()) {
      // Check if the design is a 3 or 4 digit number
      const designNumber = parseInt(newDesign);
      if (
        !isNaN(designNumber) &&
        (newDesign.length === 3 || newDesign.length === 4)
      ) {
        // Check if a design with the same number exists
        const existingDesigns = designs.filter((d) => {
          const num = parseInt(d);
          return !isNaN(num) && num === designNumber;
        });

        if (existingDesigns.length > 0) {
          const confirmAdd = window.confirm(
            `A design with number ${designNumber} already exists. Do you want to add this design anyway?`
          );
          if (!confirmAdd) {
            return;
          }
        }
      }
      // Check for similar designs using string similarity
      const similarDesigns = designs.filter(design => {
        // Convert both strings to uppercase for case-insensitive comparison
        const str1 = design.toUpperCase();
        const str2 = newDesign.trim().toUpperCase();
        
        // Calculate Levenshtein distance
        const m = str1.length;
        const n = str2.length;
        const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        
        for (let i = 1; i <= m; i++) {
          for (let j = 1; j <= n; j++) {
            if (str1[i-1] === str2[j-1]) {
              dp[i][j] = dp[i-1][j-1];
            } else {
              dp[i][j] = 1 + Math.min(dp[i-1][j], dp[i-1][j-1], dp[i][j-1]);
            }
          }
        }

        // Calculate similarity percentage
        const maxLength = Math.max(m, n);
        const similarity = ((maxLength - dp[m][n]) / maxLength) * 100;
        
        return similarity > 80 && design !== newDesign;
      });

      if (similarDesigns.length > 0) {
        const confirmAdd = window.confirm(
          `Similar designs found (>80% match):\n${similarDesigns.join(", ")}\n\nDo you want to add this design anyway?`
        );
        if (!confirmAdd) {
          return;
        }
      }

      const { data, error } = await supabase
        .from("designs")
        .insert({ title: newDesign.trim().toUpperCase() })
        .select();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add design",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Design "${data[0].title}" added successfully`,
        });
        setNewDesignInput("");
        onSuccess?.();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg space-y-4 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold">Add New Design</h3>
        <input
          type="text"
          value={newDesignInput}
          onChange={(e) => setNewDesignInput(e.target.value)}
          placeholder="Enter design name..."
          className="w-full border rounded p-2"
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              setNewDesignInput("");
            }}
          >
            Cancel
          </Button>
          <Button onClick={() => handleAddDesign(newDesignInput)}>Add</Button>
        </div>
      </div>
    </div>
  );
}
