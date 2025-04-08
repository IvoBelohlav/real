'use client';

import React, { useState, useEffect, FormEvent, KeyboardEvent } from 'react';
import { BusinessType, BusinessTypeCreateUpdate } from '@/types';
import { fetchApi } from '@/lib/api'; // Import fetchApi
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Tag, X, Sparkles, Plus, Save } from 'lucide-react'; // Added Save icon
import { toast } from 'react-toastify';

interface BusinessTypeFormProps {
  businessType?: BusinessType | null; // Data for editing, null for adding
  onSubmit: (data: BusinessTypeCreateUpdate, id?: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

// Helper to safely parse JSON, returning default value on error
const safeJsonParse = (jsonString: string | undefined | null, defaultValue: any): any => {
    if (!jsonString) return defaultValue;
    try {
        const parsed = JSON.parse(jsonString);
        // Basic type check if default value provides a hint
        if (Array.isArray(defaultValue) && !Array.isArray(parsed)) return defaultValue;
        if (typeof defaultValue === 'object' && defaultValue !== null && !Array.isArray(defaultValue) && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) return defaultValue;
        return parsed;
    } catch (error) {
        console.error("JSON parsing error:", error);
        return defaultValue;
    }
};

// Simple Tag Input Component - Enhanced with Icon Button
const TagInput: React.FC<{
  label: string;
  tags: string[];
  setTags: (tags: string[]) => void;
  placeholder?: string;
  helperText?: string;
  idSuffix?: string; // To create unique IDs
}> = ({ label, tags, setTags, placeholder = "Add item...", helperText, idSuffix = label.toLowerCase().replace(/\s+/g, '-') }) => {
  const [inputValue, setInputValue] = useState('');
  const inputId = `tag-input-${idSuffix}`;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const addTag = () => {
      if (inputValue.trim()) {
          // Avoid adding duplicate tags
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
    <div className="mb-4"> {/* Consistent margin */}
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center border border-gray-300 rounded-md shadow-sm focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500">
        <div className="flex flex-wrap gap-1 p-2 flex-grow bg-white rounded-l-md"> {/* Ensure bg color */}
            {/* Render existing tags */}
            {tags.map((tag, index) => (
              <span key={index} className="flex items-center bg-indigo-100 text-indigo-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="ml-1.5 text-indigo-500 hover:text-indigo-700 focus:outline-none"
                  aria-label={`Remove ${tag}`}
                >
                  <X size={12} /> {/* Use X icon */}
                </button>
              </span>
            ))}
            {/* Input field for new tags */}
            <input
              id={inputId}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder={placeholder}
              className="flex-grow p-1 border-none focus:ring-0 focus:outline-none text-sm min-w-[100px]" // Ensure input has some base width
            />
        </div>
         {/* Button to add the current input value as a tag */}
         <button
            type="button"
            onClick={addTag}
            className="px-3 py-2 text-gray-500 hover:text-indigo-600 focus:outline-none border-l border-gray-300 bg-gray-50 rounded-r-md" // Added bg and rounded
            aria-label={`Add ${label} tag`}
         >
            <Tag size={16} />
         </button>
      </div>
      {helperText && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
    </div>
  );
};


// Main Form Component - Simplified
const BusinessTypeForm: React.FC<BusinessTypeFormProps> = ({ businessType, onSubmit, onCancel, isLoading }) => {
  // --- State Initialization (Simplified) ---
  const [typeName, setTypeName] = useState('');
  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  const [comparisonMetrics, setComparisonMetrics] = useState<string[]>([]);

  // Removed state for: queryPatterns, attributesJson, responseTemplatesJson, validationRulesJson, categoryConfigsJson, recommendationTemplate

  const [jsonErrors, setJsonErrors] = useState<Record<string, string | null>>({}); // Keep for type name validation
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null); // State for AI errors

  // --- Effect to load data when editing ---
  useEffect(() => {
    setTypeName(businessType?.type || '');
    // Load directly from the simplified model structure
    setKeyFeatures(businessType?.key_features || []);
    setComparisonMetrics(businessType?.comparison_metrics || []);

    // Removed loading logic for deleted fields

    setJsonErrors({}); // Clear errors on load/reset
  }, [businessType]);

  // --- Handlers ---
  // Removed handleJsonChange as there are no JSON text areas anymore

  const handleGenerateSuggestions = async () => {
      if (!typeName.trim()) {
          toast.warn("Zadejte prosím nejprve název typu firmy.");
          return;
      }
      setIsAiLoading(true);
      setAiError(null);
      try {
          const params = new URLSearchParams();
          params.append('type_name', typeName.trim());
          params.append('language', 'cs'); // Request Czech suggestions

          // Fetch suggestions for key_features and comparison_metrics
          const suggestions = await fetchApi(`/api/business-types/suggestions?${params.toString()}`);

          let suggestionsApplied = false;
          if (suggestions && suggestions.key_features?.length) {
              setKeyFeatures(suggestions.key_features);
              suggestionsApplied = true;
          }
          if (suggestions && suggestions.comparison_metrics?.length) {
              setComparisonMetrics(suggestions.comparison_metrics);
              suggestionsApplied = true;
          }

          if (suggestionsApplied) {
              toast.success("AI návrhy pro vlastnosti a metriky byly použity!");
          } else {
              toast.warn("AI nevrátila žádné návrhy pro vlastnosti nebo metriky.");
              setAiError("Nebyly přijaty žádné návrhy."); // Keep generic error message
          }
      } catch (error: any) {
          console.error("Failed to fetch AI suggestions for business type:", error);
          const errorMsg = error?.detail || error.message || "Nepodařilo se získat návrhy";
          toast.error(`Chyba AI: ${errorMsg}`);
          setAiError(errorMsg);
      } finally {
          setIsAiLoading(false);
      }
  };


  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setJsonErrors({}); // Clear previous errors

    if (!typeName.trim()) {
        setJsonErrors({ type: "Type Name is required." });
        return; // Stop submission if type name is missing
    }

    // Removed JSON parsing and validation logic for deleted fields

    // Construct the simplified submission data
    const submissionData: BusinessTypeCreateUpdate = {
      type: typeName.trim(),
      key_features: keyFeatures,
      comparison_metrics: comparisonMetrics,
      // Removed deleted fields: attributes, query_patterns, response_templates, validation_rules, category_configs, comparison_config (nested structure)
    };

    onSubmit(submissionData, businessType?.id);
  };

  // Removed JsonTextArea helper component

  // --- Render ---
  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1"> {/* Reduced space-y, keep padding */}
      {/* Type Name */}
      <div className="mb-4"> {/* Added margin bottom */}
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type Name *</label>
         <div className="flex items-center space-x-2 mt-1">
            <input
              type="text"
              name="type"
              id="type"
              value={typeName}
              onChange={(e) => {
                  setTypeName(e.target.value);
                  if (jsonErrors.type) setJsonErrors(prev => ({ ...prev, type: null })); // Clear error on change
              }}
              required
              disabled={!!businessType} // Disable editing type name for existing types
              className={`block w-full px-3 py-2 border ${jsonErrors.type ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${businessType ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
            {/* AI Suggestion Button - Updated title */}
             <button
                type="button"
                onClick={handleGenerateSuggestions}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-medium border border-blue-300 flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isAiLoading || !typeName.trim()} // Disable if loading or no type name
                title={!typeName.trim() ? "Nejprve zadejte název typu" : "Navrhnout vlastnosti a metriky (AI)"} // Updated tooltip
             >
                {isAiLoading ? <LoadingSpinner /> : <Sparkles size={16} />}
                <span>Navrhnout</span>
             </button>
         </div>
         {aiError && <p className="mt-1 text-xs text-red-600">Chyba návrhu: {aiError}</p>}
         {jsonErrors.type && <p className="mt-1 text-xs text-red-600">{jsonErrors.type}</p>}
         {businessType && <p className="mt-1 text-xs text-gray-500">Název typu nelze po vytvoření změnit.</p>}
         {!businessType && <p className="mt-1 text-xs text-gray-500">Unique identifier (e.g., electronics, clothing). Cannot be changed later.</p>}
      </div>

      {/* Removed Query Patterns TagInput */}

      {/* --- Comparison Config Section (Simplified) --- */}
      <fieldset className="border border-gray-200 p-4 rounded-md space-y-4 mt-4"> {/* Adjusted border/margin */}
          <legend className="text-sm font-medium text-gray-700 px-1">Comparison Configuration</legend>

          <TagInput
              label="Key Features"
              tags={keyFeatures}
              setTags={setKeyFeatures}
              placeholder="Add feature..."
              helperText="Features for comparison (e.g., 'Screen Size', 'RAM')."
              idSuffix="key-features"
          />

          <TagInput
              label="Comparison Metrics"
              tags={comparisonMetrics}
              setTags={setComparisonMetrics}
              placeholder="Add metric..."
              helperText="Metrics for comparison (e.g., 'Price', 'Rating')."
              idSuffix="comp-metrics"
          />

          {/* Removed Recommendation Template textarea */}
      </fieldset>

      {/* --- Removed Other JSON Fields --- */}
      {/* Removed JsonTextArea for attributes */}
      {/* Removed JsonTextArea for response_templates */}
      {/* Removed JsonTextArea for validation_rules */}
      {/* Removed JsonTextArea for category_configs */}


      {/* Action Buttons */}
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
          disabled={isLoading || isAiLoading} // Disable if AI is "loading"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
        >
          {isLoading ? <LoadingSpinner /> : (
              <>
                {businessType ? <Save size={16} className="mr-1" /> : <Plus size={16} className="mr-1" />} {/* Use Save icon when editing */}
                {businessType ? 'Update Type' : 'Create Type'}
              </>
          )}
        </button>
      </div>
    </form>
  );
};

export default BusinessTypeForm;
