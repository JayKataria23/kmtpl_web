import { useState, useEffect, useRef, useCallback } from "react";
import supabase from "@/utils/supabase";
import { Button } from "@/components/ui";
import PartySelectorFast from "@/components/custom/PartySelectorFast";
import DesignSelectorFast from "@/components/custom/DesignSelectorFast";
import ShadeSelectorFast from "@/components/custom/ShadeSelectorFast";
import SavedDesignsFast from "@/components/custom/SavedDesignsFast";
import OrderDetailsSection from "@/components/custom/OrderDetailsSection";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/clerk-react";

interface Party {
  id: number;
  name: string;
  delivery_id: number | null;
  broker_id: number | null;
  transport_id: number | null;
}

interface DesignEntry {
  id: string;
  design: string;
  price: string;
  remark: string;
  shades: { [key: string]: string }[];
}

interface PriceEntry {
  design: string;
  price: string;
}

function FastOrderForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();
  const userName = user?.fullName || user?.firstName || "Unknown User";

  const [partyOptions, setPartyOptions] = useState<Party[]>([]);
  const [designs, setDesigns] = useState<string[]>([]);
  const [currentSection, setCurrentSection] = useState(0);
  const [selectedBillTo, setSelectedBillTo] = useState<number | null>(null);
  const [currentSelectedDesign, setCurrentSelectedDesign] = useState<
    string | null
  >(null);
  const [currentJSON, setCurrentJSON] = useState<{ [key: string]: string }[]>(
    []
  );
  const [designEntries, setDesignEntries] = useState<DesignEntry[]>([]);
  const [priceList, setPriceList] = useState<PriceEntry[]>([]);
  const [selectedShipTo, setSelectedShipTo] = useState<number | null>(null);
  const [selectedBroker, setSelectedBroker] = useState<number | null>(null);
  const [selectedTransport, setSelectedTransport] = useState<number | null>(
    null
  );
  const [orderNo, setOrderNo] = useState<string>("");
  const [orderDate, setOrderDate] = useState<Date>(new Date());
  const [transportOptions, setTransportOptions] = useState<
    {
      id: number;
      name: string;
    }[]
  >([]);
  const [brokerOptions, setBrokerOptions] = useState<
    {
      id: number;
      name: string;
    }[]
  >([]);

  const fetchPartyOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("party_profiles")
        .select("id, name, delivery_id, broker_id, transport_id")
        .order("name");

      if (error) throw error;

      setPartyOptions(data);
    } catch (error) {
      console.error("Error fetching party options:", error);
      // Optionally, you can show an error message to the user
    }
  };
  const generateUniqueOrderNo = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("order_no")
        .order("order_no", { ascending: false })
        .limit(1);

      if (error) throw error;
      const lastOrderNo = data.length > 0 ? parseInt(data[0].order_no) : 0;
      const newOrderNo = (lastOrderNo + 1).toString();
      setOrderNo(newOrderNo);
    } catch (error) {
      console.error("Error generating unique order number:", error);
    }
  };

  const fetchDesigns = async () => {
    try {
      const { data, error } = await supabase
        .from("designs")
        .select("title")
        .order("title");

      if (error) throw error;

      const designTitles = data.map((design) => design.title);
      setDesigns(designTitles);
    } catch (error) {
      console.error("Error fetching designs:", error);
      // Optionally, you can show an error message to the user
    }
  };

  const fetchPriceList = async (partyId: number) => {
    const { data, error } = await supabase.rpc(
      "get_latest_design_prices_by_party",
      {
        partyid: partyId,
      }
    );

    if (error) throw error;
    setPriceList(data);
  };

  const fetchTransportOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("transport_profiles")
        .select("id, name")
        .order("name");

      if (error) throw error;

      setTransportOptions(data);
    } catch (error) {
      console.error("Error fetching transport options:", error);
      // Optionally, you can show an error message to the user
    }
  };

  const fetchBrokers = async () => {
    try {
      const { data, error } = await supabase
        .from("brokers")
        .select("id, name")
        .order("name");

      if (error) throw error;

      setBrokerOptions(data);
    } catch (error) {
      console.error("Error fetching brokers:", error);
      // Optionally, you can show an error message to the user
    }
  };

  useEffect(() => {
    fetchPartyOptions();
    fetchDesigns();
    generateUniqueOrderNo();
    fetchTransportOptions();
    fetchBrokers();
  }, []);

  const sections = [
    <PartySelectorFast
      partyOptions={partyOptions}
      selectedBillTo={selectedBillTo}
      setSelectedBillTo={setSelectedBillTo}
    />,
    <DesignSelectorFast
      designs={designs}
      currentSelectedDesign={currentSelectedDesign}
      setCurrentSelectedDesign={setCurrentSelectedDesign}
      setDesigns={setDesigns}
    />,
    <ShadeSelectorFast
      currentJSON={currentJSON}
      setCurrentJSON={setCurrentJSON}
      currentSelectedDesign={currentSelectedDesign}
    />,
    <SavedDesignsFast
      designEntries={designEntries}
      setDesignEntries={setDesignEntries}
    />,
    <OrderDetailsSection
      orderNo={orderNo}
      setOrderNo={setOrderNo}
      orderDate={orderDate}
      setOrderDate={setOrderDate}
      selectedBillTo={selectedBillTo}
      setSelectedBillTo={setSelectedBillTo}
      selectedShipTo={selectedShipTo}
      setSelectedShipTo={setSelectedShipTo}
      selectedBroker={selectedBroker}
      setSelectedBroker={setSelectedBroker}
      selectedTransport={selectedTransport}
      setSelectedTransport={setSelectedTransport}
      partyOptions={partyOptions}
      brokerOptions={brokerOptions}
      transportOptions={transportOptions}
    />,
  ];

  const handleNext = useCallback(() => {
    if (currentSection === 2) {
      if (
        currentJSON.every((shade) =>
          Object.values(shade).every((value) => value === "")
        )
      ) {
        if (
          window.confirm(
            "No shades selected. Do you want to proceed without saving?"
          )
        ) {
          setCurrentSelectedDesign(null);
          setCurrentJSON([]);
          setCurrentSection(1);
        }
        return;
      }

      const newEntry: DesignEntry = {
        id: Math.random().toString(36).substr(2, 9),
        design: currentSelectedDesign || "",
        price:
          priceList.find(
        (price) =>
          price.design.split("-")[0] ===
          currentSelectedDesign?.split("-")[0]
          )?.price || "0",
        remark: "",
        shades: currentJSON,
      };

      setDesignEntries((prev) => [...prev, newEntry]);

      setCurrentSelectedDesign(null);
      setCurrentJSON([]);
      setCurrentSection(1);
    } else if (currentSection === 1 && !currentSelectedDesign) {
      setCurrentSection(3);
    } else if (currentSection < 4) {
      setCurrentSection(currentSection + 1);
    }
  }, [currentSection, currentSelectedDesign, currentJSON, priceList]);

  const handleBack = () => {
    if (currentSection === 0) {
      // Redirect to home page
      window.location.href = "/"; // Adjust the path as necessary
    } else if (currentSection === 3) {
      setCurrentSection(1);
    } else if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleNextRef = useRef(handleNext);

  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  useEffect(() => {
    if (selectedBillTo !== null) {
      fetchPriceList(selectedBillTo);
      const selectedParty = partyOptions.find(
        (party) => party.id === selectedBillTo
      );
      if (selectedParty) {
        if (selectedParty.delivery_id) {
          setSelectedShipTo(selectedParty.delivery_id);
        } else {
          setSelectedShipTo(selectedParty.id);
        }
        if (selectedParty.broker_id) {
          setSelectedBroker(selectedParty.broker_id);
        }
        if (selectedParty.transport_id) {
          setSelectedTransport(selectedParty.transport_id);
        }
      }
      handleNextRef.current();
    }
  }, [selectedBillTo, partyOptions]);

  useEffect(() => {
    if (currentSelectedDesign !== null) {
      handleNextRef.current();
    }
  }, [currentSelectedDesign]);

  const handleSave = async () => {
    if (!selectedBillTo) {
      toast({
        title: "Error",
        description: "Bill To is required",
        variant: "destructive",
      });
      return;
    }

    try {
      generateUniqueOrderNo();
      // Insert the order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            order_no: orderNo,
            date: orderDate.toLocaleDateString("en-US", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }),
            bill_to_id: selectedBillTo,
            ship_to_id: selectedShipTo,
            broker_id: selectedBroker,
            transport_id: selectedTransport,
            created_by: userName, // You'll need to add userName state from Clerk
          },
        ])
        .select();

      if (orderError) throw orderError;

      const orderId = orderData[0].id;

      // Insert design entries
      const designEntriesData = designEntries.map((design) => ({
        order_id: orderId,
        design: design.design,
        price: design.price,
        remark: design.remark,
        shades: design.shades,
      }));

      const { error: designEntriesError } = await supabase
        .from("design_entries")
        .insert(designEntriesData);

      if (designEntriesError) throw designEntriesError;

      toast({
        title: "Order Saved",
        description: `Order ${orderNo} has been saved successfully.`,
      });

      // Navigate to preview page
      navigate(`/order-preview/${orderId}`);
    } catch (error) {
      console.error("Error saving order details:", error);
      toast({
        title: "Error",
        description: `There was an error saving the order details: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="">
      <div className="text-center justify-center items-center">
        <h1 className="text-2xl font-bold">Fast Order Form</h1>

        {sections[currentSection]}
      </div>
      <Button className="text-lg p-4 h-20 absolute bottom-0 left-0" onClick={handleBack}>
        Back
      </Button>
      {currentSection === sections.length - 1 ? (
        <Button className="text-lg p-4 h-20 absolute bottom-0 right-0" onClick={handleSave}>
          Save
        </Button>
      ) : (
        <Button className="text-lg p-4 h-20 absolute bottom-0 right-0" onClick={handleNext}>
          Next
        </Button>
      )}
    </div>
  );
}

export default FastOrderForm;
