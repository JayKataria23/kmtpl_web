import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import supabase from "@/utils/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Toaster } from "@/components/ui";
import { Check } from "lucide-react";

// --- Types ---
interface BhiwandiEntry {
  bhiwandi_date: string;
  count: number;
  comment?: string;
}

interface Entry {
  design_entry_id: number;
  design: string;
  price: string;
  remark: string;
  shades: { [key: string]: string }[];
  bill_to_party: string;
  ship_to_party: string;
  broker_name: string;
  transporter_name: string;
  order_id: string;
  order_no: number;
}

interface GroupedEntry {
  design: string;
  price: string;
  remark: string;
  shades: { [key: string]: string }[];
  design_entry_id: number;
}

interface GroupedOrder {
  order_id: string;
  bill_to_party: string;
  ship_to_party: string;
  broker_name: string;
  transporter_name: string;
  entries: GroupedEntry[];
  order_no: number;
}

// --- Utility ---
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// --- Main Component ---
const BhiwandiListModern = () => {
  const [bhiwandiEntries, setBhiwandiEntries] = useState<BhiwandiEntry[]>([]);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [designEntries, setDesignEntries] = useState<Record<string, GroupedOrder[]>>({});
  const [editingRemarks, setEditingRemarks] = useState<{
    [design_entry_id: number]: { value: string; saving: boolean; saved: boolean }
  }>({});
  const [editingComment, setEditingComment] = useState<{
    bhiwandi_date: string;
    value: string;
    saved: boolean;
  } | null>(null);
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();
  const remarkInputRefs = useRef<{ [design_entry_id: number]: HTMLInputElement | null }>({});
  const commentInputRef = useRef<HTMLInputElement>(null);
  const remarkTimeoutRefs = useRef<{ [design_entry_id: number]: NodeJS.Timeout | null }>({});

  // --- Fetchers ---
  useEffect(() => {
    fetchBhiwandiEntries();
    fetchComments();
    return () => {
      // Clean up all pending remark timeouts on unmount
      Object.values(remarkTimeoutRefs.current).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  const fetchBhiwandiEntries = async () => {
    try {
      const { data, error } = await supabase.rpc("get_bhiwandi_date_counts");
      if (error) throw error;
      setBhiwandiEntries(data);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch Bhiwandi entries: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("bhiwandi_comments")
        .select("bhiwandi_date, comment");
      if (error) throw error;
      const commentMap = (data || []).reduce(
        (acc: { [key: string]: string }, item) => {
          acc[item.bhiwandi_date] = item.comment || "";
          return acc;
        },
        {}
      );
      setComments(commentMap);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch comments: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  const fetchDesignEntries = async (date: string) => {
    if (designEntries[date]) return; // Already loaded
    try {
      const { data, error } = await supabase.rpc(
        "get_design_entries_by_bhiwandi_date",
        { input_date: date }
      );
      if (error) throw error;
      setDesignEntries((prev) => ({ ...prev, [date]: groupByOrderId(data) }));
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch design entries: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  // --- Grouping ---
  function groupByOrderId(entries: Entry[]): GroupedOrder[] {
    const grouped = new Map<string, GroupedOrder>();
    entries.forEach((entry) => {
      const {
        order_id,
        bill_to_party,
        ship_to_party,
        broker_name,
        transporter_name,
        design_entry_id,
        design,
        price,
        remark,
        shades,
        order_no,
      } = entry;
      if (!grouped.has(order_id)) {
        grouped.set(order_id, {
          order_id,
          bill_to_party,
          ship_to_party,
          broker_name,
          transporter_name,
          order_no,
          entries: [],
        });
      }
      const group = grouped.get(order_id)!;
      group.entries.push({ design, price, remark, shades, design_entry_id });
    });
    return Array.from(grouped.values());
  }

  // --- Actions ---
  const handleRemarkEdit = (design_entry_id: number, value: string) => {
    // Clear any timeout for this entry
    if (remarkTimeoutRefs.current[design_entry_id]) {
      clearTimeout(remarkTimeoutRefs.current[design_entry_id]!);
      remarkTimeoutRefs.current[design_entry_id] = null;
    }
    setEditingRemarks((prev) => ({
      ...prev,
      [design_entry_id]: { value, saving: false, saved: false },
    }));
    setTimeout(() => {
      remarkInputRefs.current[design_entry_id]?.focus();
    }, 0);
  };

  const saveRemark = async (design_entry_id: number, value: string, date: string) => {
    setEditingRemarks((prev) => ({
      ...prev,
      [design_entry_id]: { ...prev[design_entry_id], saving: true, saved: false },
    }));
    try {
      const { error } = await supabase
        .from("design_entries")
        .update({ remark: value })
        .eq("id", design_entry_id);
      if (error) throw error;
      setDesignEntries((prev) => ({
        ...prev,
        [date]: prev[date].map((order) => ({
          ...order,
          entries: order.entries.map((entry) =>
            entry.design_entry_id === design_entry_id ? { ...entry, remark: value } : entry
          ),
        })),
      }));
      // Mark as saved, then clear after a short delay
      setEditingRemarks((prev) => ({
        ...prev,
        [design_entry_id]: { ...prev[design_entry_id], saving: false, saved: true },
      }));
      if (remarkTimeoutRefs.current[design_entry_id]) {
        clearTimeout(remarkTimeoutRefs.current[design_entry_id]!);
      }
      remarkTimeoutRefs.current[design_entry_id] = setTimeout(() => {
        setEditingRemarks((prev) => {
          const { [design_entry_id]: _, ...rest } = prev;
          return rest;
        });
        remarkTimeoutRefs.current[design_entry_id] = null;
      }, 800);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update remark: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
      setEditingRemarks((prev) => {
        const { [design_entry_id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleCommentEdit = (bhiwandi_date: string, value: string) => {
    setEditingComment({ bhiwandi_date, value, saved: false });
    setTimeout(() => commentInputRef.current?.focus(), 0);
  };

  const saveComment = async (bhiwandi_date: string, value: string) => {
    try {
      setEditingComment((prev) => prev && prev.bhiwandi_date === bhiwandi_date ? { ...prev, saved: true } : prev);
      const { error } = await supabase.from("bhiwandi_comments").upsert(
        { bhiwandi_date, comment: value },
        { onConflict: "bhiwandi_date" }
      );
      if (error) throw error;
      setComments((prev) => ({ ...prev, [bhiwandi_date]: value }));
      setTimeout(() => setEditingComment(null), 800);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update comment: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
      setEditingComment(null);
    }
  };

  const handleDelete = async (design_entry_id: number, date: string) => {
    try {
      setDesignEntries((prev) => ({
        ...prev,
        [date]: prev[date].map((order) => ({
          ...order,
          entries: order.entries.filter((entry) => entry.design_entry_id !== design_entry_id),
        })).filter((order) => order.entries.length > 0),
      }));
      const { error } = await supabase
        .from("design_entries")
        .update({ bhiwandi_date: null })
        .eq("id", design_entry_id);
      if (error) throw error;
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete design entry: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  // --- Batch Actions ---
  const handleDateSelect = (date: string) => {
    setSelectedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(date)) newSet.delete(date);
      else newSet.add(date);
      return newSet;
    });
  };

  const handleCombine = async () => {
    if (selectedDates.size < 2) return;
    try {
      const today = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("design_entries")
        .update({ bhiwandi_date: today })
        .in("bhiwandi_date", Array.from(selectedDates));
      if (error) throw error;
      setBhiwandiEntries((prev) => prev.filter((e) => !selectedDates.has(e.bhiwandi_date)));
      setSelectedDates(new Set());
      setDesignEntries({});
      fetchBhiwandiEntries();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to combine entries: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  // --- Render ---
  return (
    <div className="container mx-auto mt-10 text-center">
      <h1 className="text-2xl font-bold">Bhiwandi List</h1>
      <Button onClick={() => navigate("/")} className="mt-4 m-2">
        Back to Home
      </Button>
      <Button
        onClick={handleCombine}
        disabled={selectedDates.size < 2}
        className="mt-4 m-2"
      >
        Combine
      </Button>
      <div className="mt-6">
        <Accordion
          type="single"
          collapsible
          className="w-full"
          value={expandedDate as string | undefined}
          onValueChange={setExpandedDate}
        >
          {bhiwandiEntries.map((entry, index) => (
            <AccordionItem key={index} value={entry.bhiwandi_date}>
              <AccordionTrigger
                className="p-4 flex justify-between items-center"
                onClick={() => {
                  setExpandedDate(expandedDate === entry.bhiwandi_date ? null : entry.bhiwandi_date);
                  fetchDesignEntries(entry.bhiwandi_date);
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <div>
                    <input
                      type="checkbox"
                      checked={selectedDates.has(entry.bhiwandi_date)}
                      onChange={e => {
                        e.stopPropagation();
                        handleDateSelect(entry.bhiwandi_date);
                      }}
                      className="mr-2"
                    />
                    <span className="text-lg font-semibold">
                      {formatDate(entry.bhiwandi_date)}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      Count: {entry.count}
                    </span>
                  </div>
                  <div className="ml-4 flex items-center">
                    {editingComment && editingComment.bhiwandi_date === entry.bhiwandi_date ? (
                      <input
                        type="text"
                        ref={commentInputRef}
                        value={editingComment.value}
                        onChange={e => setEditingComment({ ...editingComment, value: e.target.value, saved: false })}
                        onBlur={() => saveComment(entry.bhiwandi_date, editingComment.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") saveComment(entry.bhiwandi_date, editingComment.value);
                        }}
                        onClick={e => e.stopPropagation()}
                        className="px-2 py-1 border rounded"
                        placeholder="NA"
                        style={{ minWidth: 120 }}
                      />
                    ) : (
                      <span
                        onClick={e => {
                          e.stopPropagation();
                          handleCommentEdit(entry.bhiwandi_date, comments[entry.bhiwandi_date] || "");
                        }}
                        className="text-sm text-gray-600 cursor-pointer hover:text-gray-900"
                      >
                        {comments[entry.bhiwandi_date] || "NA"}
                      </span>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 border rounded mt-2">
                <div>
                  <Button
                    onClick={() => navigate(`/bhiwandi-list-print/:${entry.bhiwandi_date}`)}
                    className="mb-4"
                  >
                    Open PDF
                  </Button>
                  {designEntries[entry.bhiwandi_date] && designEntries[entry.bhiwandi_date].map((orderGroup, orderIndex) => (
                    <div
                      key={orderIndex}
                      className={orderIndex % 2 === 0 ? "bg-white" : "bg-gray-100"}
                    >
                      <p style={{ textAlign: "left" }}>
                        <strong>Bill To:</strong> {orderGroup.bill_to_party}
                      </p>
                      <p style={{ textAlign: "left" }}>
                        <strong>Ship To:</strong> {orderGroup.ship_to_party}
                      </p>
                      <p style={{ textAlign: "left" }}>
                        <strong>Order No.:</strong> {orderGroup.order_no}
                      </p>
                      <p style={{ textAlign: "left" }}>
                        <strong>Transport:</strong> {orderGroup.transporter_name}
                      </p>
                      <div>
                        {orderGroup.entries.map((designEntry, designIndex) => (
                          <div
                            key={designEntry.design_entry_id}
                            className="flex justify-between border-b p-4"
                          >
                            <div className="text-left w-3/6">
                              <p className="font-semibold text-base md:text-lg">
                                Design: {designEntry.design}
                              </p>
                              <p className="text-sm md:text-base font-semibold">
                                Price: {designEntry.price}
                              </p>
                              <div className="text-sm md:text-base">
                                <span className="mr-2">Remark:</span>
                                {editingRemarks[designEntry.design_entry_id] ? (
                                  <input
                                    ref={el => (remarkInputRefs.current[designEntry.design_entry_id] = el)}
                                    type="text"
                                    value={editingRemarks[designEntry.design_entry_id].value}
                                    onChange={e => setEditingRemarks(prev => ({
                                      ...prev,
                                      [designEntry.design_entry_id]: {
                                        ...prev[designEntry.design_entry_id],
                                        value: e.target.value,
                                        saved: false,
                                      },
                                    }))}
                                    onBlur={() => saveRemark(designEntry.design_entry_id, editingRemarks[designEntry.design_entry_id].value, entry.bhiwandi_date)}
                                    onKeyDown={e => {
                                      if (e.key === "Enter") saveRemark(designEntry.design_entry_id, editingRemarks[designEntry.design_entry_id].value, entry.bhiwandi_date);
                                    }}
                                    className="px-2 py-1 border rounded"
                                    placeholder="Enter remark"
                                    autoFocus
                                  />
                                ) : (
                                  <span
                                    onClick={() => handleRemarkEdit(designEntry.design_entry_id, designEntry.remark || "")}
                                    className="cursor-pointer hover:text-blue-600 hover:underline"
                                  >
                                    {designEntry.remark || "N/A"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-left w-2/6">
                              <p className="font-semibold text-base md:text-lg">
                                Shades:
                              </p>
                              {designEntry.shades &&
                                designEntry.shades.map((shade, idx) => {
                                  const shadeName = Object.keys(shade)[0];
                                  const shadeValue = shade[shadeName];
                                  if (shadeValue == "") {
                                    return null;
                                  }
                                  return (
                                    <div key={idx}>
                                      {shadeName}: {shadeValue}m{" "}
                                    </div>
                                  );
                                })}
                            </div>
                            <div className="w-1/6 flex items-center justify-center">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(designEntry.design_entry_id, entry.bhiwandi_date)}
                              >
                                X
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <Toaster />
    </div>
  );
};

export default BhiwandiListModern; 