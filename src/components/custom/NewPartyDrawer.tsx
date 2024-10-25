import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
  Toaster,
} from "@/components/ui";
import { Button } from "@/components/ui";
import { Label, Input, Textarea } from "@/components/ui";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/utils/supabase";
import { useState } from "react";

function NewPartyDrawer({
  brokerOptions,
  transportOptions,
  isOpen,
  setIsOpen,
}: {
  brokerOptions: { id: number; name: string }[];
  transportOptions: { id: number; name: string }[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  // State variables for all inputs
  const [partyName, setPartyName] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [broker, setBroker] = useState("");
  const [transport, setTransport] = useState("");
  const [gstin, setGstin] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const { toast } = useToast();
  // Function to handle adding a new party
  const handleSubmit = async () => {
    if (!partyName.trim()) {
      // Check if partyName is null or empty
      toast({
        title: "Error",
        description: "Party Name cannot be empty",
        variant: "destructive",
      });
      return; // Exit the function if validation fails
    }
    // Check if the broker exists in the options, if not, add it
    const brokerId = brokerOptions.find((b) => b.name === broker)?.id || null;
    const newBrokerId =
      brokerId || (broker.trim() ? await addBrokerAndGetId(broker) : null);

    // Check if the transport exists in the options, if not, add it
    const transportId =
      transportOptions.find((t) => t.name === transport)?.id || null;
    const newTransportId =
      transportId ||
      (transport.trim() ? await addTransportAndGetId(transport) : null);

    const { error } = await supabase.from("party_profiles").insert({
      name: partyName.toUpperCase(), // Convert name to uppercase
      gstin: gstin || null,
      address: partyAddress || null,
      contact_number: contactNumber || null,
      broker_id: newBrokerId,
      transport_id: newTransportId,
      pincode: pincode || null,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add new party",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "New party added successfully",
      });
      // Clear input fields after successful submission
      setPartyName("");
      setPartyAddress("");
      setPincode("");
      setBroker("");
      setTransport("");
      setGstin("");
      setContactNumber("");
      setIsOpen(false); // Close the drawer after successful submission
    }
  };

  // New function to add broker and return its ID
  const addBrokerAndGetId = async (brokerName: string) => {
    const { data, error } = await supabase
      .from("brokers")
      .insert({ name: brokerName.trim().toUpperCase() }) // Convert to uppercase
      .select();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to add broker",
        variant: "destructive",
      });
      return null;
    }
    return data[0]?.id; // Return the new broker's ID
  };

  // New function to add transport and return its ID
  const addTransportAndGetId = async (transportName: string) => {
    const { data, error } = await supabase
      .from("transport_profiles")
      .insert({ name: transportName.trim().toUpperCase() }) // Convert to uppercase
      .select();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to add transport",
        variant: "destructive",
      });
      return null;
    }
    return data[0]?.id; // Return the new transport's ID
  };

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
      }}
    >
      <DrawerTrigger asChild>
        <Button className="w-fit">New Party</Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>New Party</DrawerTitle>
            <DrawerDescription>Add a new party to the system</DrawerDescription>
          </DrawerHeader>
          <Label>Party Name</Label>
          <div className="flex items-center">
            <Input
              id="partyName"
              placeholder="Enter Party Name"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value.toUpperCase())}
            />
            <Button
              onClick={() => setPartyName("")}
              variant="outline"
              className="ml-2"
            >
              ✖
            </Button>
          </div>
          <Label>Party Address</Label>
          <div className="flex items-center">
            <Textarea
              id="partyAddress"
              placeholder="Enter Party Address"
              value={partyAddress}
              onChange={(e) => setPartyAddress(e.target.value.toUpperCase())}
            />
            <Button
              onClick={() => setPartyAddress("")}
              variant="outline"
              className="ml-2"
            >
              ✖
            </Button>
          </div>
          <Label>Pincode</Label>
          <div className="flex items-center">
            <Input
              id="pincode"
              placeholder="Enter Pincode"
              value={pincode}
              type="number"
              onChange={(e) => setPincode(e.target.value)}
            />
            <Button
              onClick={() => setPincode("")}
              variant="outline"
              className="ml-2"
            >
              ✖
            </Button>
          </div>
          <Label>Broker</Label>
          <div className="flex items-center">
            <Input
              id="broker"
              placeholder="Enter Broker"
              value={broker}
              onChange={(e) => setBroker(e.target.value.toUpperCase())}
            />
            <Button
              onClick={() => setBroker("")}
              variant="outline"
              className="ml-2"
            >
              ✖
            </Button>
          </div>
          <datalist id="broker-options">
            {brokerOptions.map((option) => (
              <option key={option.id} value={option.name} />
            ))}
          </datalist>
          <Label>Transport</Label>
          <div className="flex items-center">
            <Input
              id="transport"
              placeholder="Enter Transport"
              value={transport}
              onChange={(e) => setTransport(e.target.value.toUpperCase())}
            />
            <Button
              onClick={() => setTransport("")}
              variant="outline"
              className="ml-2"
            >
              ✖
            </Button>
          </div>
          <datalist id="transport-options">
            {transportOptions.map((option) => (
              <option key={option.id} value={option.name} />
            ))}
          </datalist>
          <Label>GSTIN</Label>
          <div className="flex items-center">
            <Input
              id="gstin"
              placeholder="Enter GSTIN"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
            />

            <Button
              onClick={() => setTransport("")}
              variant="outline"
              className="ml-2"
            >
              ✖
            </Button>
          </div>
          <Label>Contact Number</Label>
          <div className="flex items-center">
            <Input
              id="contactNumber"
              placeholder="Enter Contact Number"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value.toUpperCase())}
            />
            <Button
              onClick={() => setContactNumber("")}
              variant="outline"
              className="ml-2"
            >
              ✖
            </Button>
          </div>
          <DrawerFooter>
            <Button onClick={handleSubmit}>Submit</Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>

      <Toaster />
    </Drawer>
  );
}

export default NewPartyDrawer;
