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

// Basic Modal structure (can be replaced with a shared component later)
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl p-6"> {/* Wider modal */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto pr-2"> {/* Added scroll */}
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Business Types</h2>
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
        >
          Add New Type
        </button>
      </div>

      {/* Render Business Type List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
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
            <p className="text-center text-gray-500 py-6">No business types found. Add one to get started!</p>
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
