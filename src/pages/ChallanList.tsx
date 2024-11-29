/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Toaster } from "@/components/ui";
import supabase from "@/utils/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Challan {
  id: string; // UUID
  challan_no: number;
  date: string;
  bill_to: { name: string } | null;
  remark: string | null;
  canceled: boolean;
}

interface ChallanFromDB {
  id: string; // UUID
  challan_no: number;
  date: string;
  remark: string | null;
  bill_to: { name: string } | null;
  canceled: boolean;
}

export default function ChallanList() {
  const [challans, setChallans] = useState<Challan[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchChallans = async () => {
    try {
      const { data, error } = await supabase
        .from("challans")
        .select(
          `
          id, 
          challan_no, 
          date, 
          remark,
          canceled, 
          bill_to:bill_to_id(name)
        `
        )
        .order("date", { ascending: false })
        .order("challan_no", { ascending: false });

      if (error) throw error;

      const formattedChallans = (data as unknown as ChallanFromDB[]).map(
        (challan) => ({
          id: challan.id,
          challan_no: challan.challan_no,
          date: challan.date,
          remark: challan.remark,
          canceled: challan.canceled,
          bill_to: challan.bill_to || { name: "N/A" },
        })
      );
      setChallans(formattedChallans);
    } catch (error) {
      console.error("Error fetching challans:", error);
      toast({
        title: "Error",
        description: `Failed to fetch challans: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchChallans();
  }, []);

  return (
    <div className="container mx-auto mt-8 p-4 max-w-4xl">
      <Button onClick={() => navigate("/")} className="mb-6">
        Back to Home
      </Button>
      <h1 className="text-3xl font-bold mb-6">Challan List</h1>
      <div className="space-y-4">
        {challans.map((challan) => (
          <div
            key={challan.id}
            onClick={() => navigate(`/challan-view/${challan.id}`)}
            className={`p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 ${
              challan.canceled ? "bg-red-100" : "bg-white"
            }`} // Conditional background color
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-4">
                <span className="text-lg font-semibold">
                  #{challan.challan_no}
                </span>
                <span className="text-sm text-gray-500">
                  {format(new Date(challan.date), "dd/MM/yyyy")}
                </span>
              </div>
              <div className="space-x-2">
                <Button
                  className="bg-yellow-500 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/challan-edit/${challan.id}`);
                  }}
                >
                  Edit
                </Button>
                {challan.canceled ? (
                  <Button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const { error } = await supabase
                          .from("challans")
                          .update({ canceled: false })
                          .eq("id", challan.id);
                        if (error) throw error;
                        fetchChallans();
                      } catch (error) {
                        console.error("Error undoing cancellation:", error);
                        toast({
                          title: "Error",
                          description: `Failed to undo cancellation: ${
                            error instanceof Error
                              ? error.message
                              : "Unknown error"
                          }`,
                          variant: "destructive",
                        });
                      }
                    }}
                    className="bg-green-500 text-white"
                  >
                    Undo
                  </Button>
                ) : (
                  <Button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const { error } = await supabase
                          .from("challans")
                          .update({ canceled: true })
                          .eq("id", challan.id);
                        if (error) throw error;
                        fetchChallans();
                      } catch (error) {
                        console.error("Error deleting challan:", error);
                        toast({
                          title: "Error",
                          description: `Failed to delete challan: ${
                            error instanceof Error
                              ? error.message
                              : "Unknown error"
                          }`,
                          variant: "destructive",
                        });
                      }
                    }}
                    className="bg-red-500 text-white"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
            <div className="text-sm font-medium text-gray-700">
              {challan.bill_to?.name}
            </div>
            {challan.remark && (
              <div className="text-sm text-gray-500 mt-1">{challan.remark}</div>
            )}
          </div>
        ))}
      </div>
      <Toaster />
    </div>
  );
}
