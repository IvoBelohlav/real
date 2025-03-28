import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, RefreshCw, Plus, Save, X } from 'lucide-react';
import api from '../../utils/api';
import styles from './BusinessType.module.css';

const BusinessTypes = () => {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [currentBusinessType, setCurrentBusinessType] = useState(null);
  const [formData, setFormData] = useState({
    type: '',
    name: '',
    domain: '',
    primary_category: '',
    description: '',
    validation_rules: {
      required_fields: [],
      field_types: {},
      value_ranges: {}
    }
  });
  const [currentRule, setCurrentRule] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Fetch business types
  const { data: businessTypes, isLoading, isError, refetch } = useQuery({
    queryKey: ['businessTypes'],
    queryFn: async () => {
      try {
        // Make sure we're using the correct endpoint for business types
        // This will need to be adjusted based on your actual API
        const response = await api.get('/api/business-types');
        return response.data;
      } catch (error) {
        console.error('Error fetching business types:', error);
        
        // Fallback: check if we have a business-configs collection
        try {
          const configsResponse = await api.get('/api/business-configs');
          return configsResponse.data;
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          return [];
        }
      }
    }
  });

  // Reload config mutation
  const reloadConfigMutation = useMutation({
    mutationFn: async () => {
      return await api.post('/api/business/reload-config');
    },
    onSuccess: () => {
      refetch();
      alert('Business configurations reloaded successfully!');
    },
    onError: (error) => {
      console.error('Error reloading configs:', error);
      alert('Failed to reload configurations. Please try again.');
    }
  });

  // Create/update business type mutation
  const saveBusinessTypeMutation = useMutation({
    mutationFn: async (data) => {
      if (editMode) {
        return await api.put(`/api/business-types/${data.type}`, data);
      } else {
        return await api.post('/api/business-types', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessTypes'] });
      setEditMode(false);
      setCurrentBusinessType(null);
      resetForm();
    },
    onError: (error) => {
      console.error('Error saving business type:', error);
      setErrors(error.response?.data?.detail || { general: 'Error saving business type' });
      setIsSubmitting(false);
    }
  });

  const handleEditBusinessType = (businessType) => {
    setEditMode(true);
    setCurrentBusinessType(businessType);
    setFormData({
      type: businessType.type || '',
      name: businessType.name || '',
      domain: businessType.domain || '',
      primary_category: businessType.primary_category || '',
      description: businessType.description || '',
      validation_rules: businessType.validation_rules || {
        required_fields: [],
        field_types: {},
        value_ranges: {}
      }
    });
  };

  const handleAddNewBusinessType = () => {
    setEditMode(false);
    setCurrentBusinessType(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      type: '',
      name: '',
      domain: '',
      primary_category: '',
      description: '',
      validation_rules: {
        required_fields: [],
        field_types: {},
        value_ranges: {}
      }
    });
    setCurrentRule('');
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAddRequiredField = () => {
    if (currentRule.trim()) {
      setFormData({
        ...formData,
        validation_rules: {
          ...formData.validation_rules,
          required_fields: [
            ...formData.validation_rules.required_fields,
            currentRule.trim()
          ]
        }
      });
      setCurrentRule('');
    }
  };

  const handleRemoveRequiredField = (index) => {
    setFormData({
      ...formData,
      validation_rules: {
        ...formData.validation_rules,
        required_fields: formData.validation_rules.required_fields.filter(
          (_, i) => i !== index
        )
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // Basic validation
    const newErrors = {};
    if (!formData.type.trim()) newErrors.type = 'Business type is required';
    if (!formData.name.trim()) newErrors.name = 'Name is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      await saveBusinessTypeMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
      setIsSubmitting(false);
    }
  };

  const handleReloadConfig = async () => {
    try {
      await reloadConfigMutation.mutateAsync();
    } catch (error) {
      console.error('Error reloading config:', error);
    }
  };

  if (isLoading) {
    return <div className={styles.loadingContainer}>Loading business types...</div>;
  }

  if (isError) {
    return <div className={styles.errorContainer}>Error loading business types!</div>;
  }

  return (
    <div className={styles.businessTypesContainer}>
      <div className={styles.headerContainer}>
        <h1 className={styles.title}>Business Types</h1>
        <div className={styles.actionButtons}>
          <button
            onClick={handleReloadConfig}
            className={styles.reloadButton}
          >
            <RefreshCw size={16} />
            Reload Config
          </button>
          <button
            onClick={handleAddNewBusinessType}
            className={styles.addButton}
          >
            <Plus size={16} />
            Add Business Type
          </button>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Left column: Business types list */}
        <div className={styles.businessTypesList}>
          <h2 className={styles.sectionTitle}>Available Business Types</h2>
          {businessTypes && businessTypes.length > 0 ? (
            <div className={styles.typeCards}>
              {businessTypes.map((businessType, index) => (
                <div key={index} className={styles.typeCard}>
                  <div className={styles.typeCardHeader}>
                    <h3 className={styles.typeCardTitle}>
                      {businessType.name || businessType.type}
                    </h3>
                    <button
                      onClick={() => handleEditBusinessType(businessType)}
                      className={styles.editButton}
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                  <div className={styles.typeCardBody}>
                    <p className={styles.typeCardType}>
                      <strong>Type:</strong> {businessType.type}
                    </p>
                    {businessType.domain && (
                      <p className={styles.typeCardDomain}>
                        <strong>Domain:</strong> {businessType.domain}
                      </p>
                    )}
                    {businessType.primary_category && (
                      <p className={styles.typeCardCategory}>
                        <strong>Primary Category:</strong> {businessType.primary_category}
                      </p>
                    )}
                    {businessType.description && (
                      <p className={styles.typeCardDescription}>
                        {businessType.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noDataMessage}>
              No business types found. Add a new business type to get started.
            </div>
          )}
        </div>

        {/* Right column: Edit form */}
        <div className={styles.businessTypeForm}>
          <h2 className={styles.sectionTitle}>
            {editMode ? 'Edit Business Type' : 'Create Business Type'}
          </h2>

          {errors.general && (
            <div className={styles.errorMessage}>{errors.general}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="type" className={styles.formLabel}>
                Type Code* (unique identifier)
              </label>
              <input
                type="text"
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className={`${styles.formInput} ${errors.type ? styles.inputError : ''}`}
                required
                readOnly={editMode} // Type can't be changed in edit mode
              />
              {errors.type && (
                <div className={styles.errorText}>{errors.type}</div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.formLabel}>
                Display Name*
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`${styles.formInput} ${errors.name ? styles.inputError : ''}`}
                required
              />
              {errors.name && (
                <div className={styles.errorText}>{errors.name}</div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="domain" className={styles.formLabel}>
                Domain
              </label>
              <input
                type="text"
                id="domain"
                name="domain"
                value={formData.domain}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="e.g., ecommerce, service, saas"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="primary_category" className={styles.formLabel}>
                Primary Category
              </label>
              <input
                type="text"
                id="primary_category"
                name="primary_category"
                value={formData.primary_category}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="e.g., electronics, clothing, software"
              />
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
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Required Fields</label>
              <div className={styles.addItemContainer}>
                <input
                  type="text"
                  value={currentRule}
                  onChange={(e) => setCurrentRule(e.target.value)}
                  className={styles.formInput}
                  placeholder="Add a required field"
                />
                <button
                  type="button"
                  onClick={handleAddRequiredField}
                  className={styles.addItemButton}
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className={styles.tagsList}>
                {formData.validation_rules.required_fields.map((field, index) => (
                  <div key={index} className={styles.tag}>
                    {field}
                    <button
                      type="button"
                      onClick={() => handleRemoveRequiredField(index)}
                      className={styles.removeTagButton}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  setCurrentBusinessType(null);
                  resetForm();
                }}
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
                    {editMode ? 'Update Business Type' : 'Create Business Type'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BusinessTypes;