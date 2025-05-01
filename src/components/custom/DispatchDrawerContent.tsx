import { Button } from "@/components/ui/button";
import { DesignDetail, SelectedDesignDetail } from "@/types/party-file";

interface DispatchDrawerContentProps {
  selectedEntries: SelectedDesignDetail[];
  setSelectedEntries: (entries: SelectedDesignDetail[]) => void;
  setIsAddPartOrderOpen: (open: boolean) => void;
  setSelectedOrder: (order: DesignDetail | null) => void;
  handleRemoveFromDrawer: (entry: DesignDetail) => void;
}

export function DispatchDrawerContent({
  selectedEntries,
  setSelectedEntries,
  setIsAddPartOrderOpen,
  setSelectedOrder,
  handleRemoveFromDrawer,
}: DispatchDrawerContentProps) {
  return (
    <div className="p-4 overflow-y-auto max-h-[60vh]">
      {selectedEntries.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No entries selected
        </div>
      ) : (
        selectedEntries.map((entry, index) => (
          <div key={entry.design_entry_id || index} className="mb-4">
            <h3 className="text-lg font-semibold mb-2">{entry.design}</h3>
            <div className="w-full border border-gray-200 rounded-md overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="p-4 md:w-3/6">
                  <div className="break-words text-sm">
                    <p className="font-medium text-gray-900">
                      {entry.party_name}
                    </p>
                    {entry.remark && (
                      <p className="text-gray-700 mt-1">
                        <span className="font-medium">Remark:</span>{" "}
                        {entry.remark}
                      </p>
                    )}
                    {entry.price && (
                      <p className="text-gray-700 mt-1">
                        <span className="font-medium">Price:</span>{" "}
                        {entry.price}
                      </p>
                    )}
                    <div className="mt-3">
                      <label
                        htmlFor={`date-${entry.design_entry_id}`}
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Date
                      </label>
                      <input
                        id={`date-${entry.design_entry_id}`}
                        type="date"
                        className="border rounded p-1 w-full"
                        value={entry.date || ""}
                        onChange={(e) => {
                          const updatedDate = e.target.value;
                          setSelectedEntries(
                            selectedEntries.map((item) =>
                              item.design_entry_id === entry.design_entry_id
                                ? { ...item, date: updatedDate }
                                : item
                            )
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 md:w-2/6 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Shades
                  </p>
                  {entry.shades && entry.shades.length > 0 ? (
                    entry.shades.map((shade, idx) => {
                      const shadeName = Object.keys(shade)[0];
                      const shadeValue = shade[shadeName];

                      if (
                        !shadeValue ||
                        shadeValue === "" ||
                        shadeValue === "NaN"
                      ) {
                        return null;
                      }

                      return (
                        <div key={idx} className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">{shadeName}:</span>{" "}
                          {shadeValue}m
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-500">No shades available</p>
                  )}
                </div>

                <div className="p-4 md:w-1/6 flex md:flex-col items-center justify-center space-y-0 md:space-y-2 space-x-2 md:space-x-0">
                  <Button
                    className="rounded-full w-10 h-10 flex items-center justify-center"
                    onClick={() => {
                      setIsAddPartOrderOpen(true);
                      setSelectedOrder(entry);
                    }}
                    title="Parts"
                  >
                    P
                  </Button>
                  <Button
                    className="bg-red-500 hover:bg-red-600 rounded-full w-10 h-10 flex items-center justify-center"
                    onClick={() => handleRemoveFromDrawer(entry)}
                    title="Remove"
                  >
                    X
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
