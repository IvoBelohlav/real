import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Database, X, RefreshCw, FolderTree, Info } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import AddBusinessTypeForm from './AddBusinessTypeForm';
import BusinessTypeManagementManual from './BusinessTypeManagementManual';
import ConfirmDialog from '../ui/ConfirmDialog';
import ProductList from './ProductList';
import styles from './BusinessTypeManagement.module.css';
import QueryClientWrapper from './QueryClientWrapper';

// Helper function to get auth token
const getAuthToken = () => {
    return localStorage.getItem('authToken');
};

const BusinessTypeManagement = () => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedBusinessType, setSelectedBusinessType] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [viewingProducts, setViewingProducts] = useState(false);
    const [selectedBusinessTypeForProducts, setSelectedBusinessTypeForProducts] = useState(null);
    const [showManual, setShowManual] = useState(false);
    const queryClient = useQueryClient();
    const API_BASE = 'http://localhost:8000';
    const router = useRouter();

    // Generate dynamic styles using LERMO's brand color
    const dynamicStyles = useMemo(() => {
        // Use the LERMO brand color directly
        const primaryColor = '#E01E26';
        const primaryHoverColor = '#B61319';
        const primaryLightColor = '#FEE2E2'; // Light red background

        return {
            addButton: {
                backgroundColor: primaryColor,
            },
            addButtonHover: {
                backgroundColor: primaryHoverColor
            },
            titleUnderline: {
                backgroundColor: primaryColor
            },
            iconButtonHover: {
                color: primaryColor
            },
            loadingSpinner: {
                borderTopColor: primaryColor
            },
            emptyStateButton: {
                backgroundColor: primaryColor
            },
            emptyStateButtonHover: {
                backgroundColor: primaryHoverColor
            },
            productsButton: {
                borderColor: primaryColor,
                color: primaryColor
            },
            productsButtonHover: {
                backgroundColor: primaryLightColor
            },
            confirmButton: {
                backgroundColor: primaryColor
            },
            confirmButtonHover: {
                backgroundColor: primaryHoverColor
            },
            backButton: {
                color: primaryColor,
                borderColor: primaryColor
            },
            backButtonHover: {
                backgroundColor: primaryLightColor
            },
            manualStyles: {
                header: {
                    borderBottomColor: primaryLightColor
                },
                sectionTitle: {
                    color: primaryColor
                },
                strongText: {
                    color: primaryColor
                }
            }
        };
    }, []);

    // Fetch business types from API
    const { data: businessTypes, isLoading, error } = useQuery({
        queryKey: ['business-types'],
        queryFn: async () => {
            const response = await api.get('/api/comparison-configs/');
            return response.data;
        }
    });

    // Delete business type mutation
    const deleteBusinessTypeMutation = useMutation({
        mutationFn: (category) => api.delete(`/api/comparison-configs/${category}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-types'] });
            toast.success('Business type deleted successfully');
            setShowDeleteConfirm(false);
        },
        onError: (error) => {
            toast.error(`Error deleting business type: ${error.message}`);
        }
    });

    // Handler functions
    const toggleManual = () => {
        setShowManual(!showManual);
    };

    const handleAddBusinessType = (data) => {
        toast.success(`Business type ${data.category} added successfully`);
        setShowAddForm(false);
        queryClient.invalidateQueries({ queryKey: ['business-types'] });
    };

    const handleEditBusinessType = (businessType) => {
        setSelectedBusinessType(businessType);
        setIsEditing(true);
        setShowAddForm(true);
    };

    const handleDeleteBusinessType = (businessType) => {
        setSelectedBusinessType(businessType);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        if (selectedBusinessType) {
            deleteBusinessTypeMutation.mutate(selectedBusinessType.category);
        }
    };

    const handleViewProducts = (category) => {
        setSelectedBusinessTypeForProducts(category);
        setViewingProducts(true);
        window.scrollTo(0, 0);
        queryClient.invalidateQueries({ queryKey: ['products'] });
    };
    
    const handleBackToBusinessTypes = () => {
        setViewingProducts(false);
        setSelectedBusinessTypeForProducts(null);
    };

    // Products view - when viewing products for a specific business type
    if (viewingProducts && selectedBusinessTypeForProducts) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <button 
                            className={styles.backButton}
                            style={dynamicStyles.backButton}
                            onClick={handleBackToBusinessTypes}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = dynamicStyles.backButtonHover?.backgroundColor;
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '';
                            }}
                        >
                            ← Back to Business Types
                        </button>
                        <h2 className={styles.title}>
                            Products for {selectedBusinessTypeForProducts}
                        </h2>
                    </div>
                    <button 
                        className={styles.refreshButton}
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
                        title="Refresh product list"
                    >
                        <RefreshCw size={18} />
                        Refresh
                    </button>
                </div>
                
                <ProductList businessTypeFilter={selectedBusinessTypeForProducts} />
            </div>
        );
    }

    // Main business types management view
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Business Type Management</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        className={styles.refreshButton}
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['business-types'] })}
                        title="Refresh business types"
                    >
                        <RefreshCw size={18} />
                        Refresh
                    </button>
                    <button 
                        className={styles.refreshButton}
                        onClick={toggleManual}
                        title="View Help"
                    >
                        <Info size={18} />
                        Help
                    </button>
                    <button 
                        className={styles.addButton}
                        style={dynamicStyles.addButton}
                        onClick={() => {
                            setIsEditing(false);
                            setSelectedBusinessType(null);
                            setShowAddForm(true);
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = dynamicStyles.addButtonHover?.backgroundColor;
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = dynamicStyles.addButton?.backgroundColor;
                        }}
                    >
                        <Plus className={styles.addButtonIcon} size={18} />
                        Add Business Type
                    </button>
                </div>
            </div>

            {showManual && <BusinessTypeManagementManual dynamicStyles={dynamicStyles.manualStyles} />}

            {isLoading ? (
                <div className={styles.loadingState}>
                    <div 
                        className={styles.loadingSpinner}
                        style={dynamicStyles.loadingSpinner}
                    ></div>
                </div>
            ) : error ? (
                <div className={styles.emptyState}>
                    <p className={styles.emptyStateText}>Error loading business types: {error.message}</p>
                </div>
            ) : businessTypes && businessTypes.length > 0 ? (
                <div className={styles.businessTypesContainer}>
                    <div className={styles.sectionHeader}>
                        <h3 className={styles.sectionTitle}>
                            <FolderTree size={18} className={styles.icon} style={dynamicStyles.iconButtonHover} />
                            Business Type Management
                        </h3>
                    </div>
                    
                    <table className={styles.table}>
                        <thead className={styles.tableHeader}>
                            <tr>
                                <th className={styles.tableHeaderCell}>BUSINESS TYPE</th>
                                <th className={styles.tableHeaderCell}>KEY FEATURES</th>
                                <th className={styles.tableHeaderCell}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className={styles.tableBody}>
                            {businessTypes.map((businessType, index) => (
                                <tr key={index} className={styles.tableRow}>
                                    <td className={`${styles.tableCell} ${styles.businessType}`}>
                                        {businessType.category}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {businessType.key_features && Array.isArray(businessType.key_features) ? (
                                            businessType.key_features.join(", ")
                                        ) : (
                                            <em>No key features specified</em>
                                        )}
                                    </td>
                                    <td className={`${styles.tableCell} ${styles.actionsCell}`}>
                                        <button 
                                            className={styles.iconButton}
                                            onClick={() => handleEditBusinessType(businessType)}
                                            title="Edit"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button 
                                            className={`${styles.iconButton} ${styles.deleteButton}`}
                                            onClick={() => handleDeleteBusinessType(businessType)}
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        <button 
                                            className={styles.productsButton}
                                            onClick={() => handleViewProducts(businessType.category)}
                                            style={dynamicStyles.productsButton}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.backgroundColor = dynamicStyles.productsButtonHover?.backgroundColor;
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.backgroundColor = '';
                                            }}
                                        >
                                            <Database size={16} className={styles.productsButtonIcon} />
                                            View Products
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <p className={styles.emptyStateText}>No business types have been added yet. Create your first business type to get started!</p>
                    <button 
                        className={styles.emptyStateButton}
                        style={dynamicStyles.emptyStateButton}
                        onClick={() => {
                            setIsEditing(false);
                            setSelectedBusinessType(null);
                            setShowAddForm(true);
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = dynamicStyles.emptyStateButtonHover?.backgroundColor;
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = dynamicStyles.emptyStateButton?.backgroundColor;
                        }}
                    >
                        <Plus size={20} />
                        Add First Business Type
                    </button>
                </div>
            )}

            {/* Add/Edit Form Dialog */}
            {showAddForm && (
                <AddBusinessTypeForm
                    isEditing={isEditing}
                    businessType={selectedBusinessType}
                    onSave={handleAddBusinessType}
                    onClose={() => setShowAddForm(false)}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                <ConfirmDialog
                    title="Delete Business Type"
                    message={`Are you sure you want to delete "${selectedBusinessType?.category}"? This action cannot be undone.`}
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    onConfirm={confirmDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                    confirmButtonStyle={{
                        backgroundColor: '#DC2626',
                        color: 'white',
                    }}
                />
            )}
        </div>
    );
};

// Export the component wrapped with QueryClientProvider
export default function WrappedBusinessTypeManagement() {
  return (
    <QueryClientWrapper>
      <BusinessTypeManagement />
    </QueryClientWrapper>
  );
}