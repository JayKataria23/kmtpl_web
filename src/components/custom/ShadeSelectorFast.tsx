import React, { useEffect, useState, useMemo } from "react";
import { Button } from "../ui";
import { X, Plus, Edit } from "lucide-react";

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

  // Initialize with default shades if empty
  useEffect(() => {
    if (currentJSON.length === 0) {
      setCurrentJSON([
        { "All Colours": "" },
        ...Array.from({ length: 30 }, (_, i) => ({ [`${i + 1}`]: "" })),
      ]);
    }
  }, [currentJSON, setCurrentJSON]);

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
      ...currentJSON
        .map((item) => {
          const key = Object.keys(item)[0];
          return parseInt(key) || 0;
        })
        .filter((num) => !isNaN(num))
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

  // Unique keys for selection buttons
  const uniqueKeys = useMemo(
    () => Array.from(new Set(currentJSON.map((item) => Object.keys(item)[0]))),
    [currentJSON]
  );

  // Clear keys
  const handleClearKeys = (keys: string[]) => {
    setCurrentJSON((prev) =>
      prev.map((item) => {
        const key = Object.keys(item)[0];
        return keys.includes(key) ? { [key]: "" } : item;
      })
    );
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4 bg-white shadow-sm rounded-lg">
      {/* Current Shades Section */}

      {/* Custom Shade Addition */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newCustomShade}
            onChange={(e) => setNewCustomShade(e.target.value)}
            placeholder="Enter custom shade"
            className="flex-grow min-w-[150px] border rounded p-2"
          />
          <Button
            onClick={handleAddCustomShade}
            variant="outline"
            size="icon"
            disabled={!newCustomShade.trim()}
            className="shrink-0"
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
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="New value for selected keys"
            className="flex-grow min-w-[150px] border rounded p-2"
          />
          <Button
            onClick={handleModifySelectedKeys}
            variant="outline"
            size="icon"
            disabled={selectedKeys.length === 0 || !newValue.trim()}
            className="shrink-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
        {/* New buttons for modifying input value */}
        <div className="flex justify-around gap-2">
          <Button
            className="text-xs shrink-0"
            onClick={() =>
              setNewValue((prev) => String((parseInt(prev) || 0) + 50))
            }
          >
            +50
          </Button>
          <Button
            className="text-xs shrink-0"
            onClick={() =>
              setNewValue((prev) => String((parseInt(prev) || 0) - 50))
            }
          >
            -50
          </Button>
          <Button
            className="text-xs shrink-0"
            onClick={() =>
              setNewValue((prev) => String((parseInt(prev) || 0) + 10))
            }
          >
            +10
          </Button>
          <Button
            className="text-xs shrink-0"
            onClick={() =>
              setNewValue((prev) => String((parseInt(prev) || 0) - 10))
            }
          >
            -10
          </Button>
          <Button
            className="text-xs shrink-0"
            onClick={() =>
              setNewValue((prev) => String((parseInt(prev) || 0) + 100))
            }
          >
            +100
          </Button>
          <Button className="text-xs shrink-0" onClick={() => setNewValue("")}>
            x
          </Button>
        </div>
      </div>

      {/* Shade Selection Buttons */}
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Select Shades for {currentSelectedDesign}
        </h3>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {uniqueKeys.map((key) => (
            <Button
              key={key}
              onClick={() => handleSelectKey(key)}
              variant={selectedKeys.includes(key) ? "destructive" : "outline"}
              size="sm"
              className="flex items-center"
            >
              {selectedKeys.includes(key) && <X className="mr-1 h-3 w-3" />}
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
          <div className=" max-h-40 overflow-y-auto flex flex-wrap space-x-2">
            {Object.entries(groupedEntries)
              .sort((a, b) => a[1].length - b[1].length) // Sort by length of keys
              .map(([value, keys]) => (
                <>
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
                </>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ShadeSelectorFast;
