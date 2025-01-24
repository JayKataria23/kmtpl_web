import React, { useState, useMemo } from "react";
import { Button } from "../ui";
import { Delete, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import supabase from "@/utils/supabase";

interface DesignSelectorFastProps {
  currentSelectedDesign: string | null;
  setCurrentSelectedDesign: React.Dispatch<React.SetStateAction<string | null>>;
  designs: string[];
  setDesigns: React.Dispatch<React.SetStateAction<string[]>>;
}

function DesignSelectorFast({
  currentSelectedDesign,
  setCurrentSelectedDesign,
  designs,
  setDesigns,
}: DesignSelectorFastProps) {
  const [filter, setFilter] = useState<string>("Regular");
  const [inputValue, setInputValue] = useState<string>("");
  const [isAddDesignOpen, setIsAddDesignOpen] = useState<boolean>(false);
  const [newDesignInput, setNewDesignInput] = useState<string>("");

  const fetchDesigns = async () => {
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
      // Optionally, you can show an error message to the user
    }
  };

  const handleAddDesign = async (newDesign: string) => {
    if (newDesign.trim()) {
      const { data, error } = await supabase
        .from("designs")
        .insert({ title: newDesign.trim().toUpperCase() }) // Convert to uppercase
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
        fetchDesigns();
      }
    }
  };

  const handleAddDesignSubmit = async () => {
    await handleAddDesign(newDesignInput);
    setNewDesignInput("");
    setIsAddDesignOpen(false);
  };

  // Memoized filtered and sorted designs
  const filteredDesigns = useMemo(() => {
    return designs
      .filter((design) => {
        // Filtering logic
        if (filter === "Regular") {
          return !/\d/.test(design) || (design.match(/\d/g) || []).length < 3;
        }
        if (filter === "Digital") {
          return design.startsWith("D-") || design.startsWith("D DBY-");
        }
        if (filter === "Print") {
          return (
            /-\d{3,4}$/.test(design) &&
            !design.startsWith("D-") &&
            !design.startsWith("D DBY-")
          );
        }
        if (filter === "Design Number") {
          return /^\d+$/.test(design);
        }
        return true;
      })
      .filter((design) => design.startsWith(inputValue))
      .sort((a, b) => {
        // Sorting logic
        if (filter === "Regular") {
          const nameA = a.replace(/\d+$/, "");
          const nameB = b.replace(/\d+$/, "");
          if (nameA === nameB) {
            return (
              parseInt(a.match(/\d+/)?.[0] || "0") -
              parseInt(b.match(/\d+/)?.[0] || "0")
            );
          }
          return nameA.localeCompare(nameB);
        }
        if (filter === "Digital" || filter === "Print") {
          const digitA = parseInt(a.split("-")[1]) || 0;
          const digitB = parseInt(b.split("-")[1]) || 0;
          return digitA - digitB;
        }
        if (filter === "Design Number") {
          return parseInt(a) - parseInt(b);
        }
        return 0;
      });
  }, [designs, filter, inputValue]);

  // Render filter buttons
  const renderFilterButtons = () => {
    const filterTypes = ["All", "Regular", "Print", "Digital", "Design Number"];
    return (
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {filterTypes.map((type) => (
          <Button
            key={type}
            onClick={() => setFilter(type)}
            variant={filter === type ? "default" : "outline"}
            className="h-10"
          >
            {type}
          </Button>
        ))}
        <Button
          variant="outline"
          className="h-10"
          onClick={() => setIsAddDesignOpen(true)}
        >
          Add Design
        </Button>
      </div>
    );
  };

  // Render design list
  const renderDesignList = () => {
    return (
      <div className="bg-gray-50 rounded-lg p-3 h-[40vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-2">Designs</h3>
        <div className="space-y-2">
          {filteredDesigns.map((design) => (
            <Button
              key={design}
              onClick={() => setCurrentSelectedDesign(design)}
              variant={currentSelectedDesign === design ? "default" : "outline"}
              className="w-full justify-start h-11"
            >
              {design}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  // Render input section
  const renderInputSection = () => {
    return (
      <div className="space-y-3">
        {currentSelectedDesign && (
          <div className="bg-gray-100 p-2 rounded text-center">
            <span className="font-medium">Selected Design:</span>{" "}
            {currentSelectedDesign}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type to filter..."
            className="flex-grow min-w-[150px] border rounded p-2 h-11"
          />
          <Button
            onClick={() => setInputValue("")}
            variant="outline"
            size="icon"
            className="shrink-0 h-11"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Render keyboard buttons
  const renderKeyboardButtons = () => {
    // Determine which set of buttons to show based on filter
    const buttonSet =
      filter === "Regular"
        ? Array.from(Array(26)).map((_, index) =>
            String.fromCharCode(65 + index)
          )
        : Array.from(Array(10)).map((_, index) =>
            String.fromCharCode(48 + index)
          );

    return (
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {buttonSet.map((char) => (
          <Button
            key={char}
            variant="outline"
            size="sm"
            className="h-10 w-10"
            onClick={() => setInputValue((prev) => prev + char)}
          >
            {char}
          </Button>
        ))}
        <Button
          variant="destructive"
          size="sm"
          className="h-10 w-10"
          onClick={() => setInputValue((prev) => prev.slice(0, -1))}
        >
          <Delete className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4 bg-white shadow-sm rounded-lg">
      {renderFilterButtons()}
      {renderDesignList()}
      {renderInputSection()}
      {renderKeyboardButtons()}

      {isAddDesignOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
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
                  setIsAddDesignOpen(false);
                  setNewDesignInput("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddDesignSubmit}>Add</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DesignSelectorFast;
