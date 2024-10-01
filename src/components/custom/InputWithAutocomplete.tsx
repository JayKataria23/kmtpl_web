import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  return (
    <div className={`relative ${className}`}>
      <Input
        id={id}
        value={inputValue}
        onChange={handleInputChange}
        list={`${id}-options`}
        placeholder={placeholder}
        aria-label={label}
        className="pr-8"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 -translate-y-1/2"
        onClick={handleClear}
      >
        <X className="h-4 w-4" />
      </Button>
      <datalist id={`${id}-options`}>
        {options.map((option) => (
          <option key={option.id} value={option.name} />
        ))}
      </datalist>
    </div>
  );
};

export default InputWithAutocomplete;
