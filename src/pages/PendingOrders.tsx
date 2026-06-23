import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "@/utils/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Clock, Truck, Inbox, Plus, ChevronDown, ChevronUp, ExternalLink, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui";

interface OrderDetail {
  id: string;
  order_no: number;
  date: string;
  total_meters: number;
  party_name: string;
  remark: string | null;
}

interface DesignEntryDetail {
  id: number;
  design: string;
  price: number;
  remark: string | null;
  shades: { [key: string]: string }[];
  order_no: number;
  party_name: string;
  date: string;
  total_meters: number;
}

export default function PendingOrders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  // States for each section
  const [pendingMetersCount, setPendingMetersCount] = useState(0);
  const [pendingEntries, setPendingEntries] = useState<DesignEntryDetail[]>([]);

  const [todaysOrders, setTodaysOrders] = useState<OrderDetail[]>([]);
  const [todaysOrdersMeters, setTodaysOrdersMeters] = useState(0);

  const [todaysBhiwandiEntries, setTodaysBhiwandiEntries] = useState<DesignEntryDetail[]>([]);
  const [todaysBhiwandiMeters, setTodaysBhiwandiMeters] = useState(0);

  const [todaysDispatchEntries, setTodaysDispatchEntries] = useState<DesignEntryDetail[]>([]);
  const [todaysDispatchMeters, setTodaysDispatchMeters] = useState(0);

  // Collapse states
  const [isPendingCollapsed, setIsPendingCollapsed] = useState(false);
  const [isTodaysOrdersCollapsed, setIsTodaysOrdersCollapsed] = useState(false);
  const [isBhiwandiCollapsed, setIsBhiwandiCollapsed] = useState(false);
  const [isDispatchCollapsed, setIsDispatchCollapsed] = useState(false);

  // Order preview state
  const [previewOrder, setPreviewOrder] = useState<OrderDetail | null>(null);
  const [previewDesigns, setPreviewDesigns] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Helper to sum shade meters
  const sumShadesMeters = (shades: any[]): number => {
    if (!shades || !Array.isArray(shades)) return 0;
    return shades.reduce((acc, shadeObj) => {
      const val = Object.values(shadeObj)[0];
      const num = parseFloat(val as string);
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
  };

  // Helper to get local date in IST YYYY-MM-DD
  const getTodayISTString = () => {
    const tzOffset = 5.5 * 60 * 60 * 1000;
    const localTime = new Date(Date.now() + tzOffset);
    return localTime.toISOString().split("T")[0];
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const todayStr = getTodayISTString();
      const startOfToday = `${todayStr}T00:00:00`;
      const endOfToday = `${todayStr}T23:59:59.999`;

      // 1. Pending design entries (No Bhiwandi AND No Dispatch)
      const { data: pendingData, error: pendingError } = await supabase
        .from("design_entries")
        .select(`
          id,
          design,
          price,
          remark,
          shades,
          orders!inner(order_no, date, remark, canceled, party_profiles!orders_bill_to_id_fkey(name))
        `)
        .is("bhiwandi_date", null)
        .is("dispatch_date", null)
        .eq("orders.canceled", false);

      if (pendingError) throw pendingError;

      const formattedPending: DesignEntryDetail[] = (pendingData || []).map((row: any) => {
        const meters = sumShadesMeters(row.shades);
        return {
          id: row.id,
          design: row.design,
          price: row.price || 0,
          remark: row.remark || null,
          shades: row.shades || [],
          order_no: row.orders?.order_no || 0,
          party_name: row.orders?.party_profiles?.name || "Unknown Party",
          date: row.orders?.date || "",
          total_meters: meters,
        };
      });
      setPendingEntries(formattedPending);
      const pendingSum = formattedPending.reduce((sum, item) => sum + item.total_meters, 0);
      setPendingMetersCount(pendingSum);

      // 2. Today's orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          order_no,
          date,
          remark,
          total_meters,
          canceled,
          party_profiles!orders_bill_to_id_fkey(name)
        `)
        .eq("date", todayStr)
        .eq("canceled", false);

      if (ordersError) throw ordersError;

      const formattedOrders: OrderDetail[] = (ordersData || []).map((row: any) => ({
        id: row.id,
        order_no: row.order_no,
        date: row.date,
        total_meters: Number(row.total_meters) || 0,
        party_name: row.party_profiles?.name || "Unknown Party",
        remark: row.remark || null,
      }));
      setTodaysOrders(formattedOrders);
      const ordersSum = formattedOrders.reduce((sum, item) => sum + item.total_meters, 0);
      setTodaysOrdersMeters(ordersSum);

      // 3. Today's Bhiwandi entries
      const { data: bhiwandiData, error: bhiwandiError } = await supabase
        .from("design_entries")
        .select(`
          id,
          design,
          price,
          remark,
          shades,
          bhiwandi_date,
          orders!inner(order_no, date, remark, canceled, party_profiles!orders_bill_to_id_fkey(name))
        `)
        .gte("bhiwandi_date", startOfToday)
        .lte("bhiwandi_date", endOfToday)
        .eq("orders.canceled", false);

      if (bhiwandiError) throw bhiwandiError;

      const formattedBhiwandi: DesignEntryDetail[] = (bhiwandiData || []).map((row: any) => {
        const meters = sumShadesMeters(row.shades);
        return {
          id: row.id,
          design: row.design,
          price: row.price || 0,
          remark: row.remark || null,
          shades: row.shades || [],
          order_no: row.orders?.order_no || 0,
          party_name: row.orders?.party_profiles?.name || "Unknown Party",
          date: row.orders?.date || "",
          total_meters: meters,
        };
      });
      setTodaysBhiwandiEntries(formattedBhiwandi);
      const bhiwandiSum = formattedBhiwandi.reduce((sum, item) => sum + item.total_meters, 0);
      setTodaysBhiwandiMeters(bhiwandiSum);

      // 4. Today's Dispatched entries
      const { data: dispatchData, error: dispatchError } = await supabase
        .from("design_entries")
        .select(`
          id,
          design,
          price,
          remark,
          shades,
          dispatch_date,
          orders!inner(order_no, date, remark, canceled, party_profiles!orders_bill_to_id_fkey(name))
        `)
        .eq("dispatch_date", todayStr)
        .eq("orders.canceled", false);

      if (dispatchError) throw dispatchError;

      const formattedDispatch: DesignEntryDetail[] = (dispatchData || []).map((row: any) => {
        const meters = sumShadesMeters(row.shades);
        return {
          id: row.id,
          design: row.design,
          price: row.price || 0,
          remark: row.remark || null,
          shades: row.shades || [],
          order_no: row.orders?.order_no || 0,
          party_name: row.orders?.party_profiles?.name || "Unknown Party",
          date: row.orders?.date || "",
          total_meters: meters,
        };
      });
      setTodaysDispatchEntries(formattedDispatch);
      const dispatchSum = formattedDispatch.reduce((sum, item) => sum + item.total_meters, 0);
      setTodaysDispatchMeters(dispatchSum);

    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      toast({
        title: "Error Loading Data",
        description: err.message || "Something went wrong while fetching data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPreview = async (order: OrderDetail) => {
    setPreviewOrder(order);
    setLoadingPreview(true);
    try {
      const { data, error } = await supabase
        .from("design_entries")
        .select(`
          id,
          design,
          price,
          remark,
          shades
        `)
        .eq("order_id", order.id);
      if (error) throw error;
      setPreviewDesigns(data || []);
    } catch (err: any) {
      toast({
        title: "Error Loading Order Details",
        description: err.message || "Could not fetch design entries.",
        variant: "destructive",
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatMeters = (m: number) => `${Math.round(m)} mtr`;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20 backdrop-blur-md bg-white/80">
        <div className="container mx-auto px-4 py-4 max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg hover:bg-slate-50 transition-colors"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Pending Orders</h1>
              <p className="text-xs text-slate-500">Live operation and daily summary dashboard</p>
            </div>
          </div>
          <Button
            onClick={fetchDashboardData}
            variant="default"
            size="sm"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl space-y-8">

        {/* Sections Area */}
        <div className="space-y-6">
          {/* Section 1: Pending Production Details */}
          <Card className="border border-slate-100 shadow-sm bg-white overflow-hidden">
            <div
              className="bg-slate-50 px-4 py-3.5 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors"
              onClick={() => setIsPendingCollapsed(!isPendingCollapsed)}
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <h2 className="font-bold text-slate-700 text-sm md:text-base">Pending Production (No Dates)</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-amber-700 bg-amber-100/70 px-2.5 py-1 rounded-full">
                  {formatMeters(pendingMetersCount)}
                </span>
                {isPendingCollapsed ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronUp className="h-4 w-4 text-slate-500" />}
              </div>
            </div>
            {!isPendingCollapsed && (
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-sm text-slate-400">Loading details...</div>
                ) : pendingEntries.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400 flex flex-col items-center justify-center gap-2">
                    <Inbox className="h-8 w-8 text-slate-300" />
                    No pending production items. All design entries have either Bhiwandi or Dispatch dates set.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                    {pendingEntries.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row justify-between md:items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">Design: {item.design}</span>
                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-600">Order #{item.order_no}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-medium">{item.party_name}</p>
                          {item.remark && <p className="text-xs text-slate-400 mt-0.5 bg-slate-50 px-2 py-1 rounded inline-block">Remark: {item.remark}</p>}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-wrap gap-1.5 max-w-xs justify-end">
                            {item.shades.map((shade, idx) => {
                              const name = Object.keys(shade)[0];
                              const val = shade[name];
                              if (!val) return null;
                              return (
                                <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                                  {name}: {val}m
                                </span>
                              );
                            })}
                          </div>
                          <div className="text-right min-w-[70px]">
                            <span className="text-xs font-extrabold text-slate-900 block">{formatMeters(item.total_meters)}</span>
                            <span className="text-[10px] text-slate-400">₹{item.price}/m</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Section 2: Today's Orders */}
          <Card className="border border-slate-100 shadow-sm bg-white overflow-hidden">
            <div
              className="bg-slate-50 px-4 py-3.5 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors"
              onClick={() => setIsTodaysOrdersCollapsed(!isTodaysOrdersCollapsed)}
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-600" />
                <h2 className="font-bold text-slate-700 text-sm md:text-base">Today's New Orders</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-full">
                  {formatMeters(todaysOrdersMeters)}
                </span>
                {isTodaysOrdersCollapsed ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronUp className="h-4 w-4 text-slate-500" />}
              </div>
            </div>
            {!isTodaysOrdersCollapsed && (
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-sm text-slate-400">Loading details...</div>
                ) : todaysOrders.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400 flex flex-col items-center justify-center gap-2">
                    <Inbox className="h-8 w-8 text-slate-300" />
                    No orders received today yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {todaysOrders.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => handleOpenPreview(order)}
                        className="p-4 hover:bg-blue-50/30 cursor-pointer transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-2 group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors flex items-center gap-1">
                              Order #{order.order_no} <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                            <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded-full font-bold">Active</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-medium">{order.party_name}</p>
                          {order.remark && <p className="text-xs text-slate-400 mt-0.5 italic">Note: {order.remark}</p>}
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-slate-900 block">{formatMeters(order.total_meters)}</span>
                          <span className="text-[10px] text-blue-500 font-semibold group-hover:underline">Click to Preview</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Grid Layout for Bhiwandi and Dispatches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Section 3: Today's Bhiwandi Designs */}
            <Card className="border border-slate-100 shadow-sm bg-white overflow-hidden flex flex-col">
              <div
                className="bg-slate-50 px-4 py-3.5 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors"
                onClick={() => setIsBhiwandiCollapsed(!isBhiwandiCollapsed)}
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-indigo-500" />
                  <h2 className="font-bold text-slate-700 text-sm">Today to Bhiwandi</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-100/70 px-2.5 py-1 rounded-full">
                    {formatMeters(todaysBhiwandiMeters)}
                  </span>
                  {isBhiwandiCollapsed ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronUp className="h-4 w-4 text-slate-500" />}
                </div>
              </div>
              {!isBhiwandiCollapsed && (
                <div className="flex-1 p-0">
                  {loading ? (
                    <div className="p-8 text-center text-sm text-slate-400">Loading details...</div>
                  ) : todaysBhiwandiEntries.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400 flex flex-col items-center justify-center gap-2 h-full min-h-[160px]">
                      <Inbox className="h-8 w-8 text-slate-300" />
                      No entries sent to Bhiwandi today.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                      {todaysBhiwandiEntries.map((item) => (
                        <div key={item.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-slate-800 text-sm">Design: {item.design}</span>
                              <p className="text-xs text-slate-500 font-medium">{item.party_name}</p>
                            </div>
                            <span className="text-xs font-bold text-slate-900">{formatMeters(item.total_meters)}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.shades.map((shade, idx) => {
                              const name = Object.keys(shade)[0];
                              const val = shade[name];
                              if (!val) return null;
                              return (
                                <span key={idx} className="bg-indigo-55/40 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-indigo-100/30">
                                  {name}: {val}m
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Section 4: Today's Dispatched */}
            <Card className="border border-slate-100 shadow-sm bg-white overflow-hidden flex flex-col">
              <div
                className="bg-slate-50 px-4 py-3.5 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors"
                onClick={() => setIsDispatchCollapsed(!isDispatchCollapsed)}
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <h2 className="font-bold text-slate-700 text-sm">Today's Dispatches</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full">
                    {formatMeters(todaysDispatchMeters)}
                  </span>
                  {isDispatchCollapsed ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronUp className="h-4 w-4 text-slate-500" />}
                </div>
              </div>
              {!isDispatchCollapsed && (
                <div className="flex-1 p-0">
                  {loading ? (
                    <div className="p-8 text-center text-sm text-slate-400">Loading details...</div>
                  ) : todaysDispatchEntries.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400 flex flex-col items-center justify-center gap-2 h-full min-h-[160px]">
                      <Inbox className="h-8 w-8 text-slate-300" />
                      No entries dispatched today.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                      {todaysDispatchEntries.map((item) => (
                        <div key={item.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-slate-800 text-sm">Design: {item.design}</span>
                              <p className="text-xs text-slate-500 font-medium">{item.party_name}</p>
                            </div>
                            <span className="text-xs font-bold text-slate-900">{formatMeters(item.total_meters)}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.shades.map((shade, idx) => {
                              const name = Object.keys(shade)[0];
                              const val = shade[name];
                              if (!val) return null;
                              return (
                                <span key={idx} className="bg-emerald-55/40 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-emerald-100/30">
                                  {name}: {val}m
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Order Quick Preview Dialog */}
      <Dialog open={!!previewOrder} onOpenChange={(open) => !open && setPreviewOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {previewOrder && (
            <>
              <DialogHeader className="border-b pb-4 flex flex-row items-center justify-between gap-4">
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    Order Wise Preview: #{previewOrder.order_no}
                  </DialogTitle>
                  <p className="text-xs text-slate-500 mt-1">Party: {previewOrder.party_name}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold flex items-center gap-1 bg-slate-55/30 border-slate-200"
                    onClick={() => navigate(`/order-preview/${previewOrder.id}`)}
                  >
                    <Printer className="h-3 w-3" /> Full Preview / PDF
                  </Button>
                </div>
              </DialogHeader>

              <div className="py-4 space-y-4">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4 text-xs border bg-slate-50/50 p-3 rounded-lg">
                  <div>
                    <span className="text-slate-400 block font-medium">Order Date</span>
                    <span className="text-slate-800 font-bold">{previewOrder.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Total Meters</span>
                    <span className="text-slate-800 font-bold">{formatMeters(previewOrder.total_meters)}</span>
                  </div>
                  {previewOrder.remark && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block font-medium">Order Remark</span>
                      <span className="text-slate-800 font-semibold">{previewOrder.remark}</span>
                    </div>
                  )}
                </div>

                {/* Design entries list */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2">Design Wise Breakdown</h3>
                  {loadingPreview ? (
                    <div className="py-8 text-center text-xs text-slate-400">Loading breakdown...</div>
                  ) : previewDesigns.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">No design entries found for this order.</div>
                  ) : (
                    <div className="space-y-3">
                      {previewDesigns.map((entry) => {
                        const mtr = sumShadesMeters(entry.shades);
                        return (
                          <div key={entry.id} className="p-3 border rounded-lg hover:border-slate-300 transition-colors flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-bold text-slate-800 text-sm">Design: {entry.design}</span>
                                {entry.remark && <p className="text-[11px] text-slate-400 mt-0.5">Remark: {entry.remark}</p>}
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-bold text-slate-900 block">{formatMeters(mtr)}</span>
                                <span className="text-[10px] text-slate-400">₹{entry.price}/m</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1 bg-slate-50 p-2 rounded">
                              {entry.shades && Array.isArray(entry.shades) && entry.shades.map((shadeObj: any, idx: number) => {
                                const name = Object.keys(shadeObj)[0];
                                const val = shadeObj[name];
                                if (!val) return null;
                                return (
                                  <span key={idx} className="bg-white border text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                                    {name}: {val}m
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
