import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui";

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

  return (
    <div className={className}>
      <Input
        id={id}
        value={inputValue}
        onChange={handleInputChange}
        list={`${id}-options`}
        placeholder={placeholder}
        aria-label={label}
      />
      <datalist id={`${id}-options`}>
        {options.map((option) => (
          <option key={option.id} value={option.name} />
        ))}
      </datalist>
    </div>
  );
};

export default InputWithAutocomplete;
