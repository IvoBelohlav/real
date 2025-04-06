import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api, { getStaticUrl } from '../../utils/api';
import { toast } from 'react-toastify';
import { X, Upload, Plus, Tag, Sparkles } from 'lucide-react';
import styles from './AddProductForm.module.css';

const AddProductForm = ({ onClose, defaultBusinessType }) => {
  const [formData, setFormData] = useState({
    product_name: '',
    description: '',
    features: '',
    pricing_onetime: '',
    pricing_currency: 'Kč',
    pricing_monthly: '',
    pricing_annual: '',
    category: '',
    business_type: defaultBusinessType || '',
    target_audience: '',
    keywords: '',
    url: '',
    admin_priority: 0,
  });
  const [featureTags, setFeatureTags] = useState([]);
  const [keywordTags, setKeywordTags] = useState([]);
  const [audienceTags, setAudienceTags] = useState([]);
  const [currentTag, setCurrentTag] = useState({ field: '', value: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState({
    target_audience: [],
    keywords: [],
    features: [],
    categories: []
  });
  const queryClient = useQueryClient();

  // Fetch business types for the dropdown
  const { data: businessTypes = [], isLoading: isLoadingBusinessTypes } = useQuery({
    queryKey: ['businessTypes'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/comparison-configs/');
        return response.data;
      } catch (error) {
        console.error('Error fetching business types:', error);
        return [];
      }
    },
  });

  // Set the default business type when available
  useEffect(() => {
    if (defaultBusinessType && formData.business_type === '') {
      setFormData(prev => ({ ...prev, business_type: defaultBusinessType }));
    }
  }, [defaultBusinessType]);

  // Effect to sync tags with formData
  useEffect(() => {
    // Convert features array to comma-separated string
    const featuresString = featureTags.join(', ');
    // Convert keywords array to comma-separated string
    const keywordsString = keywordTags.join(', ');
    // Convert target_audience array to comma-separated string
    const audienceString = audienceTags.join(', ');

    setFormData(prev => ({
      ...prev,
      features: featuresString,
      keywords: keywordsString,
      target_audience: audienceString
    }));
  }, [featureTags, keywordTags, audienceTags]);

  const addProductMutation = useMutation({
    mutationFn: async (newProduct) => {
      try {
        // Create a FormData object to send multipart/form-data
        const formData = new FormData();

        // Add basic fields with validation
        if (!newProduct.product_name) throw new Error("Product name is required");
        formData.append('product_name', newProduct.product_name);
        
        if (!newProduct.description) throw new Error("Description is required");
        formData.append('description', newProduct.description);
        
        if (!newProduct.category) throw new Error("Category is required");
        formData.append('category', newProduct.category);
        
        if (!newProduct.business_type) throw new Error("Business type is required");
        formData.append('business_type', newProduct.business_type);
        
        formData.append('admin_priority', newProduct.admin_priority);

        // Log required fields for debugging
        console.log('REQUIRED FIELD CHECK:');
        console.log('- product_name:', newProduct.product_name ? `"${newProduct.product_name}"` : 'MISSING');
        console.log('- description:', newProduct.description ? `"${newProduct.description}"` : 'MISSING');
        console.log('- category:', newProduct.category ? `"${newProduct.category}"` : 'MISSING');
        console.log('- business_type:', newProduct.business_type ? `"${newProduct.business_type}"` : 'MISSING');

        if (newProduct.url) formData.append('url', newProduct.url);

        // Always add at least one feature
        if (!newProduct.features || newProduct.features.length === 0) {
          formData.append('features', 'Default Feature');
          console.log('- features: Adding default feature');
        } else {
          console.log('- features:', JSON.stringify(newProduct.features));
          newProduct.features.forEach(feature => {
            if (feature.trim()) formData.append('features', feature.trim());
          });
        }
        
        // Handle target_audience
        if (!newProduct.target_audience || newProduct.target_audience.length === 0) {
          formData.append('target_audience', 'Default Audience');
          console.log('- target_audience: Adding default audience');
        } else {
          console.log('- target_audience:', JSON.stringify(newProduct.target_audience));
          newProduct.target_audience.forEach(audience => {
            if (audience.trim()) formData.append('target_audience', audience.trim());
          });
        }
        
        // Handle keywords
        if (!newProduct.keywords || newProduct.keywords.length === 0) {
          formData.append('keywords', 'Default Keyword');
          console.log('- keywords: Adding default keyword');
        } else {
          console.log('- keywords:', JSON.stringify(newProduct.keywords));
          newProduct.keywords.forEach(keyword => {
            if (keyword.trim()) formData.append('keywords', keyword.trim());
          });
        }

        // Add pricing fields
        if (newProduct.pricing.one_time) {
          formData.append('one_time_price', newProduct.pricing.one_time);
          console.log('- one_time_price:', newProduct.pricing.one_time);
        }
        if (newProduct.pricing.monthly) {
          formData.append('monthly_price', newProduct.pricing.monthly);
          console.log('- monthly_price:', newProduct.pricing.monthly);
        }
        if (newProduct.pricing.annual) {
          formData.append('annual_price', newProduct.pricing.annual);
          console.log('- annual_price:', newProduct.pricing.annual);
        }
        formData.append('currency', newProduct.pricing.currency || 'Kč');
        console.log('- currency:', newProduct.pricing.currency || 'Kč');

        // Add image if provided
        if (imageFile) {
          formData.append('image_file', imageFile);
          console.log('- image_file:', imageFile.name);
        }

        // Log FormData for debugging
        console.log('Submitting product with image:', imageFile ? imageFile.name : 'None');
        
        // Debug log all FormData entries
        const formDataEntries = [];
        for (let pair of formData.entries()) {
          formDataEntries.push(`${pair[0]}: ${pair[1]}`);
        }
        console.log("FormData contents:", formDataEntries);
        
        console.log("SENDING REQUEST NOW - Check network tab for details");
        
        const response = await api.post('/api/products/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data;
      } catch (error) {
        console.error('Error in mutation function:', error);
        console.error('Error response data:', error.response?.data);
        console.error('Error status:', error.response?.status);
        
        // Log detailed validation errors if available
        if (error.response?.data?.detail) {
          console.error('Validation errors:', error.response.data.detail);
        }
        
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
      toast.success('Product added successfully!');
      setIsSubmitting(false);
    },
    onError: (error) => {
      let errorMessage = 'Failed to add product. Please try again.';
      if (error.response?.data) {
        if (typeof error.response.data === 'object' && error.response.data !== null) {
          if (error.response.data.detail) {
              errorMessage = error.response.data.detail;
          } else {
              errorMessage = JSON.stringify(error.response.data);
          }
        } else if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
        }
      } else if (error.message) {
          errorMessage = error.message;
      }
      console.error('Add product error details:', error);
      console.error('Request that failed:', error.config);
      
      setErrors({ general: errorMessage });
      toast.error(errorMessage);
      setIsSubmitting(false);
    },
  });

  const handleChange = (e) => {
    const { id, value, type } = e.target;
    
    // Handle number inputs specially
    if (type === 'number') {
      setFormData(prev => ({ ...prev, [id]: value === '' ? '' : Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
    
    // Clear any error for this field
    if (errors[id]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file is an image
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, imageFile: 'Please select an image file' }));
        return;
      }
      
      // Clear previous error if any
      if (errors.imageFile) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.imageFile;
          return newErrors;
        });
      }
      
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTagInputChange = (e) => {
    const { id, value } = e.target;
    setCurrentTag({ field: id, value });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    if (!currentTag.value.trim()) return;
    
    switch (currentTag.field) {
      case 'feature_input':
        if (!featureTags.includes(currentTag.value.trim())) {
          setFeatureTags([...featureTags, currentTag.value.trim()]);
        }
        break;
      case 'keyword_input':
        if (!keywordTags.includes(currentTag.value.trim())) {
          setKeywordTags([...keywordTags, currentTag.value.trim()]);
        }
        break;
      case 'audience_input':
        if (!audienceTags.includes(currentTag.value.trim())) {
          setAudienceTags([...audienceTags, currentTag.value.trim()]);
        }
        break;
      default:
        break;
    }
    
    setCurrentTag({ field: currentTag.field, value: '' });
  };

  const removeTag = (tag, type) => {
    switch (type) {
      case 'feature':
        setFeatureTags(featureTags.filter(f => f !== tag));
        break;
      case 'keyword':
        setKeywordTags(keywordTags.filter(k => k !== tag));
        break;
      case 'audience':
        setAudienceTags(audienceTags.filter(a => a !== tag));
        break;
      default:
        break;
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.product_name.trim()) {
      newErrors.product_name = 'Product name is required';
    } else if (formData.product_name.trim().length < 3) {
      newErrors.product_name = 'Product name must be at least 3 characters';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.business_type) {
      newErrors.business_type = 'Business type is required';
    }
    
    // Check if at least one feature tag is added
    if (featureTags.length === 0) {
      newErrors.features = 'Add at least one feature for the product';
    }
    
    // Validate price fields if provided
    if (formData.pricing_onetime && isNaN(parseFloat(formData.pricing_onetime.toString().replace(',', '.').trim()))) {
      newErrors.pricing_onetime = 'Price must be a valid number';
    }
    
    if (formData.pricing_monthly && isNaN(parseFloat(formData.pricing_monthly.toString().replace(',', '.').trim()))) {
      newErrors.pricing_monthly = 'Price must be a valid number';
    }
    
    if (formData.pricing_annual && isNaN(parseFloat(formData.pricing_annual.toString().replace(',', '.').trim()))) {
      newErrors.pricing_annual = 'Price must be a valid number';
    }
    
    // Validate URL if provided
    if (formData.url) {
      try {
        new URL(formData.url);
      } catch (e) {
        newErrors.url = 'Please enter a valid URL';
      }
    }
    
    console.log('Form validation results:', { 
      product_name: formData.product_name.trim(),
      description: formData.description.trim(),
      category: formData.category.trim(),
      business_type: formData.business_type,
      features: featureTags.length,
      target_audience: audienceTags.length,
      keywords: keywordTags.length,
      errors: newErrors
    });
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }
    
    // Clear errors
    setErrors({});

    try {
      // Use fetch API directly for better FormData handling
      console.log("Submitting product with fetch API...");
      
      // Create FormData
      const formDataDirect = new FormData();
      
      // Add basic required fields
      formDataDirect.append('product_name', formData.product_name);
      formDataDirect.append('description', formData.description);
      formDataDirect.append('category', formData.category);
      formDataDirect.append('business_type', formData.business_type);
      formDataDirect.append('admin_priority', formData.admin_priority || 0);
      formDataDirect.append('currency', formData.pricing_currency || 'Kč');
      
      // Add URL if provided
      if (formData.url) {
        formDataDirect.append('url', formData.url);
      }
      
      // Add features - ensure at least one item
      if (featureTags.length > 0) {
        featureTags.forEach(feature => {
          if (feature.trim()) formDataDirect.append('features', feature.trim());
        });
      } else {
        formDataDirect.append('features', 'Default Feature');
      }
      
      // Add target_audience - ensure at least one item
      if (audienceTags.length > 0) {
        audienceTags.forEach(audience => {
          if (audience.trim()) formDataDirect.append('target_audience', audience.trim());
        });
      } else {
        formDataDirect.append('target_audience', 'Default Audience');
      }
      
      // Add keywords - ensure at least one item
      if (keywordTags.length > 0) {
        keywordTags.forEach(keyword => {
          if (keyword.trim()) formDataDirect.append('keywords', keyword.trim());
        });
      } else {
        formDataDirect.append('keywords', 'Default Keyword');
      }
      
      // Add pricing fields if provided
      if (formData.pricing_onetime) {
        const oneTimePrice = parseFloat(formData.pricing_onetime.toString().replace(',', '.').trim());
        if (!isNaN(oneTimePrice)) {
          formDataDirect.append('one_time_price', oneTimePrice);
        }
      }
      
      if (formData.pricing_monthly) {
        const monthlyPrice = parseFloat(formData.pricing_monthly.toString().replace(',', '.').trim());
        if (!isNaN(monthlyPrice)) {
          formDataDirect.append('monthly_price', monthlyPrice);
        }
      }
      
      if (formData.pricing_annual) {
        const annualPrice = parseFloat(formData.pricing_annual.toString().replace(',', '.').trim());
        if (!isNaN(annualPrice)) {
          formDataDirect.append('annual_price', annualPrice);
        }
      }
      
      // Add image if provided
      if (imageFile) {
        formDataDirect.append('image_file', imageFile);
      }
      
      // Log the data we're sending (as much as we can)
      console.log("Submitting product with image:", imageFile ? imageFile.name : 'None');
      const formDataEntries = [];
      for (let pair of formDataDirect.entries()) {
        if (pair[1] instanceof File) {
          formDataEntries.push(`${pair[0]}: File(${pair[1].name})`);
        } else {
          formDataEntries.push(`${pair[0]}: ${pair[1]}`);
        }
      }
      console.log("FormData contents:", formDataEntries);
      
      // Use fetch API directly to ensure proper FormData handling
      const fetchResponse = await fetch('http://localhost:8000/api/products/', {
        method: 'POST',
        body: formDataDirect,
      });
      
      if (!fetchResponse.ok) {
        // Handle error
        const errorData = await fetchResponse.text();
        console.error("Fetch submission error:", fetchResponse.status, errorData);
        
        setErrors({ 
          general: `Submission failed: ${fetchResponse.status} ${fetchResponse.statusText}. See console for details.`
        });
        toast.error(`Failed to add product: ${fetchResponse.status} ${fetchResponse.statusText}`);
      } else {
        // Handle success
        const responseData = await fetchResponse.json();
        console.log("Product successfully created:", responseData);
        
        // Update UI
        queryClient.invalidateQueries({ queryKey: ['products'] });
        toast.success("Product added successfully!");
        onClose();
      }
    } catch (err) {
      console.error("Form submission error:", err);
      setErrors({ general: 'Invalid form data or network error. See console for details.' });
      toast.error("Error submitting form: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // New function to generate AI suggestions
  const handleGenerateSuggestions = async () => {
    if (!formData.product_name.trim()) {
      setErrors({ product_name: 'Zadejte název produktu pro generování návrhů' });
      return;
    }

    try {
      setIsGeneratingSuggestions(true);
      console.log('Generuji návrhy pro produkt:', formData.product_name);
      
      // Use Czech language by default
      const language = 'cs';
      
      // Build query parameters
      const params = new URLSearchParams({
        product_name: formData.product_name,
        language: language
      });
      
      // Add optional parameters if available
      if (formData.description) {
        params.append('description', formData.description);
      }
      
      if (formData.category) {
        params.append('category', formData.category);
      }
      
      if (formData.business_type) {
        params.append('business_type', formData.business_type);
      }
      
      const response = await api.get(`/api/products/suggestions?${params.toString()}`);
      console.log('AI návrhy response:', response.data);
      
      if (response.data) {
        const targetAudience = response.data.target_audience || [];
        const keywords = response.data.keywords || [];
        const features = response.data.features || [];
        const categories = response.data.categories || [];
        
        console.log('Nastavuji návrhy:', { targetAudience, keywords, features, categories });
        
        setSuggestions({
          target_audience: targetAudience,
          keywords: keywords,
          features: features,
          categories: categories
        });
        
        if (targetAudience.length === 0 && keywords.length === 0 && features.length === 0 && categories.length === 0) {
          toast.info('Nebyly vygenerovány žádné návrhy. Zkuste přidat více detailů o produktu.');
        } else {
          toast.success(`Vygenerováno ${targetAudience.length} cílových skupin, ${keywords.length} klíčových slov, ${features.length} vlastností a ${categories.length} kategorií!`);
        }
      }
    } catch (error) {
      console.error('Chyba při generování návrhů:', error);
      toast.error(`Chyba při generování návrhů: ${error.message || 'Neznámá chyba'}`);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // New function to add a suggestion to tags
  const handleAddSuggestion = (type, item) => {
    // Check if item already exists to avoid duplicates
    switch (type) {
      case 'feature':
        if (!featureTags.includes(item)) {
          setFeatureTags([...featureTags, item]);
          // Remove from suggestions
          setSuggestions(prev => ({
            ...prev,
            features: prev.features.filter(i => i !== item)
          }));
        }
        break;
      case 'keyword':
        if (!keywordTags.includes(item)) {
          setKeywordTags([...keywordTags, item]);
          // Remove from suggestions
          setSuggestions(prev => ({
            ...prev,
            keywords: prev.keywords.filter(i => i !== item)
          }));
        }
        break;
      case 'audience':
        if (!audienceTags.includes(item)) {
          setAudienceTags([...audienceTags, item]);
          // Remove from suggestions
          setSuggestions(prev => ({
            ...prev,
            target_audience: prev.target_audience.filter(i => i !== item)
          }));
        }
        break;
      case 'category':
        setFormData(prev => ({ ...prev, category: item }));
        // Remove from suggestions
        setSuggestions(prev => ({
          ...prev,
          categories: prev.categories.filter(i => i !== item)
        }));
        break;
      default:
        break;
    }
  };

  // New helper function to add all AI suggestions at once for testing
  const handleAddAllSuggestions = () => {
    // Add one feature suggestion if available
    if (suggestions.features && suggestions.features.length > 0) {
      const feature = suggestions.features[0];
      if (!featureTags.includes(feature)) {
        setFeatureTags([...featureTags, feature]);
      }
    } else {
      // If no suggestions, add a test feature
      const testFeature = "Test Feature";
      if (!featureTags.includes(testFeature)) {
        setFeatureTags([...featureTags, testFeature]);
      }
    }
    
    // Add one keyword suggestion if available
    if (suggestions.keywords && suggestions.keywords.length > 0) {
      const keyword = suggestions.keywords[0];
      if (!keywordTags.includes(keyword)) {
        setKeywordTags([...keywordTags, keyword]);
      }
    } else {
      // If no suggestions, add a test keyword
      const testKeyword = "Test Keyword";
      if (!keywordTags.includes(testKeyword)) {
        setKeywordTags([...keywordTags, testKeyword]);
      }
    }
    
    // Add one audience suggestion if available
    if (suggestions.target_audience && suggestions.target_audience.length > 0) {
      const audience = suggestions.target_audience[0];
      if (!audienceTags.includes(audience)) {
        setAudienceTags([...audienceTags, audience]);
      }
    } else {
      // If no suggestions, add a test audience
      const testAudience = "Test Audience";
      if (!audienceTags.includes(testAudience)) {
        setAudienceTags([...audienceTags, testAudience]);
      }
    }
    
    // Set category if available and not already set
    if (suggestions.categories && suggestions.categories.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: suggestions.categories[0] }));
    } else if (!formData.category.trim()) {
      setFormData(prev => ({ ...prev, category: "Test Category" }));
    }
    
    // Set description if it's too short
    if (!formData.description || formData.description.trim().length < 10) {
      setFormData(prev => ({ ...prev, description: "This is a test product description that is longer than 10 characters" }));
    }
    
    toast.success('Added test data and suggestions for all required fields');
  };

  return (
    <div className={styles.card}>
      <div className={`${styles.flex} ${styles.flexBetween} ${styles.mb4}`}>
        <h3 className={styles.heading}>Add New Product</h3>
        <button
          onClick={onClose}
          className={`${styles.button} ${styles.buttonOutline}`}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* General Error */}
      {errors.general && (
        <div className={styles.errorContainer} role="alert">
          <p>{errors.general}</p>
        </div>
      )}

      {/* Validation Errors Summary */}
      {Object.keys(errors).length > 0 && !errors.general && (
        <div className={styles.errorContainer} role="alert">
          <ul className={styles.errorList}>
            {Object.entries(errors).map(([field, message]) => (
              field !== 'general' && <li key={field}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Test Helper for AI Suggestions */}
      {suggestions.features.length > 0 || suggestions.keywords.length > 0 || 
       suggestions.target_audience.length > 0 || suggestions.categories.length > 0 ? (
        <div className={styles.suggestionContainer}>
          <p className={styles.suggestionTitle}>
            <Sparkles size={16} className="mr-1 text-green-600" />
            Testing Helper
          </p>
          <button
            type="button"
            onClick={handleAddAllSuggestions}
            className={`${styles.button} ${styles.buttonOutline}`}
          >
            Add One Suggestion From Each Category (For Testing)
          </button>
          <p className={styles.formHelperText}>
            This will add one AI suggestion from each category to help test form submission
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div className={`${styles.grid} ${styles.grid2Columns}`}>
          {/* Product Name */}
          <div className={styles.formGroup}>
            <label htmlFor="product_name" className={styles.formLabel}>
              Product Name *
            </label>
            <div className={styles.flex}>
              <input
                id="product_name"
                type="text"
                className={styles.formInput}
                value={formData.product_name}
                onChange={handleChange}
                placeholder="Enter product name"
              />
              <button
                type="button"
                onClick={handleGenerateSuggestions}
                className={`${styles.button} ${styles.buttonOutline} ml-2`}
                disabled={isGeneratingSuggestions || !formData.product_name.trim()}
                title="Generovat AI návrhy na základě informací o produktu"
              >
                {isGeneratingSuggestions ? 'Generuji...' : (
                  <>
                    <Sparkles size={16} className="mr-1" />
                    AI Návrhy
                  </>
                )}
              </button>
            </div>
            {errors.product_name && <p className={styles.formError}>{errors.product_name}</p>}
            <p className={styles.formHelperText}>Name of the product.</p>
          </div>

          {/* Category */}
          <div className={styles.formGroup}>
            <label htmlFor="category" className={styles.formLabel}>
              Category *
            </label>
            <input
              id="category"
              type="text"
              className={styles.formInput}
              value={formData.category}
              onChange={handleChange}
              placeholder="Enter category"
            />
            {errors.category && <p className={styles.formError}>{errors.category}</p>}
            
            {/* AI Suggested Categories */}
            {suggestions.categories && suggestions.categories.length > 0 && (
              <div className={styles.suggestionContainer}>
                <p className={styles.suggestionTitle}>
                  <Sparkles size={16} className="mr-1" />
                  AI návrhy kategorií:
                </p>
                <div className={styles.suggestionList}>
                  {suggestions.categories.map((category, index) => (
                    <button
                      key={`category-suggestion-${index}`}
                      type="button"
                      className={styles.suggestionItem}
                      onClick={() => handleAddSuggestion('category', category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <p className={styles.formHelperText}>Product category (e.g., smartphone, laptop).</p>
          </div>
        </div>

        {/* Description */}
        <div className={styles.formGroup}>
          <label htmlFor="description" className={styles.formLabel}>
            Description *
          </label>
          <textarea
            id="description"
            rows={3}
            className={styles.formTextarea}
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter product description"
          />
          {errors.description && <p className={styles.formError}>{errors.description}</p>}
          <p className={styles.formHelperText}>Detailed product description.</p>
        </div>

        {/* Features */}
        <div className={styles.formGroup}>
          <label htmlFor="feature_input" className={styles.formLabel}>
            Features (Add tags)
          </label>
          <div className={styles.flex}>
            <input
              type="text"
              id="feature_input"
              className={styles.formInput}
              placeholder="Add a feature and press Enter"
              value={currentTag.field === 'feature_input' ? currentTag.value : ''}
              onChange={handleTagInputChange}
              onKeyPress={handleKeyPress}
            />
            <button
              type="button"
              onClick={addTag}
              className={`${styles.button} ${styles.buttonOutline} ml-2`}
              disabled={!currentTag.value || currentTag.field !== 'feature_input'}
            >
              <Tag size={16} />
            </button>
          </div>
          
          {/* AI Suggested Features */}
          {suggestions.features.length > 0 && (
            <div className={styles.suggestionContainer}>
              <p className={styles.suggestionTitle}>
                <Sparkles size={16} className="mr-1" />
                AI návrhy vlastností:
              </p>
              <div className={styles.suggestionList}>
                {suggestions.features.map((feature, index) => (
                  <button
                    key={`feature-suggestion-${index}`}
                    type="button"
                    className={styles.suggestionItem}
                    onClick={() => handleAddSuggestion('feature', feature)}
                  >
                    + {feature}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Feature Tags Display */}
          {featureTags.length > 0 && (
            <div className={styles.tagsContainer}>
              {featureTags.map((tag, index) => (
                <div key={`feature-${index}`} className={styles.tag}>
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag, 'feature')}
                    className={styles.tagRemove}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className={styles.formHelperText}>Key product features (e.g., OLED display, 4K resolution).</p>
        </div>

        {/* Target Audience */}
        <div className={styles.formGroup}>
          <label htmlFor="audience_input" className={styles.formLabel}>
            Target Audience (Add tags)
          </label>
          <div className={styles.flex}>
            <input
              type="text"
              id="audience_input"
              className={styles.formInput}
              placeholder="Add a target audience and press Enter"
              value={currentTag.field === 'audience_input' ? currentTag.value : ''}
              onChange={handleTagInputChange}
              onKeyPress={handleKeyPress}
            />
            <button
              type="button"
              onClick={addTag}
              className={`${styles.button} ${styles.buttonOutline} ml-2`}
              disabled={!currentTag.value || currentTag.field !== 'audience_input'}
            >
              <Tag size={16} />
            </button>
          </div>
          
          {/* AI Suggested Target Audience */}
          {suggestions.target_audience.length > 0 && (
            <div className={styles.suggestionContainer}>
              <p className={styles.suggestionTitle}>
                <Sparkles size={16} className="mr-1" />
                AI návrhy cílových skupin:
              </p>
              <div className={styles.suggestionList}>
                {suggestions.target_audience.map((audience, index) => (
                  <button
                    key={`audience-suggestion-${index}`}
                    type="button"
                    className={styles.suggestionItem}
                    onClick={() => handleAddSuggestion('audience', audience)}
                  >
                    + {audience}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Audience Tags Display */}
          {audienceTags.length > 0 && (
            <div className={styles.tagsContainer}>
              {audienceTags.map((tag, index) => (
                <div key={`audience-${index}`} className={styles.tag}>
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag, 'audience')}
                    className={styles.tagRemove}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className={styles.formHelperText}>Target audience (e.g., Small Business, Enterprise).</p>
        </div>

        {/* Keywords */}
        <div className={styles.formGroup}>
          <label htmlFor="keyword_input" className={styles.formLabel}>
            Keywords (Add tags)
          </label>
          <div className={styles.flex}>
            <input
              type="text"
              id="keyword_input"
              className={styles.formInput}
              placeholder="Add a keyword and press Enter"
              value={currentTag.field === 'keyword_input' ? currentTag.value : ''}
              onChange={handleTagInputChange}
              onKeyPress={handleKeyPress}
            />
            <button
              type="button"
              onClick={addTag}
              className={`${styles.button} ${styles.buttonOutline} ml-2`}
              disabled={!currentTag.value || currentTag.field !== 'keyword_input'}
            >
              <Tag size={16} />
            </button>
          </div>
          
          {/* AI Suggested Keywords */}
          {suggestions.keywords.length > 0 && (
            <div className={styles.suggestionContainer}>
              <p className={styles.suggestionTitle}>
                <Sparkles size={16} className="mr-1" />
                AI návrhy klíčových slov:
              </p>
              <div className={styles.suggestionList}>
                {suggestions.keywords.map((keyword, index) => (
                  <button
                    key={`keyword-suggestion-${index}`}
                    type="button" 
                    className={styles.suggestionItem}
                    onClick={() => handleAddSuggestion('keyword', keyword)}
                  >
                    + {keyword}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Keyword Tags Display */}
          {keywordTags.length > 0 && (
            <div className={styles.tagsContainer}>
              {keywordTags.map((tag, index) => (
                <div key={`keyword-${index}`} className={styles.tag}>
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag, 'keyword')}
                    className={styles.tagRemove}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className={styles.formHelperText}>Keywords for product search (e.g., software, productivity).</p>
        </div>

        {/* Pricing Section */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Pricing</label>
          <div className={`${styles.grid} ${styles.grid2Columns}`}>
            <div>
              <label htmlFor="pricing_onetime" className={styles.formLabel}>One-Time Price</label>
              <input
                id="pricing_onetime"
                type="text"
                className={styles.formInput}
                value={formData.pricing_onetime}
                onChange={handleChange}
                placeholder="e.g., 29999.99"
              />
              {errors.pricing_onetime && <p className={styles.formError}>{errors.pricing_onetime}</p>}
            </div>
            <div>
              <label htmlFor="pricing_monthly" className={styles.formLabel}>Monthly Price</label>
              <input
                id="pricing_monthly"
                type="text"
                className={styles.formInput}
                value={formData.pricing_monthly}
                onChange={handleChange}
                placeholder="e.g., 99.99"
              />
              {errors.pricing_monthly && <p className={styles.formError}>{errors.pricing_monthly}</p>}
            </div>
            <div>
              <label htmlFor="pricing_annual" className={styles.formLabel}>Annual Price</label>
              <input
                id="pricing_annual"
                type="text"
                className={styles.formInput}
                value={formData.pricing_annual}
                onChange={handleChange}
                placeholder="e.g., 999.99"
              />
              {errors.pricing_annual && <p className={styles.formError}>{errors.pricing_annual}</p>}
            </div>
            <div>
              <label htmlFor="pricing_currency" className={styles.formLabel}>Currency</label>
              <select
                id="pricing_currency"
                className={styles.formSelect}
                value={formData.pricing_currency}
                onChange={handleChange}
              >
                <option value="Kč">Kč</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <p className={styles.formHelperText}>At least one pricing option is recommended.</p>
        </div>

        {/* Business Type */}
        <div className={styles.formGroup}>
          <label htmlFor="business_type" className={styles.formLabel}>
            Business Type *
          </label>
          <select
            id="business_type"
            className={styles.formSelect}
            value={formData.business_type}
            onChange={handleChange}
          >
            <option value="">Select business type</option>
            {isLoadingBusinessTypes ? (
              <option value="" disabled>Loading business types...</option>
            ) : businessTypes.length > 0 ? (
              businessTypes.map((type, index) => (
                <option key={index} value={type.category || type.type || type}>
                  {type.category || type.type || type}
                </option>
              ))
            ) : (
              <option value="" disabled>No business types found</option>
            )}
            {!businessTypes.length && defaultBusinessType && (
              <option value={defaultBusinessType}>{defaultBusinessType}</option>
            )}
          </select>
          {errors.business_type && <p className={styles.formError}>{errors.business_type}</p>}
          <p className={styles.formHelperText}>Business type determines how products are compared and recommended.</p>
        </div>

        <div className={`${styles.grid} ${styles.grid2Columns}`}>
          <div className={styles.formGroup}>
            <label htmlFor="url" className={styles.formLabel}>
              URL
            </label>
            <input
              id="url"
              type="url"
              className={styles.formInput}
              value={formData.url}
              onChange={handleChange}
              placeholder="https://your-product-url.com"
            />
            {errors.url && <p className={styles.formError}>{errors.url}</p>}
            <p className={styles.formHelperText}>Link to the product page (optional).</p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="admin_priority" className={styles.formLabel}>
              Admin Priority
            </label>
            <input
              type="number"
              id="admin_priority"
              min="0"
              max="10"
              className={styles.formInput}
              value={formData.admin_priority}
              onChange={handleChange}
            />
            <p className={styles.formHelperText}>
              Higher number = higher priority for recommendations (0-10).
            </p>
          </div>
        </div>

        {/* Image Upload */}
        <div className={styles.formGroup}>
          <label htmlFor="image_file" className={styles.formLabel}>
            Product Image
          </label>
          <div className={styles.flex}>
            <label className={`${styles.button} ${styles.buttonOutline}`}>
              <Upload size={16} />
              <span>{imageFile ? 'Change Image' : 'Select Image'}</span>
              <input
                id="image_file"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {imageFile && (
              <span className="text-sm text-gray-600">
                {imageFile.name} ({Math.round(imageFile.size / 1024)} KB)
              </span>
            )}
          </div>
          {errors.imageFile && <p className={styles.formError}>{errors.imageFile}</p>}
          <p className={styles.formHelperText}>Upload product image (optional, image files only).</p>
          
          {/* Image preview */}
          {imagePreview && (
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-700 mb-1">Preview:</p>
              <div className="w-32 h-32 border rounded-md overflow-hidden">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover"/>
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className={`${styles.flex}`} style={{justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem'}}>
          <button
            type="button"
            onClick={onClose}
            className={`${styles.button} ${styles.buttonOutline}`}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`${styles.button} ${styles.buttonPrimary}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : (
              <>
                <Plus size={16} className="mr-1" />
                Add Product
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProductForm;