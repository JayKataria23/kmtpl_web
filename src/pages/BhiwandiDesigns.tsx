import { useEffect, useState } from "react";
import supabase from "@/utils/supabase";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const FILTERS = [
  { value: "all", label: "ALL" },
  { value: "regular", label: "Regular" },
  { value: "print", label: "Print" },
  { value: "digital", label: "Digital" },
  { value: "Design No.", label: "Design No." },
  { value: "prefix", label: "Prefix" },
];

interface DesignCount {
  design: string;
  count: number;
}

interface DesignEntry {
  id: number;
  bill_to_party: string;
  order_no: number;
  remark: string;
  order_remark: string;
  price: number;
  shades: { [key: string]: string }[];
  bhiwandi_date: string;
}

export default function BhiwandiDesigns() {
  const [designCounts, setDesignCounts] = useState<DesignCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [customPrefix, setCustomPrefix] = useState("");
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  const [designEntries, setDesignEntries] = useState<Record<string, DesignEntry[]>>({});
  const [loadingEntries, setLoadingEntries] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchDesignCounts = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("design_entries")
        .select(`
          id,
          design,
          order_id,
          orders!inner(canceled)
        `)
        .is("dispatch_date", null)
        .not("bhiwandi_date", "is", null)
        .neq("design", null)
        .neq("design", "")
        .eq("orders.canceled", false);
      if (error) {
        setError(error.message);
        setDesignCounts([]);
      } else if (data) {
        const countMap: Record<string, number> = {};
        (data as { design: string }[]).forEach((row) => {
          if (row.design) {
            countMap[row.design] = (countMap[row.design] || 0) + 1;
          }
        });
        const counts: DesignCount[] = Object.entries(countMap).map(([design, count]) => ({ design, count }));
        setDesignCounts(counts);
      }
      setLoading(false);
    };
    fetchDesignCounts();
  }, []);

  // Filtering and sorting logic from DesignReports
  const filteredDesignCounts = () => {
    if (filter === "all") {
      return [...designCounts].sort((a, b) => a.design.localeCompare(b.design));
    } else if (filter === "regular") {
      return designCounts
        .filter(
          (item) =>
            !(
              item.design.includes("-") && /^\d{4}$/.test(item.design.slice(-4))
            ) &&
            !(
              item.design.includes("-") && /^\d{3}$/.test(item.design.slice(-3))
            ) &&
            isNaN(Number(item.design))
        )
        .sort((a, b) => a.design.localeCompare(b.design));
    } else if (filter === "Design No.") {
      return designCounts
        .filter((item) => !isNaN(Number(item.design)))
        .sort((a, b) => Number(a.design) - Number(b.design));
    } else if (filter === "digital") {
      return designCounts
        .filter((item) => item.design.includes("D-") || item.design.includes("DDBY-"))
        .sort((a, b) => {
          const numA = Number(a.design.split("-").pop());
          const numB = Number(b.design.split("-").pop());
          return numA - numB;
        });
    } else if (filter === "prefix") {
      return designCounts
        .filter((item) => item.design.startsWith(customPrefix))
        .sort((a, b) => a.design.localeCompare(b.design));
    } else {
      // print
      return designCounts
        .filter(
          (item) =>
            (item.design.includes("-") && /^\d{4}$/.test(item.design.slice(-4))) ||
            (item.design.includes("-") && /^\d{3}$/.test(item.design.slice(-3)))
        )
        .sort((a, b) => {
          const numA = Number(a.design.split("-").pop());
          const numB = Number(b.design.split("-").pop());
          return numA - numB;
        });
    }
  };

  const handleAccordionChange = async (values: string[]) => {
    setOpenAccordionItems(values);
    // Fetch entries for any newly opened design
    for (const design of values) {
      if (!designEntries[design] && !loadingEntries[design]) {
        setLoadingEntries((prev) => ({ ...prev, [design]: true }));
        const { data, error } = await supabase
          .from("design_entries")
          .select(`
            id,
            price,
            remark,
            shades,
            bhiwandi_date,
            order_id,
            orders!inner(order_no, remark, bill_to_id, canceled, party_profiles!orders_bill_to_id_fkey(name))
          `)
          .is("dispatch_date", null)
          .not("bhiwandi_date", "is", null)
          .eq("design", design)
          .eq("orders.canceled", false);
        if (error) {
          setDesignEntries((prev) => ({ ...prev, [design]: [] }));
        } else if (data) {
          const entries: DesignEntry[] = (data as any[]).map((row) => ({
            id: row.id,
            bill_to_party: row.orders?.party_profiles?.name || "",
            order_no: row.orders?.order_no || "",
            remark: row.remark,
            order_remark: row.orders?.remark || "",
            price: row.price,
            shades: row.shades,
            bhiwandi_date: row.bhiwandi_date,
          }));
          setDesignEntries((prev) => ({ ...prev, [design]: entries }));
        }
        setLoadingEntries((prev) => ({ ...prev, [design]: false }));
      }
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Bhiwandi Designs</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        <ToggleGroup
          variant="outline"
          type="single"
          value={filter}
          onValueChange={(value) => {
            setFilter(value);
          }}
          className="w-full sm:w-auto flex-wrap justify-start"
        >
          {FILTERS.map((f) => (
            <ToggleGroupItem key={f.value} value={f.value} aria-label={f.label}>
              {f.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {filter === "prefix" && (
          <div className="flex items-center gap-2 mt-2">
            <Input
              placeholder="Enter prefix..."
              value={customPrefix}
              onChange={e => setCustomPrefix(e.target.value)}
              className="w-48"
            />
            <span className="text-sm text-gray-500">Filtering designs starting with: <b>{customPrefix || "(none)"}</b></span>
          </div>
        )}
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">Error: {error}</p>
      ) : filteredDesignCounts().length === 0 ? (
        <p>No designs found.</p>
      ) : (
        <Accordion
          type="multiple"
          className="w-full"
          value={openAccordionItems}
          onValueChange={handleAccordionChange}
        >
          {filteredDesignCounts().map((item, idx) => (
            <AccordionItem key={item.design} value={item.design}>
              <AccordionTrigger className="flex items-center justify-between">
                <span className="font-medium">{item.design}</span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full ml-2">{item.count} entries</span>
              </AccordionTrigger>
              <AccordionContent>
                {loadingEntries[item.design] ? (
                  <p>Loading entries...</p>
                ) : designEntries[item.design] && designEntries[item.design].length > 0 ? (
                  <div className="space-y-4">
                    {designEntries[item.design].map((entry) => (
                      <div key={entry.id} className="p-4 border rounded-lg bg-white">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                          <div>
                            <span className="font-semibold">Bill to Party:</span> {entry.bill_to_party}
                          </div>
                          <div>
                            <span className="font-semibold">Order No:</span> {entry.order_no}
                          </div>
                          <div>
                            <span className="font-semibold">Price:</span> ₹{entry.price}
                          </div>
                        </div>
                        <div className="mb-1">
                          <span className="font-semibold">Remark:</span> {entry.remark || <span className="text-gray-400">None</span>}
                        </div>
                        <div className="mb-1">
                          <span className="font-semibold">Order Remark:</span> {entry.order_remark || <span className="text-gray-400">None</span>}
                        </div>
                        <div className="mb-1">
                          <span className="font-semibold">Bhiwandi Date:</span> {formatDate(entry.bhiwandi_date)}
                        </div>
                        <div className="mb-1">
                          <span className="font-semibold">Shades:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {entry.shades && entry.shades.length > 0 ? (
                              entry.shades.map((shade, idx) => {
                                const shadeName = Object.keys(shade)[0];
                                const shadeValue = shade[shadeName];
                                if (!shadeValue) return null;
                                return (
                                  <span key={idx} className="bg-gray-100 px-2 py-1 rounded text-xs">
                                    {shadeName}: {shadeValue}m
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-gray-400">No shades</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No entries found for this design.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
} 