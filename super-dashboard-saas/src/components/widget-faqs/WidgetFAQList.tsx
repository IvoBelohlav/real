'use client';

import React from 'react';
import { WidgetFAQItem } from '@/types';
import { Edit, Trash2, AlertCircle } from 'lucide-react'; // Import icons
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface WidgetFAQListProps {
  faqs: WidgetFAQItem[];
  onEdit: (faq: WidgetFAQItem) => void;
  onDelete: (faqId: string) => void;
  isLoading?: boolean;
  isLoadingDelete?: boolean; // To disable delete button during deletion
  error?: Error | null;
}

const WidgetFAQList: React.FC<WidgetFAQListProps> = ({
  faqs,
  onEdit,
  onDelete,
  isLoading,
  isLoadingDelete,
  error,
}) => {

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded flex items-center" role="alert">
        <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
        <p>Error loading FAQs: {error.message}</p>
      </div>
    );
  }

  if (!faqs || faqs.length === 0) {
    return (
      <div className="text-center py-10 px-4 bg-gray-50 rounded-md border border-dashed border-gray-300"> {/* Added border */}
        <p className="text-gray-500">No Widget FAQs configured yet.</p>
        {/* Optional: Add a button here to trigger the add modal if needed */}
      </div>
    );
  }

  return (
    // Apply styles similar to Lermo's table container if needed, e.g., background, shadow
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100"> {/* Slightly darker header */}
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"> {/* Adjusted padding/font */}
                Question
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Answer
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Order
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider"> {/* Centered Actions */}
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {faqs.map((faq) => (
              <tr key={faq.id} className="hover:bg-gray-50 transition-colors duration-150"> {/* Hover effect */}
                <td className="px-4 py-4 whitespace-normal text-sm font-medium text-gray-800">{faq.question}</td> {/* Adjusted padding/font */}
                <td className="px-4 py-4 text-sm text-gray-600 max-w-sm break-words" title={faq.answer}> {/* Allow wrapping */}
                  {faq.answer}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{faq.category || '-'}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{faq.widget_order ?? '-'}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                  <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      faq.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                      {faq.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className={`ml-2 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      faq.show_in_widget ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                      {faq.show_in_widget ? 'In Widget' : 'Hidden'}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2"> {/* Centered actions */}
                  {/* Styled buttons similar to Lermo */}
                  <button
                    onClick={() => onEdit(faq)}
                    className="text-indigo-600 hover:text-indigo-800 inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    title="Edit FAQ"
                    disabled={isLoadingDelete}
                  >
                    <Edit size={14} className="mr-1" /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(faq.id)}
                    className="text-red-600 hover:text-red-800 inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    title="Delete FAQ"
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

export default WidgetFAQList;
