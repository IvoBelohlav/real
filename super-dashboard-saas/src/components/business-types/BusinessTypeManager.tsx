'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { fetchApi } from '@/lib/api';
import { BusinessType, BusinessTypeCreateUpdate } from '@/types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
// Import actual components
import BusinessTypeList from './BusinessTypeList';
import BusinessTypeForm from './BusinessTypeForm'; // A single form for add/edit
// Keep or import shared Modal
// import Modal from '@/components/shared/Modal';

// Basic Modal structure - Apply dark theme styles
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    // Use background/80 for overlay, add backdrop blur
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      {/* Use card styling for modal content */}
      <div className="relative bg-card rounded-lg shadow-xl w-full max-w-3xl p-6 border border-border">
        {/* Style header with foreground and border */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-border"> {/* Added padding-bottom and border */}
          <h3 className="text-lg font-medium leading-6 text-foreground">{title}</h3>
          {/* Style close button */}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground focus:outline-none text-2xl">&times;</button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto pr-2">
            {children}
        </div>
      </div>
    </div>
  );
};

const BusinessTypeManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBusinessType, setEditingBusinessType] = useState<BusinessType | null>(null);

  // Fetch Business Types using the new list endpoint
  const { data: businessTypes, isLoading, isError, error } = useQuery<BusinessType[], Error>({
    queryKey: ['businessTypes'],
    queryFn: () => fetchApi('/api/business-types/'), // Use the correct list endpoint
  });

  // --- Mutations ---

  // --- Mutations ---

  // Create Business Type Mutation
  const createBusinessTypeMutation = useMutation<BusinessType, Error, BusinessTypeCreateUpdate>({
    mutationFn: (newData) => fetchApi('/api/business-types/', {
      method: 'POST',
      body: JSON.stringify(newData),
      headers: { 'Content-Type': 'application/json' },
    }),
    onSuccess: (createdData) => {
      queryClient.invalidateQueries({ queryKey: ['businessTypes'] });
      toast.success(`Business Type '${createdData.type}' created successfully!`);
      setIsModalOpen(false);
      setEditingBusinessType(null);
    },
    onError: (error) => {
      toast.error(`Failed to create Business Type: ${error.message}`);
    },
  });

  // Update Business Type Mutation
  const updateBusinessTypeMutation = useMutation<BusinessType, Error, { id: string; data: BusinessTypeCreateUpdate }>({
    mutationFn: ({ id, data }) => fetchApi(`/api/business-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    }),
    onSuccess: (updatedData) => {
      queryClient.invalidateQueries({ queryKey: ['businessTypes'] });
      toast.success(`Business Type '${updatedData.type}' updated successfully!`);
      setIsModalOpen(false);
      setEditingBusinessType(null);
    },
    onError: (error, variables) => {
      toast.error(`Failed to update Business Type '${variables.data.type}': ${error.message}`);
    },
  });

   // Delete Business Type Mutation
   const deleteBusinessTypeMutation = useMutation<void, Error, { id: string; typeName: string }>({
    mutationFn: ({ id }) => fetchApi(`/api/business-types/${id}`, { method: 'DELETE' }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['businessTypes'] });
      toast.success(`Business Type '${variables.typeName}' deleted successfully!`);
    },
    onError: (error, variables) => {
      toast.error(`Failed to delete Business Type '${variables.typeName}': ${error.message}`);
    },
  });


  // --- Handlers ---
  const handleOpenAddModal = () => {
    setEditingBusinessType(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (businessType: BusinessType) => {
    setEditingBusinessType(businessType);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBusinessType(null);
  };

   const handleDelete = (id: string, typeName: string) => {
    if (window.confirm(`Are you sure you want to delete the Business Type '${typeName}'? This might affect related products or AI behavior.`)) {
      deleteBusinessTypeMutation.mutate({ id, typeName });
    }
  };

  // Decides whether to call create or update mutation
  const handleFormSubmit = (formData: BusinessTypeCreateUpdate, id?: string) => {
     if (id) {
        updateBusinessTypeMutation.mutate({ id, data: formData });
     } else {
        createBusinessTypeMutation.mutate(formData);
     }
  };


  // --- Render Logic ---
  if (isLoading) {
    return <div className="flex justify-center p-4"><LoadingSpinner /></div>;
  }

  if (isError) {
    return <div className="text-red-600 bg-red-100 p-4 rounded">Error loading business types: {error?.message}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header - Apply dark theme text and button styles */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground">Business Types</h2>
        {/* Use primary button style */}
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium"
        >
          Add New Type
        </button>
      </div>

      {/* Render Business Type List - Apply dark theme card styles */}
      <div className="bg-card shadow overflow-hidden sm:rounded-md border border-border">
         {businessTypes && businessTypes.length > 0 ? (
            <BusinessTypeList
                businessTypes={businessTypes}
                onEdit={handleOpenEditModal}
                onDelete={(id) => {
                    const bt = businessTypes.find(b => b.id === id);
                    if (bt) handleDelete(id, bt.type);
                }}
                isLoadingDelete={deleteBusinessTypeMutation.isPending}
            />
         ) : (
            // Apply dark theme muted text style
            <p className="text-center text-muted-foreground py-6">No business types found. Add one to get started!</p>
         )}
      </div>

      {/* Add/Edit Business Type Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingBusinessType ? `Edit Business Type: ${editingBusinessType.type}` : 'Add New Business Type'}>
         {/* Render Business Type Form */}
         <BusinessTypeForm
            businessType={editingBusinessType} // Pass null for add
            onSubmit={handleFormSubmit}
            onCancel={handleCloseModal}
            isLoading={createBusinessTypeMutation.isPending || updateBusinessTypeMutation.isPending}
         />
      </Modal>
    </div>
  );
};

export default BusinessTypeManager;
