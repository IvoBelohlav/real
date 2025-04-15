'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { fetchApi } from '@/lib/api';
import { GuidedChatFlow, GuidedChatOption } from '@/types'; 
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import GuidedFlowForm from './GuidedFlowForm';
import CustomTooltip from '@/components/shared/CustomTooltip'; // Import the tooltip
import { PlusCircle, RefreshCw, Upload, Download, Edit, Trash2, Home, AlertTriangle, FolderTree, X } from 'lucide-react';

const GuidedChatManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingFlow, setEditingFlow] = useState<GuidedChatFlow | null>(null);
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
  }, [flows]);

  // --- Mutations ---

   // Create Flow Mutation
   const createFlowMutation = useMutation<GuidedChatFlow, Error, Partial<GuidedChatFlow>>({
     mutationFn: (newFlowData) => {
        // Ensure default options if creating 'main' flow
        const payload = newFlowData.name === 'main'
            ? { name: 'main', options: [], ...newFlowData }
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
       setEditingFlow(newFlow);
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
      setEditingFlow(null);
    },
    onError: (error, variables) => {
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
        updateFlowMutation.mutate({ flowId: editingFlow.id, data: flowData });
    } else {
        console.error("Save handler called without an editingFlow ID.");
    }
  };

  const handleRefresh = () => { toast.info('Refreshing flows...'); refetch(); };

  // --- Render Logic ---
  const mainFlow = flows?.find((f: GuidedChatFlow) => f.name === 'main');
  const secondaryFlows = flows?.filter((f: GuidedChatFlow) => f.name !== 'main').sort((a: GuidedChatFlow, b: GuidedChatFlow) => a.name.localeCompare(b.name)) || [];

  // Pure black modal with purple accents - defined inline
  const Modal = ({ children }: { children: React.ReactNode }) => {
    if (!editingFlow) return null;
    
    return (
      <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4">
        <div className="relative bg-black rounded-lg shadow-xl w-full max-w-3xl p-6 border border-[#333333]">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#333333]">
            <h3 className="text-lg font-semibold text-purple-400">
              {editingFlow ? `Edit Flow: ${editingFlow.name}` : 'Flow Editor'}
            </h3>
            <button 
              onClick={() => setEditingFlow(null)} 
              className="text-gray-400 hover:text-white focus:outline-none"
            >
              <X size={24} />
            </button>
          </div>
          <div className="max-h-[75vh] overflow-y-auto pr-2">
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Guided Chat Flows</h2>
          <p className="text-sm text-gray-400 mt-1">Create and manage guided conversation paths for your chatbot.</p>
        </div>
         <div className="flex items-center space-x-2 flex-shrink-0 flex-wrap gap-2">
            <input type="file" ref={fileInputRef} accept=".json" onChange={handleFileImport} style={{ display: 'none' }} />
            <CustomTooltip content="Import flows from a JSON file">
              <button 
                onClick={handleImportClick} 
                disabled={importFlowsMutation.isPending} 
                className="px-3 py-1.5 text-xs font-medium text-white bg-black border border-[#333333] rounded-md shadow-sm hover:bg-[#111111] disabled:opacity-50 inline-flex items-center"
              >
                <Upload size={14} className="mr-1" /> {importFlowsMutation.isPending ? 'Importing...' : 'Import'}
              </button>
            </CustomTooltip>
            <CustomTooltip content="Export all flows to a JSON file">
              <button 
                onClick={handleExport} 
                disabled={exportFlowsMutation.isPending} 
                className="px-3 py-1.5 text-xs font-medium text-white bg-black border border-[#333333] rounded-md shadow-sm hover:bg-[#111111] disabled:opacity-50 inline-flex items-center"
              >
                <Download size={14} className="mr-1" /> {exportFlowsMutation.isPending ? 'Exporting...' : 'Export'}
              </button>
            </CustomTooltip>
            <CustomTooltip content="Reload the list of flows">
              <button 
                onClick={handleRefresh} 
                className="px-3 py-1.5 text-xs font-medium text-white bg-black border border-[#333333] rounded-md shadow-sm hover:bg-[#111111] disabled:opacity-50 inline-flex items-center" 
                disabled={isLoading} 
              >
                <RefreshCw size={14} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </CustomTooltip>
            <CustomTooltip content="Create a new guided conversation flow">
              <button 
                onClick={handleCreateNewFlow} 
                disabled={createFlowMutation.isPending} 
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium inline-flex items-center shadow-sm disabled:opacity-50"
              >
                <PlusCircle size={16} className="mr-1" /> {createFlowMutation.isPending ? 'Creating...' : 'Add New Flow'}
              </button>
            </CustomTooltip>
        </div>
      </div>

      {/* Loading/Error States */}
      {isLoading && <div className="flex justify-center p-10"><LoadingSpinner /></div>}
      {isError && <div className="text-red-400 bg-[#300000] p-4 rounded border border-red-900">Error loading flows: {error?.message}</div>}

      {/* Flow Lists - Render only if not loading and no error */}
      {!isLoading && !isError && (
        <div className="space-y-6">
          {/* Main Flow Section */}
          <div>
            <h3 className="text-lg font-medium text-white mb-2 flex items-center">
              <Home size={18} className="mr-2 text-purple-400"/> Main Flow
            </h3>
            {mainFlow ? (
              <div className="bg-black shadow-md rounded-md px-4 py-4 sm:px-6 flex justify-between items-center border border-[#222222]">
                <div>
                  <p className="text-sm font-medium text-white truncate">{mainFlow.name}</p>
                  <p className="text-xs text-gray-400">{mainFlow.options?.length || 0} options (Entry point)</p>
                 </div>
                 <div className="space-x-2">
                   <CustomTooltip content="Edit the main entry flow">
                     <button 
                       onClick={() => setEditingFlow(mainFlow)} 
                       className="text-purple-400 hover:text-purple-300 text-sm font-medium inline-flex items-center"
                     >
                       <Edit size={14} className="mr-1" /> Edit
                     </button>
                   </CustomTooltip>
                   {/* Delete button is disabled for main flow */}
                   <CustomTooltip content="The main flow cannot be deleted">
                     <button className="text-gray-500 text-sm cursor-not-allowed inline-flex items-center" disabled>
                       <Trash2 size={14} className="mr-1" /> Delete
                     </button>
                   </CustomTooltip>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 px-4 bg-[#1a1005] rounded-md border border-dashed border-amber-900/50 flex items-center justify-center text-amber-400">
                 <AlertTriangle size={16} className="mr-2"/> No 'main' flow found. Create one named "main" to define the starting point.
              </div>
            )}
          </div>

          {/* Secondary Flows Section */}
          <div>
            <h3 className="text-lg font-medium text-white mb-2 flex items-center">
              <FolderTree size={18} className="mr-2 text-gray-400"/> Secondary Flows
            </h3>
            {secondaryFlows.length > 0 ? (
              <ul role="list" className="divide-y divide-[#222222] bg-black shadow-md rounded-md border border-[#222222]">
                {secondaryFlows.map((flow) => (
                  <li key={flow.id} className="px-4 py-4 sm:px-6 flex justify-between items-center hover:bg-[#111111]">
                    <div>
                      <p className="text-sm font-medium text-white truncate">{flow.name}</p>
                      <p className="text-xs text-gray-400">{flow.options?.length || 0} options</p>
                     </div>
                     <div className="space-x-2">
                       <CustomTooltip content={`Edit the '${flow.name}' flow`}>
                         <button 
                           onClick={() => setEditingFlow(flow)} 
                           className="text-purple-400 hover:text-purple-300 text-sm font-medium inline-flex items-center"
                         >
                           <Edit size={14} className="mr-1" /> Edit
                         </button>
                       </CustomTooltip>
                       <CustomTooltip content={`Delete the '${flow.name}' flow`}>
                         <button 
                           onClick={() => handleDeleteFlow(flow)} 
                           disabled={deleteFlowMutation.isPending && deleteFlowMutation.variables?.flowId === flow.id} 
                           className="text-red-400 hover:text-red-300 text-sm font-medium disabled:opacity-50 inline-flex items-center"
                         >
                           <Trash2 size={14} className="mr-1" /> Delete
                         </button>
                       </CustomTooltip>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6 px-4 bg-black rounded-md border border-dashed border-[#333333]">
                <p className="text-gray-400">No secondary flows created yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Flow Editor Modal - Render conditionally with black background */}
      {editingFlow && (
        <Modal>
          <GuidedFlowForm
            flow={editingFlow}
            allFlows={flows || []} 
            onSave={handleSaveFlow}
            onCancel={() => setEditingFlow(null)}
            isLoading={updateFlowMutation.isPending}
          />
        </Modal>
      )}
    </div>
  );
};

export default GuidedChatManager;
