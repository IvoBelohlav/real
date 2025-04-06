'use client';

import React from 'react';
import { Product } from '@/types'; // Import the Product type
import { Edit, Trash2, ImageOff } from 'lucide-react'; // Import icons

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  isLoadingDelete?: boolean; // Optional prop to disable delete button
}

const ProductList: React.FC<ProductListProps> = ({ products, onEdit, onDelete, isLoadingDelete }) => {

  // Improved price formatting to match Lermo's logic
  const formatPrice = (pricing?: { one_time?: string | number | null, monthly?: string | number | null, annual?: string | number | null, currency?: string }) => {
    if (!pricing) return 'N/A';
    let price = pricing.one_time ?? pricing.monthly ?? pricing.annual; // Prioritize one_time
    let currency = pricing.currency || 'Kč'; // Default currency
    let suffix = '';

    if (price === pricing.monthly) suffix = '/měsíc';
    else if (price === pricing.annual) suffix = '/rok';

    if (price == null) return 'N/A'; // Use == to catch null and undefined

    // Format number with spaces as thousand separators
    try {
      const numPrice = Number(String(price).replace(/,/g, '.')); // Handle potential comma decimal separator
      if (isNaN(numPrice)) return `${price} ${currency}${suffix}`; // Fallback if conversion fails
      // Format with non-breaking space for thousands
      const formattedPrice = numPrice.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      return `${formattedPrice} ${currency}${suffix}`;
    } catch (e) {
      console.error("Price formatting error:", e);
      return `${price} ${currency}${suffix}`; // Fallback
    }
  };

  // Function to get priority styling (example)
  const getPriorityClass = (priority?: number): string => {
    const p = priority ?? 0;
    if (p >= 7) return 'text-red-600 font-semibold';
    if (p >= 4) return 'text-yellow-600 font-semibold';
    return 'text-green-600 font-semibold';
  };

  return (
    // Apply styles similar to Lermo's table container if needed, e.g., background, shadow
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16"> {/* Fixed width for image */}
                Image
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Business Type
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Price
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Features
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Priority
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-4 py-3 whitespace-nowrap">
                  {product.image_url ? (
                    <img
                      // Assuming image_url might be relative, prepend API base if needed
                      // Or use a utility function like Lermo's getStaticUrl
                      src={product.image_url}
                      alt={product.product_name}
                      className="h-10 w-10 rounded-md object-cover border border-gray-200" // Added border
                      onError={(e) => (e.currentTarget.src = '/placeholder-image.png')} // Basic fallback
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 text-xs border border-gray-200">
                      <ImageOff size={18} /> {/* Icon placeholder */}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{product.product_name}</div>
                  {/* Add SKU if available in your Product type */}
                  {/* {product.sku && <div className="text-xs text-gray-500">SKU: {product.sku}</div>} */}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {product.category}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {product.business_type}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600"> {/* Price styling */}
                  {formatPrice(product.pricing)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-xs"> {/* Max width for features */}
                   <div className="flex flex-wrap gap-1">
                      {product.features?.slice(0, 3).map((feature, idx) => ( // Show up to 3 features
                        <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                          {feature}
                        </span>
                      ))}
                      {product.features && product.features.length > 3 && (
                        <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                          +{product.features.length - 3} more
                        </span>
                      )}
                   </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                   <span className={getPriorityClass(product.admin_priority)}>
                     {product.admin_priority ?? 0}/10
                   </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium space-x-2">
                  <button
                    onClick={() => onEdit(product)}
                    className="text-indigo-600 hover:text-indigo-800 inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    title="Edit Product"
                    disabled={isLoadingDelete}
                  >
                    <Edit size={14} className="mr-1" /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(product.id)}
                    className="text-red-600 hover:text-red-800 inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    title="Delete Product"
                    disabled={isLoadingDelete}
                  >
                     <Trash2 size={14} className="mr-1" /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductList;
