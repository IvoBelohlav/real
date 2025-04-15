import React, { useState } from 'react';
import { X, Plus } from 'lucide-react'; // Using lucide-react icons

interface EditableListInputProps {
  id: string;
  label: string;
  value: string[];
  onChange: (newValue: string[]) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const EditableListInput: React.FC<EditableListInputProps> = ({
  id,
  label,
  value = [],
  onChange,
  placeholder = 'Enter item...',
  className = 'sm:col-span-6',
  required = false,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleAddItem = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !value.some(item => item.toLowerCase() === trimmedValue.toLowerCase())) {
      onChange([...value, trimmedValue]);
      setInputValue('');
    } else if (!trimmedValue) {
      console.warn('Input cannot be empty.');
    } else {
      console.warn(`Item "${trimmedValue}" already exists.`);
    }
  };

  const handleRemoveItem = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  return (
    <div className={className}>
      {/* Apply dark theme label style */}
      <label htmlFor={`${id}-input`} className="block text-sm font-medium text-muted-foreground mb-1">
        {label}{required && <span className="text-destructive">*</span>} {/* Use destructive color for required */}
      </label>
      <div className="flex items-center space-x-2 mb-2">
        {/* Apply dark theme input style */}
        <input
          type="text"
          id={`${id}-input`}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-grow block w-full bg-input border border-border rounded-md shadow-sm py-2 px-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
        />
        {/* Apply dark theme primary button style */}
        <button
          type="button"
          onClick={handleAddItem}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-ring"
          aria-label={`Add ${label} item`}
        >
          <Plus size={18} className="-ml-0.5 mr-1 h-5 w-5 sm:mr-0" aria-hidden="true" />
          <span className="hidden sm:inline">Add</span> {/* Keep Add text */}
        </button>
      </div>
      {value.length > 0 && (
        // Use standard list spacing
        <ul className="mt-2 space-y-2 list-none p-0"> {/* Increased space-y */}
          {value.map((item, index) => (
            // Apply dark theme list item style (e.g., muted background)
            <li key={index} className="flex items-center justify-between bg-muted p-2 rounded border border-border text-sm">
              {/* Apply dark theme text style */}
              <span className="text-foreground break-all">{item}</span>
              {/* Apply dark theme remove button style (destructive hover) */}
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className="ml-2 p-1 text-muted-foreground hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive rounded"
                aria-label={`Remove ${item}`}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
       {value.length === 0 && (
         // Apply dark theme muted text style
         <p className="text-xs text-muted-foreground mt-1 italic">No items added yet.</p>
       )}
    </div>
  );
};

export default EditableListInput;
