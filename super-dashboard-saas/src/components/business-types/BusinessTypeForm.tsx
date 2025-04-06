'use client';

import React, { useState, useEffect, FormEvent, KeyboardEvent } from 'react';
import { BusinessType, BusinessTypeCreateUpdate } from '@/types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Tag, X, Sparkles, Plus } from 'lucide-react'; // Import icons
import { toast } from 'react-toastify'; // Import toast for potential future use or error display

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


// Main Form Component
const BusinessTypeForm: React.FC<BusinessTypeFormProps> = ({ businessType, onSubmit, onCancel, isLoading }) => {
  // --- State Initialization ---
  const [typeName, setTypeName] = useState('');
  const [queryPatterns, setQueryPatterns] = useState<string[]>([]);
  // Comparison Config fields
  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  const [comparisonMetrics, setComparisonMetrics] = useState<string[]>([]);
  const [recommendationTemplate, setRecommendationTemplate] = useState('');
  // Other fields remain as JSON strings for now
  const [attributesJson, setAttributesJson] = useState('{}');
  const [responseTemplatesJson, setResponseTemplatesJson] = useState('{}');
  const [validationRulesJson, setValidationRulesJson] = useState('{}');
  const [categoryConfigsJson, setCategoryConfigsJson] = useState('{}');

  const [jsonErrors, setJsonErrors] = useState<Record<string, string | null>>({}); // Errors for JSON fields
  const [isAiLoading, setIsAiLoading] = useState(false); // State for AI button loading

  // --- Effect to load data when editing ---
  useEffect(() => {
    setTypeName(businessType?.type || '');
    setQueryPatterns(businessType?.query_patterns || []);

    // Parse comparison_config safely
    const initialComparisonConfig = safeJsonParse(JSON.stringify(businessType?.comparison_config || {}), {});
    setKeyFeatures(initialComparisonConfig?.key_features || []);
    setComparisonMetrics(initialComparisonConfig?.comparison_metrics || []);
    setRecommendationTemplate(initialComparisonConfig?.recommendation_template || '');

    // Set other JSON fields, ensuring they are stringified objects
    setAttributesJson(JSON.stringify(businessType?.attributes || {}, null, 2));
    setResponseTemplatesJson(JSON.stringify(businessType?.response_templates || {}, null, 2));
    setValidationRulesJson(JSON.stringify(businessType?.validation_rules || {}, null, 2));
    setCategoryConfigsJson(JSON.stringify(businessType?.category_configs || {}, null, 2));

    setJsonErrors({}); // Clear errors on load/reset
  }, [businessType]);

  // --- Handlers ---
  const handleJsonChange = (setter: React.Dispatch<React.SetStateAction<string>>, fieldName: string) =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setter(e.target.value);
      // Clear specific JSON error when user types
      if (jsonErrors[fieldName]) {
        setJsonErrors(prev => ({ ...prev, [fieldName]: null }));
      }
    };

  const handleGenerateSuggestions = async () => {
      // ** Functionality Disabled **
      // This requires a backend endpoint like /api/business-types/suggestions/{typeName} which is not currently available.
      setIsAiLoading(true); // Show loading state briefly for visual feedback
      toast.info("AI Suggestion feature is not available (missing backend endpoint).", { autoClose: 4000 });
      console.warn("Attempted to use AI suggestions, but the backend endpoint is missing.");
      // Simulate loading for demo purposes
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsAiLoading(false);

      // --- Original Logic Placeholder (requires backend changes) ---
      // if (!typeName.trim()) {
      //     setJsonErrors(prev => ({ ...prev, type: 'Please enter a Type Name first to generate suggestions' }));
      //     return;
      // }
      // try {
      //     setIsAiLoading(true);
      //     // Replace with actual API call using fetchApi from '@/lib/api'
      //     // const response = await fetchApi(`/api/business-types/suggestions/${encodeURIComponent(typeName)}`);
      //     // const suggestions = response; // Assuming response structure { key_features: [], comparison_metrics: [] }
      //
      //     // Mock response for now:
      //     await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
      //     const suggestions = {
      //         key_features: ["Mock Feature 1", "Mock Feature 2"],
      //         comparison_metrics: ["Mock Metric A", "Mock Metric B"]
      //     };
      //
      //     // Merge suggestions (avoid duplicates)
      //     setKeyFeatures(prev => [...new Set([...prev, ...(suggestions.key_features || [])])]);
      //     setComparisonMetrics(prev => [...new Set([...prev, ...(suggestions.comparison_metrics || [])])]);
      //
      //     toast.success("AI suggestions added!");
      //
      // } catch (error: any) {
      //     console.error('Error fetching suggestions:', error);
      //     toast.error(`Failed to get AI suggestions: ${error.message}`);
      // } finally {
      //     setIsAiLoading(false);
      // }
  };


  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setJsonErrors({}); // Clear previous errors
    let currentJsonErrors: Record<string, string | null> = {};
    let hasError = false;

    // Validate JSON fields before submitting
    let parsedAttributes, parsedResponseTemplates, parsedValidationRules, parsedCategoryConfigs;

    const tryParse = (jsonString: string, fieldName: string, label: string) => {
        try {
            // Allow empty string to represent empty object
            if (jsonString.trim() === '') return {};
            const parsed = JSON.parse(jsonString);
            // Basic type check: ensure it's an object
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                 throw new Error("Must be a valid JSON object (e.g., {} or {\"key\": \"value\"}).");
            }
            return parsed;
        } catch (err: any) {
            currentJsonErrors[fieldName] = `Invalid JSON in ${label}: ${err.message}`;
            hasError = true;
            return null; // Return null on error
        }
    };

    parsedAttributes = tryParse(attributesJson, 'attributes', 'Attributes');
    parsedResponseTemplates = tryParse(responseTemplatesJson, 'responseTemplates', 'Response Templates');
    parsedValidationRules = tryParse(validationRulesJson, 'validationRules', 'Validation Rules');
    parsedCategoryConfigs = tryParse(categoryConfigsJson, 'categoryConfigs', 'Category Configs');

    setJsonErrors(currentJsonErrors);

    // Ensure required validation rules exist if validation_rules was successfully parsed (even if empty)
    if (parsedValidationRules !== null) { // Check if parsing succeeded
        if (!parsedValidationRules.hasOwnProperty('product_name')) {
            parsedValidationRules.product_name = {}; // Add default if missing
            console.log("Ensured 'product_name' exists in validation_rules");
        }
        if (!parsedValidationRules.hasOwnProperty('category')) {
            parsedValidationRules.category = {}; // Add default if missing
            console.log("Ensured 'category' exists in validation_rules");
        }
    }
    // Note: If parsing failed (parsedValidationRules is null), hasError will be true, stopping submission below.

    if (hasError || !typeName.trim()) {
        // Add error for type name if empty
        if (!typeName.trim()) {
             setJsonErrors(prev => ({ ...prev, type: "Type Name is required." }));
        }
        return; // Stop submission if JSON is invalid or type name is missing
    }

    // Construct comparison_config object
    const comparisonConfigData = {
        key_features: keyFeatures,
        comparison_metrics: comparisonMetrics,
        recommendation_template: recommendationTemplate,
    };

    const submissionData: BusinessTypeCreateUpdate = {
      type: typeName.trim(),
      attributes: parsedAttributes,
      query_patterns: queryPatterns,
      response_templates: parsedResponseTemplates,
      validation_rules: parsedValidationRules,
      category_configs: parsedCategoryConfigs,
      comparison_config: comparisonConfigData,
    };

    onSubmit(submissionData, businessType?.id);
  };

  // Helper for JSON text areas
  const JsonTextArea: React.FC<{ name: string; label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; error: string | null; rows?: number; helperText?: string }> =
    ({ name, label, value, onChange, error, rows = 3, helperText }) => ( // Reduced default rows
    <div className="mb-4"> {/* Added margin bottom */}
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label} (JSON Object)</label>
      <textarea
        name={name}
        id={name}
        rows={rows}
        value={value}
        onChange={onChange}
        className={`mt-1 block w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono text-xs`}
        spellCheck="false"
        placeholder="{}" // Placeholder for empty object
      />
      {helperText && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );

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
            {/* AI Suggestion Button - Visually present but disabled */}
             <button
                type="button"
                onClick={handleGenerateSuggestions}
                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 text-sm font-medium border border-gray-300 flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={true} // Always disabled as backend endpoint is missing
                title="AI Suggestions (Feature not available - requires backend update)"
             >
                {isAiLoading ? <LoadingSpinner /> : <Sparkles size={16} />}
                <span>AI</span>
             </button>
         </div>
         {jsonErrors.type && <p className="mt-1 text-xs text-red-600">{jsonErrors.type}</p>}
         {businessType && <p className="mt-1 text-xs text-gray-500">Type name cannot be changed after creation.</p>}
         {!businessType && <p className="mt-1 text-xs text-gray-500">Unique identifier (e.g., electronics, clothing). Cannot be changed later.</p>}
      </div>

      {/* Query Patterns (Tag Input) */}
      <TagInput
        label="Query Patterns"
        tags={queryPatterns}
        setTags={setQueryPatterns}
        placeholder="Add pattern..."
        helperText="Typical user queries (e.g., 'find shoes', 'compare laptops')."
        idSuffix="query-patterns"
      />

      {/* --- Comparison Config Section --- */}
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

          <div className="mb-4"> {/* Added margin bottom */}
              <label htmlFor="recommendation_template" className="block text-sm font-medium text-gray-700">Recommendation Template</label>
              <textarea
                  id="recommendation_template"
                  name="recommendation_template"
                  rows={3}
                  placeholder="Optional: Use {product_name}, {features}, etc."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={recommendationTemplate}
                  onChange={(e) => setRecommendationTemplate(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">Customize recommendation text. Leave blank for default.</p>
          </div>
      </fieldset>

      {/* --- Other JSON Fields --- */}
      <JsonTextArea
        name="attributes"
        label="Attributes"
        value={attributesJson}
        onChange={handleJsonChange(setAttributesJson, 'attributes')}
        error={jsonErrors.attributes}
        helperText="General attributes (e.g., {'default_sort': 'price_asc'})."
      />
      <JsonTextArea
        name="response_templates"
        label="Response Templates"
        value={responseTemplatesJson}
        onChange={handleJsonChange(setResponseTemplatesJson, 'responseTemplates')}
        error={jsonErrors.responseTemplates}
        helperText="Bot responses (e.g., {'greeting': 'Welcome!'})."
      />
      <JsonTextArea
        name="validation_rules"
        label="Validation Rules"
        value={validationRulesJson}
        onChange={handleJsonChange(setValidationRulesJson, 'validationRules')}
        error={jsonErrors.validationRules}
        helperText="Input validation (e.g., {'zip_code': {'regex': '^\\\\d{5}$'}})."
      />
      <JsonTextArea
        name="category_configs"
        label="Category Configs"
        value={categoryConfigsJson}
        onChange={handleJsonChange(setCategoryConfigsJson, 'categoryConfigs')}
        error={jsonErrors.categoryConfigs}
        helperText="Specific configs for product categories."
      />


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
                <Plus size={16} className="mr-1" /> {/* Add icon */}
                {businessType ? 'Update Type' : 'Create Type'}
              </>
          )}
        </button>
      </div>
    </form>
  );
};

export default BusinessTypeForm;
