'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { Product, PriceInfo, StockInfo, BusinessType } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Upload, X, Tag, Sparkles, Plus, Save } from 'lucide-react'; // Import icons
import { toast } from 'react-toastify';

interface ProductFormProps {
  product?: Product | null; // Product data for editing, null for adding
  onSubmit: (formData: FormData, productId?: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

// Helper to safely parse number strings, returning null for invalid/empty
const parseOptionalFloat = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const num = parseFloat(String(value).replace(/,/g, '.')); // Handle comma decimal separator
  return isNaN(num) ? null : num;
};

// Simple Tag Input Component (Copied for consistency)
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


const ProductForm: React.FC<ProductFormProps> = ({ product, onSubmit, onCancel, isLoading }) => {
  // Separate state for different types of data
  const [textData, setTextData] = useState({
    product_name: '',
    description: '',
    category: '',
    business_type: '',
    one_time_price: '',
    monthly_price: '',
    annual_price: '',
    currency: 'Kč',
    url: '',
    admin_priority: '0',
  });
  const [features, setFeatures] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null); // State for AI errors

  // Fetch Business Types for dropdown
  const { data: businessTypes, isLoading: isLoadingBusinessTypes } = useQuery<BusinessType[], Error>({
    queryKey: ['businessTypes'],
    queryFn: () => fetchApi('/api/business-types/'),
  });

  useEffect(() => {
    // Populate form when product data is available (for editing)
    setTextData({
      product_name: product?.product_name || '',
      description: product?.description || '',
      category: product?.category || '',
      business_type: product?.business_type || '',
      one_time_price: product?.pricing?.one_time?.toString() || '',
      monthly_price: product?.pricing?.monthly?.toString() || '',
      annual_price: product?.pricing?.annual?.toString() || '',
      currency: product?.pricing?.currency || 'Kč',
      url: product?.url || '',
      admin_priority: product?.admin_priority?.toString() || '0',
    });
    setFeatures(product?.features || []);
    setTargetAudience(product?.target_audience || []);
    setKeywords(product?.keywords || []);
    setImageFile(null);
    setImagePreview(product?.image_url || null);
  }, [product]);

