import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface DesignEntry {
  id: string;
  design: string;
  price: string;
  remark: string;
  shades: { [key: string]: string }[];
}

function SavedDesignsFast({
  designEntries,
  setDesignEntries,
}: {
  designEntries: DesignEntry[];
  setDesignEntries: (designEntries: DesignEntry[]) => void;
}) {
  const handlePriceChange = (id: string, newPrice: string) => {
    setDesignEntries(
      designEntries.map((entry) =>
        entry.id === id ? { ...entry, price: newPrice } : entry
      )
    );
  };

  const handleRemarkChange = (id: string, newRemark: string) => {
    setDesignEntries(
      designEntries.map((entry) =>
        entry.id === id ? { ...entry, remark: newRemark } : entry
      )
    );
  };

  const handleDelete = (id: string) => {
    setDesignEntries(designEntries.filter((entry) => entry.id !== id));
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4 bg-white shadow-sm rounded-lg">
      <h1 className="text-xl font-semibold mb-4">Saved Designs</h1>

      <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {designEntries.map((entry: DesignEntry) => (
          <div
            key={entry.id}
            className="p-4 border rounded-lg space-y-3 bg-gray-50"
          >
            <div className="flex justify-between items-start">
              <h4 className="font-medium">{entry.design}</h4>
              <Button
                onClick={() => handleDelete(entry.id)}
                variant="ghost"
                size="icon"
                className="text-red-600 hover:text-red-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 w-16">Price:</span>
                <Input
                  type="number"
                  value={entry.price}
                  onChange={(e) => handlePriceChange(entry.id, e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 w-16">Remark:</span>
                <Input
                  type="text"
                  value={entry.remark}
                  onChange={(e) => handleRemarkChange(entry.id, e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            {/* Shades display */}
            <div className="mt-2 space-y-1">
              {entry.shades.length > 0 &&
                Object.entries(
                  entry.shades.reduce<Record<string, string[]>>((acc, item) => {
                    const entries = Object.entries(item);
                    if (entries.length > 0) {
                      const [key, value] = entries[0];
                      if (value) {
                        if (!acc[value]) acc[value] = [];
                        acc[value].push(key);
                      }
                    }
                    return acc;
                  }, {})
                ).map(([value, keys]) => (
                  <div
                    key={value}
                    className="text-sm text-gray-600 bg-white p-2 rounded"
                  >
                    {keys.join(", ")}: {value}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SavedDesignsFast;
