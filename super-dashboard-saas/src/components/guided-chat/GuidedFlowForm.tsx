'use client';

import React, { useState, useEffect, FormEvent, useCallback, ChangeEvent, useRef } from 'react'; // Added useRef
import { GuidedChatFlow, GuidedChatOption, BotResponse } from '@/types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { PlusCircle, Save, X, ChevronDown, ChevronUp, Trash2, ArrowRight, Send, Smile } from 'lucide-react'; // Added Smile icon
import { toast } from 'react-toastify';
import clsx from 'clsx';
import Picker from 'emoji-picker-react'; // Import the emoji picker
import { Theme } from 'emoji-picker-react'; // Import Theme type

interface GuidedFlowFormProps {
  flow: GuidedChatFlow;
  allFlows: GuidedChatFlow[];
  onSave: (updatedFlowData: Partial<GuidedChatFlow>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

// Create a default message option for adding to a flow
const createDefaultOption = (flowName: string, order: number): GuidedChatOption => {
  return {
    id: `new_${flowName}_${Date.now()}_${order}`,
    text: "New Option",
    icon: "💬",
    order,
    action: 'next_flow',
    next_flow: "",
    request_type: null,
    input_fields: ['email', 'message'],
    bot_response: { text: "", followUp: "" }
  };
};

// Define the available request types
const requestTypeOptions = [
  { value: 'order_status', label: 'Order Status Inquiry' },
  { value: 'item_return', label: 'Item Return Request' },
  { value: 'general_question', label: 'General Question' },
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
  const [showEmojiPickerForOption, setShowEmojiPickerForOption] = useState<string | null>(null); // State for emoji picker visibility
  const pickerRef = useRef<HTMLDivElement>(null); // Ref for the picker

  // Filter out the current flow being edited from the list of available next flows
  const otherFlowNames = allFlows
    .filter(f => f.id !== flow.id)
    .map(f => f.name)
    .sort();


  useEffect(() => {
    setFlowName(flow.name);
    // Sort options by order and ensure bot_response is initialized correctly
    const sortedOptions = [...(flow.options || [])]
        .sort((a, b) => a.order - b.order)
        .map(opt => ({
            ...opt,
            // Ensure bot_response is always an object, even if null/string in data
            bot_response: typeof opt.bot_response === 'object' && opt.bot_response !== null
                          ? { text: opt.bot_response.text || '', followUp: opt.bot_response.followUp || '' }
                          : { text: typeof opt.bot_response === 'string' ? opt.bot_response : '', followUp: '' }
        }));
    setOptions(sortedOptions);
    setLanguage(flow.language || 'cs');
    setIsActive(flow.active !== undefined ? flow.active : true);
    setHasUnsavedChanges(false);
    setExpandedOptionId(sortedOptions.length === 1 ? sortedOptions[0].id : null);
    setShowEmojiPickerForOption(null); // Close picker on flow change
  }, [flow]);

  // Close emoji picker if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Check if the click is outside the picker itself
      // Also check if the click target is NOT the trigger button (to avoid immediate closing)
      const targetElement = event.target as Element;
      const isTriggerButton = targetElement.closest('button[aria-label="Select emoji"]');

      if (pickerRef.current && !pickerRef.current.contains(targetElement) && !isTriggerButton) {
        setShowEmojiPickerForOption(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [pickerRef]);


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
              : { text: '', followUp: '' };
            updatedOpt.bot_response = { ...currentBotResponse, [botField]: value };
          } else {
             (updatedOpt as any)[field] = value;
                if (field === 'action') {
                    if (value === 'submit_contact_request') {
                        updatedOpt.next_flow = null;
                        if (!updatedOpt.request_type) {
                            updatedOpt.request_type = requestTypeOptions[0]?.value || null;
                        }
                        if (!updatedOpt.input_fields || updatedOpt.input_fields.length === 0) {
                            updatedOpt.input_fields = ['email', 'message'];
                        }
                    } else {
                        updatedOpt.request_type = null;
                        updatedOpt.input_fields = [];
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
                    if (!currentFields.includes(fieldName)) {
                        updatedOpt.input_fields = [...currentFields, fieldName];
                    }
                } else {
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
        .map((opt, index) => ({ ...opt, order: index }))
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
  }, []);

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
            action: opt.action || 'next_flow',
            request_type: opt.action === 'submit_contact_request' ? (opt.request_type || null) : null,
            input_fields: opt.action === 'submit_contact_request' ? (opt.input_fields || []) : [],
        };
    });

