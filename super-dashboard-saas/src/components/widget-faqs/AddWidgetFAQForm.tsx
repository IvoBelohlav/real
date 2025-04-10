'use client';

import React, { useState, FormEvent } from 'react'; // Removed KeyboardEvent
import { WidgetFAQCreate } from '@/types';
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // Import LoadingSpinner
import { Plus } from 'lucide-react'; // Removed Tag, X

interface AddWidgetFAQFormProps {
  onSubmit: (data: WidgetFAQCreate) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// Main Add FAQ Form Component
const AddWidgetFAQForm: React.FC<AddWidgetFAQFormProps> = ({ onSubmit, onCancel, isLoading }) => {
  // Removed keywords, category, language, show_in_widget, active from initial state
  const [formData, setFormData] = useState<Omit<WidgetFAQCreate, 'keywords' | 'category' | 'language' | 'show_in_widget' | 'active'>>({
    question: '',
    answer: '',
    widget_order: 0, // Default order
  });

  // Adjusted handleChange to exclude checkbox handling for removed fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    setFormData(prev => ({
      ...prev,
      // Ensure widget_order is handled as a number
      [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
    }));
  };

  // Removed setKeywords function

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Prepare data for submission, adding back default/fixed values for removed fields if needed by the API
    // Assuming the API expects these fields, we set defaults here. Adjust if API handles missing fields.
    const dataToSubmit: WidgetFAQCreate = {
        ...formData,
        keywords: [], // Default empty array
        category: '', // Default empty string
        language: 'cs', // Default language or adjust as needed
        show_in_widget: true, // Default value
        active: true, // Default value
        widget_order: formData.widget_order === 0 ? null : formData.widget_order // Treat 0 as null if desired
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

      {/* Keywords, Category, Language, Show in Widget, Active fields removed */}

        {/* Widget Order - now takes full width */}
        <div className="grid grid-cols-1 gap-4 items-center">
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
            {/* Removed Show in Widget and Active checkboxes container */}
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
