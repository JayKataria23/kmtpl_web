import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Home, Plus, Receipt } from "lucide-react";
import supabase from "@/utils/supabase";
import { AddDyeingProgramForm } from "@/components/dyeing/AddDyeingProgramForm";
import { AddGoodsReceiptForm } from "@/components/dyeing/AddGoodsReceiptForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface DyeingProgram {
  id: string;
  supplier_name: string;
  slip_number: string;
  total_takas: number;
  total_meters: number;
  design_name: string;
  shades_details: { shade: string; takas: number }[];
  dyeing_unit: string;
  lot_number: string | null;
  status: "Pending" | "In Process" | "Completed";
  created_at: string;
  goods_receipts?: GoodsReceipt[];
}

export interface GoodsReceipt {
  id: string;
  grn_number: string;
  meters_received: number;
  date_received: string;
}

function DyeingBook() {
  const [programs, setPrograms] = useState<DyeingProgram[]>([]);
  const [isAddProgramOpen, setIsAddProgramOpen] = useState(false);
  const [isAddReceiptOpen, setIsAddReceiptOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<DyeingProgram | null>(
    null
  );
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchPrograms = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("dyeing_programs")
        .select(
          `
          *,
          goods_receipts (*)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPrograms(data || []);
    } catch (error) {
      console.error("Error fetching programs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch dyeing programs",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const roundToTwoDecimals = (value: number) => {
    return Number(value.toFixed(2));
  };

  const calculateRemainingMeters = (program: DyeingProgram) => {
    const receivedMeters =
      program.goods_receipts?.reduce(
        (sum, receipt) => sum + receipt.meters_received,
        0
      ) || 0;
    return roundToTwoDecimals(program.total_meters - receivedMeters);
  };

  const handleCompleteProgram = async (program: DyeingProgram) => {
    try {
      const { error } = await supabase
        .from("dyeing_programs")
        .update({ status: "Completed" })
        .eq("id", program.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Program marked as completed",
      });
      fetchPrograms();
    } catch (error) {
      console.error("Error completing program:", error);
      toast({
        title: "Error",
        description: "Failed to complete program",
        variant: "destructive",
      });
    }
  };

  const handleReverseStatus = async (program: DyeingProgram) => {
    try {
      const { error } = await supabase
        .from("dyeing_programs")
        .update({ status: "In Process" })
        .eq("id", program.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Program status reversed to In Process",
      });
      fetchPrograms();
    } catch (error) {
      console.error("Error reversing status:", error);
      toast({
        title: "Error",
        description: "Failed to reverse program status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-[95%] mx-auto p-6 bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dyeing Book</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/")}
          className="flex items-center"
        >
          <Home className="mr-2 h-4 w-4" /> Back to Home
        </Button>
      </div>

      <div className="mb-6">
        <Button
          onClick={() => setIsAddProgramOpen(true)}
          className="flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Program
        </Button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Slip Number</TableHead>
              <TableHead>Design</TableHead>
              <TableHead>Takas</TableHead>
              <TableHead>Total Meters</TableHead>
              <TableHead>Dyeing Unit</TableHead>
              <TableHead>Lot Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Remaining Meters</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.map((program) => (
              <TableRow key={program.id}>
                <TableCell>
                  {new Date(program.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>{program.supplier_name}</TableCell>
                <TableCell>{program.slip_number}</TableCell>
                <TableCell>{program.design_name}</TableCell>
                <TableCell>{program.total_takas}</TableCell>
                <TableCell>
                  {roundToTwoDecimals(program.total_meters)}
                </TableCell>
                <TableCell>{program.dyeing_unit}</TableCell>
                <TableCell>{program.lot_number || "-"}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      program.status === "Completed"
                        ? "bg-green-100 text-green-800"
                        : program.status === "In Process"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {program.status}
                  </span>
                </TableCell>
                <TableCell>{calculateRemainingMeters(program)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {program.status === "Completed" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReverseStatus(program)}
                        className="flex items-center"
                      >
                        Reverse Status
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProgram(program);
                            setIsAddReceiptOpen(true);
                          }}
                          className="flex items-center"
                        >
                          <Receipt className="mr-2 h-4 w-4" />
                          Add Receipt
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleCompleteProgram(program)}
                          className="flex items-center"
                        >
                          Complete
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {programs.map((program) => (
          <Card key={program.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{program.design_name}</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    program.status === "Completed"
                      ? "bg-green-100 text-green-800"
                      : program.status === "In Process"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {program.status}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p>{new Date(program.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Supplier</p>
                  <p>{program.supplier_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Slip Number</p>
                  <p>{program.slip_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dyeing Unit</p>
                  <p>{program.dyeing_unit}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Takas</p>
                  <p>{program.total_takas}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Meters</p>
                  <p>{roundToTwoDecimals(program.total_meters)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Lot Number</p>
                  <p>{program.lot_number || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Remaining Meters</p>
                  <p>{calculateRemainingMeters(program)}</p>
                </div>
              </div>
              <div className="pt-2 flex gap-2">
                {program.status === "Completed" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReverseStatus(program)}
                    className="flex-1"
                  >
                    Reverse Status
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedProgram(program);
                        setIsAddReceiptOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center"
                    >
                      <Receipt className="mr-2 h-4 w-4" />
                      Add Receipt
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleCompleteProgram(program)}
                      className="flex-1"
                    >
                      Complete
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isAddProgramOpen} onOpenChange={setIsAddProgramOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Dyeing Program</DialogTitle>
          </DialogHeader>
          <AddDyeingProgramForm
            onClose={() => setIsAddProgramOpen(false)}
            onSuccess={() => {
              fetchPrograms();
              setIsAddProgramOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isAddReceiptOpen} onOpenChange={setIsAddReceiptOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Goods Receipt</DialogTitle>
          </DialogHeader>
          <AddGoodsReceiptForm
            program={selectedProgram}
            onClose={() => {
              setIsAddReceiptOpen(false);
              setSelectedProgram(null);
            }}
            onSuccess={() => {
              fetchPrograms();
              setIsAddReceiptOpen(false);
              setSelectedProgram(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DyeingBook;
