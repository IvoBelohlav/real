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
      // Dark theme error styles
      <div className="bg-destructive/10 border-l-4 border-destructive text-destructive p-4 rounded flex items-center" role="alert">
        <AlertCircle className="h-5 w-5 text-destructive mr-3" />
        <p>Error loading FAQs: {error.message}</p>
      </div>
    );
  }

  if (!faqs || faqs.length === 0) {
    return (
      // Dark theme "empty" state styles
      <div className="text-center py-10 px-4 bg-card rounded-md border border-dashed border-border">
        <p className="text-muted-foreground">No Widget FAQs configured yet.</p>
        {/* Optional: Add a button here to trigger the add modal if needed */}
      </div>
    );
  }

  return (
    // Apply dark theme card styles
    <div className="bg-card shadow-md rounded-lg overflow-hidden border border-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border"> {/* Dark divider */}
          <thead className="bg-secondary"> {/* Dark header */}
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"> {/* Dark text */}
                Question
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Answer
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Order
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border"> {/* Dark background and divider */}
            {faqs.map((faq) => (
              <tr key={faq.id} className="hover:bg-secondary transition-colors duration-150"> {/* Dark hover */}
                <td className="px-4 py-4 whitespace-normal text-sm font-medium text-foreground">{faq.question}</td> {/* Dark text */}
                <td className="px-4 py-4 text-sm text-muted-foreground max-w-sm break-words" title={faq.answer}> {/* Dark text */}
                  {faq.answer}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{faq.category || '-'}</td> {/* Dark text */}
                <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground text-center">{faq.widget_order ?? '-'}</td> {/* Dark text */}
                <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                  {/* Dark theme status badges */}
                  <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      faq.active ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                  }`}>
                      {faq.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className={`ml-2 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      faq.show_in_widget ? 'bg-blue-600/20 text-blue-400' : 'bg-muted text-muted-foreground'
                  }`}>
                      {faq.show_in_widget ? 'In Widget' : 'Hidden'}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                  {/* Dark theme action buttons */}
                  <button
                    onClick={() => onEdit(faq)}
                    className="text-primary hover:text-primary/80 inline-flex items-center px-2.5 py-1.5 border border-border text-xs font-medium rounded bg-card hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50"
                    title="Edit FAQ"
                    disabled={isLoadingDelete}
                  >
                    <Edit size={14} className="mr-1" /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(faq.id)}
                    className="text-destructive hover:text-destructive/80 inline-flex items-center px-2.5 py-1.5 border border-border text-xs font-medium rounded bg-card hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-destructive disabled:opacity-50"
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
