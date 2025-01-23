import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Delete } from "lucide-react";

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

  const filteredDesigns = designs
    .filter((design) => {
      // Adjust the filtering logic based on the filter state
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
    .sort((a, b) => {
      // Sort designs based on the selected filter
      if (filter === "Regular") {
        const nameA = a.replace(/\d+$/, ""); // Remove trailing numbers for name comparison
        const nameB = b.replace(/\d+$/, ""); // Remove trailing numbers for name comparison
        if (nameA === nameB) {
          return (
            parseInt(a.match(/\d+/)?.[0] || "0") -
            parseInt(b.match(/\d+/)?.[0] || "0")
          ); // Sort by number if names are the same
        }
        return nameA.localeCompare(nameB); // Sort alphabetically by name
      }
      if (filter === "Digital") {
        // Sort designs based on digits after the hyphen
        const digitA = parseInt(a.split("-")[1]) || 0; // Get digits after the hyphen for a
        const digitB = parseInt(b.split("-")[1]) || 0; // Get digits after the hyphen for b
        return digitA - digitB; // Sort numerically based on the digits
      }
      if (filter === "Print") {
        const digitA = parseInt(a.split("-")[1]) || 0; // Get digits after the hyphen for a
        const digitB = parseInt(b.split("-")[1]) || 0; // Get digits after the hyphen for b
        return digitA - digitB;
      }
      if (filter === "Design Number") {
        return parseInt(a) - parseInt(b); // Sort numerically for Design Number
      }
      return 0; // No sorting for other cases
    });

  return (
    <>
      <div className="flex space-x-2 mb-2">
        {["All", "Regular", "Print", "Digital", "Design Number"].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`p-2 text-center cursor-pointer text-white rounded-md ${
              filter === type ? "bg-blue-500" : "bg-gray-700"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <ScrollArea className="h-1/2 w-full p-2 ">
        {filteredDesigns
          .filter((design) => design.includes(inputValue))
          .map((design) => (
            <div
              key={design}
              onClick={() => setCurrentSelectedDesign(design)}
              className={` p-2 text-center cursor-pointer text-white rounded-md ${
                currentSelectedDesign === design ? "bg-blue-500" : "bg-black"
              } my-2`}
            >
              {design}
            </div>
          ))}
      </ScrollArea>

      <p>Selected Design: {currentSelectedDesign}</p>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="my-2 p-2 border rounded"
        placeholder="Type to filter..."
      />

      <div className="flex flex-wrap justify-center gap-2">
        {filter === "Regular" &&
          Array.from(Array(26)).map((_, index) => {
            const letter = String.fromCharCode(65 + index);
            return (
              <button
                key={letter}
                className="mx-1 p-2 bg-gray-300 rounded"
                onClick={() => {
                  setInputValue((prev) => prev + letter);
                }}
              >
                {letter}
              </button>
            );
          })}
        {(filter === "Design Number" ||
          filter === "Digital" ||
          filter === "Print") &&
          Array.from(Array(10)).map((_, index) => {
            const letter = String.fromCharCode(48 + index);
            return (
              <button
                key={letter}
                className="mx-1 p-2 bg-gray-300 rounded"
                onClick={() => {
                  setInputValue((prev) => prev + letter);
                }}
              >
                {letter}
              </button>
            );
          })}

        <button
          className="mx-1 p-2 bg-red-500 text-white rounded"
          onClick={() => setInputValue((prev) => prev.slice(0, -1))}
        >
          <Delete />
        </button>
        <button
          className="mx-1 p-2 bg-blue-500 text-white rounded"
          onClick={() => setInputValue("")}
        >
          Clear
        </button>
      </div>
    </>
  );
}

export default DesignSelectorFast;
