'use client';

import React from 'react';
import { Product } from '@/types';
import { Edit, Trash2, ImageOff } from 'lucide-react';

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  isLoadingDelete?: boolean;
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
    if (p >= 7) return 'text-red-400 font-medium';
    if (p >= 4) return 'text-amber-400 font-medium';
    return 'text-green-400 font-medium';
  };

  return (
    <div className="bg-black shadow-md rounded-lg overflow-hidden border border-[#222222]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#222222]">
          <thead className="bg-[#111111]">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-purple-400 uppercase tracking-wider w-16">
                Image
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-purple-400 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-purple-400 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-purple-400 uppercase tracking-wider">
                Business Type
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-purple-400 uppercase tracking-wider">
                Price
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-purple-400 uppercase tracking-wider">
                Features
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-purple-400 uppercase tracking-wider">
                Priority
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-purple-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-black divide-y divide-[#222222]">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-[#111111] transition-colors duration-150">
                <td className="px-4 py-3 whitespace-nowrap">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.product_name}
                      className="h-10 w-10 rounded-md object-cover border border-[#333333]"
                      onError={(e) => (e.currentTarget.src = '/placeholder-image.png')}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-[#111111] flex items-center justify-center text-gray-400 text-xs border border-[#333333]">
                      <ImageOff size={18} />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-white">{product.product_name}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                  {product.category}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                  {product.business_type}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                  {formatPrice(product.pricing)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-300 max-w-xs">
                   <div className="flex flex-wrap gap-1">
                      {product.features?.slice(0, 3).map((feature, idx) => (
                        <span key={idx} className="px-2 py-0.5 text-xs bg-[#222222] text-gray-200 rounded-full">
                          {feature}
                        </span>
                      ))}
                      {product.features && product.features.length > 3 && (
                        <span className="px-2 py-0.5 text-xs bg-[#333333] text-gray-400 rounded-full">
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
                    className="text-purple-400 hover:text-purple-300 inline-flex items-center px-2.5 py-1.5 border border-[#333333] text-xs font-medium rounded bg-black hover:bg-[#111111] focus:outline-none"
                    title="Edit Product"
                    disabled={isLoadingDelete}
                  >
                    <Edit size={14} className="mr-1" /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(product.id)}
                    className="text-red-400 hover:text-red-300 inline-flex items-center px-2.5 py-1.5 border border-[#333333] text-xs font-medium rounded bg-black hover:bg-[#111111] focus:outline-none"
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