  const handleTextChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTextData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Updated validation to accept only webp
      if (file.type !== 'image/webp') {
        toast.error('Please select a WEBP image file (.webp).');
        e.target.value = ''; // Clear the input
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(product?.image_url || null);
    }
  };

  const handleGenerateSuggestions = async () => {
      if (!textData.product_name) {
          toast.warn("Please enter a Product Name first to generate suggestions.");
          return;
      }
      setIsAiLoading(true);
      setAiError(null); // Clear previous errors
      try {
          const params = new URLSearchParams();
          params.append('product_name', textData.product_name);
          if (textData.description) params.append('description', textData.description);
          if (textData.category) params.append('category', textData.category);
          if (textData.business_type) params.append('business_type', textData.business_type);
          params.append('language', 'cs'); // Explicitly request Czech suggestions

          // Use the relative path for the API call within the same application
          const suggestions = await fetchApi(`/api/products/suggestions?${params.toString()}`);

          if (suggestions) {
              // Replace existing values with suggestions. User can still edit.
              if (suggestions.features?.length) setFeatures(suggestions.features);
              if (suggestions.keywords?.length) setKeywords(suggestions.keywords);
              if (suggestions.target_audience?.length) setTargetAudience(suggestions.target_audience);
              // Optionally suggest a category if one wasn't provided or if suggestions exist
              if (!textData.category && suggestions.categories?.length) {
                  setTextData(prev => ({ ...prev, category: suggestions.categories[0] })); // Use the first suggested category
              }
              toast.success("AI suggestions applied!");
          } else {
               toast.warn("AI did not return any suggestions.");
               setAiError("No suggestions received.");
          }
      } catch (error: any) {
          console.error("Failed to fetch AI suggestions:", error);
          const errorMsg = error?.detail || error.message || "Failed to get suggestions";
          toast.error(`AI Error: ${errorMsg}`);
          setAiError(errorMsg);
      } finally {
          setIsAiLoading(false);
      }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Basic validation
    if (!textData.product_name || !textData.description || !textData.category || !textData.business_type) {
        toast.error("Please fill in all required fields (*).");
        return;
    }

    const submissionData = new FormData();

    // Append text fields
    Object.entries(textData).forEach(([key, value]) => {
        // Handle price fields specifically
        if (key === 'one_time_price' || key === 'monthly_price' || key === 'annual_price') {
            const numValue = parseOptionalFloat(value);
            if (numValue !== null) {
                submissionData.append(key, numValue.toString());
            }
        } else if (value !== null && value !== undefined) {
             submissionData.append(key, String(value));
        }
    });

    // Append array fields (tags)
    features.forEach(feature => submissionData.append('features', feature));
    targetAudience.forEach(audience => submissionData.append('target_audience', audience));
    keywords.forEach(keyword => submissionData.append('keywords', keyword));

    // Append image file if selected
    if (imageFile) {
      // Ensure it's webp before appending (redundant check if input accept works, but safe)
      if (imageFile.type === 'image/webp') {
        submissionData.append('image_file', imageFile);
      } else {
        toast.error("Invalid file type. Only WEBP images are allowed.");
        return; // Stop submission if file type is wrong
      }
    } else if (!imagePreview && product?.image_url) {
      // Signal to potentially remove the image if API supports it
      // submissionData.append('remove_image', 'true'); // Example, depends on API
    }

    onSubmit(submissionData, product?.id);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-intro="product-form"> {/* Added data-intro */}
      {/* Product Name & AI Button */}
      <div data-intro="product-name-field"> {/* Added data-intro */}
        <label htmlFor="product_name" className="block text-sm font-medium text-gray-700">Product Name *</label>
        <div className="flex items-center space-x-2 mt-1">
            <input
              type="text" name="product_name" id="product_name" value={textData.product_name} onChange={handleTextChange} required
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <button
                type="button" onClick={handleGenerateSuggestions}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-medium border border-blue-300 flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isAiLoading || !textData.product_name} // Disable if loading or no product name
                title={!textData.product_name ? "Enter Product Name first" : "Generate AI Suggestions"}
             >
                {isAiLoading ? <LoadingSpinner /> : <Sparkles size={16} />} {/* Removed size prop */}
                <span>Suggest</span>
             </button>
        </div>
         {aiError && <p className="text-xs text-red-600 mt-1">Suggestion Error: {aiError}</p>}
      </div>

      {/* Description */}
      <div data-intro="product-description-field"> {/* Added data-intro */}
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description *</label>
        <textarea name="description" id="description" rows={4} value={textData.description} onChange={handleTextChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
      </div>

      {/* Category & Business Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div data-intro="product-category-field"> {/* Added data-intro */}
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category *</label>
          <input type="text" name="category" id="category" value={textData.category} onChange={handleTextChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
        </div>
        <div data-intro="product-businesstype-field"> {/* Added data-intro */}
          <label htmlFor="business_type" className="block text-sm font-medium text-gray-700">Business Type *</label>
          {isLoadingBusinessTypes ? <LoadingSpinner /> : (
            <select name="business_type" id="business_type" value={textData.business_type} onChange={handleTextChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              <option value="" disabled>Select type</option>
              {businessTypes?.map((bt) => <option key={bt.id || bt.type} value={bt.type}>{bt.type}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Features (Tag Input) */}
      <div data-intro="product-features-field"> {/* Added data-intro */}
        <TagInput label="Features" tags={features} setTags={setFeatures} placeholder="Add feature..." helperText="Key product features." idSuffix="prod-features"/>
      </div>

      {/* Pricing */}
       <fieldset className="border border-gray-300 p-3 rounded-md" data-intro="product-pricing-field"> {/* Added data-intro */}
         <legend className="text-sm font-medium text-gray-700 px-1">Pricing</legend>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
                <label htmlFor="one_time_price" className="block text-xs font-medium text-gray-600">One-Time</label>
                <input type="number" step="0.01" name="one_time_price" id="one_time_price" value={textData.one_time_price} onChange={handleTextChange} className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"/>
            </div>
            <div>
                <label htmlFor="monthly_price" className="block text-xs font-medium text-gray-600">Monthly</label>
                <input type="number" step="0.01" name="monthly_price" id="monthly_price" value={textData.monthly_price} onChange={handleTextChange} className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"/>
            </div>
            <div>
                <label htmlFor="annual_price" className="block text-xs font-medium text-gray-600">Annual</label>
                <input type="number" step="0.01" name="annual_price" id="annual_price" value={textData.annual_price} onChange={handleTextChange} className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"/>
            </div>
            <div>
                <label htmlFor="currency" className="block text-xs font-medium text-gray-600">Currency</label>
                <input type="text" name="currency" id="currency" value={textData.currency} onChange={handleTextChange} required className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"/>
            </div>
         </div>
       </fieldset>

      {/* Target Audience (Tag Input) */}
      <TagInput label="Target Audience" tags={targetAudience} setTags={setTargetAudience} placeholder="Add audience..." helperText="Who is this product for?" idSuffix="prod-audience"/>

      {/* Keywords (Tag Input) */}
      <TagInput label="Keywords" tags={keywords} setTags={setKeywords} placeholder="Add keyword..." helperText="Keywords for search." idSuffix="prod-keywords"/>

      {/* URL & Priority */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700">Product URL</label>
          <input type="url" name="url" id="url" value={textData.url} onChange={handleTextChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
        </div>
        <div>
          <label htmlFor="admin_priority" className="block text-sm font-medium text-gray-700">Admin Priority (0-10)</label>
          <input type="number" name="admin_priority" id="admin_priority" min="0" max="10" value={textData.admin_priority} onChange={handleTextChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
        </div>
      </div>

      {/* Image Upload */}
      <div data-intro="product-image-field"> {/* Added data-intro */}
        <label htmlFor="image_file" className="block text-sm font-medium text-gray-700">Product Image</label>
        <div className="mt-1 flex items-center space-x-4">
            <input
              type="file" name="image_file" id="image_file" accept="image/webp" onChange={handleImageChange} // Changed accept to image/webp
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {imagePreview && (
              <div className="flex items-center space-x-2">
                <img src={imagePreview} alt="Preview" className="h-16 w-16 rounded-md border border-gray-300 object-cover" />
                 <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="text-xs text-red-600 hover:text-red-800" title="Remove Image">
                    <X size={16}/>
                 </button>
              </div>
            )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-6">
        <button type="button" onClick={onCancel} disabled={isLoading} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={isLoading || isLoadingBusinessTypes} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]" data-intro="product-submit-button"> {/* Added data-intro */}
          {isLoading ? <LoadingSpinner /> : (
              <>
                {product ? <Save size={16} className="mr-1" /> : <Plus size={16} className="mr-1" />}
                {product ? 'Update Product' : 'Create Product'}
              </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
