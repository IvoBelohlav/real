import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { X, Plus, Tag, Sparkles } from 'lucide-react';
import styles from './AddBusinessTypeForm.module.css';

const AddBusinessTypeForm = ({ onClose, onBusinessConfigAdded, initialData = null, isEditing = false }) => {
    const [formData, setFormData] = useState({
        category: '',
        key_features: [],
        comparison_metrics: [],
        recommendation_template: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentFeatureTag, setCurrentFeatureTag] = useState('');
    const [currentMetricTag, setCurrentMetricTag] = useState('');
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState({
        key_features: [],
        comparison_metrics: []
    });
    const queryClient = useQueryClient();

    // Load initial data if editing an existing business type
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                category: initialData.category || '',
                key_features: Array.isArray(initialData.key_features) ? initialData.key_features : [],
                comparison_metrics: Array.isArray(initialData.comparison_metrics) ? initialData.comparison_metrics : [],
                recommendation_template: initialData.recommendation_template || ''
            }));
        }
    }, [initialData]);

    const addBusinessTypeMutation = useMutation({
        mutationFn: (newConfig) => {
            if (isEditing) {
                return api.put(`/api/comparison-configs/${initialData.category}`, newConfig);
            } else {
                return api.post('/api/comparison-configs', newConfig);
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['businessTypes'] });
            queryClient.invalidateQueries({ queryKey: ['business-types'] });
            if (onBusinessConfigAdded) onBusinessConfigAdded(data.data);
            onClose();
            toast.success(`Business Type Configuration ${isEditing ? 'updated' : 'added'} successfully!`);
            setIsSubmitting(false);
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.detail || error.message || 'An unknown error occurred';
            toast.error(`Failed to ${isEditing ? 'update' : 'add'} business type: ${errorMessage}`);
            setIsSubmitting(false);
        }
    });

    const validateForm = () => {
        const newErrors = {};
        if (!formData.category.trim()) {
            newErrors.category = 'Category is required';
        } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.category)) {
            newErrors.category = 'Category can only contain letters, numbers, underscores, and hyphens';
        }
        
        return newErrors;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validate form
        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        
        // Clear any previous errors
        setErrors({});
        setIsSubmitting(true);
        
        // Prepare data for API - Fix structure to match ComparisonConfig model
        const configData = {
            category: formData.category,
            key_features: formData.key_features,
            comparison_metrics: formData.comparison_metrics,
            feature_weights: {}, // Empty default
            scoring_rules: {}, // Empty default
            recommendation_template: formData.recommendation_template || ""
        };
        
        console.log("Sending data:", configData);
        addBusinessTypeMutation.mutate(configData);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleAddFeatureTag = () => {
        if (currentFeatureTag.trim()) {
            const updatedFeatures = formData.key_features 
                ? [...formData.key_features, currentFeatureTag.trim()] 
                : [currentFeatureTag.trim()];
            
            setFormData(prev => ({
                ...prev,
                key_features: updatedFeatures
            }));
            setCurrentFeatureTag('');
        }
    };

    const handleAddMetricTag = () => {
        if (currentMetricTag.trim()) {
            const updatedMetrics = formData.comparison_metrics 
                ? [...formData.comparison_metrics, currentMetricTag.trim()] 
                : [currentMetricTag.trim()];
            
            setFormData(prev => ({
                ...prev,
                comparison_metrics: updatedMetrics
            }));
            setCurrentMetricTag('');
        }
    };

    // Handle key press for adding tags
    const handleKeyPress = (e, type) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (type === 'feature') {
                handleAddFeatureTag();
            } else if (type === 'metric') {
                handleAddMetricTag();
            }
        }
    };

    const handleGenerateSuggestions = async () => {
        if (!formData.category.trim()) {
            setErrors({ category: 'Please enter a category first to generate suggestions' });
            return;
        }

        try {
            setIsLoadingSuggestions(true);
            console.log('Fetching suggestions for category:', formData.category);
            
            // Get browser language or use Czech by default
            const language = navigator.language?.startsWith('cs') ? 'cs' : 'cs'; // Force Czech for now
            console.log('Using language:', language);
            
            const response = await api.get(`/api/comparison-configs/suggestions/${formData.category}?language=${language}`);
            console.log('AI suggestions response:', response.data);
            
            if (response.data) {
                const features = response.data.key_features || [];
                const metrics = response.data.comparison_metrics || [];
                
                console.log('Setting suggestions:', { features, metrics });
                
                setSuggestions({
                    key_features: features,
                    comparison_metrics: metrics
                });
                
                if (features.length === 0 && metrics.length === 0) {
                    toast.info('Nebyly generovány žádné návrhy. Zkuste konkrétnější kategorii.');
                } else {
                    toast.success(`Vygenerováno ${features.length} vlastností a ${metrics.length} metrik!`);
                }
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            toast.error(`Chyba při generování návrhů: ${error.message}`);
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    const handleAddSuggestion = (type, suggestion) => {
        // Add the suggestion to the appropriate field
        if (type === 'feature') {
            const updatedFeatures = formData.key_features 
                ? [...formData.key_features, suggestion] 
                : [suggestion];
            
            setFormData(prev => ({
                ...prev,
                key_features: updatedFeatures
            }));

            // Remove the used suggestion
            setSuggestions(prev => ({
                ...prev,
                key_features: prev.key_features.filter(item => item !== suggestion)
            }));
        } else if (type === 'metric') {
            const updatedMetrics = formData.comparison_metrics 
                ? [...formData.comparison_metrics, suggestion] 
                : [suggestion];
            
            setFormData(prev => ({
                ...prev,
                comparison_metrics: updatedMetrics
            }));

            // Remove the used suggestion
            setSuggestions(prev => ({
                ...prev,
                comparison_metrics: prev.comparison_metrics.filter(item => item !== suggestion)
            }));
        }
    };

    return (
        <div className={styles.card}>
            <div className={`${styles.flex} ${styles.flexBetween} ${styles.mb4}`}>
                <h3 className={styles.heading}>Add New Business Type</h3>
                <button
                    onClick={onClose}
                    className={`${styles.button} ${styles.buttonOutline}`}
                    aria-label="Close"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Error messaging */}
            {Object.keys(errors).length > 0 && (
                <div className={styles.errorContainer}>
                    <ul className={styles.errorList}>
                        {Object.values(errors).map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label htmlFor="category" className={styles.formLabel}>
                        Category * <span className={styles.subtitle}>(unique identifier)</span>
                    </label>
                    <div className={`${styles.flex} ${styles.mb2}`}>
                        <input
                            type="text"
                            id="category"
                            name="category"
                            placeholder="e.g., electronics, clothing, retail"
                            className={`${styles.formInput} ${errors.category ? styles.formInputError : ''}`}
                            value={formData.category}
                            onChange={handleChange}
                            required
                            disabled={isEditing}
                        />
                        <button 
                            type="button"
                            onClick={handleGenerateSuggestions}
                            className={`${styles.button} ${styles.buttonOutline} ${styles.ml2}`}
                            disabled={isLoadingSuggestions || !formData.category.trim()}
                            title="Generovat AI návrhy na základě kategorie"
                        >
                            {isLoadingSuggestions ? 'Načítání...' : (
                                <>
                                    <Sparkles size={16} className={styles.buttonIcon} />
                                    AI Návrhy
                                </>
                            )}
                        </button>
                    </div>
                    {errors.category && <p className={styles.formError}>{errors.category}</p>}
                    <p className={styles.formHelperText}>
                        A unique name or identifier for the business type category. Cannot be changed after creation.
                    </p>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="key_features" className={styles.formLabel}>
                        Key Features <span className={styles.subtitle}>(comma-separated)</span>
                    </label>
                    <div className={`${styles.flex} ${styles.mb2}`}>
                        <input
                            type="text"
                            id="feature_input"
                            placeholder="Add a feature and press Enter"
                            className={styles.formInput}
                            value={currentFeatureTag}
                            onChange={(e) => setCurrentFeatureTag(e.target.value)}
                            onKeyPress={(e) => handleKeyPress(e, 'feature')}
                        />
                        <button 
                            type="button"
                            onClick={handleAddFeatureTag}
                            className={`${styles.button} ${styles.buttonOutline} ${styles.ml2}`}
                        >
                            <Tag size={16} />
                        </button>
                    </div>
                    
                    {/* AI suggested features */}
                    {suggestions.key_features.length > 0 && (
                        <div className={styles.featuresSection}>
                            <p className={styles.featuresSectionHeader}>
                                <Sparkles size={16} className={styles.icon} />
                                AI návrhy vlastností:
                            </p>
                            <div className={styles.featuresContainer}>
                                {suggestions.key_features.map((feature, index) => (
                                    <button
                                        key={index}
                                        type="button" 
                                        onClick={() => handleAddSuggestion('feature', feature)}
                                        className={styles.addFeatureButton}
                                    >
                                        + {feature}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <input
                        type="text"
                        id="key_features"
                        name="key_features"
                        placeholder="Features will appear here"
                        className={styles.formInput}
                        value={formData.key_features.join(', ')}
                        onChange={handleChange}
                    />
                    <p className={styles.formHelperText}>
                        List key features relevant to products of this business type. These are used for product comparison.
                    </p>
                    
                    {/* Feature tags preview */}
                    {formData.key_features.length > 0 && (
                        <div className={styles.featuresContainer}>
                            {formData.key_features.map((feature, index) => (
                                feature.trim() && (
                                    <span 
                                        key={index} 
                                        className={`${styles.badge} ${styles.badgePrimary}`}
                                    >
                                        {feature.trim()}
                                    </span>
                                )
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="comparison_metrics" className={styles.formLabel}>
                        Comparison Metrics <span className={styles.subtitle}>(comma-separated)</span>
                    </label>
                    <div className={`${styles.flex} ${styles.mb2}`}>
                        <input
                            type="text"
                            id="metric_input"
                            placeholder="Add a metric and press Enter"
                            className={styles.formInput}
                            value={currentMetricTag}
                            onChange={(e) => setCurrentMetricTag(e.target.value)}
                            onKeyPress={(e) => handleKeyPress(e, 'metric')}
                        />
                        <button 
                            type="button"
                            onClick={handleAddMetricTag}
                            className={`${styles.button} ${styles.buttonOutline} ${styles.ml2}`}
                        >
                            <Tag size={16} />
                        </button>
                    </div>
                    
                    {/* AI suggested metrics */}
                    {suggestions.comparison_metrics.length > 0 && (
                        <div className={styles.featuresSection}>
                            <p className={styles.featuresSectionHeader}>
                                <Sparkles size={16} className={styles.icon} />
                                AI návrhy metrik:
                            </p>
                            <div className={styles.featuresContainer}>
                                {suggestions.comparison_metrics.map((metric, index) => (
                                    <button
                                        key={index}
                                        type="button" 
                                        onClick={() => handleAddSuggestion('metric', metric)}
                                        className={styles.addFeatureButton}
                                    >
                                        + {metric}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <input
                        type="text"
                        id="comparison_metrics"
                        name="comparison_metrics"
                        placeholder="Metrics will appear here"
                        className={styles.formInput}
                        value={formData.comparison_metrics.join(', ')}
                        onChange={handleChange}
                    />
                    <p className={styles.formHelperText}>
                        Define metrics used to compare products of this business type.
                    </p>
                    
                    {/* Metric tags preview */}
                    {formData.comparison_metrics.length > 0 && (
                        <div className={styles.featuresContainer}>
                            {formData.comparison_metrics.map((metric, index) => (
                                metric.trim() && (
                                    <span 
                                        key={index} 
                                        className={`${styles.badge} ${styles.badgeSecondary}`}
                                    >
                                        {metric.trim()}
                                    </span>
                                )
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="recommendation_template" className={styles.formLabel}>
                        Recommendation Template <span className={styles.subtitle}>(optional)</span>
                    </label>
                    <textarea
                        id="recommendation_template"
                        name="recommendation_template"
                        rows={4}
                        placeholder="Template for product recommendations. Use placeholders like {product_name}, {features}, etc."
                        className={styles.formTextarea}
                        value={formData.recommendation_template}
                        onChange={handleChange}
                    />
                    <p className={styles.formHelperText}>
                        Customize how product recommendations are presented. Leave blank to use default template.
                    </p>
                </div>

                <div className={styles.buttonContainer}>
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
                                <Plus size={16} className={styles.buttonIcon} />
                                Add Business Type
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddBusinessTypeForm;