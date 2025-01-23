import { useState, useEffect, useRef, useCallback } from "react";
import supabase from "@/utils/supabase";
import { Button } from "@/components/ui";
import PartySelectorFast from "@/components/custom/PartySelectorFast";
import DesignSelectorFast from "@/components/custom/DesignSelectorFast";
import ShadeSelectorFast from "@/components/custom/ShadeSelectorFast";

interface Party {
  id: number;
  name: string;
}

function FastOrderForm() {
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
  const fetchPartyOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("party_profiles")
        .select("id, name")
        .order("name");

      if (error) throw error;

      setPartyOptions(data);
    } catch (error) {
      console.error("Error fetching party options:", error);
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

  useEffect(() => {
    fetchPartyOptions();
    fetchDesigns();
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
    />,
    <ShadeSelectorFast
      currentJSON={currentJSON}
      setCurrentJSON={setCurrentJSON}
      currentSelectedDesign={currentSelectedDesign}
    />,
    <div>Section 4 Content</div>,
    <div>Section 5 Content</div>,
  ];
  const handleNext = useCallback(() => {
    if (currentSection < 4) {
      setCurrentSection(currentSection + 1);
    }
  }, [currentSection]);

  const handleBack = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleNextRef = useRef(handleNext);

  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  useEffect(() => {
    if (selectedBillTo !== null) {
      handleNextRef.current();
    }
  }, [selectedBillTo]);

  useEffect(() => {
    if (currentSelectedDesign !== null) {
      handleNextRef.current();
    }
  }, [currentSelectedDesign]);

  return (
    <div>
      <div className="flex flex-col justify-center items-center">
        <h1 className="text-2xl font-bold">Fast Order Form</h1>
        <h3>
          {partyOptions.find((party) => party.id === selectedBillTo)?.name ||
            "No party selected"}
        </h3>
        {sections[currentSection]}
      </div>
      <div className="flex justify-around">
        <Button className="" onClick={handleBack}>
          Back
        </Button>
        <Button className="" onClick={handleNext}>
          Next
        </Button>
      </div>
    </div>
  );
}

export default FastOrderForm;
