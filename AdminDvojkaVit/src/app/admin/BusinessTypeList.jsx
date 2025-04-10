import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { Edit, Trash2, List, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { PulseLoader } from 'react-spinners';
import styles from './AdminPanel.module.css';

const BusinessTypeList = ({ onEdit, onBusinessTypeSelect }) => {
    const queryClient = useQueryClient();

    // Fetch business types from API
    const { data: businessTypes = [], isLoading, isError, error } = useQuery({
        queryKey: ['businessTypes'],
        queryFn: async () => {
            try {
                const response = await api.get('/api/comparison-configs/');
                return response.data;
            } catch (error) {
                console.error('Error fetching business types:', error);
                throw error;
            }
        }
    });

    // Delete mutation
    const deleteBusinessTypeMutation = useMutation({
        mutationFn: (businessTypeCategory) => api.delete(`/api/comparison-configs/${businessTypeCategory}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['businessTypes'] });
            toast.success('Business Type deleted successfully');
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete business type';
            toast.error(`Error: ${errorMessage}`);
        }
    });

    const handleDelete = async (category) => {
        if (window.confirm(`Are you sure you want to delete the business type '${category}'? This action cannot be undone.`)) {
            deleteBusinessTypeMutation.mutate(category);
        }
    };

    const handleEdit = (category) => {
        if (onEdit) onEdit(category);
    };

    const handleSelectBusinessType = (category) => {
        if (onBusinessTypeSelect) onBusinessTypeSelect(category);
    };

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <PulseLoader color="#4F46E5" size={10} />
            </div>
        );
    }

    if (isError) {
        return (
            <div className={styles.errorContainer} role="alert">
                <div className={styles.flex}>
                    <AlertCircle className={styles.mb1} size={18} />
                    <strong className={styles.mb1}>Error!</strong>
                    <span>{error?.message || 'Failed to load business types'}</span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.card}>
            <h2 className={styles.heading}>Business Types</h2>
            {businessTypes.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>No business types found. Add your first business type.</p>
                </div>
            ) : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.tableHeader}>Category</th>
                            <th className={styles.tableHeader}>Metrics</th>
                            <th className={styles.tableHeader}>Key Features</th>
                            <th className={styles.tableHeader}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {businessTypes.map(businessType => (
                            <tr key={businessType.category} className={styles.tableRow}>
                                <td className={styles.tableCell}>
                                    <div className={styles.subheading}>{businessType.category}</div>
                                </td>
                                <td className={styles.tableCell}>
                                    {businessType.comparison_metrics && businessType.comparison_metrics.length > 0 ? (
                                        <div className={styles.tagsContainer}>
                                            {businessType.comparison_metrics.slice(0, 2).map((metric, index) => (
                                                <span key={index} className={`${styles.badge} ${styles.badgePrimary}`}>
                                                    {metric}
                                                </span>
                                            ))}
                                            {businessType.comparison_metrics.length > 2 && (
                                                <span className={`${styles.badge} ${styles.badgeSecondary}`}>
                                                    +{businessType.comparison_metrics.length - 2} more
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className={styles.formHelperText}>None</span>
                                    )}
                                </td>
                                <td className={styles.tableCell}>
                                    {businessType.key_features && businessType.key_features.length > 0 ? (
                                        <div className={styles.tagsContainer}>
                                            {businessType.key_features.slice(0, 2).map((feature, index) => (
                                                <span key={index} className={`${styles.badge} ${styles.badgePrimary}`}>
                                                    {feature}
                                                </span>
                                            ))}
                                            {businessType.key_features.length > 2 && (
                                                <span className={`${styles.badge} ${styles.badgeSecondary}`}>
                                                    +{businessType.key_features.length - 2} more
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className={styles.formHelperText}>None</span>
                                    )}
                                </td>
                                <td className={styles.tableCell}>
                                    <div className={`${styles.flex} ${styles.flexBetween}`}>
                                        <button
                                            onClick={() => handleEdit(businessType.category)}
                                            className={styles.buttonOutline}
                                            title="Edit"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(businessType.category)}
                                            className={styles.buttonDanger}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleSelectBusinessType(businessType.category)}
                                            className={`${styles.button} ${styles.buttonPrimary}`}
                                            title="View Products"
                                        >
                                            <List size={14} className={styles.mb1} />
                                            Products
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default BusinessTypeList;