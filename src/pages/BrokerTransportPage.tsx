import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Input,
  Label,
  Toaster,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/utils/supabase";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AddNewDesign } from "@/components/custom/AddNewDesign";
import * as XLSX from "xlsx";

interface Profile {
  id: number;
  name: string;
}

interface Design {
  id: number;
  title: string;
}

interface DyeingUnit {
  id: number;
  dyeing_unit: string;
}

interface SupplierName {
  id: number;
  supplier_name: string;
}

const scrollableContentClass = "max-h-[300px] overflow-y-auto pr-2";

export default function BrokerTransportPage() {
  const [brokers, setBrokers] = useState<Profile[]>([]);
  const [transports, setTransports] = useState<Profile[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [dyeingUnits, setDyeingUnits] = useState<DyeingUnit[]>([]);
  const [supplierNames, setSupplierNames] = useState<SupplierName[]>([]);
  const [newBroker, setNewBroker] = useState("");
  const [newTransport, setNewTransport] = useState("");
  const [newDyeingUnit, setNewDyeingUnit] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [isAddDesignOpen, setIsAddDesignOpen] = useState(false);
  const [remarkOptions, setRemarkOptions] = useState<string[]>([]);
  const [newRemark, setNewRemark] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [editingStates, setEditingStates] = useState<{
    [key: number]: boolean;
  }>({});
  const [editTitles, setEditTitles] = useState<{ [key: number]: string }>({});
  const [selectedDesigns, setSelectedDesigns] = useState<Design[]>([]);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pin, setPin] = useState("");
  const CORRECT_PIN = "1234"; // You can change this to any 4-digit PIN
  // State for sales receivables upload
  const [receivablesFile, setReceivablesFile] = useState<File | null>(null);
  const [isUploadingReceivables, setIsUploadingReceivables] = useState(false);

  useEffect(() => {
    fetchBrokers();
    fetchTransports();
    fetchDesigns();
    fetchRemarkOptions();
  }, []);

  const fetchBrokers = async () => {
    const { data, error } = await supabase
      .from("brokers")
      .select("*")
      .order("name");
    if (error) {
      console.error("Error fetching brokers:", error);
    } else {
      setBrokers(data);
    }
  };

  const fetchTransports = async () => {
    const { data, error } = await supabase
      .from("transport_profiles")
      .select("*")
      .order("name");
    if (error) {
      console.error("Error fetching transport profiles:", error);
    } else {
      setTransports(data);
    }
  };

  const fetchDesigns = async () => {
    const { data, error } = await supabase
      .from("designs")
      .select("*")
      .order("title");
    if (error) {
      console.error("Error fetching designs:", error);
    } else {
      setDesigns(data);
    }
  };

  const fetchRemarkOptions = async () => {
    try {
      const { data, error } = await supabase.from("REMARKS").select("content");

      if (error) throw error;

      setRemarkOptions(data.map((remark) => remark.content));
    } catch (error) {
      console.error("Error fetching remark options:", error);
    }
  };


  const addBroker = async () => {
    if (newBroker.trim()) {
      const { data, error } = await supabase
        .from("brokers")
        .insert({ name: newBroker.trim().toUpperCase() })
        .select();
      if (error) {
        toast({
          title: "Error",
          description: "Failed to add broker",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Broker "${data[0].name}" added successfully`,
        });
        setNewBroker("");
        fetchBrokers();
      }
    }
  };

  const addTransport = async () => {
    if (newTransport.trim()) {
      const { data, error } = await supabase
        .from("transport_profiles")
        .insert({ name: newTransport.trim().toUpperCase() })
        .select();
      if (error) {
        toast({
          title: "Error",
          description: "Failed to add transport profile",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Transport profile "${data[0].name}" added successfully`,
        });
        setNewTransport("");
        fetchTransports();
      }
    }
  };

  const addRemark = async () => {
    if (newRemark.trim()) {
      const { error } = await supabase
        .from("REMARKS")
        .insert({ content: newRemark.trim().toUpperCase() });
      if (error) {
        toast({
          title: "Error",
          description: "Failed to add remark",
          variant: "destructive",
        });
      } else {
        fetchRemarkOptions();
        toast({
          title: "Success",
          description: `Remark "${newRemark.trim()}" added successfully`,
        });
      }
    }
  };


  const deleteBroker = async (id: number) => {
    const { error } = await supabase.from("brokers").delete().eq("id", id);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete broker",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Broker deleted successfully",
      });
      fetchBrokers();
    }
  };

  const deleteTransport = async (id: number) => {
    const { error } = await supabase
      .from("transport_profiles")
      .delete()
      .eq("id", id);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete transport profile",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Transport profile deleted successfully",
      });
      fetchTransports();
    }
  };

  const deleteDesign = async (id: number) => {
    const { error } = await supabase.from("designs").delete().eq("id", id);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete design",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Design deleted successfully",
      });
      fetchDesigns();
    }
  };

  const deleteRemark = async (remark: string) => {
    const { error } = await supabase
      .from("REMARKS")
      .delete()
      .eq("content", remark);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete remark",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Remark deleted successfully",
      });
      fetchRemarkOptions();
    }
  };

  // Helpers for Sales Receivables upload
  const formatExcelSerialToISO = (serial: number, date1904: boolean = false): string | null => {
    if (typeof serial !== "number" || isNaN(serial)) return null;
    const o = (XLSX.SSF as any).parse_date_code(serial, { date1904 });
    if (!o) return null;
    const y = String(o.y).padStart(4, "0");
    const m = String(o.m).padStart(2, "0");
    const d = String(o.d).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const formatStringDateToISO = (value: string): string | null => {
    const s = value.trim();
    if (!s) return null;
    // ISO-like
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
      const [y, m, d] = s.split("-");
      return `${y}-${String(Number(m)).padStart(2, "0")}-${String(Number(d)).padStart(2, "0")}`;
    }
    // d/m/y
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) {
      const [d, m, yRaw] = s.split("/");
      const yNum = yRaw.length === 2 ? Number(yRaw) + 2000 : Number(yRaw);
      return `${yNum}-${String(Number(m)).padStart(2, "0")}-${String(Number(d)).padStart(2, "0")}`;
    }
    // d-m-y
    if (/^\d{1,2}-\d{1,2}-\d{2,4}$/.test(s)) {
      const [d, m, yRaw] = s.split("-");
      const yNum = yRaw.length === 2 ? Number(yRaw) + 2000 : Number(yRaw);
      return `${yNum}-${String(Number(m)).padStart(2, "0")}-${String(Number(d)).padStart(2, "0")}`;
    }
    return null;
  };

  const toIsoDate = (value: unknown): string | null => {
    if (value == null || value === "") return null;
    if (typeof value === "number") return formatExcelSerialToISO(value);
    if (value instanceof Date) {
      return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
    }
    if (typeof value === "string") return formatStringDateToISO(value);
    return null;
  };

  const parsePendingAmount = (value: unknown): number | null => {
    if (value == null || value === "") return null;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/[\,\s]/g, "");
      const num = Number(cleaned);
      return isNaN(num) ? null : num;
    }
    return null;
  };

  const uploadReceivablesFromExcel = async () => {
    if (!receivablesFile) {
      toast({ title: "No file", description: "Please choose an Excel file" });
      return;
    }
    setIsUploadingReceivables(true);
    try {
      const arrayBuffer = await receivablesFile.arrayBuffer();
      // Do not use cellDates; keep Excel serials to avoid timezone conversions
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: true,
      });
      const isDate1904 = !!(workbook.Workbook && workbook.Workbook.WBProps && workbook.Workbook.WBProps.date1904);

      if (!rows.length) {
        toast({ title: "Empty sheet", description: "No rows found" });
        return;
      }

      const payload = rows
        .map((r) => {
          const isoDate = typeof r["Date"] === "number" ? formatExcelSerialToISO(r["Date"], isDate1904) : toIsoDate(r["Date"]);
          const reference = String(r["Ref. No."] ?? "").toString().trim();
          const party = String(r["Party's Name"] ?? "").toString().trim();
          const amount = parsePendingAmount(r["Pending"]);
          if (!isoDate || !reference || !party || amount == null) return null;
          return {
            transaction_date: isoDate,
            reference_number: reference,
            party_name: party,
            pending_amount: amount,
          } as {
            transaction_date: string;
            reference_number: string;
            party_name: string;
            pending_amount: number;
          };
        })
        .filter(Boolean) as Array<{
        transaction_date: string;
        reference_number: string;
        party_name: string;
        pending_amount: number;
      }>;

      if (!payload.length) {
        toast({ title: "No valid rows", description: "Nothing to upload" });
        return;
      }

      const chunkSize = 500;
      let insertedTotal = 0;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        const { error } = await supabase.from("sales_receivables").insert(chunk);
        if (error) throw error;
        insertedTotal += chunk.length;
      }

      toast({
        title: "Upload complete",
        description: `${insertedTotal} receivable rows uploaded`,
      });
      setReceivablesFile(null);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.message || "Unable to upload receivables",
        variant: "destructive",
      });
    } finally {
      setIsUploadingReceivables(false);
    }
  };

  const deleteAllSalesReceivables = async () => {
    const confirmed = window.confirm(
      "Delete ALL rows from sales_receivables? This cannot be undone."
    );
    if (!confirmed) return;
    const { error } = await supabase.from("sales_receivables").delete().gte("id", 0);
    if (error) {
      toast({
        title: "Delete failed",
        description: "Could not delete all receivables",
        variant: "destructive",
      });
    } else {
      toast({ title: "Deleted", description: "All receivables removed" });
    }
  };

  
  
  const editDesign = async (id: number, title: string) => {
    if (title.trim()) {
      const { error } = await supabase
        .from("designs")
        .update({ title: title.trim().toUpperCase() })
        .eq("id", id);
      if (error) {
        toast({
          title: "Error",
          description: "Failed to edit design",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Design updated successfully`,
        });
        fetchDesigns();
      }
    }
  };

  
  
  
  
  const handleDesignSelect = (design: Design) => {
    if (selectedDesigns.find((d) => d.id === design.id)) {
      setSelectedDesigns(selectedDesigns.filter((d) => d.id !== design.id));
    } else if (selectedDesigns.length < 2) {
      setSelectedDesigns([...selectedDesigns, design]);
    }
  };

  const handlePinSubmit = () => {
    if (pin === CORRECT_PIN) {
      setIsPinDialogOpen(false);
      setPin("");
      replaceDesigns();
    } else {
      toast({
        title: "Error",
        description: "Incorrect PIN",
        variant: "destructive",
      });
      setPin("");
    }
  };

  const replaceDesigns = async () => {
    if (selectedDesigns.length !== 2) {
      toast({
        title: "Error",
        description: "Please select exactly two designs",
        variant: "destructive",
      });
      return;
    }

    const [oldDesign, newDesign] = selectedDesigns;

    const { error } = await supabase.rpc("replace_and_delete_design", {
      old_design_name: oldDesign.title,
      new_design_name: newDesign.title,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to replace design",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Design "${oldDesign.title}" replaced with "${newDesign.title}" successfully`,
      });
      setSelectedDesigns([]);
      fetchDesigns();
    }
  };

  return (
    <div className="container mx-auto mt-10 p-4">
      <Button onClick={() => navigate("/")} className="mb-4">
        Back to Home
      </Button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">Brokers</h2>
          <div className="space-y-2 mb-4">
            <Label htmlFor="newBroker">Add New Broker</Label>
            <div className="flex space-x-2">
              <Input
                id="newBroker"
                value={newBroker}
                onChange={(e) => setNewBroker(e.target.value)}
                placeholder="Enter broker name"
              />
              <Button onClick={addBroker}>Add</Button>
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="brokers">
              <AccordionTrigger>Existing Brokers</AccordionTrigger>
              <AccordionContent>
                <div className={scrollableContentClass}>
                  <ul className="space-y-2">
                    {brokers.map((broker) => (
                      <li
                        key={broker.id}
                        className="flex justify-between items-center bg-gray-100 p-2 rounded"
                      >
                        <span>{broker.name}</span>
                        <Button
                          onClick={() => deleteBroker(broker.id)}
                          variant="destructive"
                          size="sm"
                        >
                          Delete
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">Transport Profiles</h2>
          <div className="space-y-2 mb-4">
            <Label htmlFor="newTransport">Add New Transport Profile</Label>
            <div className="flex space-x-2">
              <Input
                id="newTransport"
                value={newTransport}
                onChange={(e) => setNewTransport(e.target.value)}
                placeholder="Enter transport profile name"
              />
              <Button onClick={addTransport}>Add</Button>
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="transports">
              <AccordionTrigger>Existing Transport Profiles</AccordionTrigger>
              <AccordionContent>
                <div className={scrollableContentClass}>
                  <ul className="space-y-2">
                    {transports.map((transport) => (
                      <li
                        key={transport.id}
                        className="flex justify-between items-center bg-gray-100 p-2 rounded"
                      >
                        <span>{transport.name}</span>
                        <Button
                          onClick={() => deleteTransport(transport.id)}
                          variant="destructive"
                          size="sm"
                        >
                          Delete
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">Designs</h2>
          <div className="space-y-2 mb-4">
            <Label htmlFor="newDesign">Add New Design</Label>
            <div className="flex space-x-2">
              <Button onClick={() => setIsAddDesignOpen(true)}>
                Add Design
              </Button>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {selectedDesigns.length === 0
                  ? "Select two designs to replace"
                  : `Selected ${selectedDesigns.length}/2 designs`}
              </div>
              {selectedDesigns.length === 2 && (
                <Button
                  onClick={() => setIsPinDialogOpen(true)}
                  variant="default"
                  size="sm"
                >
                  Replace Designs
                </Button>
              )}
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="designs">
              <AccordionTrigger>Existing Designs</AccordionTrigger>
              <AccordionContent>
                <div className={scrollableContentClass}>
                  <div className="space-y-4">
                    <ul className="space-y-2">
                      {designs.map((design) => (
                        <li
                          key={design.id}
                          className={`flex justify-between items-center p-2 rounded ${
                            selectedDesigns.find((d) => d.id === design.id)
                              ? "bg-blue-100 border-2 border-blue-500"
                              : "bg-gray-100"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedDesigns.some(
                                (d) => d.id === design.id
                              )}
                              onChange={() => handleDesignSelect(design)}
                              className="h-4 w-4"
                            />
                            {editingStates[design.id] ? (
                              <Input
                                value={editTitles[design.id] || design.title}
                                onChange={(e) =>
                                  setEditTitles({
                                    ...editTitles,
                                    [design.id]: e.target.value,
                                  })
                                }
                                placeholder="Edit design title"
                              />
                            ) : (
                              <span>{design.title}</span>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            {editingStates[design.id] ? (
                              <Button
                                onClick={() => {
                                  editDesign(
                                    design.id,
                                    editTitles[design.id] || design.title
                                  );
                                  setEditingStates({
                                    ...editingStates,
                                    [design.id]: false,
                                  });
                                }}
                                variant="outline"
                                size="sm"
                              >
                                Save
                              </Button>
                            ) : (
                              <Button
                                onClick={() =>
                                  setEditingStates({
                                    ...editingStates,
                                    [design.id]: true,
                                  })
                                }
                                variant="outline"
                                size="sm"
                              >
                                Edit
                              </Button>
                            )}
                            <Button
                              onClick={() => deleteDesign(design.id)}
                              variant="destructive"
                              size="sm"
                            >
                              Delete
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">Remarks</h2>
          <div className="space-y-2 mb-4">
            <Label htmlFor="newDesign">Add New Remark</Label>
            <div className="flex space-x-2">
              <Input
                id="newRemark"
                value={newRemark}
                onChange={(e) => setNewRemark(e.target.value)}
                placeholder="Enter Remark"
              />
              <Button onClick={addRemark}>Add</Button>
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="designs">
              <AccordionTrigger>Existing Designs</AccordionTrigger>
              <AccordionContent>
                <div className={scrollableContentClass}>
                  <ul className="space-y-2">
                    {remarkOptions.map((remark) => (
                      <li
                        key={remark}
                        className="flex justify-between items-center bg-gray-100 p-2 rounded"
                      >
                        <span>{remark}</span>
                        <Button
                          onClick={() => deleteRemark(remark)}
                          variant="destructive"
                          size="sm"
                        >
                          Delete
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">Sales Receivables (Outstandings)</h2>
          <div className="space-y-3 mb-4">
            <Label htmlFor="receivablesFile">Upload Excel</Label>
            <input
              id="receivablesFile"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setReceivablesFile(e.target.files?.[0] || null)}
              className="block w-full text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={uploadReceivablesFromExcel} disabled={isUploadingReceivables || !receivablesFile}>
                {isUploadingReceivables ? "Uploading..." : "Upload"}
              </Button>
              <Button
                variant="destructive"
                onClick={deleteAllSalesReceivables}
              >
                Delete All Receivables
              </Button>
            </div>
            <div className="text-xs text-gray-500">
              Expected headers: Date, Ref. No., Party's Name, Pending
            </div>
          </div>
        </div>
      </div>
      <AddNewDesign
        isOpen={isAddDesignOpen}
        onClose={() => setIsAddDesignOpen(false)}
        onSuccess={fetchDesigns}
        designs={designs.map((d) => d.title)}
      />
      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter PIN</DialogTitle>
            Please enter the 4-digit PIN to confirm design replacement
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "");
                setPin(value);
              }}
              placeholder="Enter 4-digit PIN"
              className="text-center text-2xl tracking-widest"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsPinDialogOpen(false);
                  setPin("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handlePinSubmit} disabled={pin.length !== 4}>
                Verify
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  );
}
