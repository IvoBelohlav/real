'use client';

import React, { useState, useEffect, FormEvent, useCallback, ChangeEvent } from 'react'; // Added ChangeEvent
import { GuidedChatFlow, GuidedChatOption, BotResponse } from '@/types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { PlusCircle, Save, X, ChevronDown, ChevronUp, Trash2, ArrowRight, Send } from 'lucide-react'; // Added Send icon
import { toast } from 'react-toastify';
import clsx from 'clsx';

interface GuidedFlowFormProps {
  flow: GuidedChatFlow; // The flow being edited
  allFlows: GuidedChatFlow[]; // Needed for next_flow dropdown and validation
  onSave: (updatedFlowData: Partial<GuidedChatFlow>) => void; // Send only updated data
  onCancel: () => void;
  isLoading: boolean;
}

// Ensure BotResponse type definition if not globally defined in types/index.ts
// type BotResponse = { text: string; followUp?: string | null };

// Create a default message option for adding to a flow
const createDefaultOption = (flowName: string, order: number): GuidedChatOption => {
  return {
    id: `new_${flowName}_${Date.now()}_${order}`, // Temporary ID
    text: "New Option",
    icon: "💬",
    order,
    action: 'next_flow', // Default action
    next_flow: "",
    request_type: null,
    input_fields: ['email', 'message'], // Default required fields for contact request
    bot_response: { text: "", followUp: "" }
  };
};

// Define the available request types
const requestTypeOptions = [
  { value: 'order_status', label: 'Order Status Inquiry' },
  { value: 'item_return', label: 'Item Return Request' },
  { value: 'general_question', label: 'General Question' },
  // Add more types here if needed
];

// Define the available input fields for contact requests
const availableInputFields: GuidedChatOption['input_fields'] = ['email', 'phone', 'message', 'order_number'];

