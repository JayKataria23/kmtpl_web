import React, { useState } from "react";
import { Button, ScrollArea } from "../ui";
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
        className="px-2 py-1 h-11 w-12 text-lg"
        onClick={() => setInputValue((prev) => prev + letter)}
      >
        {letter}
      </Button>
    );
  });

  return (
    <div className="flex flex-col h-[80vh]">
      {/* Party List */}
      <div className="flex-grow overflow-hidden rounded-t-lg bg-white shadow-sm">
        <ScrollArea className="h-full w-screen">
          <div className="p-2 space-y-2">
            {filteredParties.map((party) => (
              <Button
                key={party.id}
                variant={selectedBillTo === party.id ? "default" : "outline"}
                className="w-[90%] mx-auto justify-start truncate"
                onClick={() => setSelectedBillTo(party.id)}
              >
                <span className="truncate max-w-full block text-left">
                  {party.name}
                </span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Filters Container */}
      <div className="bg-gray-100 p-4 rounded-b-lg space-y-4 w-screen">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search parties..."
            className="w-full p-2 pl-10 border rounded-md"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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

        {/* Alphabet Buttons */}
        <div className="flex flex-wrap gap-1 justify-center">
          {alphabetButtons}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            className="flex-grow"
            onClick={() => setInputValue((prev) => prev.slice(0, -1))}
          >
            Backspace
          </Button>
          <Button
            variant="destructive"
            className="flex-grow"
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
