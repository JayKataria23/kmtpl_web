import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui";
import PartySelectorFast from "@/components/custom/PartySelectorFast";
import DesignSelectorFast from "@/components/custom/DesignSelectorFast";

function FastOrderForm() {
  const [currentSection, setCurrentSection] = useState(0);
  const [selectedBillTo, setSelectedBillTo] = useState<number | null>(null);
  const [currentSelectedDesign, setCurrentSelectedDesign] = useState<
    string | null
  >(null);
  const sections = [
    <PartySelectorFast
      selectedBillTo={selectedBillTo}
      setSelectedBillTo={setSelectedBillTo}
    />,
    <DesignSelectorFast
      currentSelectedDesign={currentSelectedDesign}
      setCurrentSelectedDesign={setCurrentSelectedDesign}
    />,
    <div>Section 3 Content</div>,
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
    <div className="w-[100%] h-[100vh] ">
      <div className="h-[85%] flex flex-col justify-center items-center">
        <h1 className="text-2xl font-bold">Fast Order Form</h1>

        {sections[currentSection]}
      </div>
      <div className="h-[15%] flex justify-around">
        <Button className="w-[45%] h-[45%]" onClick={handleBack}>
          Back
        </Button>
        <Button className="w-[45%] h-[45%]" onClick={handleNext}>
          Next
        </Button>
      </div>
    </div>
  );
}

export default FastOrderForm;
