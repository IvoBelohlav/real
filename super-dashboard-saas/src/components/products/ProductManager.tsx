'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { fetchApi } from '@/lib/api';
import { Product, ProductCreate, ProductUpdate, BusinessType } from '@/types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ProductList from './ProductList';
import ProductForm from './ProductForm';
import { PlusCircle, RefreshCw, Search, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react';

const ProductManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    businessType: '',
    category: '',
    priceRange: { min: '', max: '' },
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalCount: 0,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Reset page to 1 when filters or search term change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [filters, searchTerm, pagination.limit]);

  // Fetch Products with pagination, search, and filters
  const {
    data: productsData,
    isLoading,
    isError,
    error,
    refetch,
    data
  } = useQuery<{ products: Product[], totalCount: number, totalPages: number }, Error>({
    queryKey: ['products', pagination.page, pagination.limit, filters, searchTerm],
    queryFn: async ({ queryKey }) => {
      const params = new URLSearchParams();
      params.append('skip', String((pagination.page - 1) * pagination.limit));
      params.append('limit', String(pagination.limit));

      if (searchTerm) params.append('search', searchTerm);
      if (filters.businessType) params.append('business_type', filters.businessType);
      if (filters.category) params.append('category', filters.category);
      if (filters.priceRange.min) params.append('min_price', filters.priceRange.min);
      if (filters.priceRange.max) params.append('max_price', filters.priceRange.max);

      const response = await fetchApi(`/api/products?${params.toString()}`);

      const totalCount = parseInt(response.headers?.get('x-total-count') || response.totalCount || '0', 10);
      const totalPages = Math.ceil(totalCount / pagination.limit) || 1;

      // Update pagination state based on response
      setPagination(prev => ({
        ...prev,
        totalPages,
        totalCount,
        page: Math.min(prev.page, totalPages) || 1
      }));

      return {
        products: response.products || response,
        totalCount,
        totalPages,
      };
    },
    placeholderData: (previousData) => previousData,
  });

  // Fetch Business Types for filter dropdown
  const { data: businessTypes = [] } = useQuery<BusinessType[], Error>({
    queryKey: ['businessTypes'],
    queryFn: () => fetchApi('/api/business-types'),
  });

  // Extract unique categories from fetched products for filter dropdown
  const categories = data?.products
    ? [...new Set(data.products.map((product: Product) => product.category).filter(Boolean))]
    : [];

  // --- Mutations ---
  const createProductMutation = useMutation<Product, Error, FormData>({
    mutationFn: (formData) => fetchApi('/api/products/', { method: 'POST', body: formData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully!');
      setIsModalOpen(false);
    },
    onError: (error) => toast.error(`Failed to create product: ${error.message}`),
  });

  const updateProductMutation = useMutation<Product, Error, { id: string; formData: FormData }>({
    mutationFn: ({ id, formData }) => fetchApi(`/api/products/${id}`, { method: 'PUT', body: formData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully!');
      setIsModalOpen(false);
      setEditingProduct(null);
    },
    onError: (error) => toast.error(`Failed to update product: ${error.message}`),
  });

  const deleteProductMutation = useMutation<void, Error, string>({
    mutationFn: (productId) => fetchApi(`/api/products/${productId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully!');
      if (data?.products.length === 1 && pagination.page > 1) {
        handlePageChange(pagination.page - 1);
      }
    },
    onError: (error) => toast.error(`Failed to delete product: ${error.message}`),
  });

  // --- Handlers ---
  const handleOpenAddModal = () => { setEditingProduct(null); setIsModalOpen(true); };
  const handleOpenEditModal = (product: Product) => { setEditingProduct(product); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingProduct(null); };
  const handleDeleteProduct = (productId: string) => { if (window.confirm('Delete this product?')) { deleteProductMutation.mutate(productId); } };
  const handleFormSubmit = (formData: FormData, productId?: string) => { if (productId) { updateProductMutation.mutate({ id: productId, formData }); } else { createProductMutation.mutate(formData); } };
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value);
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'min_price' || name === 'max_price') {
      setFilters(prev => ({ ...prev, priceRange: { ...prev.priceRange, [name === 'min_price' ? 'min' : 'max']: value } }));
    } else {
      setFilters(prev => ({ ...prev, [name]: value }));
    }
  };
  const resetFilters = () => { setFilters({ businessType: '', category: '', priceRange: { min: '', max: '' } }); setSearchTerm(''); };
  const handlePageChange = (newPage: number) => { if (newPage > 0 && newPage <= pagination.totalPages) { setPagination(prev => ({ ...prev, page: newPage })); } };
  const handleLimitChange = (newLimit: number) => { setPagination(prev => ({ ...prev, limit: newLimit, page: 1 })); };
  const handleRefresh = () => { toast.info('Refreshing products...'); refetch(); };

  // --- Modal - Apply dark theme styles ---
  const Modal = ({ children }: { children: React.ReactNode }) => {
    if (!isModalOpen) return null;

    return (
      // Use background/80 for overlay, add backdrop blur
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
        {/* Use card styling for modal content */}
        <div className="relative bg-card rounded-lg shadow-xl w-full max-w-3xl p-6 border border-border">
          {/* Style header with foreground and border */}
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>
            {/* Style close button */}
            <button
              onClick={handleCloseModal}
              className="text-muted-foreground hover:text-foreground focus:outline-none"
            >
              <X size={24} />
            </button>
          </div>
          {/* Ensure content area scrolls */}
          <div className="max-h-[80vh] overflow-y-auto pr-2">
            {children}
          </div>
        </div>
      </div>
    );
  };

  // --- Render Logic ---
  return (
    <div className="space-y-6" data-intro="product-manager-container">
      {/* Header - Already styled */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Products</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your product catalog.</p>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0" data-intro="add-product-area">
          <button onClick={handleRefresh} className="px-3 py-2 text-sm font-medium text-secondary-foreground bg-secondary border border-border rounded-md shadow-sm hover:bg-muted focus:outline-none disabled:opacity-50 inline-flex items-center" disabled={isLoading} title="Refresh Products">
            <RefreshCw size={16} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={handleOpenAddModal} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium inline-flex items-center shadow-sm">
            <PlusCircle size={16} className="mr-1" /> Add New Product
          </button>
        </div>
      </div>

      {/* Search and Filters - Already styled */}
      <div className="bg-card p-4 rounded-lg shadow space-y-4 border border-border">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative flex-grow w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <input
              type="text"
              placeholder="Search products by name..."
              className="block w-full pl-10 pr-3 py-2 border border-border rounded-md leading-5 bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary sm:text-sm"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="px-3 py-2 text-sm font-medium text-secondary-foreground bg-secondary border border-border rounded-md shadow-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring inline-flex items-center w-full sm:w-auto justify-center">
            <Filter size={16} className="mr-1" /> {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showFilters && (
          <div className="border-t border-border pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Filters - Already styled */}
            <div>
              <label htmlFor="businessType" className="block text-sm font-medium text-muted-foreground">Business Type</label>
              <select id="businessType" name="businessType" value={filters.businessType} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-input border-border focus:outline-none focus:ring-ring focus:border-primary sm:text-sm rounded-md text-foreground">
                <option value="">All</option>
                {businessTypes.map((bt) => <option key={bt.id} value={bt.type}>{bt.type}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-muted-foreground">Category</label>
              <select id="category" name="category" value={filters.category} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-input border-border focus:outline-none focus:ring-ring focus:border-primary sm:text-sm rounded-md text-foreground">
                <option value="">All</option>
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="min_price" className="block text-sm font-medium text-muted-foreground">Min Price</label>
              <input type="number" id="min_price" name="min_price" placeholder="Min" value={filters.priceRange.min} onChange={handleFilterChange} className="mt-1 focus:ring-ring focus:border-primary block w-full shadow-sm sm:text-sm border-border rounded-md bg-input text-foreground"/>
            </div>
            <div>
              <label htmlFor="max_price" className="block text-sm font-medium text-muted-foreground">Max Price</label>
              <input type="number" id="max_price" name="max_price" placeholder="Max" value={filters.priceRange.max} onChange={handleFilterChange} className="mt-1 focus:ring-ring focus:border-primary block w-full shadow-sm sm:text-sm border-border rounded-md bg-input text-foreground"/>
            </div>
            <div className="sm:col-span-2 md:col-span-4 flex justify-end pt-2">
              <button onClick={resetFilters} className="px-3 py-2 text-sm font-medium text-secondary-foreground bg-secondary border border-border rounded-md shadow-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring">
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading/Error/List - Already styled */}
      {isLoading ? (
        <div className="flex justify-center p-10"><LoadingSpinner /></div>
      ) : isError ? (
        <div className="text-destructive-foreground bg-destructive/80 p-4 rounded border border-destructive">Error loading products: {error?.message}</div>
      ) : (
        <>
          <div data-intro="product-list-area">
            <ProductList
               products={data?.products || []}
               onEdit={handleOpenEditModal}
               onDelete={handleDeleteProduct}
               isLoadingDelete={deleteProductMutation.isPending}
            />
          </div>

          {/* Pagination Controls - Already styled */}
          {data && data.totalCount > 0 && (
            <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3 sm:px-6 mt-4 rounded-b-lg shadow-md">
              <div className="flex-1 flex justify-between sm:hidden">
                <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1} className="relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-secondary-foreground bg-secondary hover:bg-muted disabled:opacity-50"> Previous </button>
                <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="ml-3 relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-secondary-foreground bg-secondary hover:bg-muted disabled:opacity-50"> Next </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium text-foreground">{Math.min(pagination.page * pagination.limit, data.totalCount)}</span> of{' '}
                    <span className="font-medium text-foreground">{data.totalCount}</span> results
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                   <select value={pagination.limit} onChange={(e) => handleLimitChange(Number(e.target.value))} className="text-sm border-border rounded-md shadow-sm focus:border-primary focus:ring focus:ring-ring focus:ring-opacity-50 bg-input text-foreground">
                       <option value={10}>10 per page</option>
                       <option value={25}>25 per page</option>
                       <option value={50}>50 per page</option>
                       <option value={100}>100 per page</option>
                   </select>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-secondary text-sm font-medium text-secondary-foreground hover:bg-muted disabled:opacity-50">
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border bg-secondary text-sm font-medium text-secondary-foreground hover:bg-muted disabled:opacity-50">
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Product Form Modal */}
      {isModalOpen && (
        <Modal>
          <ProductForm
            product={editingProduct}
            onSubmit={handleFormSubmit}
            onCancel={handleCloseModal}
            isLoading={createProductMutation.isPending || updateProductMutation.isPending}
          />
        </Modal>
      )}
    </div>
  );
};

export default ProductManager;
