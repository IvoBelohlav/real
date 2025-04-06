'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { fetchApi } from '@/lib/api';
import { GuidedChatFlow, GuidedChatOption } from '@/types'; // Import the flow type
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import GuidedFlowForm from './GuidedFlowForm';
import { PlusCircle, RefreshCw, Upload, Download, Edit, Trash2, Home, AlertTriangle, FolderTree } from 'lucide-react'; // Ensure FolderTree is imported

// Basic Modal structure (Re-using from previous examples)
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl p-6"> {/* Wider modal for flow form */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto pr-2">
            {children}
        </div>
      </div>
    </div>
  );
};


const GuidedChatManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingFlow, setEditingFlow] = useState<GuidedChatFlow | null>(null); // Flow being edited/created
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mainFlowExists, setMainFlowExists] = useState(false);

  // Fetch Flows
  const { data: flows, isLoading, isError, error, refetch } = useQuery<GuidedChatFlow[], Error>({
    queryKey: ['guidedFlows'],
    queryFn: () => fetchApi('/api/guided-flows'),
  });

  // Check for main flow existence when data changes
  useEffect(() => {
    if (flows) {
      const mainExists = flows.some((flow: GuidedChatFlow) => flow.name === 'main');
      setMainFlowExists(mainExists);
      if (!mainExists) {
        console.warn("Guided Chat: 'main' flow not found. Consider creating it.");
      }
    }
  }, [flows]); // Dependency array ensures this runs when flows data updates

  // --- Mutations ---

   // Create Flow Mutation
   const createFlowMutation = useMutation<GuidedChatFlow, Error, Partial<GuidedChatFlow>>({
     mutationFn: (newFlowData) => {
        // Ensure default options if creating 'main' flow
        const payload = newFlowData.name === 'main'
            ? { name: 'main', options: [], ...newFlowData } // Add default options if needed
            : { name: `New Flow ${Date.now()}`, options: [], ...newFlowData };
        return fetchApi('/api/guided-flows', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
        });
     },
     onSuccess: (newFlow) => {
       queryClient.invalidateQueries({ queryKey: ['guidedFlows'] });
       toast.success(`Flow '${newFlow.name}' created! Opening editor...`);
       setEditingFlow(newFlow); // Open editor with the newly created flow
     },
     onError: (error) => {
      toast.error(`Failed to create flow: ${error.message}`);
    },
  });

  // Update Flow Mutation
  const updateFlowMutation = useMutation<GuidedChatFlow, Error, { flowId: string; data: Partial<GuidedChatFlow> }>({
    mutationFn: ({ flowId, data }) => fetchApi(`/api/guided-flows/${flowId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    }),
    onSuccess: (updatedFlow) => {
      queryClient.invalidateQueries({ queryKey: ['guidedFlows'] });
      toast.success(`Flow '${updatedFlow.name}' updated successfully!`);
      setEditingFlow(null); // Close modal on success
    },
    onError: (error, variables) => {
      // Ensure variables.data exists and has a name property before accessing it
      const flowName = variables?.data?.name || 'the flow';
      toast.error(`Failed to update ${flowName}: ${error.message}`);
    },
  });

  // Delete Flow Mutation
  const deleteFlowMutation = useMutation<void, Error, { flowId: string, flowName: string }>({
    mutationFn: ({ flowId }) => fetchApi(`/api/guided-flows/${flowId}`, { method: 'DELETE' }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['guidedFlows'] });
      toast.success(`Flow '${variables.flowName}' deleted successfully!`);
    },
    onError: (error, variables) => {
      toast.error(`Failed to delete flow '${variables.flowName}': ${error.message}`);
    },
  });

   // Export Flows Mutation
   const exportFlowsMutation = useMutation<{ filename: string; content: string }, Error>({
     mutationFn: () => fetchApi('/api/guided-flows/export'),
     onSuccess: (data) => {
       const blob = new Blob([data.content], { type: 'application/json' });
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = data.filename || 'guided_chat_flows.json';
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(url);
       toast.success('Flows exported successfully!');
     },
     onError: (error) => {
       toast.error(`Failed to export flows: ${error.message}`);
     },
   });

   // Import Flows Mutation
   const importFlowsMutation = useMutation<{ message: string; details?: any }, Error, string>({
     mutationFn: (jsonContent) => fetchApi('/api/guided-flows/import', {
       method: 'POST',
       body: jsonContent,
       headers: { 'Content-Type': 'application/json' }
     }),
     onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ['guidedFlows'] });
       toast.success(data.message || 'Flows imported successfully!');
     },
     onError: (error) => {
       toast.error(`Failed to import flows: ${error.message}`);
     },
     onSettled: () => {
        if (fileInputRef.current) fileInputRef.current.value = '';
     }
   });


  // --- Handlers ---
  const handleCreateNewFlow = () => {
     const flowName = prompt("Enter a name for the new flow (lowercase, numbers, underscores only):");
     if (!flowName) return;

     if (flows?.some((f: GuidedChatFlow) => f.name === flowName)) {
        toast.error(`A flow with the name "${flowName}" already exists.`);
        return;
     }
     if (!/^[a-z0-9_]+$/.test(flowName)) {
        toast.error("Flow name must contain only lowercase letters, numbers, and underscores.");
        return;
     }
     createFlowMutation.mutate({ name: flowName });
  };

  const handleDeleteFlow = (flow: GuidedChatFlow) => {
    if (flow.name === 'main') {
        toast.error("The 'main' flow cannot be deleted.");
        return;
    }
    if (window.confirm(`Delete flow "${flow.name}"? This cannot be undone.`)) {
      deleteFlowMutation.mutate({ flowId: flow.id, flowName: flow.name });
    }
  };

   const handleExport = () => exportFlowsMutation.mutate();
   const handleImportClick = () => fileInputRef.current?.click();
   const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (file && file.type === 'application/json') {
       const reader = new FileReader();
       reader.onload = (e) => {
         const content = e.target?.result;
         if (typeof content === 'string') {
           importFlowsMutation.mutate(content);
         } else { toast.error('Failed to read file content.'); }
       };
       reader.onerror = () => toast.error('Error reading file.');
       reader.readAsText(file);
     } else if (file) {
       toast.error('Please select a valid JSON file.');
       if (fileInputRef.current) fileInputRef.current.value = '';
     }
   };

  const handleSaveFlow = (flowData: Partial<GuidedChatFlow>) => {
    if (editingFlow?.id) {
        // Add circular reference check here if desired before mutation
        updateFlowMutation.mutate({ flowId: editingFlow.id, data: flowData });
    } else {
        console.error("Save handler called without an editingFlow ID.");
    }
  };

  const handleRefresh = () => { toast.info('Refreshing flows...'); refetch(); };

  // --- Render Logic ---

  const mainFlow = flows?.find((f: GuidedChatFlow) => f.name === 'main');
  const secondaryFlows = flows?.filter((f: GuidedChatFlow) => f.name !== 'main').sort((a: GuidedChatFlow, b: GuidedChatFlow) => a.name.localeCompare(b.name)) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Guided Chat Flows</h2>
          <p className="text-sm text-gray-500 mt-1">Create and manage guided conversation paths for your chatbot.</p>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0 flex-wrap gap-2"> {/* Added flex-wrap and gap */}
           <input type="file" ref={fileInputRef} accept=".json" onChange={handleFileImport} style={{ display: 'none' }} />
           <button onClick={handleImportClick} disabled={importFlowsMutation.isPending} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 inline-flex items-center">
             <Upload size={14} className="mr-1" /> {importFlowsMutation.isPending ? 'Importing...' : 'Import'}
           </button>
           <button onClick={handleExport} disabled={exportFlowsMutation.isPending} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 inline-flex items-center">
             <Download size={14} className="mr-1" /> {exportFlowsMutation.isPending ? 'Exporting...' : 'Export'}
           </button>
           <button onClick={handleRefresh} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 inline-flex items-center" disabled={isLoading} title="Refresh Flows">
             <RefreshCw size={14} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
           </button>
          <button onClick={handleCreateNewFlow} disabled={createFlowMutation.isPending} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium inline-flex items-center shadow-sm disabled:opacity-50">
            <PlusCircle size={16} className="mr-1" /> {createFlowMutation.isPending ? 'Creating...' : 'Add New Flow'}
          </button>
        </div>
      </div>

      {/* Loading/Error States */}
      {isLoading && <div className="flex justify-center p-10"><LoadingSpinner /></div>}
      {isError && <div className="text-red-600 bg-red-100 p-4 rounded">Error loading flows: {error?.message}</div>}

      {/* Flow Lists - Render only if not loading and no error */}
      {!isLoading && !isError && (
        <div className="space-y-6">
          {/* Main Flow Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-2 flex items-center"><Home size={18} className="mr-2 text-indigo-600"/> Main Flow</h3>
            {mainFlow ? (
              <div className="bg-white shadow rounded-md px-4 py-4 sm:px-6 flex justify-between items-center border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-indigo-700 truncate">{mainFlow.name}</p>
                  <p className="text-xs text-gray-500">{mainFlow.options?.length || 0} options (Entry point)</p>
                </div>
                <div className="space-x-2">
                  <button onClick={() => setEditingFlow(mainFlow)} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">Edit</button>
                  {/* Delete button is disabled for main flow */}
                  <button className="text-gray-400 text-sm cursor-not-allowed" disabled title="Main flow cannot be deleted">Delete</button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 px-4 bg-yellow-50 rounded-md border border-dashed border-yellow-300 flex items-center justify-center text-yellow-700">
                 <AlertTriangle size={16} className="mr-2"/> No 'main' flow found. Create one named "main" to define the starting point.
                 {/* Optionally add a button to create the main flow */}
                 {/* <button onClick={() => createFlowMutation.mutate({ name: 'main' })} className="...">Create Main Flow</button> */}
              </div>
            )}
          </div>

          {/* Secondary Flows Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-2 flex items-center"><FolderTree size={18} className="mr-2 text-gray-500"/> Secondary Flows</h3>
            {secondaryFlows.length > 0 ? (
              <ul role="list" className="divide-y divide-gray-200 bg-white shadow rounded-md border border-gray-200">
                {secondaryFlows.map((flow) => (
                  <li key={flow.id} className="px-4 py-4 sm:px-6 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800 truncate">{flow.name}</p>
                      <p className="text-xs text-gray-500">{flow.options?.length || 0} options</p>
                    </div>
                    <div className="space-x-2">
                      <button onClick={() => setEditingFlow(flow)} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">Edit</button>
                      <button onClick={() => handleDeleteFlow(flow)} disabled={deleteFlowMutation.isPending && deleteFlowMutation.variables?.flowId === flow.id} className="text-red-600 hover:text-red-900 text-sm font-medium disabled:opacity-50">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6 px-4 bg-gray-50 rounded-md border border-dashed border-gray-300">
                <p className="text-gray-500">No secondary flows created yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

       {/* Flow Editor Modal */}
       <Modal isOpen={!!editingFlow} onClose={() => setEditingFlow(null)} title={editingFlow ? `Edit Flow: ${editingFlow.name}` : 'Flow Editor'}>
         {editingFlow && (
            <GuidedFlowForm
                flow={editingFlow}
                allFlows={flows || []} // Pass all flows array to the prop
                onSave={handleSaveFlow}
                onCancel={() => setEditingFlow(null)}
                isLoading={updateFlowMutation.isPending}
            />
         )}
       </Modal>

    </div>
  );
};

export default GuidedChatManager;
