import React, { useState } from "react";
import { Button, Input } from "../ui";
import { X, Search } from "lucide-react";

interface Party {
  id: number;
  name: string;
}

interface PartySelectorFastProps {
  selectedBillTo: number | null;
  setSelectedBillTo: React.Dispatch<React.SetStateAction<number | null>>;
  partyOptions: Party[];
}

function PartySelectorFast({
  selectedBillTo,
  setSelectedBillTo,
  partyOptions,
}: PartySelectorFastProps) {
  const [inputValue, setInputValue] = useState("");

  // Memoized filtered parties
  const filteredParties = partyOptions.filter((party) => {
    const words = party.name.split(" ");
    return inputValue.split("").every((char, index) => {
      const wordIndex = index;
      return (
        words[wordIndex] &&
        words[wordIndex][0].toLowerCase() === char.toLowerCase()
      );
    });
  });

  // Alphabet quick filter buttons
  const alphabetButtons = Array.from(Array(26)).map((_, index) => {
    const letter = String.fromCharCode(65 + index);
    return (
      <Button
        key={letter}
        variant="outline"
        className="px-2 py-1 h-10 w-10 text-lg"
        onClick={() => setInputValue((prev) => prev + letter)}
      >
        {letter}
      </Button>
    );
  });

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4 bg-white shadow-sm rounded-lg">
      <h1 className="text-xl font-semibold mb-4 text-center">Select Party</h1>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Search parties..."
          className="w-full pl-10 h-11"
        />
        {inputValue && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
            onClick={() => setInputValue("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Party List */}
      <div className="bg-gray-50 rounded-lg p-3 h-[40vh] overflow-y-auto">
        <div className="space-y-2">
          {filteredParties.map((party) => (
            <Button
              key={party.id}
              variant={selectedBillTo === party.id ? "default" : "outline"}
              className="w-full justify-start h-11"
              onClick={() => setSelectedBillTo(party.id)}
            >
              <span className="truncate">{party.name}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Alphabet Buttons */}
      <div className="space-y-4 bg-gray-50 p-3 rounded-lg">
        <div className="flex flex-wrap gap-1 justify-center">
          {alphabetButtons}
        </div>

        <div className="flex gap-2 justify-center">
          <Button
            variant="secondary"
            className="h-11"
            onClick={() =>
              setInputValue((prev) =>
                prev.length > 0 ? prev.slice(0, -1) : prev
              )
            }
          >
            Backspace
          </Button>
          <Button
            variant="destructive"
            className="h-11"
            onClick={() => setInputValue("")}
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PartySelectorFast;
