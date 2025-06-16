import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui";
import InputWithAutocomplete from "@/components/custom/InputWithAutocomplete";
import { PartyCount, DesignDetail } from "@/types/party-file";
import {
  fetchPartyCounts,
  fetchOrderDetails,
} from "@/utils/party-file/data-fetching";
import { generatePartyReport } from "@/utils/party-file/pdf-generator";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function PartyReports() {
  const [partyCounts, setPartyCounts] = useState<PartyCount[]>([]);
  const [selectedParty, setSelectedParty] = useState<string>("");
  const [partyOrders, setPartyOrders] = useState<DesignDetail[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<DesignDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    const loadPartyCounts = async () => {
      const counts = await fetchPartyCounts();
      // Filter parties that have at least one undispatch design
      const filteredCounts = counts.filter(
        (count) => count.design_entry_count > 0
      );
      setPartyCounts(filteredCounts);
    };
    loadPartyCounts();
  }, []);

  // Filter orders based on date range
  useEffect(() => {
    if (!partyOrders.length) {
      setFilteredOrders([]);
      return;
    }

    if (!startDate && !endDate) {
      setFilteredOrders(partyOrders);
      return;
    }

    const filtered = partyOrders.filter((order) => {
      const orderDate = new Date(order.order_date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && end) {
        return orderDate >= start && orderDate <= end;
      } else if (start) {
        return orderDate >= start;
      } else if (end) {
        return orderDate <= end;
      }
      return true;
    });

    setFilteredOrders(filtered);
  }, [partyOrders, startDate, endDate]);

  const handlePartySelect = async (partyName: string) => {
    setSelectedParty(partyName);
    setIsLoading(true);
    try {
      const orders = await fetchOrderDetails(partyName);
      setPartyOrders(orders);
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch order details",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedParty || !filteredOrders.length) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a party with orders first",
      });
      return;
    }

    setIsGeneratingReport(true);
    try {
      const htmlReport = generatePartyReport(selectedParty, filteredOrders);

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        throw new Error(
          "Could not open print window. Please check your popup settings."
        );
      }

      printWindow.document.write(htmlReport);
      printWindow.document.close();

      // Wait for resources to load before printing
      printWindow.onload = () => {
        printWindow.print();
        printWindow.focus();
      };
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate report",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleClearDates = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="container mx-auto mt-10 p-4">
      <h1 className="text-2xl font-bold mb-6">Party Reports</h1>

      <div className="mb-6 space-y-4">
        <InputWithAutocomplete
          id="party-select"
          value={selectedParty}
          onChange={handlePartySelect}
          options={partyCounts.map((count) => ({
            id: count.design_entry_count,
            name: count.party_name,
          }))}
          placeholder="Select a party..."
          label="Party"
          className="w-full max-w-md"
        />

        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full"
            />
          </div>
          <Button variant="outline" onClick={handleClearDates} className="h-10">
            Clear Dates
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          <p>Loading order details...</p>
        </div>
      ) : selectedParty && filteredOrders.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {selectedParty} - {filteredOrders.length} Orders
              {(startDate || endDate) && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (Filtered by date range)
                </span>
              )}
            </h2>
            <Button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="flex items-center"
            >
              {isGeneratingReport ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Generate Report
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Design
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shades
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order, index) => (
                  <tr
                    key={index}
                    className={order.bhiwandi_date ? "bg-yellow-50" : ""}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.design}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.shades.map((shade, idx) => {
                        const shadeName = Object.keys(shade)[0];
                        const shadeValue = shade[shadeName];
                        return shadeValue ? (
                          <div key={idx}>
                            {shadeName}: {shadeValue}m
                          </div>
                        ) : null;
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div>
                        {order.order_date && (
                          <div>
                            Order Date:{" "}
                            {new Date(order.order_date).toLocaleDateString()}
                          </div>
                        )}
                        {order.order_no && (
                          <div>Order No: {order.order_no}</div>
                        )}
                        {order.price && <div>Price: ₹{order.price}</div>}
                        {order.remark && <div>Remark: {order.remark}</div>}
                        {order.bhiwandi_date && (
                          <div className="text-red-600">
                            Bhiwandi Date:{" "}
                            {new Date(order.bhiwandi_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : selectedParty ? (
        <div className="text-center p-6 text-gray-500">
          No orders found for this party
          {(startDate || endDate) && " in the selected date range"}
        </div>
      ) : null}

      <Toaster />
    </div>
  );
}

export default PartyReports;
