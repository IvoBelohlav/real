'use client';

import React, { useState, useEffect, FormEvent, KeyboardEvent } from 'react';
import { WidgetFAQItem, WidgetFAQCreate } from '@/types';
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // Import LoadingSpinner
import { Tag, X, Save } from 'lucide-react'; // Import icons

interface EditWidgetFAQFormProps {
  faq: WidgetFAQItem; // The FAQ item being edited
  onSubmit: (data: WidgetFAQCreate) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// Simple Tag Input Component (Copied from AddWidgetFAQForm for consistency)
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
      {/* Apply dark theme label style */}
      <label htmlFor={inputId} className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
      {/* Apply dark theme input container style */}
      <div className="flex items-center border border-border rounded-md shadow-sm focus-within:ring-1 focus-within:ring-ring focus-within:border-primary bg-input">
        <div className="flex flex-wrap gap-1 p-2 flex-grow rounded-l-md">
            {tags.map((tag, index) => (
              // Apply dark theme tag style
              <span key={index} className="flex items-center bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5 rounded-full border border-primary/30">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  // Apply dark theme tag remove button style
                  className="ml-1.5 text-primary/70 hover:text-primary focus:outline-none"
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
              // Apply dark theme tag input style
              className="flex-grow p-1 border-none focus:ring-0 focus:outline-none text-sm min-w-[100px] bg-transparent text-foreground placeholder-muted-foreground"
            />
        </div>
         <button
            type="button"
            onClick={addTag}
            // Apply dark theme tag add button style
            className="px-3 py-2 text-muted-foreground hover:text-primary focus:outline-none border-l border-border bg-input rounded-r-md"
            aria-label={`Add ${label} tag`}
         >
            <Tag size={16} />
         </button>
      </div>
      {/* Apply dark theme helper text style */}
      {helperText && <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
};

// Main Edit FAQ Form Component
const EditWidgetFAQForm: React.FC<EditWidgetFAQFormProps> = ({ faq, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState<WidgetFAQCreate>({
    question: '',
    answer: '',
    keywords: [],
    category: '',
    language: 'cs',
    show_in_widget: true,
    widget_order: 0,
    active: true,
  });

  // Populate form with existing FAQ data when the component mounts or faq prop changes
  useEffect(() => {
    if (faq) {
      setFormData({
        question: faq.question || '',
        answer: faq.answer || '',
        keywords: faq.keywords || [],
        category: faq.category || '',
        language: faq.language || 'cs',
        show_in_widget: faq.show_in_widget ?? true,
        widget_order: faq.widget_order || 0,
        active: faq.active ?? true,
      });
    }
  }, [faq]);

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
        {/* Apply dark theme label style */}
        <label htmlFor="edit-question" className="block text-sm font-medium text-muted-foreground">Question *</label>
        {/* Apply dark theme input style */}
        <input
          type="text"
          name="question"
          id="edit-question"
          value={formData.question}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-primary sm:text-sm bg-input text-foreground placeholder-muted-foreground"
        />
      </div>

      <div>
        {/* Apply dark theme label style */}
        <label htmlFor="edit-answer" className="block text-sm font-medium text-muted-foreground">Answer *</label>
        {/* Apply dark theme textarea style */}
        <textarea
          name="answer"
          id="edit-answer"
          rows={4}
          value={formData.answer}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-primary sm:text-sm bg-input text-foreground placeholder-muted-foreground"
        />
      </div>

      {/* Use TagInput for Keywords (already styled internally) */}
      <TagInput
        label="Keywords"
        tags={formData.keywords || []}
        setTags={setKeywords}
        placeholder="Add keyword..."
        helperText="Keywords help the AI find this FAQ."
        idSuffix="edit-faq-keywords"
      />

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                {/* Apply dark theme label style */}
                <label htmlFor="edit-category" className="block text-sm font-medium text-muted-foreground">Category</label>
                {/* Apply dark theme input style */}
                <input
                type="text"
                name="category"
                id="edit-category"
                value={formData.category || ''}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-primary sm:text-sm bg-input text-foreground placeholder-muted-foreground"
                />
            </div>
            <div>
                {/* Apply dark theme label style */}
                <label htmlFor="edit-language" className="block text-sm font-medium text-muted-foreground">Language</label>
                {/* Apply dark theme select style */}
                <select
                    name="language"
                    id="edit-language"
                    value={formData.language}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-border bg-input rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-primary sm:text-sm text-foreground"
                >
                    <option value="cs">Czech (cs)</option>
                    <option value="en">English (en)</option>
                    {/* Add other languages as needed */}
                </select>
            </div>
       </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
                {/* Apply dark theme label style */}
                <label htmlFor="edit-widget_order" className="block text-sm font-medium text-muted-foreground">Widget Order</label>
                {/* Apply dark theme input style */}
                <input
                type="number"
                name="widget_order"
                id="edit-widget_order"
                value={formData.widget_order || ''} // Show empty instead of 0 if null/0
                onChange={handleChange}
                placeholder="Lower number = higher priority"
                className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-primary sm:text-sm bg-input text-foreground placeholder-muted-foreground"
                />
            </div>
            {/* Apply dark theme checkbox styles */}
            <div className="flex items-center pt-6 space-x-4">
                 <div className="flex items-center">
                    <input
                        id="edit-show_in_widget"
                        name="show_in_widget"
                        type="checkbox"
                        checked={formData.show_in_widget}
                        onChange={handleChange}
                        className="focus:ring-primary h-4 w-4 text-primary border-border rounded bg-input"
                    />
                    <label htmlFor="edit-show_in_widget" className="ml-2 block text-sm text-muted-foreground">Show in Widget</label>
                 </div>
                 <div className="flex items-center">
                     <input
                        id="edit-active"
                        name="active"
                        type="checkbox"
                        checked={formData.active}
                        onChange={handleChange}
                        className="focus:ring-primary h-4 w-4 text-primary border-border rounded bg-input"
                    />
                    <label htmlFor="edit-active" className="ml-2 block text-sm text-muted-foreground">Active</label>
                 </div>
            </div>
        </div>

      {/* Apply dark theme styles to buttons and border */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-muted text-sm font-medium disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-primary border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 flex items-center justify-center min-w-[120px]" // Adjusted min-width
        >
          {isLoading ? <LoadingSpinner /> : (
              <>
                <Save size={16} className="mr-1" /> {/* Save icon */}
                Save Changes
              </>
          )}
        </button>
      </div>
    </form>
  );
};

export default EditWidgetFAQForm;
