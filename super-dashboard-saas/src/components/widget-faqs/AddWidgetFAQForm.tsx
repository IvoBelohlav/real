'use client';

import React, { useState, FormEvent, KeyboardEvent } from 'react';
import { WidgetFAQCreate } from '@/types';
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // Import LoadingSpinner
import { Tag, X, Plus } from 'lucide-react'; // Import icons

interface AddWidgetFAQFormProps {
  onSubmit: (data: WidgetFAQCreate) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// Simple Tag Input Component (Copied from BusinessTypeForm for now)
const TagInput: React.FC<{
  label: string;
  tags: string[];
  setTags: (tags: string[]) => void;
  placeholder?: string;
  helperText?: string;
  idSuffix?: string;
}> = ({ label, tags, setTags, placeholder = "Add item...", helperText, idSuffix = label.toLowerCase().replace(/\s+/g, '-') }) => {
  const [inputValue, setInputValue] = useState('');
  const inputId = `tag-input-${idSuffix}`;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const addTag = () => {
      if (inputValue.trim()) {
          if (!tags.includes(inputValue.trim())) {
              setTags([...tags, inputValue.trim()]);
          }
          setInputValue('');
      }
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (indexToRemove: number) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="mb-4">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center border border-gray-300 rounded-md shadow-sm focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500">
        <div className="flex flex-wrap gap-1 p-2 flex-grow bg-white rounded-l-md">
            {tags.map((tag, index) => (
              <span key={index} className="flex items-center bg-indigo-100 text-indigo-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="ml-1.5 text-indigo-500 hover:text-indigo-700 focus:outline-none"
                  aria-label={`Remove ${tag}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <input
              id={inputId}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder={placeholder}
              className="flex-grow p-1 border-none focus:ring-0 focus:outline-none text-sm min-w-[100px]"
            />
        </div>
         <button
            type="button"
            onClick={addTag}
            className="px-3 py-2 text-gray-500 hover:text-indigo-600 focus:outline-none border-l border-gray-300 bg-gray-50 rounded-r-md"
            aria-label={`Add ${label} tag`}
         >
            <Tag size={16} />
         </button>
      </div>
      {helperText && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
    </div>
  );
};


// Main Add FAQ Form Component
const AddWidgetFAQForm: React.FC<AddWidgetFAQFormProps> = ({ onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState<WidgetFAQCreate>({
    question: '',
    answer: '',
    keywords: [],
    category: '',
    language: 'cs', // Default language
    show_in_widget: true,
    widget_order: 0, // Default order
    active: true, // Default active
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value, 10) || 0 : value,
    }));
  };

  // Keywords are now handled by TagInput's setTags prop
  const setKeywords = (newKeywords: string[]) => {
      setFormData(prev => ({ ...prev, keywords: newKeywords }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure widget_order is a number or null if empty/invalid
    const dataToSubmit = {
        ...formData,
        widget_order: formData.widget_order === 0 ? null : formData.widget_order // Treat 0 as null if desired, or keep 0
    };
    onSubmit(dataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="question" className="block text-sm font-medium text-gray-700">Question *</label>
        <input
          type="text"
          name="question"
          id="question"
          value={formData.question}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="answer" className="block text-sm font-medium text-gray-700">Answer *</label>
        <textarea
          name="answer"
          id="answer"
          rows={4}
          value={formData.answer}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      {/* Use TagInput for Keywords */}
      <TagInput
        label="Keywords"
        tags={formData.keywords || []}
        setTags={setKeywords}
        placeholder="Add keyword..."
        helperText="Keywords help the AI find this FAQ."
        idSuffix="faq-keywords"
      />

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                <input
                type="text"
                name="category"
                id="category"
                value={formData.category || ''}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
            </div>
            <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700">Language</label>
                <select
                    name="language"
                    id="language"
                    value={formData.language}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                    <option value="cs">Czech (cs)</option>
                    <option value="en">English (en)</option>
                    {/* Add other languages as needed */}
                </select>
            </div>
       </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
                <label htmlFor="widget_order" className="block text-sm font-medium text-gray-700">Widget Order</label>
                <input
                type="number"
                name="widget_order"
                id="widget_order"
                value={formData.widget_order || ''} // Show empty instead of 0 if null/0
                onChange={handleChange}
                placeholder="Lower number = higher priority"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
            </div>
            <div className="flex items-center pt-6 space-x-4">
                 <div className="flex items-center">
                    <input
                        id="show_in_widget"
                        name="show_in_widget"
                        type="checkbox"
                        checked={formData.show_in_widget}
                        onChange={handleChange}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                    <label htmlFor="show_in_widget" className="ml-2 block text-sm text-gray-900">Show in Widget</label>
                 </div>
                 <div className="flex items-center">
                     <input
                        id="active"
                        name="active"
                        type="checkbox"
                        checked={formData.active}
                        onChange={handleChange}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                    <label htmlFor="active" className="ml-2 block text-sm text-gray-900">Active</label>
                 </div>
            </div>
        </div>


      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center justify-center min-w-[100px]"
        >
          {isLoading ? <LoadingSpinner /> : (
              <>
                <Plus size={16} className="mr-1" />
                Add FAQ
              </>
          )}
        </button>
      </div>
    </form>
  );
};

export default AddWidgetFAQForm;
