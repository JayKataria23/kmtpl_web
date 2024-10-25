import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import supabase from "@/utils/supabase";

interface InputWithAutocompleteProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: number; name: string }[];
  placeholder: string;
  label: string;
  className?: string;
}

const InputWithAutocomplete: React.FC<InputWithAutocompleteProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder,
  label,
  className,
}) => {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleClear = () => {
    setInputValue("");
    onChange("");
  };

  const addNewField = async (field: string, value: string) => {
    if (field === "Broker") {
      const { error } = await supabase
        .from("brokers")
        .insert({ name: value.trim().toUpperCase() }) // Convert to uppercase
        .select();
      if (error) {
        console.error("Error adding broker:", error);
      } else {
        console.log("Broker added:", value.trim().toUpperCase());
      }
    } else if (field === "Transport") {
      const { error } = await supabase
        .from("transport_profiles")
        .insert({ name: value.trim().toUpperCase() }) // Convert to uppercase
        .select();
      if (error) {
        console.error("Error adding transport:", error);
      } else {
        console.log("Transport added:", value.trim().toUpperCase());
      }
    } else if (field === "Ship To" || field === "Bill To") {
      const { error } = await supabase.from("party_profiles").insert({
        name: value.trim().toUpperCase(),
      });
      if (error) {
        console.error(`Error adding ${field}:`, error);
      } else {
        console.log(`${field} added:`, value.trim().toUpperCase());
      }
    } else {
      console.log("Unknown field", field);
    }
  };

  return (
    <div className={`relative ${className} `}>
      <div className="flex items-center">
        <Input
          id={id}
        value={inputValue}
        onChange={handleInputChange}
        list={`${id}-options`}
        placeholder={placeholder}
        aria-label={label}
        />  
        <Button
          type="button"
        variant="ghost"
        size="icon"
        className=""
        onClick={handleClear}
      >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <datalist id={`${id}-options`}>
        {options.map((option) => (
          <option key={option.id} value={option.name} />
        ))}
      </datalist>
      {label === "Broker" || label === "Transport" || label === "Ship To" || label === "Bill To" ? (
        <div className="flex justify-end pr-10"> {/* Added a div to center the button */}
          <Button
            size="sm"
          className="mt-2 ml-2"
          onClick={() => addNewField(label, inputValue)}
        >
          Add New {label}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default InputWithAutocomplete;
