import { useEffect, useState } from "react";
import supabase from "@/utils/supabase";
import { ScrollArea } from "../ui";
import { Delete } from "lucide-react";

interface PartySelectorFastProps {
  selectedBillTo: number | null;
  setSelectedBillTo: React.Dispatch<React.SetStateAction<number | null>>;
}

interface Party {
  id: number;
  name: string;
}

function PartySelectorFast({
  selectedBillTo,
  setSelectedBillTo,
}: PartySelectorFastProps) {
  const [partyOptions, setPartyOptions] = useState<Party[]>([]);
  const [inputValue, setInputValue] = useState<string>("");

  const fetchPartyOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("party_profiles")
        .select("id, name")
        .order("name");

      if (error) throw error;

      setPartyOptions(data);
    } catch (error) {
      console.error("Error fetching party options:", error);
    }
  };

  useEffect(() => {
    fetchPartyOptions();
  }, []);

  return (
    <>
      <ScrollArea className="h-1/2 p-2">
        {partyOptions
          .filter((party) => {
            const words = party.name.split(" ");
            return inputValue.split("").every((char, index) => {
              const wordIndex = index; // Directly use index for word matching
              return (
                words[wordIndex] &&
                words[wordIndex][0].toLowerCase() === char.toLowerCase()
              );
            });
          })
          .map((party) => {
            return (
              <div
                onClick={() => setSelectedBillTo(party.id)}
                className={` p-2 text-center cursor-pointer text-white rounded-md ${
                  selectedBillTo === party.id ? "bg-blue-500" : "bg-black"
                } my-2`}
                key={party.id}
              >
                {party.name}
              </div>
            );
          })}
      </ScrollArea>

      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="my-2 p-2 border rounded"
        placeholder="Type to filter..."
      />

      <div className="flex flex-wrap justify-center gap-2">
        {Array.from(Array(26)).map((_, index) => {
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
export default PartySelectorFast;
