import React, { useState, useMemo } from "react";
import { Button } from "../ui";
import { Delete, X } from "lucide-react";

interface DesignSelectorFastProps {
  currentSelectedDesign: string | null;
  setCurrentSelectedDesign: React.Dispatch<React.SetStateAction<string | null>>;
  designs: string[];
}

function DesignSelectorFast({
  currentSelectedDesign,
  setCurrentSelectedDesign,
  designs,
}: DesignSelectorFastProps) {
  const [filter, setFilter] = useState<string>("Regular");
  const [inputValue, setInputValue] = useState<string>("");

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
      .filter((design) => design.includes(inputValue))
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
            size="sm"
          >
            {type}
          </Button>
        ))}
      </div>
    );
  };

  // Render design list
  const renderDesignList = () => {
    return (
      <div className="bg-gray-50 rounded-lg p-3 mb-4 h-64 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-2">Designs</h3>
        <div className="space-y-2">
          {filteredDesigns.map((design) => (
            <Button
              key={design}
              onClick={() => setCurrentSelectedDesign(design)}
              variant={currentSelectedDesign === design ? "default" : "outline"}
              className="w-full justify-center"
            >
              {design}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  // Render input and selected design
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
            className="flex-grow min-w-[150px] border rounded p-2"
          />
          <Button
            onClick={() => setInputValue("")}
            variant="outline"
            size="icon"
            className="shrink-0"
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
            onClick={() => setInputValue((prev) => prev + char)}
          >
            {char}
          </Button>
        ))}
        <Button
          variant="destructive"
          size="sm"
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
    </div>
  );
}

export default DesignSelectorFast;
