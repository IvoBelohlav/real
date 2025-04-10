// Complete EditProductForm with All Original Fields and Image Upload
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getStaticUrl } from '../../utils/api';
import { toast } from 'react-toastify';
import { X, Save, Upload } from 'lucide-react';
import styles from './AdminPanel.module.css';

const EditProductForm = ({ productId, onClose }) => {
    const [formData, setFormData] = useState({
        product_name: '',
        description: '',
        features: '',
        pricing_onetime: '',
        pricing_monthly: '',
        pricing_annual: '',
        pricing_currency: 'Kč',
        category: '',
        business_type: '',
        target_audience: '',
        keywords: '',
        url: '',
        admin_priority: 0,
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const queryClient = useQueryClient();
    const [imageTimestamp, setImageTimestamp] = useState(Date.now());

    // Fetch business types
    const { data: businessTypes = [] } = useQuery({
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

    // Fetch the product data
    const { data: product, isLoading, isError, error: fetchError } = useQuery({
        queryKey: ['product', productId],
        queryFn: async () => {
            const response = await api.get(`/api/products/${productId}`);
            return response.data;
        },
        enabled: !!productId,
        retry: 3,
        retryDelay: 1000,
    });

    // Update form data when product is loaded
    useEffect(() => {
        if (product) {
            console.log("Product data loaded:", product);
            setFormData({
                product_name: product.product_name || '',
                description: product.description || '',
                features: Array.isArray(product.features) ? product.features.join(', ') : '',
                pricing_onetime: product.pricing?.one_time || '',
                pricing_monthly: product.pricing?.monthly || '',
                pricing_annual: product.pricing?.annual || '',
                pricing_currency: product.pricing?.currency || 'Kč',
                category: product.category || '',
                business_type: product.business_type || '',
                target_audience: Array.isArray(product.target_audience) ? product.target_audience.join(', ') : '',
                keywords: Array.isArray(product.keywords) ? product.keywords.join(', ') : '',
                url: product.url || '',
                admin_priority: product.admin_priority || 0,
            });
        }
    }, [product]);

    // Handle product data update (without image)
    const updateProductMutation = useMutation({
        mutationFn: async (updateData) => {
            try {
                // Always use the JSON endpoint for product data
                return await api.put(`/api/products/${productId}/json`, updateData, {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
            } catch (error) {
                console.error('Request error details:', {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status
                });
                throw error;
            }
        },
        onSuccess: async (data) => {
            // If there's also an image to upload, do that next
            if (imageFile) {
                await uploadImageMutation.mutate();
            } else {
                // No image to upload, just complete the process
                queryClient.invalidateQueries({ queryKey: ['products'] });
                queryClient.invalidateQueries({ queryKey: ['product', productId] });
                toast.success('Product updated successfully!');
                onClose();
            }
        },
        onError: (error) => {
            console.error('Update product error:', error);
            let errorMessage = 'Failed to update product. Please try again.';
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
            setError(errorMessage);
            toast.error(errorMessage);
        },
    });

    // Separate mutation for image upload
    const uploadImageMutation = useMutation({
        mutationFn: async () => {
            try {
                // Use FormData only for the image file
                const formData = new FormData();
                formData.append('image_file', imageFile);
                
                console.log('Uploading image:', imageFile.name);
                
                // Use dedicated image upload endpoint
                return await api.put(`/api/products/${productId}/upload-image`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    }
                });
            } catch (error) {
                console.error('Image upload error details:', {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status
                });
                throw error;
            }
        },
        onSuccess: (data) => {
            // Update timestamp to force image refresh
            setImageTimestamp(Date.now());
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['product', productId] });
            toast.success('Product and image updated successfully!');
            onClose();
        },
        onError: (error) => {
            console.error('Image upload error:', error);
            // Even if image upload fails, the product data was updated
            toast.warning(`Product data updated, but image upload failed: ${error.message || 'Unknown error'}`);
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['product', productId] });
            onClose();
        },
    });

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
        
        // Clear error when user types
        if (validationErrors[id]) {
            setValidationErrors(prev => ({ ...prev, [id]: null }));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            
            // Create a preview URL for the image
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
        }
    };

    // Form submission handler
    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setValidationErrors({});

        // Validate form data
        const errors = {};
        if (!formData.product_name) {
            errors.product_name = 'Product name is required';
        }
        if (!formData.description) {
            errors.description = 'Description is required';
        }
        if (!formData.category) {
            errors.category = 'Category is required';
        }
        if (!formData.business_type) {
            errors.business_type = 'Business type is required';
        }
        
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        try {
            // Create a clean JSON object for the update
            const updateData = {
                product_name: formData.product_name,
                description: formData.description,
                category: formData.category,
                business_type: formData.business_type,
                admin_priority: Number(formData.admin_priority || 0)
            };
            
            // Add URL if provided
            if (formData.url) updateData.url = formData.url;
            
            // Process array fields properly
            updateData.features = formData.features
                ? formData.features.split(',').map(item => item.trim()).filter(Boolean)
                : [];
                
            updateData.target_audience = formData.target_audience
                ? formData.target_audience.split(',').map(item => item.trim()).filter(Boolean)
                : [];
                
            updateData.keywords = formData.keywords
                ? formData.keywords.split(',').map(item => item.trim()).filter(Boolean)
                : [];
            
            // Create pricing object
            updateData.pricing = {};
            if (formData.pricing_onetime) updateData.pricing.one_time = formData.pricing_onetime;
            if (formData.pricing_monthly) updateData.pricing.monthly = formData.pricing_monthly;
            if (formData.pricing_annual) updateData.pricing.annual = formData.pricing_annual;
            if (formData.pricing_currency) updateData.pricing.currency = formData.pricing_currency;
            
            console.log('Submitting product update:', updateData);
            
            // Send the JSON data
            updateProductMutation.mutate(updateData);
            
        } catch (err) {
            console.error("Form submission error:", err);
            setError('Invalid form data. Please check all fields and try again.');
        }
    };

    // Render content (loading, error, form)
    if (isLoading) {
        return (
            <div className={styles.card}>
                <div className="flex items-center justify-center p-6">
                    <div className="animate-pulse text-gray-500">Loading product data...</div>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className={styles.card}>
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md" role="alert">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline"> Failed to load product: {fetchError?.message}</span>
                    <button 
                        onClick={onClose} 
                        className="mt-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.card}>
            <div className={`${styles.flex} ${styles.flexBetween} ${styles.mb4}`}>
                <h3 className={styles.heading}>Edit Product</h3>
                <button
                    onClick={onClose}
                    className={`${styles.button} ${styles.buttonOutline}`}
                    aria-label="Close"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Validation Errors */}
            {Object.keys(validationErrors).length > 0 && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4" role="alert">
                    <ul className="list-disc pl-5">
                        {Object.values(validationErrors).map((error, index) => (
                            error && <li key={index} className="text-sm">{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* General Error */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4" role="alert">
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className={`${styles.grid} ${styles.grid2Columns}`}>
                    {/* Product Name */}
                    <div className={styles.formGroup}>
                        <label htmlFor="product_name" className={styles.formLabel}>
                            Product Name *
                        </label>
                        <input
                            id="product_name"
                            type="text"
                            required
                            className={`${styles.formInput} ${validationErrors.product_name ? 'border-red-500' : ''}`}
                            value={formData.product_name}
                            onChange={handleChange}
                            placeholder="Enter product name"
                        />
                        {validationErrors.product_name && <p className={styles.formError}>{validationErrors.product_name}</p>}
                    </div>

                    {/* Category */}
                    <div className={styles.formGroup}>
                        <label htmlFor="category" className={styles.formLabel}>
                            Category *
                        </label>
                        <input
                            id="category"
                            type="text"
                            required
                            className={`${styles.formInput} ${validationErrors.category ? 'border-red-500' : ''}`}
                            value={formData.category}
                            onChange={handleChange}
                            placeholder="Enter category"
                        />
                        {validationErrors.category && <p className={styles.formError}>{validationErrors.category}</p>}
                    </div>
                </div>

                {/* Description */}
                <div className={styles.formGroup}>
                    <label htmlFor="description" className={styles.formLabel}>
                        Description *
                    </label>
                    <textarea
                        id="description"
                        required
                        rows={3}
                        className={`${styles.formTextarea} ${validationErrors.description ? 'border-red-500' : ''}`}
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Enter product description"
                    />
                    {validationErrors.description && <p className={styles.formError}>{validationErrors.description}</p>}
                </div>

                {/* Features */}
                <div className={styles.formGroup}>
                    <label htmlFor="features" className={styles.formLabel}>
                        Features (comma-separated)
                    </label>
                    <input
                        id="features"
                        type="text"
                        className={styles.formInput}
                        value={formData.features}
                        onChange={handleChange}
                        placeholder="Feature 1, Feature 2, Feature 3"
                    />
                    <p className={styles.formHelperText}>Key product features (e.g., 'OLED display, 4K resolution').</p>
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
                        className={`${styles.formSelect} ${validationErrors.business_type ? 'border-red-500' : ''}`}
                        value={formData.business_type}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select business type</option>
                        {businessTypes.map((type, index) => (
                            <option key={index} value={type.category || type.type || type}>
                                {type.category || type.type || type}
                            </option>
                        ))}
                        {/* Include current value if not in the list */}
                        {formData.business_type && 
                            !businessTypes.some(t => (t.category || t.type || t) === formData.business_type) && (
                            <option value={formData.business_type}>{formData.business_type}</option>
                        )}
                    </select>
                    {validationErrors.business_type && <p className={styles.formError}>{validationErrors.business_type}</p>}
                    <p className={styles.formHelperText}>Business type determines how products are compared and recommended.</p>
                </div>

                {/* Additional Information */}
                <div className={`${styles.grid} ${styles.grid2Columns}`}>
                    <div className={styles.formGroup}>
                        <label htmlFor="target_audience" className={styles.formLabel}>
                            Target Audience (comma-separated)
                        </label>
                        <input
                            id="target_audience"
                            type="text"
                            className={styles.formInput}
                            value={formData.target_audience}
                            onChange={handleChange}
                            placeholder="Small Business, Enterprise"
                        />
                        <p className={styles.formHelperText}>Target audience (e.g., 'Small Business, Enterprise').</p>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="keywords" className={styles.formLabel}>
                            Keywords (comma-separated)
                        </label>
                        <input
                            id="keywords"
                            type="text"
                            className={styles.formInput}
                            value={formData.keywords}
                            onChange={handleChange}
                            placeholder="software, productivity"
                        />
                        <p className={styles.formHelperText}>Keywords for product search (e.g., 'software, productivity').</p>
                    </div>
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
                    <div className="flex items-center space-x-2">
                        <label className="cursor-pointer flex items-center space-x-2 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50">
                            <Upload size={16} />
                            <span>{imageFile ? 'Change Image' : 'Update Image'}</span>
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
                        {product?.image_url && !imageFile && (
                            <span className="text-sm text-gray-600">
                                Current image: {product.image_url.split('/').pop()}
                            </span>
                        )}
                    </div>
                    <p className={styles.formHelperText}>Upload product image (optional, image files only). Leave empty to keep current image.</p>
                    
                    {/* Add image preview */}
                    {product?.image_url && !imageFile && (
                        <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700 mb-1">Current image:</p>
                            <div className="w-32 h-32 border rounded-md overflow-hidden">
                                <img 
                                    src={getStaticUrl(product.image_url, true)} 
                                    alt={product.product_name} 
                                    className="w-full h-full object-cover"
                                    key={imageTimestamp}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Submit buttons */}
                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`${styles.button} ${styles.buttonOutline}`}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={`${styles.button} ${styles.buttonPrimary}`}
                        disabled={updateProductMutation.isPending || uploadImageMutation.isPending}
                    >
                        {updateProductMutation.isPending || uploadImageMutation.isPending ? 'Updating...' : (
                            <>
                                <Save size={16} className="mr-1" />
                                Update Product
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditProductForm;