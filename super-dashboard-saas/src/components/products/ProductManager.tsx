'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { fetchApi } from '@/lib/api';
import { Product, ProductCreate, ProductUpdate, BusinessType } from '@/types'; // Added BusinessType
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ProductList from './ProductList';
import ProductForm from './ProductForm';
import { PlusCircle, RefreshCw, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'; // Import icons

// Basic Modal structure (Re-using from previous examples)
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl p-6"> {/* Wider modal for product form */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto pr-2">
            {children}
        </div>
      </div>
    </div>
  );
};

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
    limit: 10, // Default limit
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
    data // Destructure data directly
  } = useQuery<{ products: Product[], totalCount: number, totalPages: number }, Error>({
    queryKey: ['products', pagination.page, pagination.limit, filters, searchTerm],
    queryFn: async ({ queryKey }) => { // Destructure queryKey if needed, though not used here directly
      const params = new URLSearchParams();
      params.append('skip', String((pagination.page - 1) * pagination.limit));
      params.append('limit', String(pagination.limit));

      if (searchTerm) params.append('search', searchTerm);
      if (filters.businessType) params.append('business_type', filters.businessType);
      if (filters.category) params.append('category', filters.category);
      if (filters.priceRange.min) params.append('min_price', filters.priceRange.min);
      if (filters.priceRange.max) params.append('max_price', filters.priceRange.max);

      const response = await fetchApi(`/api/products?${params.toString()}`);

      // Assuming backend sends total count in header or response body
      // Adjust based on your actual API response structure
      const totalCount = parseInt(response.headers?.get('x-total-count') || response.totalCount || '0', 10);
      const totalPages = Math.ceil(totalCount / pagination.limit) || 1;

      // Update pagination state based on response
      setPagination(prev => ({
        ...prev,
        totalPages,
        totalCount,
        // Reset page if current page is out of bounds after filtering/deletion
        page: Math.min(prev.page, totalPages) || 1
      }));

      return {
        products: response.products || response, // Adjust if response is directly the array
        totalCount,
        totalPages,
      };
    },
    placeholderData: (previousData) => previousData, // Use placeholderData instead of keepPreviousData
    // staleTime: 5 * 60 * 1000, // Optional: Cache data for 5 minutes
  });

  // Fetch Business Types for filter dropdown
  const { data: businessTypes = [] } = useQuery<BusinessType[], Error>({
    queryKey: ['businessTypes'], // Re-use key if already fetched elsewhere
    queryFn: () => fetchApi('/api/business-types'), // Use the correct endpoint
  });

  // Extract unique categories from fetched products for filter dropdown
  const categories = data?.products
    ? [...new Set(data.products.map((product: Product) => product.category).filter(Boolean))] // Add type annotation for product
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
      // Optionally reset to page 1 if the last item on a page was deleted
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
  const handleLimitChange = (newLimit: number) => { setPagination(prev => ({ ...prev, limit: newLimit, page: 1 })); }; // Reset to page 1 on limit change
  const handleRefresh = () => { toast.info('Refreshing products...'); refetch(); };

  // --- Render Logic ---

  return (
    <div className="space-y-6" data-intro="product-manager-container"> {/* Added data-intro */}
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Products</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your product catalog.</p>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0" data-intro="add-product-area"> {/* Moved data-intro here */}
          <button onClick={handleRefresh} className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 inline-flex items-center" disabled={isLoading} title="Refresh Products">
            <RefreshCw size={16} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={handleOpenAddModal} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium inline-flex items-center shadow-sm"> {/* Removed data-intro */}
            <PlusCircle size={16} className="mr-1" /> Add New Product
          </button>
        </div> {/* Added missing closing div tag */}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative flex-grow w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              placeholder="Search products by name..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-black focus:outline-none focus:placeholder-black focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 inline-flex items-center w-full sm:w-auto justify-center">
            <Filter size={16} className="mr-1" /> {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showFilters && (
          <div className="border-t border-gray-200 pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Business Type Filter */}
            <div>
              <label htmlFor="businessType" className="block text-sm font-medium text-gray-700">Business Type</label>
              <select id="businessType" name="businessType" value={filters.businessType} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                <option value="">All</option>
                {businessTypes.map((bt) => <option key={bt.id} value={bt.type}>{bt.type}</option>)}
              </select>
            </div>
            {/* Category Filter */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
              <select id="category" name="category" value={filters.category} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                <option value="">All</option>
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            {/* Price Filters */}
            <div>
              <label htmlFor="min_price" className="block text-sm font-medium text-gray-700">Min Price</label>
              <input type="number" id="min_price" name="min_price" placeholder="Min" value={filters.priceRange.min} onChange={handleFilterChange} className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"/>
            </div>
            <div>
              <label htmlFor="max_price" className="block text-sm font-medium text-gray-700">Max Price</label>
              <input type="number" id="max_price" name="max_price" placeholder="Max" value={filters.priceRange.max} onChange={handleFilterChange} className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"/>
            </div>
            {/* Reset Button */}
            <div className="sm:col-span-2 md:col-span-4 flex justify-end pt-2">
              <button onClick={resetFilters} className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading/Error/List */}
      {isLoading ? (
        <div className="flex justify-center p-10"><LoadingSpinner /></div>
      ) : isError ? (
        <div className="text-red-600 bg-red-100 p-4 rounded">Error loading products: {error?.message}</div>
      ) : (
        <>
          <div data-intro="product-list-area"> {/* Added wrapper div with data-intro */}
            <ProductList
               products={data?.products || []} // Access data.products
               onEdit={handleOpenEditModal}
               onDelete={handleDeleteProduct}
               isLoadingDelete={deleteProductMutation.isPending}
            />
          </div>
          {/* Pagination Controls */}
          {data && data.totalCount > 0 && ( // Check data.totalCount
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-b-lg shadow-md">
              <div className="flex-1 flex justify-between sm:hidden">
                <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"> Previous </button>
                <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"> Next </button> {/* Use >= for safety */}
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, data.totalCount)}</span> of{' '} {/* Use data.totalCount */}
                    <span className="font-medium">{data.totalCount}</span> results {/* Use data.totalCount */}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                   <select value={pagination.limit} onChange={(e) => handleLimitChange(Number(e.target.value))} className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                       <option value={10}>10 per page</option>
                       <option value={25}>25 per page</option>
                       <option value={50}>50 per page</option>
                       <option value={100}>100 per page</option>
                   </select>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    {/* Page numbers could be added here if needed */}
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
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

      {/* Add/Edit Product Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingProduct ? 'Edit Product' : 'Add New Product'} data-intro="product-modal"> {/* Added data-intro */}
         <ProductForm
            product={editingProduct}
            onSubmit={handleFormSubmit}
            onCancel={handleCloseModal}
            isLoading={createProductMutation.isPending || updateProductMutation.isPending}
         />
      </Modal>
    </div>
  );
};

export default ProductManager;
