import React, { useEffect, useState, useMemo } from "react";
import { Button, Input, Label } from "../ui";
import { X, Plus, Edit } from "lucide-react";
import supabase from "@/utils/supabase";

interface ShadeItem {
  [key: string]: string;
}

interface ShadeSelectorFastProps {
  currentJSON: ShadeItem[];
  setCurrentJSON: React.Dispatch<React.SetStateAction<ShadeItem[]>>;
  currentSelectedDesign: string | null;
}

function ShadeSelectorFast({
  currentJSON,
  setCurrentJSON,
  currentSelectedDesign,
}: ShadeSelectorFastProps) {
  const [newCustomShade, setNewCustomShade] = useState<string>("");
  const [newValue, setNewValue] = useState<string>("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [totalShades, setTotalShades] = useState<number | null>(null);
  const [isSavingTotalShades, setIsSavingTotalShades] = useState(false);

  // Initialize with default shades if empty
  useEffect(() => {
    if (currentJSON.length === 0) {
      setCurrentJSON([
        { "All Colours": "" },
        ...Array.from({ length: 30 }, (_, i) => ({ [`${i + 1}`]: "" })),
      ]);
    }
  }, [currentJSON, setCurrentJSON]);

  // Fetch total shades for the currently selected design
  useEffect(() => {
    const fetchTotalShadesForDesign = async () => {
      if (!currentSelectedDesign) {
        setTotalShades(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("designs")
          .select("total_shades")
          .eq("title", currentSelectedDesign)
          .single();

        if (error || !data || typeof data.total_shades !== "number") {
          setTotalShades(null);
          return;
        }

        setTotalShades(data.total_shades);
      } catch (err) {
        console.error("Error fetching total shades for design:", err);
        setTotalShades(null);
      }
    };

    fetchTotalShadesForDesign();
  }, [currentSelectedDesign]);

  // Memoized grouped entries to reduce unnecessary re-computations
  const groupedEntries = useMemo(() => {
    return currentJSON.reduce((acc, item) => {
      const [key] = Object.keys(item);
      const value = item[key];
      if (value) {
        if (!acc[value]) {
          acc[value] = [];
        }
        acc[value].push(key);
      }
      return acc;
    }, {} as Record<string, string[]>);
  }, [currentJSON]);

  // Add more empty shade entries
  const addElements = () => {
    const maxShadeNumber = Math.max(
      ...currentJSON.map((item) => {
        const key = Object.keys(item)[0];
        return parseInt(key) || 0;
      })
    );

    const newElements = Array.from({ length: 10 }, (_, i) => ({
      [`${maxShadeNumber + i + 1}`]: "",
    }));

    setCurrentJSON((prev) => [...prev, ...newElements]);
  };

  // Add a custom shade
  const handleAddCustomShade = () => {
    if (!newCustomShade.trim()) return;

    const newShadeKey = newCustomShade.trim().toUpperCase();
    const isDuplicate = currentJSON.some(
      (item) => Object.keys(item)[0] === newShadeKey
    );

    if (isDuplicate) {
      alert("This shade name already exists!");
      return;
    }

    setCurrentJSON((prev) => [...prev, { [newShadeKey]: "" }]);
    setNewCustomShade("");
  };

  // Select/deselect a key for modification
  const handleSelectKey = (key: string) => {
    setSelectedKeys((prevKeys) =>
      prevKeys.includes(key)
        ? prevKeys.filter((k) => k !== key)
        : [...prevKeys, key]
    );
  };

  // Modify selected keys' values
  const handleModifySelectedKeys = () => {
    if (!newValue.trim() || selectedKeys.length === 0) return;

    setCurrentJSON((prev) =>
      prev.map((item) => {
        const key = Object.keys(item)[0];
        return selectedKeys.includes(key) ? { [key]: newValue.trim() } : item;
      })
    );

    setSelectedKeys([]); // Clear selected keys
    setNewValue(""); // Clear the input field
  };

  // Unique keys for selection buttons, ordered:
  // 1) "All Colours"
  // 2) any non-numeric/text shades
  // 3) numeric shades in increasing order
  const uniqueKeys = useMemo(() => {
    const keys = Array.from(
      new Set(currentJSON.map((item) => Object.keys(item)[0]))
    );

    const allColours = keys.filter((k) => k === "All Colours");
    const textKeys = keys.filter(
      (k) => k !== "All Colours" && isNaN(Number(k))
    );
    const numericKeys = keys
      .filter((k) => !isNaN(Number(k)))
      .sort((a, b) => Number(a) - Number(b));

    return [...allColours, ...textKeys, ...numericKeys];
  }, [currentJSON]);

  // Clear keys
  const handleClearKeys = (keys: string[]) => {
    setCurrentJSON((prev) =>
      prev.map((item) => {
        const key = Object.keys(item)[0];
        return keys.includes(key) ? { [key]: "" } : item;
      })
    );
  };

  const allColoursValue = useMemo(() => {
    const item = currentJSON.find(
      (shade) => Object.keys(shade)[0] === "All Colours"
    );
    if (!item) return "";
    return item["All Colours"];
  }, [currentJSON]);

  const handleApplyAllColours = () => {
    if (!totalShades || totalShades < 1) return;
    const value = allColoursValue;
    if (!value || isNaN(Number(value))) return;

    setCurrentJSON((prev) => {
      const maxTotal = totalShades ?? 0;

      // Remove existing numeric shades in range 1..totalShades
      const filtered = prev.filter((item) => {
        const key = Object.keys(item)[0];
        const n = Number(key);
        return isNaN(n) || n < 1 || n > maxTotal;
      });

      const newShades = [...filtered];
      for (let i = 1; i <= maxTotal; i++) {
        newShades.push({ [i.toString()]: value });
      }

      // Clear All Colours value after applying
      return newShades.map((item) =>
        Object.keys(item)[0] === "All Colours" ? { "All Colours": "" } : item
      );
    });
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4 bg-white shadow-sm rounded-lg">
      <div className="mb-2 text-center">
        <h1 className="text-xl font-semibold">Select Shades for {currentSelectedDesign}</h1>

      </div>

      {/* Total Colours and Apply-to-All (uses existing "All Colours" shade) */}
      {currentSelectedDesign && (
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-gray-800 whitespace-nowrap">
              Total Colours
            </Label>
            <Input
              type="number"
              min={0}
              value={totalShades ?? 0}
              onChange={(e) =>
                setTotalShades(parseInt(e.target.value, 10) || 0)
              }
              className="w-20 h-8 text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={isSavingTotalShades || !currentSelectedDesign}
              onClick={async () => {
                if (!currentSelectedDesign) return;
                try {
                  setIsSavingTotalShades(true);
                  const { error } = await supabase
                    .from("designs")
                    .update({ total_shades: totalShades ?? 0 })
                    .eq("title", currentSelectedDesign);
                  setIsSavingTotalShades(false);
                  if (error) {
                    console.error("Error updating total shades:", error);
                    return;
                  }
                } catch (err) {
                  console.error("Error updating total shades:", err);
                  setIsSavingTotalShades(false);
                }
              }}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={handleApplyAllColours}
              disabled={
                !totalShades ||
                totalShades < 1 ||
                !allColoursValue ||
                isNaN(Number(allColoursValue))
              }
            >
              Apply to All
            </Button>
          </div>

        </div>
      )}

      {/* Custom Shade Addition */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newCustomShade}
            onChange={(e) => setNewCustomShade(e.target.value)}
            placeholder="Enter custom shade"
            className="flex-grow min-w-[150px] border rounded p-2 h-11"
          />
          <Button
            onClick={handleAddCustomShade}
            variant="outline"
            size="icon"
            disabled={!newCustomShade.trim()}
            className="shrink-0 h-11"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Button onClick={addElements} variant="secondary" className="w-full">
          <Plus className="mr-2 h-4 w-4" /> Add 10 Numeric Shades
        </Button>
      </div>

      {/* Modify Keys Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="New value for selected keys"
            className="flex-grow min-w-[150px] border rounded p-2 h-11"
          />
          <Button
            onClick={handleModifySelectedKeys}
            variant="outline"
            size="icon"
            disabled={selectedKeys.length === 0 || !newValue.trim()}
            className="shrink-0 h-11"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>

        {/* Numeric Buttons for modifying input value */}
        <div className="flex justify-around gap-2">
          {["+50", "-50", "+10", "-10", "+100"].map((label) => (
            <Button
              key={label}
              className="h-11"
              onClick={() => {
                const value = parseInt(label) || 0;
                setNewValue((prev) => String((parseInt(prev) || 0) + value));
              }}
            >
              {label}
            </Button>
          ))}
          <Button className="h-11" onClick={() => setNewValue("")}>
            x
          </Button>
        </div>
      </div>

      {/* Shade Selection Buttons */}
      <div className="bg-gray-50 rounded-lg p-3 h-[35vh] overflow-y-auto">
        <div className="grid grid-cols-4 gap-2">
          {uniqueKeys.map((key) => (
            <Button
              key={key}
              onClick={() => handleSelectKey(key)}
              variant={selectedKeys.includes(key) ? "default" : "outline"}
              className="w-full h-11"
            >
              {key}
            </Button>
          ))}
        </div>
      </div>
      {Object.entries(groupedEntries).length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <h3 className="text-lg font-semibold mb-2">
            {currentSelectedDesign}
          </h3>
          <div className=" max-h-40 overflow-y-auto flex flex-wrap space-x-2 px-10">
            {Object.entries(groupedEntries)
              .sort((a, b) => a[1].length - b[1].length) // Sort by length of keys
              .map(([value, keys]) => (
                <div className="flex">
                  <div key={value} className="items-center">
                    <div className="font-medium text-gray-700 mr-2 border-b-2 w-full text-center">
                      {keys.join("-")}
                    </div>
                    <div className="text-gray-500 break-words text-center w-full">
                      {value}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleClearKeys(keys)}
                    variant="ghost"
                    size="icon"
                    className="relative left-[-10px]"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ShadeSelectorFast;