    const updatedFlowData: Partial<GuidedChatFlow> = {
      id: flow.id,
      name: flowName,
      options: finalOptions as any,
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
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Flow Name, Language, Active */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-neutral-900 border border-border rounded-lg">
        <div>
          <label htmlFor="flowName" className="block text-sm font-medium text-foreground mb-1">Flow Name *</label>
          <input
            type="text" id="flowName" value={flowName} onChange={handleFlowNameChange} required disabled={flow.name === 'main'}
            className={clsx(
              "block w-full px-3 py-2 bg-muted border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm",
              flow.name === 'main' ? 'bg-neutral-800 cursor-not-allowed text-muted-foreground' : 'bg-neutral-800 text-foreground'
            )}
          />
           {flow.name === 'main' && <p className="mt-1 text-xs text-muted-foreground">'main' flow name cannot be changed.</p>}
        </div>
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-foreground mb-1">Language</label>
          <select 
            id="language" 
            value={language} 
            onChange={(e) => { setLanguage(e.target.value); setHasUnsavedChanges(true); }} 
            className="block w-full px-3 py-2 bg-neutral-800 border border-border text-foreground rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          >
            <option value="cs">Czech (cs)</option>
            <option value="en">English (en)</option>
          </select>
        </div>
        <div className="flex items-center justify-start md:justify-center md:pt-6">
          <div className="flex items-center">
            <input 
              id="isActive" 
              name="isActive" 
              type="checkbox" 
              checked={isActive} 
              onChange={(e) => { setIsActive(e.target.checked); setHasUnsavedChanges(true); }} 
              className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm font-medium text-foreground">Active</label>
          </div>
        </div>
      </div>

      {/* Options Editor */}
      <div className="space-y-4">
        <label className="block text-base font-semibold text-foreground">Options</label>
        {options.length === 0 && 
          <p className="text-sm text-muted-foreground italic px-3 py-2 bg-neutral-900 rounded-md border border-border">
            No options added yet. Click "Add Option" below.
          </p>
        }
        {options.map((option, index) => (
          <div key={option.id} className="border border-border rounded-lg shadow-md overflow-hidden bg-card">
            {/* Option Header */}
            <div
              className={clsx(
                "flex items-center justify-between p-3 cursor-pointer transition-colors duration-150",
                expandedOptionId === option.id ? "bg-primary/10 border-b border-primary/30" : "bg-neutral-900 hover:bg-neutral-800"
              )}
              onClick={() => toggleOption(option.id)}
            >
              <div className="flex items-center space-x-3 flex-grow min-w-0">
                 <span className="text-xl flex-shrink-0 w-6 text-center">{option.icon || '💬'}</span>
                 <span className="text-sm font-medium text-foreground truncate flex-grow">{option.text || `Option ${index + 1}`}</span>
                 {/* Show indicator for action type */}
                 {option.action === 'submit_contact_request' ? (
                    <span className="flex-shrink-0 flex items-center text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded-full ml-2 font-medium">
                      <Send size={12} className="mr-1"/> Submit Request
                    </span>
                 ) : option.next_flow ? (
                    <span className="flex-shrink-0 flex items-center text-xs bg-primary/20 text-primary-foreground px-2 py-0.5 rounded-full ml-2 font-medium">
                      <ArrowRight size={12} className="mr-1"/> {option.next_flow}
                    </span>
                 ) : (
                    <span className="flex-shrink-0 flex items-center text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full ml-2 font-medium">
                      End
                    </span>
                 )}
              </div>
              <div className="flex items-center space-x-1 flex-shrink-0 ml-3">
                 {/* Reorder Buttons */}
                 <button 
                   type="button" 
                   onClick={(e) => { e.stopPropagation(); handleMoveOption(index, 'up'); }} 
                   disabled={index === 0} 
                   className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-neutral-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                 >
                   <ChevronUp size={18}/>
                 </button>
                 <button 
                   type="button" 
                   onClick={(e) => { e.stopPropagation(); handleMoveOption(index, 'down'); }} 
                   disabled={index === options.length - 1} 
                   className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-neutral-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                 >
                   <ChevronDown size={18}/>
                 </button>
                 {/* Expand/Collapse Button */}
                 <button 
                   type="button" 
                   onClick={(e) => { e.stopPropagation(); toggleOption(option.id); }} 
                   className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-neutral-700 rounded"
                 >
                    {expandedOptionId === option.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                 </button>
              </div>
            </div>

            {/* Option Details (Expanded) */}
            {expandedOptionId === option.id && (
              <div className="p-5 bg-card space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-5">
                    {/* Display Text */}
                    <div className="sm:col-span-5">
                        <label htmlFor={`option-text-${option.id}`} className="block text-sm font-medium text-foreground mb-1">Display Text *</label>
                        <input 
                          id={`option-text-${option.id}`} 
                          type="text" 
                          value={option.text || ""} 
                          onChange={(e) => handleOptionChange(option.id, "text", e.target.value)} 
                          required 
                          className="block w-full px-3 py-2 bg-neutral-800 border border-border text-foreground rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </div>
                    {/* Icon with Emoji Picker Button */}
                    <div className="sm:col-span-1 relative">
                        <label htmlFor={`option-icon-${option.id}`} className="block text-sm font-medium text-foreground mb-1">Icon *</label>
                        <div className="flex items-center space-x-2">
                            <input
                              id={`option-icon-${option.id}`}
                              type="text"
                              value={option.icon || ""}
                              onChange={(e) => handleOptionChange(option.id, "icon", e.target.value)}
                              required
                              maxLength={4} // Allow for multi-byte emojis
                              className="block w-full px-3 py-2 bg-neutral-800 border border-border text-foreground rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-center"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent option collapse/click outside closing
                                setShowEmojiPickerForOption(showEmojiPickerForOption === option.id ? null : option.id);
                              }}
                              className="p-2 bg-neutral-700 text-muted-foreground hover:text-foreground rounded-md hover:bg-neutral-600 transition-colors"
                              aria-label="Select emoji"
                            >
                              <Smile size={18} />
                            </button>
                        </div>
                         {/* Emoji Picker Popover */}
                         {showEmojiPickerForOption === option.id && (
                            <div ref={pickerRef} className="absolute z-10 mt-2 right-0" onClick={(e) => e.stopPropagation()}>
                                <Picker
                                    onEmojiClick={(emojiData) => {
                                        handleOptionChange(option.id, "icon", emojiData.emoji);
                                        setShowEmojiPickerForOption(null); // Close picker after selection
                                    }}
                                    theme={Theme.DARK} // Use dark theme
                                    lazyLoadEmojis={true}
                                    width={350}
                                    height={400}
                                />
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Bot Response */}
                <div>
                  <label htmlFor={`option-bot-text-${option.id}`} className="block text-sm font-medium text-foreground mb-1">Bot Response Text</label>
                  <textarea 
                    id={`option-bot-text-${option.id}`} 
                    value={(typeof option.bot_response === 'object' && option.bot_response?.text) || ''} 
                    onChange={(e) => handleOptionChange(option.id, "bot_response.text", e.target.value)} 
                    rows={3} 
                    className="block w-full px-3 py-2 bg-neutral-800 border border-border text-foreground rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
                
                {/* Follow-up */}
                <div>
                  <label htmlFor={`option-bot-followup-${option.id}`} className="block text-sm font-medium text-foreground mb-1">Follow-up Message (Optional)</label>
                  <input 
                    id={`option-bot-followup-${option.id}`} 
                    type="text" 
                    value={(typeof option.bot_response === 'object' && option.bot_response?.followUp) || ''} 
                    onChange={(e) => handleOptionChange(option.id, "bot_response.followUp", e.target.value)} 
                    className="block w-full px-3 py-2 bg-neutral-800 border border-border text-foreground rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>

                {/* Action Type Selection */}
                <div className="border-t border-border pt-4 mt-4">
                    <label className="block text-sm font-medium text-foreground mb-2">Option Action</label>
                    <div className="flex space-x-4">
                        <label className="flex items-center">
                            <input 
                              type="radio" 
                              name={`action-type-${option.id}`} 
                              value="next_flow" 
                              checked={!option.action || option.action === 'next_flow'} 
                              onChange={(e) => handleOptionChange(option.id, "action", e.target.value)} 
                              className="focus:ring-primary h-4 w-4 text-primary border-border"
                            />
                            <span className="ml-2 text-sm text-foreground">Go to another flow / End</span>
                        </label>
                        <label className="flex items-center">
                            <input 
                              type="radio" 
                              name={`action-type-${option.id}`} 
                              value="submit_contact_request" 
                              checked={option.action === 'submit_contact_request'} 
                              onChange={(e) => handleOptionChange(option.id, "action", e.target.value)} 
                              className="focus:ring-primary h-4 w-4 text-primary border-border"
                            />
                            <span className="ml-2 text-sm text-foreground">Submit Contact Request</span>
                        </label>
                    </div>
                </div>

                {/* Conditional Fields based on Action */}
                {(!option.action || option.action === 'next_flow') && (
                    <div>
                        <label htmlFor={`option-next-flow-${option.id}`} className="block text-sm font-medium text-foreground mb-1">Next Flow (Optional)</label>
                        <select 
                          id={`option-next-flow-${option.id}`} 
                          value={option.next_flow || ""} 
                          onChange={(e) => handleOptionChange(option.id, "next_flow", e.target.value)} 
                          className="block w-full px-3 py-2 bg-neutral-800 border border-border text-foreground rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        >
                            <option value="">-- End Conversation --</option>
                            {otherFlowNames.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                )}

                {option.action === 'submit_contact_request' && (
                    <div className="space-y-4 p-4 border border-primary/30 bg-primary/10 rounded-md">
                        <h4 className="text-sm font-semibold text-primary">Contact Request Settings</h4>
                        {/* Request Type */}
                        <div>
                            <label htmlFor={`option-request-type-${option.id}`} className="block text-sm font-medium text-foreground mb-1">Request Type *</label>
                            <select 
                              id={`option-request-type-${option.id}`} 
                              value={option.request_type || ""} 
                              onChange={(e) => handleOptionChange(option.id, "request_type", e.target.value)} 
                              required 
                              className="block w-full px-3 py-2 bg-neutral-800 border border-border text-foreground rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            >
                                <option value="" disabled>-- Select Type --</option>
                                {requestTypeOptions.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                            </select>
                        </div>
                        {/* Required Input Fields */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Required Input Fields</label>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                {availableInputFields.map(field => (
                                    <label key={field} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={option.input_fields?.includes(field) || false}
                                            onChange={(e) => handleInputFieldChange(option.id, field, e)}
                                            className="focus:ring-primary h-4 w-4 text-primary border-border rounded"
                                        />
                                        <span className="ml-2 text-sm text-foreground capitalize">{field.replace('_', ' ')}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Select fields the user must provide for this request.</p>
                        </div>
                    </div>
                )}

                {/* Delete Button */}
                <div className="flex justify-end pt-3 border-t border-border mt-4">
                    <button 
                      type="button" 
                      onClick={() => handleDeleteOption(option.id)} 
                      className="text-red-400 hover:text-red-300 text-sm font-medium inline-flex items-center px-3 py-1.5 rounded-md hover:bg-red-900/30 transition-colors duration-150"
                    >
                        <Trash2 size={16} className="mr-1.5"/> Delete Option
                    </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Option Button */}
      <div className="pt-4">
        <button 
          type="button" 
          onClick={handleAddOption} 
          className="w-full flex justify-center items-center px-4 py-2.5 border-2 border-dashed border-border rounded-lg text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-150"
        >
          <PlusCircle size={18} className="mr-2" /> Add Option
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-border mt-8">
        <button 
          type="button" 
          onClick={handleCancel} 
          disabled={isLoading} 
          className="px-5 py-2 bg-neutral-800 border border-border text-foreground rounded-md hover:bg-neutral-700 text-sm font-medium disabled:opacity-50 transition-colors duration-150"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={isLoading || !hasUnsavedChanges} 
          className="px-5 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/80 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[130px] transition-colors duration-150"
        >
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
