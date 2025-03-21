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
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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
  taka_received: number | null;
}

function DyeingBook() {
  const [programs, setPrograms] = useState<DyeingProgram[]>([]);
  const [isAddProgramOpen, setIsAddProgramOpen] = useState(false);
  const [isAddReceiptOpen, setIsAddReceiptOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<DyeingProgram | null>(
    null
  );
  const [isEditProgramOpen, setIsEditProgramOpen] = useState(false);
  const [selectedProgramForEdit, setSelectedProgramForEdit] =
    useState<DyeingProgram | null>(null);
  const [editingLotNumber, setEditingLotNumber] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const [editingDate, setEditingDate] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const [editingGRNDate, setEditingGRNDate] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const [filters, setFilters] = useState({
    supplier: "",
    dyeingUnit: "",
    design: "",
    status: "",
  });
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

  const calculateRemainingTakas = (program: DyeingProgram) => {
    const receivedTakas =
      program.goods_receipts?.reduce(
        (sum, receipt) => sum + (receipt.taka_received || 0),
        0
      ) || 0;
    return roundToTwoDecimals(program.total_takas - receivedTakas);
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

  const handleDeleteProgram = async (program: DyeingProgram) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete the dyeing program for ${program.design_name}?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("dyeing_programs")
        .delete()
        .eq("id", program.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Program deleted successfully",
      });
      fetchPrograms();
    } catch (error) {
      console.error("Error deleting program:", error);
      toast({
        title: "Error",
        description: "Failed to delete program",
        variant: "destructive",
      });
    }
  };

  const handleEditButtonClick = (program: DyeingProgram) => {
    setSelectedProgramForEdit(program);
    setIsEditProgramOpen(true);
  };

  const handleLotNumberUpdate = async (programId: string, newValue: string) => {
    try {
      const { error } = await supabase
        .from("dyeing_programs")
        .update({ lot_number: newValue || null })
        .eq("id", programId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lot number updated successfully",
      });
      fetchPrograms();
      setEditingLotNumber(null);
    } catch (error) {
      console.error("Error updating lot number:", error);
      toast({
        title: "Error",
        description: "Failed to update lot number",
        variant: "destructive",
      });
    }
  };

  const handleDateUpdate = async (programId: string, newValue: string) => {
    try {
      const { error } = await supabase
        .from("dyeing_programs")
        .update({ created_at: newValue })
        .eq("id", programId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Date updated successfully",
      });
      fetchPrograms();
      setEditingDate(null);
    } catch (error) {
      console.error("Error updating date:", error);
      toast({
        title: "Error",
        description: "Failed to update date",
        variant: "destructive",
      });
    }
  };

  const handleGRNDateUpdate = async (receiptId: string, newValue: string) => {
    try {
      const { error } = await supabase
        .from("goods_receipts")
        .update({ date_received: newValue })
        .eq("id", receiptId);

      if (error) throw error;

      // Check if we need to auto-complete the program
      const program = programs.find((p) =>
        p.goods_receipts?.some((r) => r.id === receiptId)
      );

      if (
        program &&
        calculateRemainingTakas(program) <= 0 &&
        program.status !== "Completed"
      ) {
        await handleCompleteProgram(program);
      }

      toast({
        title: "Success",
        description: "GRN date updated successfully",
      });
      fetchPrograms();
      setEditingGRNDate(null);
    } catch (error) {
      console.error("Error updating GRN date:", error);
      toast({
        title: "Error",
        description: "Failed to update GRN date",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGRN = async (receiptId: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      "Are you sure you want to delete this GRN entry?"
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("goods_receipts")
        .delete()
        .eq("id", receiptId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "GRN entry deleted successfully",
      });
      fetchPrograms();
    } catch (error) {
      console.error("Error deleting GRN:", error);
      toast({
        title: "Error",
        description: "Failed to delete GRN entry",
        variant: "destructive",
      });
    }
  };

  const filteredPrograms = programs.filter((program) => {
    return (
      (!filters.supplier ||
        program.supplier_name
          .toLowerCase()
          .includes(filters.supplier.toLowerCase())) &&
      (!filters.dyeingUnit ||
        program.dyeing_unit
          .toLowerCase()
          .includes(filters.dyeingUnit.toLowerCase())) &&
      (!filters.design ||
        program.design_name
          .toLowerCase()
          .includes(filters.design.toLowerCase())) &&
      (!filters.status || program.status === filters.status)
    );
  });

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

      <div className="mb-6 space-y-4">
        <Button
          onClick={() => setIsAddProgramOpen(true)}
          className="flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Program
        </Button>

        <details className="border rounded-lg p-4">
          <summary className="cursor-pointer text-sm text-blue-600 font-medium">
            Show Filters
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div>
              <Input
                placeholder="Filter by supplier..."
                value={filters.supplier}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, supplier: e.target.value }))
                }
                className="w-full"
              />
            </div>
            <div>
              <Input
                placeholder="Filter by dyeing unit..."
                value={filters.dyeingUnit}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    dyeingUnit: e.target.value,
                  }))
                }
                className="w-full"
              />
            </div>
            <div>
              <Input
                placeholder="Filter by design..."
                value={filters.design}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, design: e.target.value }))
                }
                className="w-full"
              />
            </div>
            <div>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Process">In Process</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </details>
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
              <TableHead>Remaining Takas</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPrograms.map((program) => (
              <TableRow key={program.id}>
                <TableCell>
                  {editingDate?.id === program.id ? (
                    <Input
                      type="date"
                      value={editingDate.value}
                      onChange={(e) =>
                        setEditingDate({
                          id: program.id,
                          value: e.target.value,
                        })
                      }
                      onBlur={() =>
                        handleDateUpdate(program.id, editingDate.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleDateUpdate(program.id, editingDate.value);
                        } else if (e.key === "Escape") {
                          setEditingDate(null);
                        }
                      }}
                      className="w-32"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() =>
                        setEditingDate({
                          id: program.id,
                          value: program.created_at.split("T")[0],
                        })
                      }
                      className="cursor-pointer hover:text-blue-600"
                    >
                      {new Date(program.created_at).toLocaleDateString()}
                    </span>
                  )}
                </TableCell>
                <TableCell>{program.supplier_name}</TableCell>
                <TableCell>{program.slip_number}</TableCell>
                <TableCell>{program.design_name}</TableCell>
                <TableCell>{program.total_takas}</TableCell>
                <TableCell>
                  {roundToTwoDecimals(program.total_meters)}
                </TableCell>
                <TableCell className="text-red-600 font-medium">
                  {program.dyeing_unit}
                </TableCell>
                <TableCell>
                  {editingLotNumber?.id === program.id ? (
                    <Input
                      value={editingLotNumber.value}
                      onChange={(e) =>
                        setEditingLotNumber({
                          id: program.id,
                          value: e.target.value,
                        })
                      }
                      onBlur={() =>
                        handleLotNumberUpdate(
                          program.id,
                          editingLotNumber.value
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleLotNumberUpdate(
                            program.id,
                            editingLotNumber.value
                          );
                        } else if (e.key === "Escape") {
                          setEditingLotNumber(null);
                        }
                      }}
                      className="w-24"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() =>
                        setEditingLotNumber({
                          id: program.id,
                          value: program.lot_number || "",
                        })
                      }
                      className="cursor-pointer hover:text-blue-600 text-red-500"
                    >
                      {program.lot_number || "-"}
                    </span>
                  )}
                </TableCell>
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
                <TableCell>{calculateRemainingTakas(program)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[300px]">
                    {program.status === "Completed" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReverseStatus(program)}
                          className="flex-1 items-center justify-center"
                        >
                          Reverse Status
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteProgram(program)}
                          className="flex-1 items-center justify-center"
                        >
                          Delete
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProgram(program);
                            setIsAddReceiptOpen(true);
                          }}
                          className="flex-1 items-center justify-center"
                        >
                          <Receipt className="mr-2 h-4 w-4" />
                          Add Receipt
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleCompleteProgram(program)}
                          className="flex-1 items-center justify-center"
                        >
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteProgram(program)}
                          className="flex-1 items-center justify-center"
                        >
                          Delete
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
        {filteredPrograms.map((program) => (
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
                  {editingDate?.id === program.id ? (
                    <Input
                      type="date"
                      value={editingDate.value}
                      onChange={(e) =>
                        setEditingDate({
                          id: program.id,
                          value: e.target.value,
                        })
                      }
                      onBlur={() =>
                        handleDateUpdate(program.id, editingDate.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleDateUpdate(program.id, editingDate.value);
                        } else if (e.key === "Escape") {
                          setEditingDate(null);
                        }
                      }}
                      className="mt-1"
                      autoFocus
                    />
                  ) : (
                    <p
                      onClick={() =>
                        setEditingDate({
                          id: program.id,
                          value: program.created_at.split("T")[0],
                        })
                      }
                      className="cursor-pointer hover:text-blue-600"
                    >
                      {new Date(program.created_at).toLocaleDateString()}
                    </p>
                  )}
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
                  <p className="text-red-600 font-medium">
                    {program.dyeing_unit}
                  </p>
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
                  {editingLotNumber?.id === program.id ? (
                    <Input
                      value={editingLotNumber.value}
                      onChange={(e) =>
                        setEditingLotNumber({
                          id: program.id,
                          value: e.target.value,
                        })
                      }
                      onBlur={() =>
                        handleLotNumberUpdate(
                          program.id,
                          editingLotNumber.value
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleLotNumberUpdate(
                            program.id,
                            editingLotNumber.value
                          );
                        } else if (e.key === "Escape") {
                          setEditingLotNumber(null);
                        }
                      }}
                      className="mt-1"
                      autoFocus
                    />
                  ) : (
                    <p
                      onClick={() =>
                        setEditingLotNumber({
                          id: program.id,
                          value: program.lot_number || "",
                        })
                      }
                      className="cursor-pointer hover:text-blue-600 text-red-500"
                    >
                      {program.lot_number || "-"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Remaining Takas</p>
                  <p>{calculateRemainingTakas(program)}</p>
                </div>
              </div>
              <div className="pt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditButtonClick(program)}
                  className="flex-1 min-w-[100px] items-center justify-center"
                >
                  Edit
                </Button>
                {program.status === "Completed" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReverseStatus(program)}
                      className="flex-1 min-w-[100px] items-center justify-center"
                    >
                      Reverse Status
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteProgram(program)}
                      className="flex-1 min-w-[100px] items-center justify-center"
                    >
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedProgram(program);
                        setIsAddReceiptOpen(true);
                      }}
                      className="flex-1 min-w-[100px] items-center justify-center"
                    >
                      <Receipt className="mr-2 h-4 w-4" />
                      Add Receipt
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleCompleteProgram(program)}
                      className="flex-1 min-w-[100px] items-center justify-center"
                    >
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteProgram(program)}
                      className="flex-1 min-w-[100px] items-center justify-center"
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
              {/* Expandable Details */}
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-blue-600">
                  View Details
                </summary>
                <div className="mt-2 space-y-4">
                  {/* Shades Details */}
                  <div>
                    <h4 className="font-medium mb-2">Shades Details</h4>
                    <div className="space-y-1">
                      {program.shades_details.map((shade, index) => (
                        <div key={index} className="border p-2 rounded">
                          <p className="text-sm">
                            Shade:{" "}
                            <span className="font-medium">{shade.shade}</span>
                          </p>
                          <p className="text-sm">
                            Takas:{" "}
                            <span className="font-medium">{shade.takas}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* GRN Details */}
                  <div>
                    <h4 className="font-medium mb-2">GRN Details</h4>
                    <div className="space-y-1">
                      {program.goods_receipts?.map((receipt) => (
                        <div
                          key={receipt.id}
                          className="border p-2 rounded relative"
                        >
                          <button
                            onClick={() => handleDeleteGRN(receipt.id)}
                            className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                          <p className="text-sm">
                            GRN Number: {receipt.grn_number}
                          </p>
                          <p className="text-sm">
                            Meters Received: {receipt.meters_received}
                          </p>
                          <p className="text-sm">
                            Takas Received: {receipt.taka_received || 0}
                          </p>
                          <p className="text-sm">
                            Date Received:{" "}
                            {editingGRNDate?.id === receipt.id ? (
                              <Input
                                type="date"
                                value={editingGRNDate.value}
                                onChange={(e) =>
                                  setEditingGRNDate({
                                    id: receipt.id,
                                    value: e.target.value,
                                  })
                                }
                                onBlur={() =>
                                  handleGRNDateUpdate(
                                    receipt.id,
                                    editingGRNDate.value
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleGRNDateUpdate(
                                      receipt.id,
                                      editingGRNDate.value
                                    );
                                  } else if (e.key === "Escape") {
                                    setEditingGRNDate(null);
                                  }
                                }}
                                className="mt-1 w-full"
                                autoFocus
                              />
                            ) : (
                              <span
                                onClick={() =>
                                  setEditingGRNDate({
                                    id: receipt.id,
                                    value: receipt.date_received.split("T")[0],
                                  })
                                }
                                className="cursor-pointer hover:text-blue-600"
                              >
                                {new Date(
                                  receipt.date_received
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={isAddProgramOpen} onOpenChange={setIsAddProgramOpen}>
        <SheetContent className="sm:max-w-[425px]" side="top">
          <SheetHeader>
            <SheetTitle>Add New Dyeing Program</SheetTitle>
          </SheetHeader>
          <AddDyeingProgramForm
            onClose={() => setIsAddProgramOpen(false)}
            onSuccess={() => {
              fetchPrograms();
              setIsAddProgramOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>

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

      {/* Edit Program Dialog */}
      <Dialog open={isEditProgramOpen} onOpenChange={setIsEditProgramOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Dyeing Program</DialogTitle>
          </DialogHeader>
          <AddDyeingProgramForm
            initialData={selectedProgramForEdit}
            onClose={() => {
              setIsEditProgramOpen(false);
              setSelectedProgramForEdit(null);
            }}
            onSuccess={() => {
              fetchPrograms();
              setIsEditProgramOpen(false);
              setSelectedProgramForEdit(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DyeingBook;
