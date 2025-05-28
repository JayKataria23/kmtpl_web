import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Label, Toaster } from "@/components/ui";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/utils/supabase";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AddNewDesign } from "@/components/custom/AddNewDesign";

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
  const [editingDyeingUnit, setEditingDyeingUnit] = useState<{
    [key: number]: boolean;
  }>({});
  const [editingSupplierName, setEditingSupplierName] = useState<{
    [key: number]: boolean;
  }>({});
  const [editDyeingUnitValues, setEditDyeingUnitValues] = useState<{
    [key: number]: string;
  }>({});
  const [editSupplierNameValues, setEditSupplierNameValues] = useState<{
    [key: number]: string;
  }>({});

  useEffect(() => {
    fetchBrokers();
    fetchTransports();
    fetchDesigns();
    fetchRemarkOptions();
    fetchDyeingUnits();
    fetchSupplierNames();
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

  const fetchDyeingUnits = async () => {
    const { data, error } = await supabase
      .from("dyeing_units")
      .select("*")
      .order("dyeing_unit");
    if (error) {
      console.error("Error fetching dyeing units:", error);
    } else {
      setDyeingUnits(data);
    }
  };

  const fetchSupplierNames = async () => {
    const { data, error } = await supabase
      .from("supplier_names")
      .select("*")
      .order("supplier_name");
    if (error) {
      console.error("Error fetching supplier names:", error);
    } else {
      setSupplierNames(data);
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

  const addDyeingUnit = async () => {
    if (newDyeingUnit.trim()) {
      const { data, error } = await supabase
        .from("dyeing_units")
        .insert({ dyeing_unit: newDyeingUnit.trim().toUpperCase() })
        .select();
      if (error) {
        toast({
          title: "Error",
          description: "Failed to add dyeing unit",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Dyeing unit "${data[0].dyeing_unit}" added successfully`,
        });
        setNewDyeingUnit("");
        fetchDyeingUnits();
      }
    }
  };

  const addSupplierName = async () => {
    if (newSupplierName.trim()) {
      const { data, error } = await supabase
        .from("supplier_names")
        .insert({ supplier_name: newSupplierName.trim().toUpperCase() })
        .select();
      if (error) {
        toast({
          title: "Error",
          description: "Failed to add supplier name",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Supplier name "${data[0].supplier_name}" added successfully`,
        });
        setNewSupplierName("");
        fetchSupplierNames();
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

  const deleteDyeingUnit = async (id: number) => {
    const { error } = await supabase.from("dyeing_units").delete().eq("id", id);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete dyeing unit",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Dyeing unit deleted successfully",
      });
      fetchDyeingUnits();
    }
  };

  const deleteSupplierName = async (id: number) => {
    const { error } = await supabase
      .from("supplier_names")
      .delete()
      .eq("id", id);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete supplier name",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Supplier name deleted successfully",
      });
      fetchSupplierNames();
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

  const editDyeingUnit = async (id: number, value: string) => {
    if (value.trim()) {
      const { error } = await supabase
        .from("dyeing_units")
        .update({ dyeing_unit: value.trim().toUpperCase() })
        .eq("id", id);
      if (error) {
        toast({
          title: "Error",
          description: "Failed to edit dyeing unit",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Dyeing unit updated successfully",
        });
        fetchDyeingUnits();
      }
    }
  };

  const editSupplierName = async (id: number, value: string) => {
    if (value.trim()) {
      const { error } = await supabase
        .from("supplier_names")
        .update({ supplier_name: value.trim().toUpperCase() })
        .eq("id", id);
      if (error) {
        toast({
          title: "Error",
          description: "Failed to edit supplier name",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Supplier name updated successfully",
        });
        fetchSupplierNames();
      }
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
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="designs">
              <AccordionTrigger>Existing Designs</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2">
                  {designs.map((design) => (
                    <li
                      key={design.id}
                      className="flex justify-between items-center bg-gray-100 p-2 rounded"
                    >
                      {editingStates[design.id] ? (
                        <>
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
                        </>
                      ) : (
                        <>
                          <span>{design.title}</span>
                          <div className="flex space-x-2">
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
                            <Button
                              onClick={() => deleteDesign(design.id)}
                              variant="destructive"
                              size="sm"
                            >
                              Delete
                            </Button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">Dyeing Units</h2>
          <div className="space-y-2 mb-4">
            <Label htmlFor="newDyeingUnit">Add New Dyeing Unit</Label>
            <div className="flex space-x-2">
              <Input
                id="newDyeingUnit"
                value={newDyeingUnit}
                onChange={(e) => setNewDyeingUnit(e.target.value)}
                placeholder="Enter dyeing unit name"
              />
              <Button onClick={addDyeingUnit}>Add</Button>
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="dyeingUnits">
              <AccordionTrigger>Existing Dyeing Units</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2">
                  {dyeingUnits.map((unit) => (
                    <li
                      key={unit.id}
                      className="flex justify-between items-center bg-gray-100 p-2 rounded"
                    >
                      {editingDyeingUnit[unit.id] ? (
                        <>
                          <Input
                            value={
                              editDyeingUnitValues[unit.id] || unit.dyeing_unit
                            }
                            onChange={(e) =>
                              setEditDyeingUnitValues({
                                ...editDyeingUnitValues,
                                [unit.id]: e.target.value,
                              })
                            }
                            placeholder="Edit dyeing unit"
                          />
                          <Button
                            onClick={() => {
                              editDyeingUnit(
                                unit.id,
                                editDyeingUnitValues[unit.id] ||
                                  unit.dyeing_unit
                              );
                              setEditingDyeingUnit({
                                ...editingDyeingUnit,
                                [unit.id]: false,
                              });
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Save
                          </Button>
                        </>
                      ) : (
                        <>
                          <span>{unit.dyeing_unit}</span>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() =>
                                setEditingDyeingUnit({
                                  ...editingDyeingUnit,
                                  [unit.id]: true,
                                })
                              }
                              variant="outline"
                              size="sm"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => deleteDyeingUnit(unit.id)}
                              variant="destructive"
                              size="sm"
                            >
                              Delete
                            </Button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">Supplier Names</h2>
          <div className="space-y-2 mb-4">
            <Label htmlFor="newSupplierName">Add New Supplier Name</Label>
            <div className="flex space-x-2">
              <Input
                id="newSupplierName"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="Enter supplier name"
              />
              <Button onClick={addSupplierName}>Add</Button>
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="supplierNames">
              <AccordionTrigger>Existing Supplier Names</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2">
                  {supplierNames.map((supplier) => (
                    <li
                      key={supplier.id}
                      className="flex justify-between items-center bg-gray-100 p-2 rounded"
                    >
                      {editingSupplierName[supplier.id] ? (
                        <>
                          <Input
                            value={
                              editSupplierNameValues[supplier.id] ||
                              supplier.supplier_name
                            }
                            onChange={(e) =>
                              setEditSupplierNameValues({
                                ...editSupplierNameValues,
                                [supplier.id]: e.target.value,
                              })
                            }
                            placeholder="Edit supplier name"
                          />
                          <Button
                            onClick={() => {
                              editSupplierName(
                                supplier.id,
                                editSupplierNameValues[supplier.id] ||
                                  supplier.supplier_name
                              );
                              setEditingSupplierName({
                                ...editingSupplierName,
                                [supplier.id]: false,
                              });
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Save
                          </Button>
                        </>
                      ) : (
                        <>
                          <span>{supplier.supplier_name}</span>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() =>
                                setEditingSupplierName({
                                  ...editingSupplierName,
                                  [supplier.id]: true,
                                })
                              }
                              variant="outline"
                              size="sm"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => deleteSupplierName(supplier.id)}
                              variant="destructive"
                              size="sm"
                            >
                              Delete
                            </Button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
      <AddNewDesign
        isOpen={isAddDesignOpen}
        onClose={() => setIsAddDesignOpen(false)}
        onSuccess={fetchDesigns}
        designs={designs.map((d) => d.title)}
      />
      <Toaster />
    </div>
  );
}
