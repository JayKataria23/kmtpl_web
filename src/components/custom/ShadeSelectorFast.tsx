import React, { useEffect, useState } from "react";
import { Button } from "../ui";

interface ShadeSelectorFastProps {
  currentJSON: { [key: string]: string }[];
  setCurrentJSON: React.Dispatch<
    React.SetStateAction<{ [key: string]: string }[]>
  >;
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

  const groupedEntries = currentJSON.reduce((acc, item) => {
    Object.entries(item).forEach(([key, value]) => {
      if (!acc[value]) {
        acc[value] = [];
      }
      acc[value].push(key);
    });
    return acc;
  }, {} as Record<string, string[]>);

  const addElements = () => {
    if (currentJSON.length > 0) {
      // Find the maximum shade number from existing shades
      const maxShadeNumber = Math.max(
        ...currentJSON.map((item) => parseInt(Object.keys(item)[0]) || 0)
      );

      // Create new shades based on the maximum shade number
      const newElements = Array.from({ length: 10 }, (_, i) => ({
        [`${maxShadeNumber + i + 1}`]: "",
      }));

      // Update the state with the new elements
      setCurrentJSON((prev) => [...prev, ...newElements]);
    }
  };

  const handleAddCustomShade = () => {
    if (newCustomShade.trim()) {
      const newShade = { [newCustomShade.trim().toUpperCase()]: "" };
      setCurrentJSON((prev) => [...prev, newShade]);
      setNewCustomShade("");
    }
  };

  const handleSelectKey = (key: string) => {
    setSelectedKeys((prevKeys) => [...prevKeys, key]);
    console.log(`Key selected: ${key}`);
  };

  const handleModifySelectedKeys = () => {
    setCurrentJSON((prev) =>
      prev.map((item) => {
        const key = Object.keys(item)[0];
        if (selectedKeys.includes(key)) {
          return { [key]: newValue }; // Assign newValue to selected keys
        }
        return item; // Return unchanged item
      })
    );
    setSelectedKeys([]); // Clear selected keys after modification
    setNewValue(""); // Clear the input field
    console.log("Selected keys modified");
  };

  return (
    <div>
      {Object.entries(groupedEntries)
        .filter(([value]) => value) // Only include groups with a value
        .map(([value, keys]) => (
          <div key={value}>
            <div>{keys.join("-")}</div>
            <div>{value}</div>
          </div>
        ))}
      <div>
        <Button onClick={addElements}>+10</Button>
      </div>
      <div className="flex items-center mt-4">
        <input
          type="text"
          value={newCustomShade}
          onChange={(e) => setNewCustomShade(e.target.value)}
          placeholder="Enter custom shade"
          className="border rounded p-2"
        />
        <Button onClick={handleAddCustomShade} className="ml-2">
          Add Custom Shade
        </Button>
      </div>
      <div className="flex flex-wrap">
        {currentJSON
          .filter(
            (item, index, self) =>
              index ===
              self.findIndex((t) => Object.keys(t)[0] === Object.keys(item)[0])
          ) // Ensure unique keys
          .map((item) => (
            <div
              key={item[Object.keys(item)[0]]}
              style={{ display: "inline-block", marginRight: "8px" }}
            >
              <Button onClick={() => handleSelectKey(Object.keys(item)[0])}>
                {Object.keys(item)[0]}
              </Button>
            </div>
          ))}
      </div>
      <div className="flex items-center mt-4">
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Modify selected keys value"
          className="border rounded p-2"
        />

        <Button onClick={handleModifySelectedKeys} className="ml-2">
          Modify Selected Keys
        </Button>
      </div>
    </div>
  );
}

export default ShadeSelectorFast;
