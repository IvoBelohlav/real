import React, { useState, useEffect } from "react";
import { 
  PlusCircle, 
  Save, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  ArrowRight,
  Plus
} from "lucide-react";
import styles from "./GuidedChatManager.module.css";

// Create a default message option for adding to a flow
const createDefaultOption = (flowName, existingOptions = []) => {
  const order = existingOptions.length;
  
  return {
    id: `${flowName}-${Date.now()}`,
    text: "New option",
    icon: "💬",
    order,
    next_flow: "",
    bot_response: {
      text: "This is the bot's response to the user selecting this option.",
      followUp: "What would you like to do next?"
    }
  };
};

const GuidedFlowEditor = ({ flow, onSave, onClose, allFlows = [], dynamicStyles = {} }) => {
  const [options, setOptions] = useState([]);
  const [expandedOption, setExpandedOption] = useState(null);
  const [isMainFlow] = useState(flow.name === "main");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Add list of other flow names to use as references (excluding this flow)
  const otherFlowNames = allFlows
    .filter(f => f.name !== flow.name)
    .map(f => f.name)
    .sort();

  // Emoji picker options for quick selection
  const commonEmojis = ["💬", "🔍", "📝", "📚", "🛠️", "⚙️", "💡", "❓", "✅", "🚀", "👋", "👍", "🎯", "💰", "📊", "🎨", "🏆", "🔒", "🌎", "⚠️"];

  // Initialize options from the flow
  useEffect(() => {
    if (flow && flow.options) {
      // Sort by order property
      const sortedOptions = [...flow.options].sort((a, b) => a.order - b.order);
      setOptions(sortedOptions);
      
      // Auto-expand if there's only one option
      if (sortedOptions.length === 1 && expandedOption === null) {
        setExpandedOption(sortedOptions[0].id);
      }
    }
  }, [flow]);

  // Add a new option to the flow
  const handleAddOption = () => {
    const newOption = createDefaultOption(flow.name, options);
    setOptions([...options, newOption]);
    setExpandedOption(newOption.id); // Auto-expand the new option
    setHasUnsavedChanges(true);
  };

  // Update an option field value
  const handleOptionChange = (optionId, field, value) => {
    setOptions(prevOptions => {
      return prevOptions.map(option => {
        if (option.id === optionId) {
          if (field.startsWith("bot_response.")) {
            const botField = field.split(".")[1];
            return {
              ...option,
              bot_response: {
                ...option.bot_response,
                [botField]: value
              }
            };
          }
          return { ...option, [field]: value };
        }
        return option;
      });
    });
    setHasUnsavedChanges(true);
  };

  // Delete an option
  const handleDeleteOption = (optionId) => {
    if (!window.confirm("Are you sure you want to delete this option?")) return;
    
    setOptions(prevOptions => {
      const updatedOptions = prevOptions
        .filter(option => option.id !== optionId)
        .map((option, index) => ({ ...option, order: index }));
      return updatedOptions;
    });
    
    if (expandedOption === optionId) {
      setExpandedOption(null);
    }
    
    setHasUnsavedChanges(true);
  };

  // Move an option up or down in the order
  const handleMoveOption = (optionId, direction) => {
    setOptions(prevOptions => {
      const index = prevOptions.findIndex(option => option.id === optionId);
      if (index === -1) return prevOptions;
      
      if (direction === "up" && index > 0) {
        const newOptions = [...prevOptions];
        [newOptions[index - 1], newOptions[index]] = [newOptions[index], newOptions[index - 1]];
        
        // Update order properties
        return newOptions.map((option, i) => ({
          ...option,
          order: i
        }));
      }
      
      if (direction === "down" && index < prevOptions.length - 1) {
        const newOptions = [...prevOptions];
        [newOptions[index], newOptions[index + 1]] = [newOptions[index + 1], newOptions[index]];
        
        // Update order properties
        return newOptions.map((option, i) => ({
          ...option,
          order: i
        }));
      }
      
      return prevOptions;
    });
    
    setHasUnsavedChanges(true);
  };

  // Toggle option expansion
  const toggleOption = (optionId) => {
    setExpandedOption(expandedOption === optionId ? null : optionId);
  };

  // Save the flow with updated options
  const handleSave = () => {
    // Create a fresh object to avoid any reference issues
    const updatedFlow = {
      ...flow,
      options: options.map((option, index) => ({
        ...option,
        order: index // Ensure order is correct
      }))
    };
    
    onSave(updatedFlow);
    setHasUnsavedChanges(false);
  };

  // Confirm before leaving with unsaved changes
  const handleClose = () => {
    if (hasUnsavedChanges && !window.confirm("You have unsaved changes. Are you sure you want to exit without saving?")) {
      return;
    }
    onClose();
  };

  return (
    <div className={styles.flowEditorContainer} style={{ width: '100%', maxWidth: '1400px' }}>
      <div className={styles.editorActionsTop} style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            className={`${styles.actionButton} ${styles.primaryButton}`}
            style={{
              ...dynamicStyles.primaryButton,
              minWidth: '160px',
              padding: '0.75rem 1.5rem'
            }}
            onClick={handleSave}
            disabled={options.length === 0}
            title="Save changes"
            onMouseOver={(e) => {
              if (options.length > 0) e.currentTarget.style.backgroundColor = dynamicStyles.primaryButtonHover?.backgroundColor;
            }}
            onMouseOut={(e) => {
              if (options.length > 0) e.currentTarget.style.backgroundColor = dynamicStyles.primaryButton?.backgroundColor;
            }}
          >
            <Save className={styles.buttonIcon} size={18} />
            Save Flow
          </button>
          
          <button
            className={`${styles.actionButton} ${styles.secondaryButton}`}
            style={{ minWidth: '160px', padding: '0.75rem 1.5rem' }}
            onClick={handleAddOption}
            title="Add new option"
          >
            <PlusCircle className={styles.buttonIcon} size={18} />
            Add Option
          </button>
        </div>
      </div>

      {options.length === 0 ? (
        <div className={styles.emptyState} style={{ padding: '3rem', marginBottom: '2rem' }}>
          <p className={styles.emptyStateText} style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            {isMainFlow 
              ? "This is the main flow where users start their guided chat journey. Add options to get started." 
              : "This flow has no options yet. Add options to define the user's choices."}
          </p>
          <button 
            className={`${styles.actionButton} ${styles.primaryButton}`}
            style={{
              ...dynamicStyles.primaryButton,
              minWidth: '180px',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem'
            }}
            onClick={handleAddOption}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = dynamicStyles.primaryButtonHover?.backgroundColor;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = dynamicStyles.primaryButton?.backgroundColor;
            }}
          >
            <Plus className={styles.buttonIcon} size={18} />
            Add First Option
          </button>
        </div>
      ) : (
        <div className={styles.optionsList} style={{ width: '100%', maxWidth: '1300px' }}>
          {options.map((option, index) => (
            <div 
              key={option.id} 
              className={`${styles.optionItem} ${expandedOption === option.id ? styles.expanded : ''}`}
              style={{ width: '100%' }}
            >
              <div 
                className={styles.optionHeader} 
                onClick={() => toggleOption(option.id)}
                style={{ padding: '1.25rem 1.5rem' }}
              >
                <div className={styles.optionInfo}>
                  <span className={styles.optionIcon} style={{ fontSize: '1.5rem' }}>{option.icon}</span>
                  <span className={styles.optionTitle} style={{ fontSize: '1.1rem' }}>{option.text || "Untitled Option"}</span>
                  {option.next_flow && (
                    <span className={styles.optionFlowLink} style={{
                      ...dynamicStyles.optionFlowLink,
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.85rem'
                    }}>
                      <ArrowRight size={16} />
                      {option.next_flow}
                    </span>
                  )}
                </div>
                <div className={styles.optionActions}>
                  {expandedOption !== option.id ? (
                    <button
                      className={styles.expandButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOption(option.id);
                      }}
                    >
                      <ChevronDown size={22} />
                    </button>
                  ) : (
                    <button
                      className={styles.collapseButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOption(option.id);
                      }}
                    >
                      <ChevronUp size={22} />
                    </button>
                  )}
                </div>
              </div>

              {expandedOption === option.id && (
                <div className={styles.optionDetails} style={{ padding: '1.75rem' }}>
                  <div className={styles.optionField}>
                    <label className={styles.fieldLabel}>Display Text</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={option.text || ""}
                      onChange={(e) => handleOptionChange(option.id, "text", e.target.value)}
                      placeholder="What the user sees as an option"
                      style={{
                        ':focus': dynamicStyles.focusBorder
                      }}
                    />
                  </div>

                  <div className={styles.optionField}>
                    <label className={styles.fieldLabel}>Icon</label>
                    <div className={styles.emojiPicker}>
                      <input
                        type="text"
                        className={styles.emojiInput}
                        value={option.icon || ""}
                        onChange={(e) => handleOptionChange(option.id, "icon", e.target.value)}
                        placeholder="💬"
                        maxLength={2}
                        style={{
                          ':focus': dynamicStyles.focusBorder
                        }}
                      />
                      <div className={styles.emojiOptions}>
                        {commonEmojis.map(emoji => (
                          <button
                            key={emoji}
                            className={styles.emojiOption}
                            onClick={() => handleOptionChange(option.id, "icon", emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={styles.optionField}>
                    <label className={styles.fieldLabel}>Bot Response</label>
                    <textarea
                      className={styles.textareaInput}
                      value={option.bot_response?.text || ""}
                      onChange={(e) => 
                        handleOptionChange(option.id, "bot_response.text", e.target.value)
                      }
                      placeholder="What the bot says after the user selects this option"
                      rows={3}
                      style={{
                        ':focus': dynamicStyles.focusBorder
                      }}
                    />
                  </div>

                  <div className={styles.optionField}>
                    <label className={styles.fieldLabel}>Follow-up Message</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={option.bot_response?.followUp || ""}
                      onChange={(e) => 
                        handleOptionChange(option.id, "bot_response.followUp", e.target.value)
                      }
                      placeholder="Optional follow-up question or prompt"
                      style={{
                        ':focus': dynamicStyles.focusBorder
                      }}
                    />
                  </div>

                  <div className={styles.optionField}>
                    <label className={styles.fieldLabel}>Next Flow</label>
                    <select
                      className={styles.selectInput}
                      value={option.next_flow || ""}
                      onChange={(e) => handleOptionChange(option.id, "next_flow", e.target.value)}
                      style={{
                        ':focus': dynamicStyles.focusBorder
                      }}
                    >
                      <option value="">No next flow (end conversation)</option>
                      {otherFlowNames.map(flowName => (
                        <option key={flowName} value={flowName}>
                          {flowName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.optionActions} style={{ marginTop: '1.5rem' }}>
                    <div className={styles.orderButtons} style={{ gap: '0.5rem' }}>
                      <button
                        className={styles.orderButton}
                        onClick={() => handleMoveOption(option.id, "up")}
                        disabled={index === 0}
                        title="Move up"
                        style={{ width: '2.5rem', height: '2.5rem' }}
                      >
                        <ChevronUp size={20} />
                      </button>
                      <button
                        className={styles.orderButton}
                        onClick={() => handleMoveOption(option.id, "down")}
                        disabled={index === options.length - 1}
                        title="Move down"
                        style={{ width: '2.5rem', height: '2.5rem' }}
                      >
                        <ChevronDown size={20} />
                      </button>
                    </div>
                    <button
                      className={`${styles.actionButtonSmall} ${styles.deleteButton}`}
                      onClick={() => handleDeleteOption(option.id)}
                      title="Delete option"
                      style={{ padding: '0.6rem 1.2rem', minWidth: '100px' }}
                    >
                      <Trash2 className={styles.buttonIcon} size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GuidedFlowEditor;