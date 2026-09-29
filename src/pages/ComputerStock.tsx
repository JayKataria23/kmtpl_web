import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, RefreshCw, Search, X } from "lucide-react";
import { Button, Toaster } from "@/components/ui";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/utils/supabase";

interface ComputerStockItem {
  id: number;
  particulars: string;
  quantity_mtrs: number;
}

type FilterTab = "all" | "regular" | "print" | "designs";
type SortDirection = "asc" | "desc" | null;

const PRINT_PATTERN = /-\s*\d{4}$/;
const NUMERIC_PATTERN = /^\d+$/;

const isPrint = (name: string) => PRINT_PATTERN.test(name.trim());
const isNumericDesign = (name: string) => NUMERIC_PATTERN.test(name.trim());

const TAB_RULES: Record<FilterTab, (name: string) => boolean> = {
  all: () => true,
  regular: (name) => !isPrint(name) && !isNumericDesign(name),
  print: isPrint,
  designs: isNumericDesign,
};

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "regular", label: "Regular" },
  { key: "print", label: "Print" },
  { key: "designs", label: "Designs" },
];

const formatMeters = (quantity: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(quantity);

export default function ComputerStock() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stock, setStock] = useState<ComputerStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const fetchStock = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("computer_stock")
      .select("id, particulars, quantity_mtrs")
      .order("particulars");

    if (error) {
      toast({
        title: "Unable to load computer stock",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setStock(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchStock();
  }, []);

  const tabCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = { all: 0, regular: 0, print: 0, designs: 0 };
    for (const item of stock) {
      (Object.keys(TAB_RULES) as FilterTab[]).forEach((tab) => {
        if (TAB_RULES[tab](item.particulars)) counts[tab] += 1;
      });
    }
    return counts;
  }, [stock]);

  const visibleStock = useMemo(() => {
    // "Contains" search: every space-separated term must appear anywhere in the design name.
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);

    const filtered = stock.filter((item) => {
      if (!TAB_RULES[activeTab](item.particulars)) return false;
      const name = item.particulars.toLowerCase();
      return terms.every((term) => name.includes(term));
    });

    if (sortDirection) {
      const factor = sortDirection === "asc" ? 1 : -1;
      return [...filtered].sort(
        (a, b) => (Number(a.quantity_mtrs) - Number(b.quantity_mtrs)) * factor
      );
    }
    return filtered;
  }, [stock, activeTab, search, sortDirection]);

  const totalMeters = visibleStock.reduce((total, item) => total + Number(item.quantity_mtrs), 0);

  const toggleSort = () =>
    setSortDirection((current) => (current === "asc" ? "desc" : "asc"));

  const SortIcon =
    sortDirection === "asc" ? ArrowUp : sortDirection === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="-ml-3 mb-3 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Computer Stock</h1>
          <p className="mt-1 text-sm text-slate-500">
            Current design-wise stock uploaded from the Master page.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {/* Toolbar: tabs, search, refresh */}
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div role="tablist" aria-label="Design filter" className="flex flex-wrap gap-1">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`ml-2 text-xs tabular-nums ${
                        isActive ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      {tabCounts[tab.key]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search design name"
                  aria-label="Search design name"
                  className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => void fetchStock()}
                disabled={loading}
                aria-label="Refresh stock"
                title="Refresh"
                className="h-9 w-9 shrink-0 border-slate-300 text-slate-600"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">DESIGN NAME</th>
                  <th
                    className="px-5 py-3 text-right"
                    aria-sort={
                      sortDirection === "asc"
                        ? "ascending"
                        : sortDirection === "desc"
                        ? "descending"
                        : "none"
                    }
                  >
                    <button
                      onClick={toggleSort}
                      className="inline-flex items-center gap-1.5 uppercase tracking-wide hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      title="Sort by quantity"
                    >
                      Quantity (Mtrs)
                      <SortIcon
                        className={`h-3.5 w-3.5 ${sortDirection ? "text-slate-900" : "text-slate-400"}`}
                      />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={2} className="px-5 py-12 text-center text-slate-500">
                      Loading stock…
                    </td>
                  </tr>
                ) : stock.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-5 py-12 text-center text-slate-500">
                      No computer stock has been uploaded yet.
                    </td>
                  </tr>
                ) : visibleStock.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-5 py-12 text-center text-slate-500">
                      No designs match your filter or search.
                    </td>
                  </tr>
                ) : (
                  visibleStock.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">{item.particulars}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                        {formatMeters(Number(item.quantity_mtrs))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {!loading && visibleStock.length > 0 && (
                <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900">
                  <tr>
                    <td className="px-5 py-3">
                      Total
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {visibleStock.length} {visibleStock.length === 1 ? "design" : "designs"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {formatMeters(totalMeters)} Mtrs
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
        <Toaster />
      </div>
    </div>
  );
}
