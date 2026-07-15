import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "@/utils/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Inbox, ChevronDown, ChevronUp, Printer, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui";
import { format, parseISO } from "date-fns";

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

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Helper to get local date in IST YYYY-MM-DD
  const getTodayISTString = () => {
    const tzOffset = 5.5 * 60 * 60 * 1000;
    const localTime = new Date(Date.now() + tzOffset);
    return localTime.toISOString().split("T")[0];
  };

  const [selectedDateStr, setSelectedDateStr] = useState(getTodayISTString());

  // Global States
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [pendingMetersCount, setPendingMetersCount] = useState(0);
  const [pendingEntries, setPendingEntries] = useState<DesignEntryDetail[]>([]);
  const [isPendingCollapsed, setIsPendingCollapsed] = useState(true);
  const [loadingPending, setLoadingPending] = useState(false);

  const [pendingDispatchMetersCount, setPendingDispatchMetersCount] = useState(0);
  const [pendingDispatchEntries, setPendingDispatchEntries] = useState<DesignEntryDetail[]>([]);
  const [isPendingDispatchCollapsed, setIsPendingDispatchCollapsed] = useState(true);
  const [loadingPendingDispatch, setLoadingPendingDispatch] = useState(false);

  // Date-Specific States
  const [loadingDate, setLoadingDate] = useState(true);
  const [todaysOrders, setTodaysOrders] = useState<OrderDetail[]>([]);
  const [todaysOrdersMeters, setTodaysOrdersMeters] = useState(0);
  const [isTodaysOrdersCollapsed, setIsTodaysOrdersCollapsed] = useState(true);
  const [loadingTodaysOrders, setLoadingTodaysOrders] = useState(false);

  const [todaysBhiwandiEntries, setTodaysBhiwandiEntries] = useState<DesignEntryDetail[]>([]);
  const [todaysBhiwandiMeters, setTodaysBhiwandiMeters] = useState(0);
  const [isBhiwandiCollapsed, setIsBhiwandiCollapsed] = useState(true);
  const [loadingBhiwandi, setLoadingBhiwandi] = useState(false);

  const [todaysDispatchEntries, setTodaysDispatchEntries] = useState<DesignEntryDetail[]>([]);
  const [todaysDispatchMeters, setTodaysDispatchMeters] = useState(0);
  const [isDispatchCollapsed, setIsDispatchCollapsed] = useState(true);
  const [loadingDispatch, setLoadingDispatch] = useState(false);

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

  const changeDate = (days: number) => {
    const d = new Date(`${selectedDateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    setSelectedDateStr(d.toISOString().split("T")[0]);
  };

  const fetchGlobalAggregates = async () => {
    setLoadingGlobal(true);
    try {
      // 1. Pending Production (No Bhiwandi AND No Dispatch)
      const { data: pendingData, error: pendingError } = await supabase
        .from("design_entries")
        .select(`shades, orders!inner(canceled)`)
        .is("bhiwandi_date", null)
        .is("dispatch_date", null)
        .eq("orders.canceled", false);

      if (pendingError) throw pendingError;
      const pendingSum = (pendingData || []).reduce((sum, row: any) => sum + sumShadesMeters(row.shades), 0);
      setPendingMetersCount(pendingSum);

      // 2. Pending Dispatch (Has Bhiwandi AND No Dispatch)
      const { data: dispatchData, error: dispatchError } = await supabase
        .from("design_entries")
        .select(`shades, orders!inner(canceled)`)
        .not("bhiwandi_date", "is", null)
        .is("dispatch_date", null)
        .eq("orders.canceled", false);

      if (dispatchError) throw dispatchError;
      const dispatchSum = (dispatchData || []).reduce((sum, row: any) => sum + sumShadesMeters(row.shades), 0);
      setPendingDispatchMetersCount(dispatchSum);

    } catch (err: any) {
      console.error("Error fetching global aggregates:", err);
      toast({
        title: "Error Loading Data",
        description: err.message || "Something went wrong while fetching global data.",
        variant: "destructive",
      });
    } finally {
      setLoadingGlobal(false);
    }
  };

  const fetchDateAggregates = async () => {
    setLoadingDate(true);
    try {
      const startOfDay = `${selectedDateStr}T00:00:00`;
      const endOfDay = `${selectedDateStr}T23:59:59.999`;

      // 1. New orders on selected date
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`total_meters, canceled`)
        .eq("date", selectedDateStr)
        .eq("canceled", false);

      if (ordersError) throw ordersError;
      const ordersSum = (ordersData || []).reduce((sum, row: any) => sum + (Number(row.total_meters) || 0), 0);
      setTodaysOrdersMeters(ordersSum);

      // 2. Bhiwandi entries on selected date
      const { data: bhiwandiData, error: bhiwandiError } = await supabase
        .from("design_entries")
        .select(`shades, orders!inner(canceled)`)
        .gte("bhiwandi_date", startOfDay)
        .lte("bhiwandi_date", endOfDay)
        .eq("orders.canceled", false);

      if (bhiwandiError) throw bhiwandiError;
      const bhiwandiSum = (bhiwandiData || []).reduce((sum, row: any) => sum + sumShadesMeters(row.shades), 0);
      setTodaysBhiwandiMeters(bhiwandiSum);

      // 3. Dispatched entries on selected date
      const { data: dispatchData, error: dispatchError } = await supabase
        .from("design_entries")
        .select(`shades, orders!inner(canceled)`)
        .eq("dispatch_date", selectedDateStr)
        .eq("orders.canceled", false);

      if (dispatchError) throw dispatchError;
      const dispatchSum = (dispatchData || []).reduce((sum, row: any) => sum + sumShadesMeters(row.shades), 0);
      setTodaysDispatchMeters(dispatchSum);

    } catch (err: any) {
      console.error("Error fetching date aggregates:", err);
      toast({
        title: "Error Loading Date Data",
        description: err.message || "Something went wrong while fetching date data.",
        variant: "destructive",
      });
    } finally {
      setLoadingDate(false);
    }
  };

  // Details Fetchers
  const fetchPendingDetails = async () => {
    if (pendingEntries.length > 0) return;
    setLoadingPending(true);
    try {
      const { data, error } = await supabase
        .from("design_entries")
        .select(`
          id, design, price, remark, shades,
          orders!inner(order_no, date, remark, canceled, party_profiles!orders_bill_to_id_fkey(name))
        `)
        .is("bhiwandi_date", null)
        .is("dispatch_date", null)
        .eq("orders.canceled", false);
      if (error) throw error;
      const formatted = (data || []).map((row: any) => ({
        id: row.id, design: row.design, price: row.price || 0, remark: row.remark || null, shades: row.shades || [],
        order_no: row.orders?.order_no || 0, party_name: row.orders?.party_profiles?.name || "Unknown Party", date: row.orders?.date || "", total_meters: sumShadesMeters(row.shades),
      }));
      setPendingEntries(formatted);
    } catch (err) { console.error(err); } finally { setLoadingPending(false); }
  };

  const fetchPendingDispatchDetails = async () => {
    if (pendingDispatchEntries.length > 0) return;
    setLoadingPendingDispatch(true);
    try {
      const { data, error } = await supabase
        .from("design_entries")
        .select(`
          id, design, price, remark, shades,
          orders!inner(order_no, date, remark, canceled, party_profiles!orders_bill_to_id_fkey(name))
        `)
        .not("bhiwandi_date", "is", null)
        .is("dispatch_date", null)
        .eq("orders.canceled", false);
      if (error) throw error;
      const formatted = (data || []).map((row: any) => ({
        id: row.id, design: row.design, price: row.price || 0, remark: row.remark || null, shades: row.shades || [],
        order_no: row.orders?.order_no || 0, party_name: row.orders?.party_profiles?.name || "Unknown Party", date: row.orders?.date || "", total_meters: sumShadesMeters(row.shades),
      }));
      setPendingDispatchEntries(formatted);
    } catch (err) { console.error(err); } finally { setLoadingPendingDispatch(false); }
  };

  const fetchTodaysOrdersDetails = async () => {
    if (todaysOrders.length > 0) return;
    setLoadingTodaysOrders(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, order_no, date, remark, total_meters, canceled,
          party_profiles!orders_bill_to_id_fkey(name)
        `)
        .eq("date", selectedDateStr)
        .eq("canceled", false);
      if (error) throw error;
      const formatted = (data || []).map((row: any) => ({
        id: row.id, order_no: row.order_no, date: row.date, total_meters: Number(row.total_meters) || 0,
        party_name: row.party_profiles?.name || "Unknown Party", remark: row.remark || null,
      }));
      setTodaysOrders(formatted);
    } catch (err) { console.error(err); } finally { setLoadingTodaysOrders(false); }
  };

  const fetchBhiwandiDetails = async () => {
    if (todaysBhiwandiEntries.length > 0) return;
    setLoadingBhiwandi(true);
    try {
      const startOfDay = `${selectedDateStr}T00:00:00`;
      const endOfDay = `${selectedDateStr}T23:59:59.999`;
      const { data, error } = await supabase
        .from("design_entries")
        .select(`
          id, design, price, remark, shades, bhiwandi_date,
          orders!inner(order_no, date, remark, canceled, party_profiles!orders_bill_to_id_fkey(name))
        `)
        .gte("bhiwandi_date", startOfDay)
        .lte("bhiwandi_date", endOfDay)
        .eq("orders.canceled", false);
      if (error) throw error;
      const formatted = (data || []).map((row: any) => ({
        id: row.id, design: row.design, price: row.price || 0, remark: row.remark || null, shades: row.shades || [],
        order_no: row.orders?.order_no || 0, party_name: row.orders?.party_profiles?.name || "Unknown Party", date: row.orders?.date || "", total_meters: sumShadesMeters(row.shades),
      }));
      setTodaysBhiwandiEntries(formatted);
    } catch (err) { console.error(err); } finally { setLoadingBhiwandi(false); }
  };

  const fetchDispatchDetails = async () => {
    if (todaysDispatchEntries.length > 0) return;
    setLoadingDispatch(true);
    try {
      const { data, error } = await supabase
        .from("design_entries")
        .select(`
          id, design, price, remark, shades, dispatch_date,
          orders!inner(order_no, date, remark, canceled, party_profiles!orders_bill_to_id_fkey(name))
        `)
        .eq("dispatch_date", selectedDateStr)
        .eq("orders.canceled", false);
      if (error) throw error;
      const formatted = (data || []).map((row: any) => ({
        id: row.id, design: row.design, price: row.price || 0, remark: row.remark || null, shades: row.shades || [],
        order_no: row.orders?.order_no || 0, party_name: row.orders?.party_profiles?.name || "Unknown Party", date: row.orders?.date || "", total_meters: sumShadesMeters(row.shades),
      }));
      setTodaysDispatchEntries(formatted);
    } catch (err) { console.error(err); } finally { setLoadingDispatch(false); }
  };

  const handleOpenPreview = async (order: OrderDetail) => {
    setPreviewOrder(order);
    setLoadingPreview(true);
    try {
      const { data, error } = await supabase
        .from("design_entries")
        .select(`id, design, price, remark, shades`)
        .eq("order_id", order.id);
      if (error) throw error;
      setPreviewDesigns(data || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not fetch design entries.", variant: "destructive" });
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchGlobalAggregates();
  }, []);

  useEffect(() => {
    // Reset date-specific details and collapse them
    setIsTodaysOrdersCollapsed(true);
    setIsBhiwandiCollapsed(true);
    setIsDispatchCollapsed(true);
    setTodaysOrders([]);
    setTodaysBhiwandiEntries([]);
    setTodaysDispatchEntries([]);
    fetchDateAggregates();
  }, [selectedDateStr]);

  const formatMeters = (m: number) => `${Math.round(m)} mtr`;
  const isToday = selectedDateStr === getTodayISTString();

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20 backdrop-blur-md bg-white/80">
        <div className="container mx-auto px-4 py-4 max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg hover:bg-slate-50" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
              <p className="text-xs text-slate-500">Live operational insights and daily summary</p>
            </div>
          </div>
          <Button
            onClick={() => { fetchGlobalAggregates(); fetchDateAggregates(); }}
            variant="default"
            size="sm"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium"
            disabled={loadingGlobal || loadingDate}
          >
            {(loadingGlobal || loadingDate) ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl space-y-8">
        {/* AREA A: Global KPIs */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            Global Active Pipeline
            {loadingGlobal && <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />}
          </h2>
          <div className="grid grid-cols-1 gap-4 mb-4">
            {/* Total Pending (No Dispatch Date) */}
            <Card className="border border-indigo-100 bg-slate-50 shadow-sm overflow-hidden">
              <div className="px-4 py-4 sm:px-5 sm:py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-indigo-500 shadow-sm" />
                  <div>
                    <h3 className="font-bold text-indigo-900 text-sm sm:text-base md:text-lg">Total Pending Orders</h3>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <span className="text-lg sm:text-xl md:text-2xl font-black text-indigo-800 bg-white/60 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border border-indigo-200/50 shadow-sm whitespace-nowrap">
                    {formatMeters(pendingMetersCount + pendingDispatchMetersCount)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Global KPI 1: Pending Production */}
            <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
              <div
                className="bg-slate-50 px-4 py-3.5 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => {
                  const newCollapsed = !isPendingCollapsed;
                  setIsPendingCollapsed(newCollapsed);
                  if (!newCollapsed) fetchPendingDetails();
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm" />
                  <h3 className="font-bold text-slate-700 text-sm md:text-base">Pending Production</h3>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <span className="text-sm font-black text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-200 shadow-sm whitespace-nowrap">
                    {formatMeters(pendingMetersCount)}
                  </span>
                  {isPendingCollapsed ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronUp className="h-4 w-4 text-slate-500" />}
                </div>
              </div>
              {!isPendingCollapsed && (
                <CardContent className="p-0 border-t border-slate-100">
                  {loadingPending ? (
                    <div className="p-8 text-center text-sm text-slate-400">Loading details...</div>
                  ) : pendingEntries.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400 flex flex-col items-center">
                      <Inbox className="h-8 w-8 text-slate-300 mb-2" />
                      No pending production items.
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
                          </div>
                          <div className="text-right min-w-[70px]">
                            <span className="text-sm font-extrabold text-slate-900 block">{formatMeters(item.total_meters)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Global KPI 2: Pending Dispatch */}
            <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
              <div
                className="bg-slate-50 px-4 py-3.5 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => {
                  const newCollapsed = !isPendingDispatchCollapsed;
                  setIsPendingDispatchCollapsed(newCollapsed);
                  if (!newCollapsed) fetchPendingDispatchDetails();
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-sm" />
                  <h3 className="font-bold text-slate-700 text-sm md:text-base">Pending Dispatch (In Bhiwandi)</h3>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <span className="text-sm font-black text-orange-700 bg-orange-100 px-3 py-1 rounded-full border border-orange-200 shadow-sm whitespace-nowrap">
                    {formatMeters(pendingDispatchMetersCount)}
                  </span>
                  {isPendingDispatchCollapsed ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronUp className="h-4 w-4 text-slate-500" />}
                </div>
              </div>
              {!isPendingDispatchCollapsed && (
                <CardContent className="p-0 border-t border-slate-100">
                  {loadingPendingDispatch ? (
                    <div className="p-8 text-center text-sm text-slate-400">Loading details...</div>
                  ) : pendingDispatchEntries.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400 flex flex-col items-center">
                      <Inbox className="h-8 w-8 text-slate-300 mb-2" />
                      All items in Bhiwandi have been dispatched.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                      {pendingDispatchEntries.map((item) => (
                        <div key={item.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row justify-between md:items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">Design: {item.design}</span>
                              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-600">Order #{item.order_no}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 font-medium">{item.party_name}</p>
                          </div>
                          <div className="text-right min-w-[70px]">
                            <span className="text-sm font-extrabold text-slate-900 block">{formatMeters(item.total_meters)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        </section>

        {/* AREA B: Date Dashboard */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Daily Summary
              {loadingDate && <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin ml-2" />}
            </h2>
            
            {/* Simple Date Picker */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 w-full sm:w-auto justify-between sm:justify-start shadow-sm">
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white hover:shadow-sm" onClick={() => changeDate(-1)}>
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </Button>
              <div className="px-4 text-sm font-bold text-slate-700 min-w-[140px] text-center">
                {isToday ? "Today" : format(parseISO(selectedDateStr), "dd MMM yyyy")}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white hover:shadow-sm" onClick={() => changeDate(1)}>
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Section 1: Date Orders */}
            <Card className="border border-slate-100 shadow-sm bg-white overflow-hidden">
              <div
                className="bg-blue-50/30 px-4 py-3.5 border-b border-blue-50 flex items-center justify-between cursor-pointer hover:bg-blue-50/60 transition-colors"
                onClick={() => {
                  const newCollapsed = !isTodaysOrdersCollapsed;
                  setIsTodaysOrdersCollapsed(newCollapsed);
                  if (!newCollapsed) fetchTodaysOrdersDetails();
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-600" />
                  <h3 className="font-bold text-blue-900 text-sm">New Orders Created</h3>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <span className="text-xs font-bold text-blue-700 bg-white px-2.5 py-1 rounded-full border border-blue-100 shadow-sm whitespace-nowrap">
                    {formatMeters(todaysOrdersMeters)}
                  </span>
                  {isTodaysOrdersCollapsed ? <ChevronDown className="h-4 w-4 text-blue-500" /> : <ChevronUp className="h-4 w-4 text-blue-500" />}
                </div>
              </div>
              {!isTodaysOrdersCollapsed && (
                <CardContent className="p-0">
                  {loadingTodaysOrders ? (
                    <div className="p-8 text-center text-sm text-slate-400">Loading details...</div>
                  ) : todaysOrders.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400">No orders created on this date.</div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                      {todaysOrders.map((order) => (
                        <div key={order.id} onClick={() => handleOpenPreview(order)} className="p-4 hover:bg-blue-50/30 cursor-pointer flex justify-between gap-2 group">
                          <div>
                            <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600">Order #{order.order_no}</span>
                            <p className="text-xs text-slate-500 mt-1">{order.party_name}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-extrabold text-slate-900 block">{formatMeters(order.total_meters)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Section 2: Bhiwandi List */}
              <Card className="border border-slate-100 shadow-sm bg-white overflow-hidden flex flex-col">
                <div
                  className="bg-indigo-50/30 px-4 py-3.5 border-b border-indigo-50 flex items-center justify-between cursor-pointer hover:bg-indigo-50/60 transition-colors"
                  onClick={() => {
                    const newCollapsed = !isBhiwandiCollapsed;
                    setIsBhiwandiCollapsed(newCollapsed);
                    if (!newCollapsed) fetchBhiwandiDetails();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-indigo-500" />
                    <h3 className="font-bold text-indigo-900 text-sm">Sent to Bhiwandi</h3>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <span className="text-xs font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-full border border-indigo-100 shadow-sm whitespace-nowrap">
                      {formatMeters(todaysBhiwandiMeters)}
                    </span>
                    {isBhiwandiCollapsed ? <ChevronDown className="h-4 w-4 text-indigo-500" /> : <ChevronUp className="h-4 w-4 text-indigo-500" />}
                  </div>
                </div>
                {!isBhiwandiCollapsed && (
                  <div className="flex-1 p-0">
                    {loadingBhiwandi ? (
                      <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
                    ) : todaysBhiwandiEntries.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-400">Nothing sent to Bhiwandi.</div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                        {todaysBhiwandiEntries.map((item) => (
                          <div key={item.id} className="p-4 hover:bg-slate-50/50 flex justify-between">
                            <div>
                              <span className="font-bold text-slate-800 text-sm">Design: {item.design}</span>
                              <p className="text-xs text-slate-500">{item.party_name}</p>
                            </div>
                            <span className="text-xs font-bold text-slate-900">{formatMeters(item.total_meters)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Section 3: Dispatched List */}
              <Card className="border border-slate-100 shadow-sm bg-white overflow-hidden flex flex-col">
                <div
                  className="bg-emerald-50/30 px-4 py-3.5 border-b border-emerald-50 flex items-center justify-between cursor-pointer hover:bg-emerald-50/60 transition-colors"
                  onClick={() => {
                    const newCollapsed = !isDispatchCollapsed;
                    setIsDispatchCollapsed(newCollapsed);
                    if (!newCollapsed) fetchDispatchDetails();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <h3 className="font-bold text-emerald-900 text-sm">Dispatched</h3>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <span className="text-xs font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-full border border-emerald-100 shadow-sm whitespace-nowrap">
                      {formatMeters(todaysDispatchMeters)}
                    </span>
                    {isDispatchCollapsed ? <ChevronDown className="h-4 w-4 text-emerald-500" /> : <ChevronUp className="h-4 w-4 text-emerald-500" />}
                  </div>
                </div>
                {!isDispatchCollapsed && (
                  <div className="flex-1 p-0">
                    {loadingDispatch ? (
                      <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
                    ) : todaysDispatchEntries.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-400">Nothing dispatched.</div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                        {todaysDispatchEntries.map((item) => (
                          <div key={item.id} className="p-4 hover:bg-slate-50/50 flex justify-between">
                            <div>
                              <span className="font-bold text-slate-800 text-sm">Design: {item.design}</span>
                              <p className="text-xs text-slate-500">{item.party_name}</p>
                            </div>
                            <span className="text-xs font-bold text-slate-900">{formatMeters(item.total_meters)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </section>
      </div>

      {/* Order Quick Preview Dialog */}
      <Dialog open={!!previewOrder} onOpenChange={(open) => !open && setPreviewOrder(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {previewOrder && (
            <>
              <DialogHeader className="border-b pb-4 flex flex-row items-center justify-between gap-4">
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900">Order #{previewOrder.order_no}</DialogTitle>
                  <p className="text-xs text-slate-500 mt-1">Party: {previewOrder.party_name}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate(`/order-preview/${previewOrder.id}`)}>
                  <Printer className="h-3 w-3 mr-1" /> Full Preview
                </Button>
              </DialogHeader>
              <div className="py-4">
                {loadingPreview ? (
                  <div className="py-8 text-center text-sm text-slate-400">Loading...</div>
                ) : (
                  <div className="space-y-3">
                    {previewDesigns.map((entry) => (
                      <div key={entry.id} className="p-3 border rounded-lg flex justify-between">
                        <span className="font-bold text-sm">Design: {entry.design}</span>
                        <span className="text-sm font-bold">{formatMeters(sumShadesMeters(entry.shades))} mtr</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  );
}
