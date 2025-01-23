import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui";
import PartySelectorFast from "@/components/custom/PartySelectorFast";
import DesignSelectorFast from "@/components/custom/DesignSelectorFast";
import ShadeSelectorFast from "@/components/custom/ShadeSelectorFast";

function FastOrderForm() {
  const [currentSection, setCurrentSection] = useState(0);
  const [selectedBillTo, setSelectedBillTo] = useState<number | null>(null);
  const [currentSelectedDesign, setCurrentSelectedDesign] = useState<
    string | null
  >(null);
  const [currentJSON, setCurrentJSON] = useState<{ [key: string]: string }[]>(
    []
  );
  const sections = [
    <PartySelectorFast
      selectedBillTo={selectedBillTo}
      setSelectedBillTo={setSelectedBillTo}
    />,
    <DesignSelectorFast
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

  return (
    <div>
      <div className="flex flex-col justify-center items-center">
        <h1 className="text-2xl font-bold">Fast Order Form</h1>

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
