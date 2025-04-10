import React, { useState } from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/20/solid'; // Using Heroicons

interface EditableListInputProps {
  id: string;
  label: string;
  value: string[]; // Expecting an array of strings
  onChange: (newValue: string[]) => void; // Callback with the updated array
  placeholder?: string;
  className?: string;
  required?: boolean; // Add required prop if needed for the label
}

const EditableListInput: React.FC<EditableListInputProps> = ({
  id,
  label,
  value = [], // Default to empty array
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
    // Add item if it's not empty and not already in the list (case-insensitive check)
    if (trimmedValue && !value.some(item => item.toLowerCase() === trimmedValue.toLowerCase())) {
      onChange([...value, trimmedValue]);
      setInputValue(''); // Clear input after adding
    } else if (!trimmedValue) {
      // Optional: Add feedback if input is empty
      console.warn('Input cannot be empty.');
    } else {
      // Optional: Add feedback if item already exists
      console.warn(`Item "${trimmedValue}" already exists.`);
    }
  };

  const handleRemoveItem = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission on Enter key
      handleAddItem();
    }
  };

  return (
    <div className={className}>
      <label htmlFor={`${id}-input`} className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && '*'}
      </label>
      <div className="flex items-center space-x-2 mb-2">
        <input
          type="text"
          id={`${id}-input`} // Unique ID for the input
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown} // Add item on Enter key
          placeholder={placeholder}
          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md px-3 py-2 border flex-grow"
        />
        <button
          type="button"
          onClick={handleAddItem}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          aria-label={`Add ${label} item`}
        >
          <PlusIcon className="h-5 w-5" aria-hidden="true" />
          <span className="ml-1 hidden sm:inline">Add</span>
        </button>
      </div>
      {value.length > 0 && (
        <ul className="mt-2 space-y-1 list-none p-0">
          {value.map((item, index) => (
            <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200 text-sm">
              <span className="text-gray-800 break-all">{item}</span>
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className="ml-2 p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                aria-label={`Remove ${item}`}
              >
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
       {value.length === 0 && (
         <p className="text-xs text-gray-500 mt-1">No items added yet.</p>
       )}
    </div>
  );
};

export default EditableListInput;
