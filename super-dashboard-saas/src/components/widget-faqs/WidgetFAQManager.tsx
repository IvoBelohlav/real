'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { fetchApi } from '@/lib/api';
import { WidgetFAQItem, WidgetFAQCreate } from '@/types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import WidgetFAQList from './WidgetFAQList';
import AddWidgetFAQForm from './AddWidgetFAQForm';
import EditWidgetFAQForm from './EditWidgetFAQForm';
import { PlusCircle, RefreshCw, HelpCircle, MessageSquareText, X, AlertTriangle } from 'lucide-react';

// Modal component with animations
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4"
            style={{ backdropFilter: 'blur(4px)' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex justify-center items-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden pointer-events-auto">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <HelpCircle className="mr-2 h-5 w-5 text-blue-600" />
                  {title}
                </h3>
                <button 
                  onClick={onClose} 
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="max-h-[75vh] overflow-y-auto p-6">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { 
      type: "spring", 
      stiffness: 100 
    }
  }
};

const buttonVariants = {
  hover: { scale: 1.03 },
  tap: { scale: 0.97 }
};

const WidgetFAQManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<WidgetFAQItem | null>(null);

  // Fetch FAQs
  const { data: faqs, isLoading, isError, error, refetch } = useQuery<WidgetFAQItem[], Error>({
    queryKey: ['widgetFaqs'],
    queryFn: () => fetchApi('/api/widget-faqs'),
  });

  // Add FAQ Mutation
  const addFaqMutation = useMutation<WidgetFAQItem, Error, WidgetFAQCreate>({
    mutationFn: (newFaq) => fetchApi('/api/widget-faqs', {
      method: 'POST',
      body: JSON.stringify(newFaq),
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgetFaqs'] });
      toast.success('FAQ updated successfully!');
      setEditingFaq(null);
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
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      deleteFaqMutation.mutate(faqId);
    }
  };

  const handleRefresh = () => {
    toast.info('Refreshing FAQs...');
    refetch();
  };

  // --- Render Logic ---
  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center items-center p-16"
      >
        <LoadingSpinner />
      </motion.div>
    );
  }

  if (isError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 shadow-sm"
      >
        <AlertTriangle className="h-6 w-6 mr-3 text-red-500 flex-shrink-0" />
        <p className="font-medium">Error loading FAQs: {error?.message}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header section with title and buttons */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center rounded-xl bg-white p-5 shadow-md border border-gray-200"
      >
        <div className="flex items-center mb-4 sm:mb-0">
          <MessageSquareText className="h-6 w-6 text-blue-600 mr-3" />
          <div>
            <h2 className="text-xl font-bold text-gray-800">Widget FAQs</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage frequently asked questions that appear in the widget.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 self-end sm:self-auto">
          <motion.button
            whileHover="hover"
            whileTap="tap"
            variants={buttonVariants}
            onClick={handleRefresh}
            className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 inline-flex items-center transition-colors duration-200"
            disabled={isLoading}
            title="Refresh FAQs"
          >
            <RefreshCw size={16} className={`mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </motion.button>
          <motion.button
            whileHover="hover"
            whileTap="tap"
            variants={buttonVariants}
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium inline-flex items-center shadow-md transition-colors duration-200"
          >
            <PlusCircle size={16} className="mr-1.5" />
            Add New FAQ
          </motion.button>
        </div>
      </motion.div>

      {/* FAQ List */}
      <motion.div variants={itemVariants}>
        <WidgetFAQList
          faqs={faqs || []}
          onEdit={(faq) => setEditingFaq(faq)}
          onDelete={handleDeleteFaq}
          isLoadingDelete={deleteFaqMutation.isPending}
        />
      </motion.div>

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
        {editingFaq && (
          <EditWidgetFAQForm
            faq={editingFaq}
            onSubmit={handleUpdateFaq}
            onCancel={() => setEditingFaq(null)}
            isLoading={updateFaqMutation.isPending}
          />
        )}
      </Modal>
    </motion.div>
  );
};

export default WidgetFAQManager;