import React, { useEffect, useState } from "react";
import { Button, ScrollArea } from "../ui";

interface ShadeItem {
  [key: string]: string;
}

interface ShadeSelectorFastProps {
  currentJSON: ShadeItem[];
  setCurrentJSON: React.Dispatch<React.SetStateAction<ShadeItem[]>>;
}

function ShadeSelectorFast({
  currentJSON,
  setCurrentJSON,
}: ShadeSelectorFastProps) {
  const [newCustomShade, setNewCustomShade] = useState<string>("");
  const [newValue, setNewValue] = useState<string>("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  useEffect(() => {
    if (currentJSON.length === 0) {
      setCurrentJSON([
        { "All Colours": "" },
        ...Array.from({ length: 30 }, (_, i) => ({ [`${i + 1}`]: "" })),
      ]);
    }
  }, [currentJSON, setCurrentJSON]);

  // Group entries by their values
  const groupedEntries = currentJSON.reduce((acc, item) => {
    const [key] = Object.keys(item);
    const value = item[key];
    if (!acc[value]) {
      acc[value] = [];
    }
    acc[value].push(key);
    return acc;
  }, {} as Record<string, string[]>);

  // Add more empty shade entries
  const addElements = () => {
    if (currentJSON.length > 0) {
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
    }
  };

  // Add a custom shade
  const handleAddCustomShade = () => {
    if (newCustomShade.trim()) {
      const newShade = { [newCustomShade.trim().toUpperCase()]: "" };

      // Prevent duplicate keys
      const isDuplicate = currentJSON.some(
        (item) => Object.keys(item)[0] === newShade[Object.keys(newShade)[0]]
      );

      if (!isDuplicate) {
        setCurrentJSON((prev) => [...prev, newShade]);
        setNewCustomShade("");
      } else {
        alert("This shade name already exists!");
      }
    }
  };

  // Select a key for modification
  const handleSelectKey = (key: string) => {
    setSelectedKeys((prevKeys) =>
      prevKeys.includes(key)
        ? prevKeys.filter((k) => k !== key)
        : [...prevKeys, key]
    );
  };

  // Modify selected keys' values
  const handleModifySelectedKeys = () => {
    if (newValue.trim() === "") return;

    setCurrentJSON((prev) =>
      prev.map((item) => {
        const key = Object.keys(item)[0];
        return selectedKeys.includes(key) ? { [key]: newValue.trim() } : item;
      })
    );

    setSelectedKeys([]); // Clear selected keys
    setNewValue(""); // Clear the input field
  };

  return (
    <div className="space-y-4">
      {/* Grouped Entries Display */}
      {Object.entries(groupedEntries)
        .filter(([value]) => value) // Only include groups with a value
        .map(([value, keys]) => (
          <div key={value} className="flex items-center space-x-2">
            <span className="font-bold">{keys.join(", ")}</span>
            <span className="text-gray-600">{value}</span>
          </div>
        ))}

      {/* Add More Shades Button */}
      <div>
        <Button onClick={addElements}>+10 Shades</Button>
      </div>

      {/* Custom Shade Addition */}
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={newCustomShade}
          onChange={(e) => setNewCustomShade(e.target.value)}
          placeholder="Enter custom shade"
          className="border rounded p-2 flex-grow"
        />
        <Button onClick={handleAddCustomShade}>Add Custom Shade</Button>
      </div>

      {/* Shade Selection Buttons */}
      <ScrollArea className="flex flex-wrap gap-2">
        {currentJSON
          .map((item) => {
            const key = Object.keys(item)[0];
            return { key, value: item[key] };
          })
          .filter(
            (item, index, self) =>
              self.findIndex((t) => t.key === item.key) === index
          )
          .map(({ key }) => (
            <Button
              key={key}
              onClick={() => handleSelectKey(key)}
              variant={selectedKeys.includes(key) ? "destructive" : "default"}
            >
              {key}
            </Button>
          ))}
      </ScrollArea>

      {/* Modify Selected Keys */}
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Modify selected keys value"
          className="border rounded p-2 flex-grow"
        />
        <Button
          onClick={handleModifySelectedKeys}
          disabled={selectedKeys.length === 0 || newValue.trim() === ""}
        >
          Modify Selected Keys
        </Button>
      </div>
    </div>
  );
}

export default ShadeSelectorFast;
