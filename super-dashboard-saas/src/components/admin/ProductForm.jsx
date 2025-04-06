import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Plus, X, Upload, Sparkles } from 'lucide-react';
import api from '../../utils/api';
import styles from './Product.module.css';
import { toast } from 'react-toastify';

const ProductForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    product_name: '',
    description: '',
    category: '',
    business_type: '',
    features: [],
    one_time_price: '',
    monthly_price: '',
    annual_price: '',
    currency: 'Kč',
    target_audience: [],
    keywords: [],
    url: '',
    admin_priority: 0,
    currentFeature: '',
    currentKeyword: '',
    currentAudience: '',
    imageFile: null,
    imagePreview: null
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState({
    target_audience: [],
    keywords: [],
    features: []
  });

  // Fetch business types for dropdown
  const { data: businessTypes } = useQuery({
    queryKey: ['businessTypes'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/business/types');
        return response.data;
      } catch (error) {
        console.error('Error fetching business types:', error);
        return [];
      }
    }
  });

  // Fetch product data if editing
  const { data: productData, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get(`/api/products/${id}`);
      return response.data;
    },
    enabled: isEditing
  });

  // Update form when product data is loaded
  useEffect(() => {
    if (productData) {
      setFormData({
        product_name: productData.product_name || '',
        description: productData.description || '',
        category: productData.category || '',
        business_type: productData.business_type || '',
        features: productData.features || [],
        one_time_price: productData.pricing?.one_time || '',
        monthly_price: productData.pricing?.monthly || '',
        annual_price: productData.pricing?.annual || '',
        currency: productData.pricing?.currency || 'Kč',
        target_audience: productData.target_audience || [],
        keywords: productData.keywords || [],
        url: productData.url || '',
        admin_priority: productData.admin_priority || 0,
        currentFeature: '',
        currentKeyword: '',
        currentAudience: '',
        imageFile: null,
        imagePreview: productData.image_url || null
      });
    }
  }, [productData]);

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await api.post('/api/products/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/admin/products');
    },
    onError: (error) => {
      console.error('Error creating product:', error);
      setErrors(error.response?.data?.detail || { general: 'Error creating product' });
      setIsSubmitting(false);
    }
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, formData }) => {
      const response = await api.put(`/api/products/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      navigate('/admin/products');
    },
    onError: (error) => {
      console.error('Error updating product:', error);
      setErrors(error.response?.data?.detail || { general: 'Error updating product' });
      setIsSubmitting(false);
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleNumberInputChange = (e) => {
    const { name, value } = e.target;
    // Only allow numbers and decimal point
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        imageFile: file,
        imagePreview: URL.createObjectURL(file)
      });
    }
  };

  // Add item to array (features, keywords, target_audience)
  const handleAddItem = (fieldName, currentField) => {
    if (formData[currentField].trim()) {
      setFormData({
        ...formData,
        [fieldName]: [...formData[fieldName], formData[currentField].trim()],
        [currentField]: ''
      });
    }
  };

  // Remove item from array
  const handleRemoveItem = (fieldName, index) => {
    setFormData({
      ...formData,
      [fieldName]: formData[fieldName].filter((_, i) => i !== index)
    });
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
        
        console.log('Nastavuji návrhy:', { targetAudience, keywords, features });
        
        setSuggestions({
          target_audience: targetAudience,
          keywords: keywords,
          features: features
        });
        
        if (targetAudience.length === 0 && keywords.length === 0 && features.length === 0) {
          toast.info('Nebyly vygenerovány žádné návrhy. Zkuste přidat více detailů o produktu.');
        } else {
          toast.success(`Vygenerováno ${targetAudience.length} cílových skupin, ${keywords.length} klíčových slov a ${features.length} vlastností!`);
        }
      }
    } catch (error) {
      console.error('Chyba při generování návrhů:', error);
      toast.error(`Chyba při generování návrhů: ${error.message || 'Neznámá chyba'}`);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // New function to add a suggestion to the form data
  const handleAddSuggestion = (type, item) => {
    // Check if item already exists in the array to avoid duplicates
    if (type === 'target_audience' && !formData.target_audience.includes(item)) {
      setFormData({
        ...formData,
        target_audience: [...formData.target_audience, item]
      });
      
      // Remove from suggestions
      setSuggestions(prev => ({
        ...prev,
        target_audience: prev.target_audience.filter(i => i !== item)
      }));
    } else if (type === 'keywords' && !formData.keywords.includes(item)) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, item]
      });
      
      // Remove from suggestions
      setSuggestions(prev => ({
        ...prev,
        keywords: prev.keywords.filter(i => i !== item)
      }));
    } else if (type === 'features' && !formData.features.includes(item)) {
      setFormData({
        ...formData,
        features: [...formData.features, item]
      });
      
      // Remove from suggestions
      setSuggestions(prev => ({
        ...prev,
        features: prev.features.filter(i => i !== item)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // Basic validation
    const newErrors = {};
    if (!formData.product_name.trim()) newErrors.product_name = 'Product name is required';
    if (!formData.category.trim()) newErrors.category = 'Category is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    // Create FormData object for the API
    const submitFormData = new FormData();
    submitFormData.append('product_name', formData.product_name);
    submitFormData.append('description', formData.description);
    submitFormData.append('category', formData.category);
    submitFormData.append('business_type', formData.business_type);
    
    // Add arrays as comma-separated strings or as individual items
    formData.features.forEach(feature => {
      submitFormData.append('features', feature);
    });
    
    formData.target_audience.forEach(audience => {
      submitFormData.append('target_audience', audience);
    });
    
    formData.keywords.forEach(keyword => {
      submitFormData.append('keywords', keyword);
    });

    // Add pricing fields
    if (formData.one_time_price) submitFormData.append('one_time_price', formData.one_time_price);
    if (formData.monthly_price) submitFormData.append('monthly_price', formData.monthly_price);
    if (formData.annual_price) submitFormData.append('annual_price', formData.annual_price);
    submitFormData.append('currency', formData.currency);
    
    // Add other fields
    if (formData.url) submitFormData.append('url', formData.url);
    submitFormData.append('admin_priority', formData.admin_priority);
    
    // Add image if selected
    if (formData.imageFile) {
      submitFormData.append('image_file', formData.imageFile);
    }

    try {
      if (isEditing) {
        await updateProductMutation.mutateAsync({ id, formData: submitFormData });
      } else {
        await createProductMutation.mutateAsync(submitFormData);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setIsSubmitting(false);
    }
  };

  if (isEditing && isLoadingProduct) {
    return <div className={styles.loadingContainer}>Loading product data...</div>;
  }

  return (
    <div className={styles.formContainer}>
      <div className={styles.formHeader}>
        <button 
          type="button" 
          onClick={() => navigate('/admin/products')}
          className={styles.backButton}
        >
          <ArrowLeft size={16} />
          Back to Products
        </button>
        <h1 className={styles.formTitle}>
          {isEditing ? 'Edit Product' : 'Create New Product'}
        </h1>
      </div>

      {errors.general && (
        <div className={styles.errorMessage}>{errors.general}</div>
      )}

      <form onSubmit={handleSubmit} className={styles.productForm}>
        <div className={styles.formGrid}>
          {/* Left Column */}
          <div className={styles.formColumn}>
            <div className={styles.formGroup}>
              <label htmlFor="product_name" className={styles.formLabel}>
                Product Name*
              </label>
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  id="product_name"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleInputChange}
                  className={`${styles.formInput} ${errors.product_name ? styles.inputError : ''}`}
                  required
                />
                <button
                  type="button"
                  onClick={handleGenerateSuggestions}
                  className={styles.aiButton}
                  disabled={isGeneratingSuggestions || !formData.product_name.trim()}
                  title="Generovat AI návrhy na základě informací o produktu"
                >
                  {isGeneratingSuggestions ? 'Generuji...' : (
                    <>
                      <Sparkles size={16} className={styles.buttonIcon} />
                      AI Návrhy
                    </>
                  )}
                </button>
              </div>
              {errors.product_name && (
                <div className={styles.errorText}>{errors.product_name}</div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="category" className={styles.formLabel}>
                Category*
              </label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={`${styles.formInput} ${errors.category ? styles.inputError : ''}`}
                required
              />
              {errors.category && (
                <div className={styles.errorText}>{errors.category}</div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="business_type" className={styles.formLabel}>
                Business Type
              </label>
              <select
                id="business_type"
                name="business_type"
                value={formData.business_type}
                onChange={handleInputChange}
                className={styles.formSelect}
              >
                <option value="">Select Business Type</option>
                {businessTypes?.map((type, index) => (
                  <option key={index} value={type.type || type}>
                    {type.name || type.type || type}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description" className={styles.formLabel}>
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className={styles.formTextarea}
                rows={5}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="url" className={styles.formLabel}>
                URL
              </label>
              <input
                type="url"
                id="url"
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="https://example.com/product"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="admin_priority" className={styles.formLabel}>
                Admin Priority
              </label>
              <input
                type="number"
                id="admin_priority"
                name="admin_priority"
                value={formData.admin_priority}
                onChange={handleNumberInputChange}
                className={styles.formInput}
                min="0"
                max="10"
              />
              <small className={styles.inputHelp}>
                Higher values (0-10) will be shown first in search results
              </small>
            </div>
          </div>

          {/* Right Column */}
          <div className={styles.formColumn}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Pricing</label>
              <div className={styles.pricingGrid}>
                <div>
                  <label htmlFor="one_time_price" className={styles.subLabel}>
                    One-time Price
                  </label>
                  <input
                    type="text"
                    id="one_time_price"
                    name="one_time_price"
                    value={formData.one_time_price}
                    onChange={handleNumberInputChange}
                    className={styles.formInput}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="monthly_price" className={styles.subLabel}>
                    Monthly Price
                  </label>
                  <input
                    type="text"
                    id="monthly_price"
                    name="monthly_price"
                    value={formData.monthly_price}
                    onChange={handleNumberInputChange}
                    className={styles.formInput}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="annual_price" className={styles.subLabel}>
                    Annual Price
                  </label>
                  <input
                    type="text"
                    id="annual_price"
                    name="annual_price"
                    value={formData.annual_price}
                    onChange={handleNumberInputChange}
                    className={styles.formInput}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="currency" className={styles.subLabel}>
                    Currency
                  </label>
                  <input
                    type="text"
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className={styles.formInput}
                  />
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Product Image</label>
              <div className={styles.imageUploadContainer}>
                {formData.imagePreview ? (
                  <div className={styles.imagePreviewWrapper}>
                    <img
                      src={formData.imagePreview}
                      alt="Product Preview"
                      className={styles.imagePreview}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        imageFile: null, 
                        imagePreview: null 
                      })}
                      className={styles.removeImageButton}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className={styles.imageUploadLabel}>
                    <input
                      type="file"
                      onChange={handleImageChange}
                      className={styles.fileInput}
                      accept="image/*"
                    />
                    <div className={styles.uploadPlaceholder}>
                      <Upload size={24} />
                      <span>Click to upload image</span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Features</label>
              <div className={styles.addItemContainer}>
                <input
                  type="text"
                  value={formData.currentFeature}
                  onChange={(e) => setFormData({ ...formData, currentFeature: e.target.value })}
                  className={styles.formInput}
                  placeholder="Add a feature"
                />
                <button
                  type="button"
                  onClick={() => handleAddItem('features', 'currentFeature')}
                  className={styles.addItemButton}
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className={styles.tagsList}>
                {formData.features.map((feature, index) => (
                  <div key={index} className={styles.tag}>
                    {feature}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem('features', index)}
                      className={styles.removeTagButton}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Target Audience</label>
              <div className={styles.addItemContainer}>
                <input
                  type="text"
                  value={formData.currentAudience}
                  onChange={(e) => setFormData({ ...formData, currentAudience: e.target.value })}
                  className={styles.formInput}
                  placeholder="Add target audience"
                />
                <button
                  type="button"
                  onClick={() => handleAddItem('target_audience', 'currentAudience')}
                  className={styles.addItemButton}
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className={styles.tagsList}>
                {formData.target_audience.map((audience, index) => (
                  <div key={index} className={styles.tag}>
                    {audience}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem('target_audience', index)}
                      className={styles.removeTagButton}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Keywords</label>
              <div className={styles.addItemContainer}>
                <input
                  type="text"
                  value={formData.currentKeyword}
                  onChange={(e) => setFormData({ ...formData, currentKeyword: e.target.value })}
                  className={styles.formInput}
                  placeholder="Add a keyword"
                />
                <button
                  type="button"
                  onClick={() => handleAddItem('keywords', 'currentKeyword')}
                  className={styles.addItemButton}
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className={styles.tagsList}>
                {formData.keywords.map((keyword, index) => (
                  <div key={index} className={styles.tag}>
                    {keyword}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem('keywords', index)}
                      className={styles.removeTagButton}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className={styles.cancelButton}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              'Saving...'
            ) : (
              <>
                <Save size={16} />
                {isEditing ? 'Update Product' : 'Create Product'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;