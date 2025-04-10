import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { X, Save, Tag } from 'lucide-react';
import styles from './AdminPanel.module.css';

const EditBusinessTypeForm = ({ businessTypeId, onClose, onBusinessConfigUpdated }) => {
    const [formData, setFormData] = useState({
        category: '',
        key_features: '',
        comparison_metrics: '',
        recommendation_template: ''
    });
    const [errors, setErrors] = useState({});
    const queryClient = useQueryClient();

    // Fetch business type data
    const { data: businessTypeConfig, isLoading, isError, error } = useQuery({
        queryKey: ['businessTypeConfig', businessTypeId],
        queryFn: async () => {
            const response = await api.get(`/api/comparison-configs/${businessTypeId}`);
            return response.data;
        },
        enabled: !!businessTypeId,
        retry: 1,
    });

    // Update form when data is loaded
    useEffect(() => {
        if (businessTypeConfig) {
            setFormData({
                category: businessTypeConfig.category || '',
                key_features: Array.isArray(businessTypeConfig.key_features) 
                    ? businessTypeConfig.key_features.join(', ') 
                    : '',
                comparison_metrics: Array.isArray(businessTypeConfig.comparison_metrics) 
                    ? businessTypeConfig.comparison_metrics.join(', ') 
                    : '',
                recommendation_template: businessTypeConfig.recommendation_template || ''
            });
        }
    }, [businessTypeConfig]);

    // Update business type mutation
    const updateBusinessTypeMutation = useMutation({
        mutationFn: (updatedConfig) => api.put(`/api/comparison-configs/${businessTypeId}`, updatedConfig),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['businessTypes'] });
            queryClient.invalidateQueries({ queryKey: ['businessTypeConfig', businessTypeId] });
            if (onBusinessConfigUpdated) onBusinessConfigUpdated(data.data);
            toast.success('Business Type updated successfully!');
            onClose();
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.detail || error.message || 'An unknown error occurred';
            toast.error(`Failed to update business type: ${errorMessage}`);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validate form
        const validationErrors = {};
        if (!formData.category.trim()) {
            validationErrors.category = 'Category is required';
        }
        
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        
        // Clear any previous errors
        setErrors({});
        
        // Prepare data for API
        const configData = {
            category: formData.category,
            key_features: formData.key_features.split(',').map(f => f.trim()).filter(Boolean),
            comparison_metrics: formData.comparison_metrics.split(',').map(m => m.trim()).filter(Boolean),
            recommendation_template: formData.recommendation_template
        };
        
        updateBusinessTypeMutation.mutate(configData);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    // Insert placeholder into the template field
    const handleInsertPlaceholder = (placeholder) => {
        setFormData(prev => ({
            ...prev,
            recommendation_template: prev.recommendation_template + placeholder
        }));
    };

    if (isLoading) {
        return (
            <div className={styles.card}>
                <div className="flex items-center justify-center p-6">
                    <div className="animate-pulse text-gray-500">Loading business type data...</div>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className={styles.card}>
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md" role="alert">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline"> {error?.message || 'Failed to load business type configuration'}</span>
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

    // Available placeholders for recommendation templates
    const availablePlaceholders = [
        "{product_name}",
        "{product_price}",
        "{category}",
        "{features}",
        "{comparison_result}",
        "{recommendations}",
        "{pros}",
        "{cons}"
    ];

    return (
        <div className={styles.card}>
            <div className={`${styles.flex} ${styles.flexBetween} ${styles.mb4}`}>
                <h3 className={styles.heading}>Edit Business Type</h3>
                <button
                    onClick={onClose}
                    className={`${styles.button} ${styles.buttonOutline}`}
                    aria-label="Close"
                >
                    <X size={18} />
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label htmlFor="category" className={styles.formLabel}>
                        Category * <span className="text-xs text-gray-500">(cannot be changed)</span>
                    </label>
                    <input
                        type="text"
                        id="category"
                        name="category"
                        className={`${styles.formInput} bg-gray-100 cursor-not-allowed`}
                        value={formData.category}
                        readOnly
                    />
                    <p className={styles.formHelperText}>
                        The business type category identifier cannot be changed after creation.
                    </p>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="key_features" className={styles.formLabel}>
                        Key Features <span className="text-xs text-gray-500">(comma-separated)</span>
                    </label>
                    <input
                        type="text"
                        id="key_features"
                        name="key_features"
                        placeholder="e.g., display_technology, screen_size, resolution"
                        className={styles.formInput}
                        value={formData.key_features}
                        onChange={handleChange}
                    />
                    <p className={styles.formHelperText}>
                        List key features relevant to products of this business type. These are used for product comparison.
                    </p>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="comparison_metrics" className={styles.formLabel}>
                        Comparison Metrics <span className="text-xs text-gray-500">(comma-separated)</span>
                    </label>
                    <input
                        type="text"
                        id="comparison_metrics"
                        name="comparison_metrics"
                        placeholder="e.g., price_difference, feature_similarity"
                        className={styles.formInput}
                        value={formData.comparison_metrics}
                        onChange={handleChange}
                    />
                    <p className={styles.formHelperText}>
                        Define metrics used to compare products of this business type.
                    </p>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="recommendation_template" className={styles.formLabel}>
                        Recommendation Template
                    </label>
                    <textarea
                        id="recommendation_template"
                        name="recommendation_template"
                        rows={6}
                        placeholder="Template for product recommendations. Use placeholders like {product_name}, {features}, etc."
                        className={styles.formTextarea}
                        value={formData.recommendation_template}
                        onChange={handleChange}
                    />
                    
                    {/* Placeholder buttons */}
                    <div className="mt-2 mb-1">
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                            Available Placeholders:
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {availablePlaceholders.map(placeholder => (
                                <button
                                    key={placeholder}
                                    type="button"
                                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    onClick={() => handleInsertPlaceholder(placeholder)}
                                >
                                    <Tag size={12} className="mr-1" />
                                    {placeholder}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <p className={styles.formHelperText}>
                        Customize how product recommendations are presented. Use placeholders to insert dynamic content.
                    </p>
                </div>

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
                        disabled={updateBusinessTypeMutation.isPending}
                    >
                        {updateBusinessTypeMutation.isPending ? 'Updating...' : (
                            <>
                                <Save size={16} className="mr-1" />
                                Update Business Type
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditBusinessTypeForm;