'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { fetchApi } from '@/lib/api';
import { WidgetFAQItem, WidgetFAQCreate } from '@/types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import WidgetFAQList from './WidgetFAQList';
import AddWidgetFAQForm from './AddWidgetFAQForm';
import EditWidgetFAQForm from './EditWidgetFAQForm';
import { PlusCircle, RefreshCw } from 'lucide-react'; // Import icons

// Basic Modal structure - consider creating a reusable Modal component later
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4">
      {/* Increased max-width for wider modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200"> {/* Added border */}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3> {/* Increased font weight */}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        {/* Added max height and scroll */}
        <div className="max-h-[75vh] overflow-y-auto pr-2">
            {children}
        </div>
      </div>
    </div>
  );
};


const WidgetFAQManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<WidgetFAQItem | null>(null); // FAQ being edited

  // Fetch FAQs
  const { data: faqs, isLoading, isError, error, refetch } = useQuery<WidgetFAQItem[], Error>({
    queryKey: ['widgetFaqs'],
    queryFn: () => fetchApi('/api/widget-faqs'), // Matches backend endpoint
  });

  // --- Mutations (Add, Update, Delete) ---

  // Add FAQ Mutation
  const addFaqMutation = useMutation<WidgetFAQItem, Error, WidgetFAQCreate>({
    mutationFn: (newFaq) => fetchApi('/api/widget-faqs', {
      method: 'POST',
      body: JSON.stringify(newFaq),
      headers: { 'Content-Type': 'application/json' }, // Ensure content type
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgetFaqs'] });
      toast.success('FAQ added successfully!');
      setIsAddModalOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to add FAQ: ${error.message}`);
    },
  });

  // Update FAQ Mutation
  const updateFaqMutation = useMutation<WidgetFAQItem, Error, { id: string; data: WidgetFAQCreate }>({
    mutationFn: ({ id, data }) => fetchApi(`/api/widget-faqs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }, // Ensure content type
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgetFaqs'] });
      toast.success('FAQ updated successfully!');
      setEditingFaq(null); // Close edit modal/form
    },
    onError: (error) => {
      toast.error(`Failed to update FAQ: ${error.message}`);
    },
  });

  // Delete FAQ Mutation
  const deleteFaqMutation = useMutation<void, Error, string>({
    mutationFn: (faqId) => fetchApi(`/api/widget-faqs/${faqId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgetFaqs'] });
      toast.success('FAQ deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete FAQ: ${error.message}`);
    },
  });

  // --- Handlers ---
  const handleAddFaq = (formData: WidgetFAQCreate) => {
    addFaqMutation.mutate(formData);
  };

  const handleUpdateFaq = (formData: WidgetFAQCreate) => {
    if (editingFaq) {
      updateFaqMutation.mutate({ id: editingFaq.id, data: formData });
    }
  };

  const handleDeleteFaq = (faqId: string) => {
    // Using window.confirm as a simple confirmation dialog
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      deleteFaqMutation.mutate(faqId);
    }
  };

  const handleRefresh = () => {
      toast.info('Refreshing FAQs...');
      refetch();
  };

  // --- Render Logic ---

  return (
    <div className="space-y-6">
      {/* Header section with title and buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4"> {/* Adjusted flex for responsiveness */}
        <div>
            <h2 className="text-xl font-semibold text-gray-800">Widget FAQs</h2>
            <p className="text-sm text-gray-500 mt-1">
                Manage frequently asked questions that appear in the widget.
            </p>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0"> {/* Prevent shrinking on small screens */}
            <button
                onClick={handleRefresh}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 inline-flex items-center"
                disabled={isLoading}
                title="Refresh FAQs"
            >
                <RefreshCw size={16} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
            </button>
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium inline-flex items-center shadow-sm"
            >
                <PlusCircle size={16} className="mr-1" />
                Add New FAQ
            </button>
        </div>
      </div>

      {/* Loading and Error States */}
      {isLoading && (
          <div className="flex justify-center p-10">
              <LoadingSpinner />
          </div>
      )}
      {isError && (
          <div className="text-red-600 bg-red-100 p-4 rounded">Error loading FAQs: {error?.message}</div>
      )}

      {/* FAQ List - Render only if not loading and no error */}
      {!isLoading && !isError && (
        <WidgetFAQList
          faqs={faqs || []} // Pass empty array if faqs is undefined
          onEdit={(faq) => setEditingFaq(faq)}
          onDelete={handleDeleteFaq}
          isLoadingDelete={deleteFaqMutation.isPending}
        />
      )}

      {/* Add FAQ Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New FAQ">
        <AddWidgetFAQForm
          onSubmit={handleAddFaq}
          onCancel={() => setIsAddModalOpen(false)}
          isLoading={addFaqMutation.isPending}
        />
      </Modal>

      {/* Edit FAQ Modal */}
      <Modal isOpen={!!editingFaq} onClose={() => setEditingFaq(null)} title="Edit FAQ">
        {editingFaq && ( // Ensure editingFaq is not null before rendering form
          <EditWidgetFAQForm
            faq={editingFaq}
            onSubmit={handleUpdateFaq}
            onCancel={() => setEditingFaq(null)}
            isLoading={updateFaqMutation.isPending}
          />
         )}
      </Modal>
    </div>
  );
};

export default WidgetFAQManager;