const GuidedFlowForm: React.FC<GuidedFlowFormProps> = ({ flow, allFlows, onSave, onCancel, isLoading }) => {
  const [flowName, setFlowName] = useState(flow.name);
  const [options, setOptions] = useState<GuidedChatOption[]>([]);
  const [language, setLanguage] = useState(flow.language || 'cs');
  const [isActive, setIsActive] = useState(flow.active !== undefined ? flow.active : true);
  const [expandedOptionId, setExpandedOptionId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Filter out the current flow being edited from the list of available next flows
  const otherFlowNames = allFlows
    .filter(f => f.id !== flow.id)
    .map(f => f.name)
    .sort();

  const commonEmojis = ["💬", "🔍", "📝", "📚", "🛠️", "⚙️", "💡", "❓", "✅", "🚀", "👋", "👍", "🎯", "💰", "📊", "🎨", "🏆", "🔒", "🌎", "⚠️"];

  useEffect(() => {
    setFlowName(flow.name);
    // Sort options by order and ensure bot_response is initialized correctly
    const sortedOptions = [...(flow.options || [])]
        .sort((a, b) => a.order - b.order)
        .map(opt => ({
            ...opt,
            // Ensure bot_response is always an object, even if null/string in data
            bot_response: typeof opt.bot_response === 'object' && opt.bot_response !== null
                          ? { text: opt.bot_response.text || '', followUp: opt.bot_response.followUp || '' } // Ensure text/followUp exist
                          : { text: typeof opt.bot_response === 'string' ? opt.bot_response : '', followUp: '' }
        }));
    setOptions(sortedOptions);
    setLanguage(flow.language || 'cs');
    setIsActive(flow.active !== undefined ? flow.active : true);
    setHasUnsavedChanges(false);
    setExpandedOptionId(sortedOptions.length === 1 ? sortedOptions[0].id : null);
  }, [flow]);

  const handleFlowNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFlowName(e.target.value);
    setHasUnsavedChanges(true);
  };

  // Handles changes within an option's input fields
  const handleOptionChange = (optionId: string, field: string, value: any) => {
    setOptions(prevOptions =>
      prevOptions.map(opt => {
        if (opt.id === optionId) {
          const updatedOpt = { ...opt };
          if (field.startsWith("bot_response.")) {
            const botField = field.split(".")[1];
            // Ensure bot_response is treated as an object
            const currentBotResponse = typeof opt.bot_response === 'object' && opt.bot_response !== null
              ? opt.bot_response
              : { text: '', followUp: '' }; // Initialize if not object
            updatedOpt.bot_response = { ...currentBotResponse, [botField]: value };
          } else {
             // Directly update other fields like text, icon, next_flow, action, request_type
             // The 'input_fields' case is now handled exclusively by handleInputFieldChange
             (updatedOpt as any)[field] = value;
                // If action changes, reset the other action's fields
                if (field === 'action') {
                    if (value === 'submit_contact_request') {
                        updatedOpt.next_flow = null; // Clear next_flow if switching to submit action
                        // Set default request_type if not already set
                        if (!updatedOpt.request_type) {
                            updatedOpt.request_type = requestTypeOptions[0]?.value || null;
                        }
                         // Ensure default input fields if empty
                        if (!updatedOpt.input_fields || updatedOpt.input_fields.length === 0) {
                            updatedOpt.input_fields = ['email', 'message'];
                        }
                    } else { // action is 'next_flow' or null
                        updatedOpt.request_type = null; // Clear request_type
                        updatedOpt.input_fields = []; // Clear input fields
                    }
                }
            }
            return updatedOpt;
        }
        return opt;
        })
    );
    setHasUnsavedChanges(true);
  };

  // Specific handler for input_fields checkboxes
  const handleInputFieldChange = (optionId: string, fieldName: 'email' | 'phone' | 'message' | 'order_number', event: ChangeEvent<HTMLInputElement>) => {
    setOptions(prevOptions =>
        prevOptions.map(opt => {
            if (opt.id === optionId) {
                const updatedOpt = { ...opt };
                const currentFields = Array.isArray(updatedOpt.input_fields) ? updatedOpt.input_fields : [];
                const isChecked = event.target.checked;

                if (isChecked) {
                    // Add field if checked and not already present
                    if (!currentFields.includes(fieldName)) {
                        updatedOpt.input_fields = [...currentFields, fieldName];
                    }
                } else {
                    // Remove field if unchecked
                    updatedOpt.input_fields = currentFields.filter(f => f !== fieldName);
                }
                return updatedOpt;
            }
            return opt;
        })
    );
    setHasUnsavedChanges(true);
  };


  const handleAddOption = () => {
    const newOption = createDefaultOption(flow.name, options.length);
    setOptions(prevOptions => [...prevOptions, newOption]);
    setExpandedOptionId(newOption.id);
    setHasUnsavedChanges(true);
  };

  const handleDeleteOption = (optionId: string) => {
    if (!window.confirm("Delete this option?")) return;
    setOptions(prevOptions =>
      prevOptions
        .filter(opt => opt.id !== optionId)
        .map((opt, index) => ({ ...opt, order: index })) // Re-order remaining
    );
    if (expandedOptionId === optionId) {
      setExpandedOptionId(null);
    }
    setHasUnsavedChanges(true);
  };

  const handleMoveOption = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === options.length - 1)) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newOptions = [...options];
    [newOptions[index], newOptions[newIndex]] = [newOptions[newIndex], newOptions[index]];
    const reorderedOptions = newOptions.map((opt, idx) => ({ ...opt, order: idx }));
    setOptions(reorderedOptions);
    setHasUnsavedChanges(true);
  };

  const toggleOption = (optionId: string) => {
    setExpandedOptionId(prevId => (prevId === optionId ? null : optionId));
  };

  // Circular reference check
  const detectCircularReferences = useCallback((currentFlow: GuidedChatFlow, updatedOptions: GuidedChatOption[], allFlowsData: GuidedChatFlow[]): boolean => {
    const flowsMap = new Map<string, GuidedChatFlow>();
    allFlowsData.forEach(f => flowsMap.set(f.name, f));
    // Temporarily update the map with the options being saved for the current flow
    flowsMap.set(currentFlow.name, { ...currentFlow, options: updatedOptions });

    const checkForCycles = (flowName: string | null | undefined, path: Set<string>): boolean => {
        if (!flowName) return false;

        if (path.has(flowName)) {
            console.error(`Circular reference detected: Path includes ${flowName} twice.`);
            toast.error(`Circular reference detected involving flow: ${flowName}`);
            return true;
        }

        const targetFlow = flowsMap.get(flowName);
        if (!targetFlow) return false; // Linked flow doesn't exist

        const newPath = new Set(path);
        newPath.add(flowName);

        for (const option of targetFlow.options || []) {
            if (checkForCycles(option.next_flow, newPath)) {
                return true;
            }
        }
        return false;
    };

    // Check cycles starting from each option in the current flow
    for (const option of updatedOptions) {
        if (checkForCycles(option.next_flow, new Set([currentFlow.name]))) {
            return true;
        }
    }

    return false;
  }, []); // Empty dependency array as it uses passed parameters

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!flowName.trim()) { toast.error("Flow name cannot be empty."); return; }
    if (flowName !== flow.name && allFlows.some(f => f.name === flowName && f.id !== flow.id)) { toast.error(`A flow named "${flowName}" already exists.`); return; }
    if (flowName !== 'main' && !/^[a-z0-9_]+$/.test(flowName)) { toast.error("Flow name must contain only lowercase letters, numbers, and underscores (except for 'main')."); return; }

    // Validate options
    for (const opt of options) {
        if (!opt.text?.trim()) { toast.error(`Option text cannot be empty (Option ${opt.order + 1}).`); setExpandedOptionId(opt.id); return; }
        if (!opt.icon?.trim()) { toast.error(`Option icon cannot be empty (Option ${opt.order + 1}).`); setExpandedOptionId(opt.id); return; }
    }

    // Prepare updated flow data
    const finalOptions = options.map((opt, index) => {
        const botResponse = opt.bot_response;
        let cleanBotResponse: BotResponse | null = null;

        // Ensure bot_response is an object with text, or null if text is empty
        if (typeof botResponse === 'object' && botResponse !== null && botResponse.text?.trim()) {
            cleanBotResponse = { text: botResponse.text.trim(), followUp: botResponse.followUp?.trim() || null };
        } else if (typeof botResponse === 'string' && botResponse.trim()) {
             cleanBotResponse = { text: botResponse.trim(), followUp: null };
        }

        return {
            id: opt.id.startsWith('new_') ? undefined : opt.id,
            text: opt.text.trim(),
            icon: opt.icon.trim(),
            order: index,
            next_flow: opt.action === 'submit_contact_request' ? null : (opt.next_flow || null),
            bot_response: cleanBotResponse,
            // Include new action-related fields
            action: opt.action || 'next_flow', // Default to next_flow if null/undefined
            request_type: opt.action === 'submit_contact_request' ? (opt.request_type || null) : null,
            input_fields: opt.action === 'submit_contact_request' ? (opt.input_fields || []) : [],
        };
    });

    const updatedFlowData: Partial<GuidedChatFlow> = {
      id: flow.id,
      name: flowName,
      options: finalOptions as any, // Cast needed as IDs might be undefined
      language: language,
      active: isActive,
    };

    // Check for circular references before saving
    if (detectCircularReferences(flow, finalOptions as GuidedChatOption[], allFlows)) {
      return; // Stop submission if cycle detected
    }

    onSave(updatedFlowData);
    setHasUnsavedChanges(false);
  };

  const handleCancel = () => {
      if (hasUnsavedChanges && !window.confirm("Discard unsaved changes?")) {
          return;
      }
    setHasUnsavedChanges(false);
  };

 

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Flow Name, Language, Active - Improved Styling */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div>
          <label htmlFor="flowName" className="block text-sm font-medium text-gray-700 mb-1">Flow Name *</label>
          <input
            type="text" id="flowName" value={flowName} onChange={handleFlowNameChange} required disabled={flow.name === 'main'}
            className={clsx(
              "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm",
              flow.name === 'main' ? 'bg-gray-200 cursor-not-allowed text-gray-500' : 'bg-white'
            )}
          />
           {flow.name === 'main' && <p className="mt-1 text-xs text-gray-500">'main' flow name cannot be changed.</p>}
        </div>
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">Language</label>
          <select id="language" value={language} onChange={(e) => { setLanguage(e.target.value); setHasUnsavedChanges(true); }} className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            <option value="cs">Czech (cs)</option>
            <option value="en">English (en)</option>
          </select>
        </div>
        <div className="flex items-center justify-start md:justify-center md:pt-6"> {/* Adjusted alignment */}
          <div className="flex items-center">
            <input id="isActive" name="isActive" type="checkbox" checked={isActive} onChange={(e) => { setIsActive(e.target.checked); setHasUnsavedChanges(true); }} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"/>
            <label htmlFor="isActive" className="ml-2 block text-sm font-medium text-gray-900">Active</label>
          </div>
        </div>
      </div>

      {/* Options Editor - Improved Styling */}
      <div className="space-y-4"> {/* Increased spacing */}
        <label className="block text-base font-semibold text-gray-800">Options</label> {/* Increased font size/weight */}
        {options.length === 0 && <p className="text-sm text-gray-500 italic px-3 py-2 bg-gray-50 rounded-md border border-gray-200">No options added yet. Click "Add Option" below.</p>}
        {options.map((option, index) => (
          <div key={option.id} className="border border-gray-300 rounded-lg shadow-sm overflow-hidden"> {/* Added shadow, increased rounding */}
            {/* Option Header - Improved Styling */}
            <div
              className={clsx(
                "flex items-center justify-between p-3 cursor-pointer transition-colors duration-150",
                expandedOptionId === option.id ? "bg-indigo-50 border-b border-indigo-200" : "bg-gray-50 hover:bg-gray-100"
              )}
              onClick={() => toggleOption(option.id)}
            >
              <div className="flex items-center space-x-3 flex-grow min-w-0">
                 <span className="text-xl flex-shrink-0 w-6 text-center">{option.icon || '💬'}</span>
                 <span className="text-sm font-medium text-gray-900 truncate flex-grow">{option.text || `Option ${index + 1}`}</span>
                 {/* Show indicator for action type */}
                 {option.action === 'submit_contact_request' ? (
                    <span className="flex-shrink-0 flex items-center text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full ml-2 font-medium">
                      <Send size={12} className="mr-1"/> Submit Request
                    </span>
                 ) : option.next_flow ? (
                    <span className="flex-shrink-0 flex items-center text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full ml-2 font-medium">
                      <ArrowRight size={12} className="mr-1"/> {option.next_flow}
                    </span>
                 ) : (
                    <span className="flex-shrink-0 flex items-center text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full ml-2 font-medium">
                      End
                    </span>
                 )}
              </div>
              <div className="flex items-center space-x-1 flex-shrink-0 ml-3">
                 {/* Reorder Buttons - Slightly larger */}
                 <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveOption(index, 'up'); }} disabled={index === 0} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"> <ChevronUp size={18}/> </button>
                 <button type="button" onClick={(e) => { e.stopPropagation(); handleMoveOption(index, 'down'); }} disabled={index === options.length - 1} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"> <ChevronDown size={18}/> </button>
                 {/* Expand/Collapse Button */}
                 <button type="button" onClick={(e) => { e.stopPropagation(); toggleOption(option.id); }} className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded">
                    {expandedOptionId === option.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                 </button>
              </div>
            </div>

            {/* Option Details (Expanded) - Improved Styling */}
            {expandedOptionId === option.id && (
              <div className="p-5 bg-white space-y-5"> {/* Increased padding and spacing */}
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-5"> {/* Increased gap */}
                    {/* Display Text */}
                    <div className="sm:col-span-5">
                        <label htmlFor={`option-text-${option.id}`} className="block text-sm font-medium text-gray-700 mb-1">Display Text *</label>
                        <input id={`option-text-${option.id}`} type="text" value={option.text || ""} onChange={(e) => handleOptionChange(option.id, "text", e.target.value)} required className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                    </div>
                    {/* Icon */}
                    <div className="sm:col-span-1">
                        <label htmlFor={`option-icon-${option.id}`} className="block text-sm font-medium text-gray-700 mb-1">Icon *</label>
                        <input id={`option-icon-${option.id}`} type="text" value={option.icon || ""} onChange={(e) => handleOptionChange(option.id, "icon", e.target.value)} required maxLength={2} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-center"/>
                    </div>
                </div>
                 {/* Emoji Picker - Improved Styling */}
                 <div className="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-md bg-gray-50">
                    {commonEmojis.map(emoji => (
                        <button key={emoji} type="button" className="p-1.5 rounded hover:bg-indigo-100 text-xl transition-colors duration-150" onClick={() => handleOptionChange(option.id, "icon", emoji)}>
                            {emoji}
                        </button>
                    ))}
                 </div>

                {/* Bot Response */}
                <div>
                  <label htmlFor={`option-bot-text-${option.id}`} className="block text-sm font-medium text-gray-700 mb-1">Bot Response Text</label>
                  <textarea id={`option-bot-text-${option.id}`} value={(typeof option.bot_response === 'object' && option.bot_response?.text) || ''} onChange={(e) => handleOptionChange(option.id, "bot_response.text", e.target.value)} rows={3} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                </div>
                {/* Follow-up */}
                <div>
                  <label htmlFor={`option-bot-followup-${option.id}`} className="block text-sm font-medium text-gray-700 mb-1">Follow-up Message (Optional)</label>
                  <input id={`option-bot-followup-${option.id}`} type="text" value={(typeof option.bot_response === 'object' && option.bot_response?.followUp) || ''} onChange={(e) => handleOptionChange(option.id, "bot_response.followUp", e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                </div>

                {/* Action Type Selection */}
                <div className="border-t pt-4 mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Option Action</label>
                    <div className="flex space-x-4">
                        <label className="flex items-center">
                            <input type="radio" name={`action-type-${option.id}`} value="next_flow" checked={!option.action || option.action === 'next_flow'} onChange={(e) => handleOptionChange(option.id, "action", e.target.value)} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"/>
                            <span className="ml-2 text-sm text-gray-700">Go to another flow / End</span>
                        </label>
                        <label className="flex items-center">
                            <input type="radio" name={`action-type-${option.id}`} value="submit_contact_request" checked={option.action === 'submit_contact_request'} onChange={(e) => handleOptionChange(option.id, "action", e.target.value)} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"/>
                            <span className="ml-2 text-sm text-gray-700">Submit Contact Request</span>
                        </label>
                    </div>
                </div>

                {/* Conditional Fields based on Action */}
                {(!option.action || option.action === 'next_flow') && (
                    <div>
                        <label htmlFor={`option-next-flow-${option.id}`} className="block text-sm font-medium text-gray-700 mb-1">Next Flow (Optional)</label>
                        <select id={`option-next-flow-${option.id}`} value={option.next_flow || ""} onChange={(e) => handleOptionChange(option.id, "next_flow", e.target.value)} className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            <option value="">-- End Conversation --</option>
                            {otherFlowNames.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                )}

                {option.action === 'submit_contact_request' && (
                    <div className="space-y-4 p-4 border border-green-200 bg-green-50 rounded-md">
                        <h4 className="text-sm font-semibold text-green-800">Contact Request Settings</h4>
                        {/* Request Type */}
                        <div>
                            <label htmlFor={`option-request-type-${option.id}`} className="block text-sm font-medium text-gray-700 mb-1">Request Type *</label>
                            <select id={`option-request-type-${option.id}`} value={option.request_type || ""} onChange={(e) => handleOptionChange(option.id, "request_type", e.target.value)} required className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                <option value="" disabled>-- Select Type --</option>
                                {requestTypeOptions.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                            </select>
                        </div>
                        {/* Required Input Fields */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Required Input Fields</label>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                {availableInputFields.map(field => (
                                    <label key={field} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={option.input_fields?.includes(field) || false}
                                            onChange={(e) => handleInputFieldChange(option.id, field, e)}
                                            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 capitalize">{field.replace('_', ' ')}</span>
                                    </label>
                                ))}
                            </div>
                             <p className="text-xs text-gray-500 mt-1">Select fields the user must provide for this request.</p>
                        </div>
                    </div>
                )}

                {/* Delete Button */}
                <div className="flex justify-end pt-3 border-t mt-4">
                    <button type="button" onClick={() => handleDeleteOption(option.id)} className="text-red-600 hover:text-red-800 text-sm font-medium inline-flex items-center px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors duration-150">
                        <Trash2 size={16} className="mr-1.5"/> Delete Option
                    </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Option Button - Improved Styling */}
      <div className="pt-4">
        <button type="button" onClick={handleAddOption} className="w-full flex justify-center items-center px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-indigo-400 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150">
          <PlusCircle size={18} className="mr-2" /> Add Option
        </button>
      </div>

      {/* Action Buttons - Improved Styling */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 mt-8"> {/* Increased spacing */}
        <button type="button" onClick={handleCancel} disabled={isLoading} className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium disabled:opacity-50 transition-colors duration-150">
          Cancel
        </button>
        <button type="submit" disabled={isLoading || !hasUnsavedChanges} className="px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[130px] transition-colors duration-150">
          {isLoading ? <LoadingSpinner /> : (
              <>
                <Save size={18} className="mr-1.5" />
                Save Flow
              </>
          )}
        </button>
      </div>
    </form>
  );
};

export default GuidedFlowForm;
