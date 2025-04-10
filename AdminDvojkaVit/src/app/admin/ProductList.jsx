import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getStaticUrl } from '../../utils/api';
import { toast } from 'react-toastify';
import { Edit, Trash2, Filter, Search, Plus, ChevronLeft, ChevronRight, Loader, AlertTriangle, RefreshCw } from 'lucide-react';
import { PulseLoader } from 'react-spinners';
import AddProductForm from './AddProductForm';
import EditProductForm from './EditProductForm';
import adminStyles from './AdminPanel.module.css';
import styles from './ProductList.module.css';
import QueryClientWrapper from './QueryClientWrapper';

const ProductList = ({ businessTypeFilter = null }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editProductId, setEditProductId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    businessType: businessTypeFilter || '',
    category: '',
    priceRange: { min: '', max: '' },
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    totalPages: 1,
    showAll: false
  });
  const [showFilters, setShowFilters] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const queryClient = useQueryClient();

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [filters, searchTerm]);

  // Update filter when businessTypeFilter prop changes
  useEffect(() => {
    if (businessTypeFilter !== filters.businessType) {
      setFilters(prev => ({
        ...prev,
        businessType: businessTypeFilter || ''
      }));
    }
  }, [businessTypeFilter, filters.businessType]);

  // Fetch products with a more robust error handling approach
  const {
    data: productsData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['products', pagination.page, pagination.limit, filters, searchTerm, fallbackMode, pagination.showAll],
    queryFn: async () => {
      try {
        // Build query parameters - Convert to integers explicitly
        const params = new URLSearchParams();
        
        if (pagination.showAll) {
          // Show maximum allowed products (backend limit is 100)
          params.append('skip', 0);
          params.append('limit', 100); // Backend has a max limit of 100
        } else {
          params.append('skip', parseInt((pagination.page - 1) * pagination.limit, 10));
          params.append('limit', parseInt(pagination.limit, 10));
        }
        
        if (searchTerm) {
          params.append('search', searchTerm);
        }
        
        if (filters.businessType) {
          params.append('business_type', filters.businessType);
        }
        
        if (filters.category) {
          params.append('category', filters.category);
        }
        
        if (filters.priceRange.min) {
          params.append('min_price', parseFloat(filters.priceRange.min));
        }
        
        if (filters.priceRange.max) {
          params.append('max_price', parseFloat(filters.priceRange.max));
        }
        
        // Add a fallback mode parameter to tell the backend to use a more lenient schema
        if (fallbackMode) {
          params.append('compatibility_mode', 'true');
        }
        
        // Make sure we don't have trailing slashes and use the correct endpoint
        const response = await api.get(`/api/products?${params.toString()}`);
        
        // Handle pagination from response headers or data
        const totalCount = response.headers['x-total-count'] || response.data.length;
        const totalPages = Math.ceil(totalCount / pagination.limit) || 1;
        
        setPagination(prev => ({
          ...prev,
          totalPages,
        }));
        
        return {
          products: response.data,
          totalCount,
          totalPages,
        };
      } catch (error) {
        console.error('Error fetching products:', error);
        
        // If we get a validation error and we're not in fallback mode, try enabling fallback mode
        if (error.message && error.message.includes('validation error') && !fallbackMode) {
          setFallbackMode(true);
          toast.warning('Switching to compatibility mode due to schema validation issues.');
          
          // Return empty data for now, will retry with fallback mode
          return {
            products: [],
            totalCount: 0,
            totalPages: 1,
          };
        }
        
        throw error;
      }
    },
    keepPreviousData: true,
    retry: fallbackMode ? 0 : 1, // Reduce retries in fallback mode
    staleTime: 0, // Always treat data as stale to ensure fresh images
    refetchOnWindowFocus: true // Refresh when window regains focus
  });

  // Fetch business types for filters
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
  
  // Delete mutation
  const deleteProductMutation = useMutation({
    mutationFn: (productId) => api.delete(`/api/products/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
    },
    onError: (error) => {
      console.error('Delete product error:', error);
      toast.error(`Error: ${error.message || 'Failed to delete product'}`);
    }
  });

  const handleDelete = (productId, productName) => {
    if (window.confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      deleteProductMutation.mutate(productId);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'min_price' || name === 'max_price') {
      setFilters({
        ...filters,
        priceRange: {
          ...filters.priceRange,
          [name === 'min_price' ? 'min' : 'max']: value,
        },
      });
    } else {
      setFilters({
        ...filters,
        [name]: value,
      });
    }
  };

  const resetFilters = () => {
    setFilters({
      businessType: businessTypeFilter || '',
      category: '',
      priceRange: { min: '', max: '' },
    });
    setSearchTerm('');
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const handleToggleFallbackMode = () => {
    setFallbackMode(!fallbackMode);
    // Force refetch when changing mode
    setTimeout(() => {
      refetch();
    }, 100);
  };

  const toggleShowAll = () => {
    setPagination(prev => ({
      ...prev,
      showAll: !prev.showAll,
      page: 1
    }));
  };

  // Format price display
  const formatPrice = (pricing) => {
    if (!pricing) return 'N/A';
    
    // Try different price types
    let price = pricing.one_time || pricing.monthly || pricing.annual;
    let currency = pricing.currency || 'Kč';
    let suffix = '';
    
    if (pricing.monthly && !pricing.one_time) {
      suffix = '/month';
    } else if (pricing.annual && !pricing.one_time && !pricing.monthly) {
      suffix = '/year';
    }
    
    if (!price) return 'N/A';
    
    // Ensure price is a number
    if (typeof price === 'string') {
      try {
        price = parseFloat(price);
      } catch {
        return `${price} ${currency}${suffix}`;
      }
    }
    
    // Format with thousand separators
    return `${price.toLocaleString()} ${currency}${suffix}`;
  };

  // Extract categories for filter dropdown
  const categories = productsData?.products
    ? [...new Set(productsData.products.map(product => product.category).filter(Boolean))]
    : [];
  
  return (
    <div className={styles.container}>
      {!businessTypeFilter && (
        <div className={styles.header}>
          <h1 className={adminStyles.heading}>Product Management</h1>
          <div className={adminStyles.flex}>
            <button
              onClick={handleToggleFallbackMode}
              className={`${adminStyles.button} ${fallbackMode ? adminStyles.buttonWarning : adminStyles.buttonOutline}`}
              title={fallbackMode ? "Currently in compatibility mode" : "Enable compatibility mode for schema issues"}
            >
              <RefreshCw size={16} className={styles.buttonIconLeft} />
              {fallbackMode ? 'Compatibility Mode: On' : 'Normal Mode'}
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className={styles.addButton}
            >
              <Plus size={18} className={styles.buttonIconLeft} />
              Add Product
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className={`${adminStyles.card} ${adminStyles.mb4}`}>
        <div className={`${adminStyles.flex} ${adminStyles.flexBetween} ${adminStyles.mb4}`}>
          <div className={styles.searchInputContainer}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search products..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          
          <button
            onClick={toggleFilters}
            className={styles.filterButton}
          >
            <Filter size={16} className={styles.buttonIconLeft} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
        
        {showFilters && (
          <div className={`${adminStyles.grid} ${adminStyles.grid2Columns}`}>
            {!businessTypeFilter && (
              <div className={adminStyles.formGroup}>
                <label htmlFor="businessType" className={adminStyles.formLabel}>Business Type</label>
                <select
                  id="businessType"
                  name="businessType"
                  className={adminStyles.formSelect}
                  value={filters.businessType}
                  onChange={handleFilterChange}
                >
                  <option value="">All Business Types</option>
                  {businessTypes.map((type, index) => (
                    <option key={index} value={type.category || type.type || type}>
                      {type.category || type.type || type}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className={adminStyles.formGroup}>
              <label htmlFor="category" className={adminStyles.formLabel}>Category</label>
              <select
                id="category"
                name="category"
                className={adminStyles.formSelect}
                value={filters.category}
                onChange={handleFilterChange}
              >
                <option value="">All Categories</option>
                {categories.map((category, index) => (
                  <option key={index} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div className={adminStyles.formGroup}>
              <label htmlFor="min_price" className={adminStyles.formLabel}>Min Price</label>
              <input
                type="number"
                id="min_price"
                name="min_price"
                placeholder="Min price"
                className={adminStyles.formInput}
                value={filters.priceRange.min}
                onChange={handleFilterChange}
              />
            </div>
            
            <div className={adminStyles.formGroup}>
              <label htmlFor="max_price" className={adminStyles.formLabel}>Max Price</label>
              <input
                type="number"
                id="max_price"
                name="max_price"
                placeholder="Max price"
                className={adminStyles.formInput}
                value={filters.priceRange.max}
                onChange={handleFilterChange}
              />
            </div>
            
            <div className={styles.colSpanFull}>
              <button
                type="button"
                onClick={resetFilters}
                className={`${adminStyles.button} ${adminStyles.buttonOutline}`}
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={() => refetch()}
                className={`${adminStyles.button} ${adminStyles.buttonPrimary}`}
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Warning for fallback mode */}
      {fallbackMode && (
        <div className={`${adminStyles.card} ${styles.warningCard} ${adminStyles.mb4}`}>
          <div className={styles.flexContainer}>
            <AlertTriangle size={20} className={styles.warningIcon} />
            <div>
              <h3 className={styles.warningTitle}>Compatibility Mode Enabled</h3>
              <p className={styles.warningText}>
                Running in compatibility mode to handle schema validation issues. Some product fields may not be properly displayed.
                Consider updating your backend models to match the database schema.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Form */}
      {showAddForm && (
        <div className={adminStyles.mb6}>
          <AddProductForm
            onClose={() => setShowAddForm(false)}
            defaultBusinessType={businessTypeFilter}
          />
        </div>
      )}
      
      {/* Edit Product Form */}
      {editProductId && (
        <div className={adminStyles.mb6}>
          <EditProductForm
            productId={editProductId}
            onClose={() => setEditProductId(null)}
          />
        </div>
      )}

      {/* Products List */}
      <div className={adminStyles.card}>
        <h2 className={adminStyles.subheading}>
          {businessTypeFilter 
            ? `Products for ${businessTypeFilter}` 
            : 'All Products'}
        </h2>
        
        {isLoading ? (
          <div className={adminStyles.loadingContainer}>
            <PulseLoader color="#E01E26" size={10} />
          </div>
        ) : isError ? (
          <div className={adminStyles.errorContainer}>
            <AlertTriangle size={20} className={styles.buttonIconLeft} />
            <div>
              <span className={adminStyles.subheading}>Failed to load products: {error.message}</span>
              <div className={adminStyles.mt4}>
                <button 
                  onClick={() => {
                    setFallbackMode(true);
                    setTimeout(() => refetch(), 100);
                  }}
                  className={`${adminStyles.button} ${adminStyles.buttonWarning} ${adminStyles.mb2}`}
                  disabled={fallbackMode}
                >
                  Try Compatibility Mode
                </button>
                <button onClick={() => refetch()} className={`${adminStyles.button} ${adminStyles.buttonPrimary}`}>
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : !productsData?.products?.length ? (
          <div className={adminStyles.emptyState}>
            <p>No products found. {!businessTypeFilter && 'Click "Add Product" to create your first product.'}</p>
          </div>
        ) : (
          <>
            <div className={adminStyles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.tableHeader}>Image</th>
                    <th className={styles.tableHeader}>Name</th>
                    <th className={styles.tableHeader}>Category</th>
                    <th className={styles.tableHeader}>Business Type</th>
                    <th className={styles.tableHeader}>Price</th>
                    <th className={styles.tableHeader}>Features</th>
                    <th className={styles.tableHeader}>Priority</th>
                    <th className={styles.tableHeader}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {productsData.products.map((product) => (
                    <tr key={product.id} className={styles.tableRow}>
                      <td className={styles.tableCell}>
                        {product.image_url ? (
                          <img 
                            src={getStaticUrl(product.image_url, true)} 
                            alt={product.product_name} 
                            className={styles.productImage}
                          />
                        ) : (
                          <div className={styles.noImagePlaceholder}>
                            No image
                          </div>
                        )}
                      </td>
                      <td className={styles.tableCell}>
                        <div className={styles.productName}>{product.product_name}</div>
                        {product.sku && <span className={styles.productSku}>SKU: {product.sku}</span>}
                      </td>
                      <td className={styles.tableCell}>{product.category}</td>
                      <td className={styles.tableCell}>{product.business_type}</td>
                      <td className={styles.tableCell}>{formatPrice(product.pricing)}</td>
                      <td className={styles.tableCell}>
                        <div className={styles.featuresContainer}>
                          {product.features?.slice(0, 2).map((feature, idx) => (
                            <span key={idx} className={styles.feature}>
                              {feature}
                            </span>
                          ))}
                          {product.features?.length > 2 && (
                            <span className={`${adminStyles.badge} ${adminStyles.badgeSecondary}`}>
                              +{product.features.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={styles.tableCell}>
                        <span className={
                          product.admin_priority >= 7 ? styles.priorityHigh :
                          product.admin_priority >= 4 ? styles.priorityMedium :
                          styles.priorityLow
                        }>
                          {product.admin_priority}/10
                        </span>
                      </td>
                      <td className={styles.tableCell}>
                        <div className={`${adminStyles.flex} ${adminStyles.flexBetween}`}>
                          <button
                            onClick={() => setEditProductId(product.id)}
                            className={`${styles.actionButton} ${styles.editButton}`}
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id, product.product_name)}
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            title="Delete"
                            disabled={deleteProductMutation.isLoading}
                          >
                            {deleteProductMutation.isLoading ? (
                              <Loader size={16} className={styles.spinner} />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className={`${adminStyles.flex} ${adminStyles.flexBetween} ${adminStyles.mt4}`}>
              <div>
                <span className={styles.paginationInfo}>
                  {pagination.showAll 
                    ? 'Showing all products' 
                    : `Page ${pagination.page} of ${pagination.totalPages}`}
                </span>
              </div>
              <div className={`${adminStyles.flex} ${adminStyles.flexCenter}`}>
                <select 
                  className={styles.paginationSelect}
                  value={pagination.limit}
                  onChange={(e) => setPagination({
                    ...pagination, 
                    limit: parseInt(e.target.value), 
                    page: 1,
                    showAll: false
                  })}
                  disabled={pagination.showAll}
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
                
                <button
                  onClick={toggleShowAll}
                  className={`${adminStyles.button} ${pagination.showAll ? adminStyles.buttonPrimary : adminStyles.buttonOutline}`}
                >
                  {pagination.showAll ? 'Use Pagination' : 'Show Max (100)'}
                </button>
                
                {pagination.showAll && (
                  <div className={styles.paginationLimit}>
                    Showing up to 100 products due to server limitations.
                  </div>
                )}
                
                {!pagination.showAll && (
                  <>
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className={`${adminStyles.button} ${adminStyles.buttonOutline} ${
                        pagination.page === 1 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className={`${adminStyles.button} ${adminStyles.buttonOutline} ${
                        pagination.page === pagination.totalPages ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Export the component wrapped with QueryClientProvider
export default function WrappedProductList(props) {
  return (
    <QueryClientWrapper>
      <ProductList {...props} />
    </QueryClientWrapper>
  );
}