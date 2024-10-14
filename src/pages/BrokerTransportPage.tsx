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

interface Profile {
  id: number;
  name: string;
}

interface Design {
  id: number;
  title: string;
}

export default function BrokerTransportPage() {
  const [brokers, setBrokers] = useState<Profile[]>([]);
  const [transports, setTransports] = useState<Profile[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [newBroker, setNewBroker] = useState("");
  const [newTransport, setNewTransport] = useState("");
  const [newDesign, setNewDesign] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchBrokers();
    fetchTransports();
    fetchDesigns();
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

  const addBroker = async () => {
    if (newBroker.trim()) {
      const { data, error } = await supabase
        .from("brokers")
        .insert({ name: newBroker.trim().toUpperCase() }) // Convert to uppercase
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
        .insert({ name: newTransport.trim().toUpperCase() }) // Convert to uppercase
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

  const addDesign = async () => {
    if (newDesign.trim()) {
      const { data, error } = await supabase
        .from("designs")
        .insert({ title: newDesign.trim().toUpperCase() }) // Convert to uppercase
        .select();
      if (error) {
        toast({
          title: "Error",
          description: "Failed to add design",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Design "${data[0].title}" added successfully`,
        });
        setNewDesign("");
        fetchDesigns();
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
    const { error } = await supabase.from("transport_profiles").delete().eq("id", id);
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
                    <li key={broker.id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                      <span>{broker.name}</span>
                      <Button onClick={() => deleteBroker(broker.id)} variant="destructive" size="sm">Delete</Button>
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
                    <li key={transport.id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                      <span>{transport.name}</span>
                      <Button onClick={() => deleteTransport(transport.id)} variant="destructive" size="sm">Delete</Button>
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
              <Input
                id="newDesign"
                value={newDesign}
                onChange={(e) => setNewDesign(e.target.value)}
                placeholder="Enter design title"
              />
              <Button onClick={addDesign}>Add</Button>
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="designs">
              <AccordionTrigger>Existing Designs</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2">
                  {designs.map((design) => (
                    <li key={design.id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                      <span>{design.title}</span>
                      <Button onClick={() => deleteDesign(design.id)} variant="destructive" size="sm">Delete</Button>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
