import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  PlusCircle, 
  CircleHelp, 
  Code, 
  FileText, 
  Settings, 
  ArrowLeft, 
  Save,
  Trash2,
  FolderTree,
  RefreshCw
} from "lucide-react";
import { toast } from "react-toastify";
// Import the correct api instance from lib
import api from "../../lib/api";
import GuidedFlowEditor from "./GuidedFlowEditor";
import GuidedChatManagerManual from "./GuidedChatManagerManual";
import styles from "./GuidedChatManager.module.css";
import { useQuery } from '@tanstack/react-query';

// Remove manual token getter, rely on interceptor
// const getAuthToken = () => {
//   return localStorage.getItem('authToken');
// };

const DEFAULT_MAIN_FLOW_OPTIONS = [
  {
    id: `main-1`,
    text: "Build AI chatbot",
    icon: "🚀",
    order: 0,
    next_flow: "build_flow",
    bot_response: {
      text: "Let's get you started on building your AI chatbot! Here's how to install the Chat Widget on your website 👇",
      followUp: "Select what you'd like to learn about first:",
    },
  },
  {
    id: `main-2`,
    text: "Using ChatBot",
    icon: "👍",
    order: 1,
    next_flow: "usage_flow",
    bot_response: {
      text: "I'm here to help you with everything about the ChatBot. 🤝 Let's dive in!",
      followUp: "How may I assist you?",
    },
  },
  {
    id: `main-3`,
    text: "I have questions",
    icon: "❓",
    order: 2,
    next_flow: "questions_flow",
    bot_response: {
      text: "I'll be happy to answer your questions! Let me know what you'd like to learn about.",
      followUp: "Choose a topic below:",
    },
  },
  {
    id: `main-4`,
    text: "Just browsing",
    icon: "😎",
    order: 3,
    next_flow: "features_flow",
    bot_response: {
      text: "Welcome! I can show you around our main features. We have a lot to offer! 🎯",
      followUp: "What would you like to explore first?",
    },
  },
];

const GuidedChatManager = () => {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFlow, setEditingFlow] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const API_BASE = 'http://localhost:8000';

  // Fetch widget configuration to use for dynamic styling
  const { data: widgetConfig } = useQuery({
    queryKey: ['widget-config'],
    queryFn: async () => {
      try {
        // Use the configured api instance
        const response = await api.get('/widget-config/'); // Use relative path

        // Axios response structure is different from fetch
        // Axios response structure: data is in response.data
        return response.data;
      } catch (error) {
        // Handle Axios error structure
        console.error("Error fetching widget config:", error);
        // Optionally, inform the user via toast
        toast.error(`Failed to fetch widget configuration: ${error.message}`);
        return null;
      }
    },
    staleTime: 300000 // 5 minutes (Moved outside queryFn)
  });

  // Generate dynamic styles based on widget configuration
  const dynamicStyles = useMemo(() => {
    if (!widgetConfig) return {};

    // Extract colors from widget config
    const primaryColor = widgetConfig.accent_color || '#E01E26';
    const primaryHoverColor = adjustColorBrightness(primaryColor, -20);
    const primaryLightColor = adjustColorBrightness(primaryColor, 80);

    return {
      primaryButton: {
        backgroundColor: primaryColor,
        color: '#ffffff'
      },
      primaryButtonHover: {
        backgroundColor: primaryHoverColor
      },
      editButton: {
        backgroundColor: primaryColor,
        color: '#ffffff'
      },
      editButtonHover: {
        backgroundColor: primaryHoverColor
      },
      icon: {
        color: primaryColor
      },
      flowIcon: {
        backgroundColor: primaryColor
      },
      mainFlowIcon: {
        backgroundColor: primaryColor
      },
      spinner: {
        borderTopColor: primaryColor
      },
      title: {
        '::after': {
          background: primaryColor
        }
      },
      optionFlowLink: {
        backgroundColor: primaryLightColor,
        color: primaryColor
      },
      focusBorder: {
        borderColor: primaryColor,
        boxShadow: `0 0 0 2px ${hexToRgba(primaryColor, 0.1)}`
      },
      manualContainer: {
        borderLeftColor: primaryColor
      },
      manualIcon: {
        color: primaryColor
      },
      sectionIcon: {
        color: primaryColor
      },
      manualListItem: {
        '::before': {
          color: primaryColor
        }
      },
      callout: {
        borderLeftColor: primaryColor
      }
    };
  }, [widgetConfig]);

  // Helper function to adjust color brightness
  function adjustColorBrightness(hex, percent) {
    // Convert hex to RGB
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);

    // Adjust brightness
    r = Math.min(255, Math.max(0, r + (percent * 2.55)));
    g = Math.min(255, Math.max(0, g + (percent * 2.55)));
    b = Math.min(255, Math.max(0, b + (percent * 2.55)));

    // Convert back to hex
    return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
  }

  // Helper function to convert hex to rgba
  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const fetchFlows = useCallback(async () => {
    try {
      setLoading(true);

      // Use the configured api instance
      const response = await api.get('/guided-flows/'); // Use relative path
      const flowData = response.data; // Axios puts data in response.data
      console.log("Fetched flows:", flowData);

      // If there's no main flow, let's create it with default options
      if (!flowData.some((flow) => flow.name === "main")) {
        await handleCreateMainFlow();
        return; // The function will recall fetchFlows
      }

      setFlows(flowData);
    } catch (error) {
      console.error("Error fetching guided flows:", error);
      toast.error(`Failed to load guided chat flows: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateMainFlow = async () => {
    try {
      setLoading(true);
      
      // Create a clean version of the default main flow options
      const cleanOptions = DEFAULT_MAIN_FLOW_OPTIONS.map(option => ({
        id: option.id,
        text: option.text || '',
        icon: option.icon || '💬',
        order: option.order || 0,
        next_flow: option.next_flow || '',
        bot_response: {
          text: option.bot_response?.text || '',
          followUp: option.bot_response?.followUp || ''
        }
      }));

      // Create a minimal main flow object
      const minimalMainFlow = {
        name: "main",
        options: cleanOptions
      };

      // Convert to JSON string
      const jsonString = JSON.stringify(minimalMainFlow);
      console.log("Creating main flow:", jsonString);
      
      // Use the configured api instance
      // RE-APPLYING FIX: Ensure correct variable is used
      const response = await api.post('/guided-flows/', minimalMainFlow); 
      const responseData = response.data; // Axios puts data in response.data
      console.log("API response:", responseData);

      toast.success("Created main guided flow");
      fetchFlows(); // Reload flows
    } catch (error) {
      console.error("Error creating main flow:", error);
      toast.error(`Failed to create main flow: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

 const handleCreateFlow = async () => {
    try {
      setLoading(true);
      
      const flowName = prompt("Enter a name for the new flow:");
      if (!flowName) {
        setLoading(false);
        return;
      }

      // Validate flow name
      if (flows.some((f) => f.name === flowName)) {
        toast.error(`A flow with the name "${flowName}" already exists`);
        setLoading(false);
        return;
      }

      if (!/^[a-z0-9_]+$/.test(flowName)) {
        toast.error(
            "Flow name must contain only lowercase letters, numbers, and underscores"
        );
        setLoading(false);
        return;
      }

      // Create a minimal new flow object with an empty options array
      const minimalFlow = {
        name: flowName,
        options: []
      };

      // Convert to JSON string
      const jsonString = JSON.stringify(minimalFlow);
      console.log("Creating new flow:", jsonString);
      
      // Use the configured api instance
      const response = await api.post('/guided-flows/', minimalFlow); // Send object directly
      const responseData = response.data; // Axios puts data in response.data
      console.log("API response:", responseData);

      toast.success(`Created new flow: ${flowName}`);
      await fetchFlows(); // Reload flows

      // Find and edit the newly created flow
      setTimeout(() => {
        const createdFlow = flows.find((f) => f.name === flowName);
        if (createdFlow) {
          handleEditFlow(createdFlow);
        }
      }, 500);
    } catch (error) {
      console.error("Error creating flow:", error);
      toast.error(`Failed to create flow: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditFlow = (flow) => {
    setEditingFlow(flow);
  };

  const handleCloseEditor = () => {
    setEditingFlow(null);
  };

  const detectCircularReferences = (flow, allFlows) => {
    // Find flow by name helper
    const findFlowByName = (name) => allFlows.find(f => f.name === name);
    
    // Set to track visited flows in current path
    const checkForCycles = (flowName, path = new Set()) => {
      // Circular reference detected if flow is already in our path
      if (path.has(flowName)) {
        return true;
      }
      
      // Get the flow object
      const currentFlow = findFlowByName(flowName);
      if (!currentFlow) {
        return false; // Flow doesn't exist (yet), so no cycle here
      }
      
      // Create a new path including this flow
      const newPath = new Set(path);
      newPath.add(flowName);
      
      // Check all next_flow references in this flow's options
      for (const option of currentFlow.options || []) {
        if (option.next_flow && option.next_flow !== "" && checkForCycles(option.next_flow, newPath)) {
          return true; // Cycle detected in a child flow
        }
      }
      
      return false; // No cycles found
    };
    
    return checkForCycles(flow.name);
  };

  const handleSaveFlow = async (updatedFlow) => {
    try {
      setLoading(true);
      
      // Check for circular references
      if (detectCircularReferences(updatedFlow, [...flows.filter(f => f.id !== updatedFlow.id), updatedFlow])) {
        throw new Error("Circular reference detected in flow paths. Please fix before saving.");
      }
  
      // Clean up the flow data before sending to API
      const cleanFlow = {
        ...updatedFlow,
        options: updatedFlow.options.map(option => ({
          ...option,
          // Ensure all required fields exist
          id: option.id || `${updatedFlow.name}-${Date.now()}`,
          text: option.text || '',
          icon: option.icon || '💬',
          order: option.order || 0,
          next_flow: option.next_flow || '',
          bot_response: {
            text: option.bot_response?.text || '',
            followUp: option.bot_response?.followUp || ''
          }
        }))
      };
  
      // Use the configured api instance
      console.log("Updating flow:", JSON.stringify(cleanFlow, null, 2));
      const response = await api.put(`/guided-flows/${updatedFlow.id}/`, cleanFlow); // Use relative path

      // Axios throws on non-2xx status, so no need for manual check
      // const responseData = response.data; // Can use if needed
      
      // Check for structural changes (added/removed options or changed flow links)
      const originalFlow = flows.find(f => f.id === updatedFlow.id);
      const hasStructuralChanges = originalFlow && checkForStructuralChanges(originalFlow, updatedFlow);
  
      if (hasStructuralChanges) {
        toast.success(`Flow "${updatedFlow.name}" saved. Flows with changes: needs redeployment.`);
      } else {
        toast.success(`Flow "${updatedFlow.name}" saved successfully.`);
      }
  
      // Update local state
      setFlows(prevFlows => 
        prevFlows.map(flow => 
          flow.id === updatedFlow.id ? updatedFlow : flow
        )
      );
    } catch (error) {
      console.error("Error saving flow:", error);
      toast.error(`Failed to save flow: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to check if structural changes were made
  const checkForStructuralChanges = (originalFlow, updatedFlow) => {
    // Check if options were added or removed
    if (originalFlow.options.length !== updatedFlow.options.length) {
      return true;
    }
    
    // Check if any next_flow values changed
    const originalNextFlows = new Set(
      originalFlow.options.map(opt => opt.next_flow).filter(Boolean)
    );
    
    const updatedNextFlows = new Set(
      updatedFlow.options.map(opt => opt.next_flow).filter(Boolean)
    );
    
    // If the number of distinct next_flows changed
    if (originalNextFlows.size !== updatedNextFlows.size) {
      return true;
    }
    
    // If any specific next_flow value changed
    for (const nextFlow of updatedNextFlows) {
      if (!originalNextFlows.has(nextFlow)) {
        return true;
      }
    }
    
    return false;
  };

  const handleDeleteFlow = async (flowId) => {
    // Never allow deleting the main flow
    const flowToDelete = flows.find(f => f.id === flowId);
    
    if (flowToDelete && flowToDelete.name === "main") {
      toast.error("The main flow cannot be deleted");
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete this flow? This cannot be undone.`)) {
      return;
    }
    
    try {
      setLoading(true);

      // Use the configured api instance
      const response = await api.delete(`/guided-flows/${flowId}/`); // Use relative path

      // Axios throws on non-2xx status, so no need for manual check
      
      toast.success("Flow deleted successfully");
      
      // Update local state
      setFlows(prevFlows => prevFlows.filter(flow => flow.id !== flowId));
    } catch (error) {
      console.error("Error deleting flow:", error);
      toast.error(`Failed to delete flow: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleManual = () => {
    setShowManual(!showManual);
  };

  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  // Rendering the editor UI when a flow is being edited
  if (editingFlow) {
    return (
      <div className={styles.flowEditor}>
        <div className={styles.editorHeader}>
          <h2 className={styles.editorTitle}>
            {editingFlow.name === "main" && <span>🏠 </span>}
            Editing Flow: <strong>{editingFlow.name}</strong>
          </h2>
          <div className={styles.editorActions}>
            <button 
              className={`${styles.actionButton} ${styles.secondaryButton}`}
              onClick={handleCloseEditor} 
            >
              <ArrowLeft className={styles.buttonIcon} size={16} />
              Back to flows
            </button>
          </div>
        </div>
        
        <GuidedFlowEditor 
          flow={editingFlow} 
          onSave={handleSaveFlow} 
          onClose={handleCloseEditor}
          allFlows={flows}
          dynamicStyles={dynamicStyles}
        />
      </div>
    );
  }

  return (
    <div className={styles.container} style={{ width: '100%' }}>
      <div className={styles.header}>
        <h1 className={styles.title} style={dynamicStyles.title}>Guided Chat Manager</h1>
        <p className={styles.description}>
          Create and manage guided conversation paths for your chat bot
        </p>
      </div>

      <div className={styles.flowManagement} style={{ width: '100%' }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <FolderTree className={styles.icon} style={dynamicStyles.icon} size={20} />
            Flow Management
          </h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className={`${styles.actionButton} ${styles.secondaryButton}`} 
              onClick={toggleManual}
              title="View Help"
            >
              <CircleHelp className={styles.buttonIcon} size={16} />
              Help
            </button>
            <button 
              className={`${styles.actionButton} ${styles.primaryButton}`} 
              style={dynamicStyles.primaryButton}
              onClick={handleCreateFlow}
              disabled={loading}
              onMouseOver={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = dynamicStyles.primaryButtonHover?.backgroundColor;
              }}
              onMouseOut={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = dynamicStyles.primaryButton?.backgroundColor;
              }}
            >
              <PlusCircle className={styles.buttonIcon} size={16} />
              Create New Flow
            </button>
          </div>
        </div>

        {showManual && <GuidedChatManagerManual dynamicStyles={dynamicStyles} />}

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} style={dynamicStyles.spinner}></div>
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            <div className={styles.mainFlow} style={{ width: '100%' }}>
              {flows.filter(flow => flow.name === "main").map(mainFlow => (
                <div key={mainFlow.id} className={styles.flowItem}>
                  <div className={styles.flowInfo}>
                    <div 
                      className={`${styles.flowIcon} ${styles.mainFlowIcon}`} 
                      style={dynamicStyles.mainFlowIcon}
                    >🏠</div>
                    <div className={styles.flowDetails}>
                      <div className={styles.flowName}>Main Flow</div>
                      <div className={styles.flowDescription}>
                        Primary entry point for guided chats ({mainFlow.options?.length || 0} options)
                      </div>
                    </div>
                  </div>
                  <div className={styles.flowActions}>
                    <button 
                      className={`${styles.actionButtonSmall} ${styles.editButton}`}
                      style={dynamicStyles.editButton}
                      onClick={() => handleEditFlow(mainFlow)}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = dynamicStyles.editButtonHover?.backgroundColor;
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = dynamicStyles.editButton?.backgroundColor;
                      }}
                    >
                      Edit Main Flow
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.secondaryFlows} style={{ width: '100%' }}>
              <h3 className={styles.secondaryFlowsTitle}>Secondary Flows</h3>
              {flows.filter(flow => flow.name !== "main").length === 0 ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyStateText}>No secondary flows created yet.</p>
                  <button 
                    className={`${styles.actionButton} ${styles.primaryButton}`}
                    style={dynamicStyles.primaryButton}
                    onClick={handleCreateFlow}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = dynamicStyles.primaryButtonHover?.backgroundColor;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = dynamicStyles.primaryButton?.backgroundColor;
                    }}
                  >
                    <PlusCircle className={styles.buttonIcon} size={16} />
                    Create Flow
                  </button>
                </div>
              ) : (
                <div className={styles.flowList} style={{ width: '100%' }}>
                  {flows
                    .filter(flow => flow.name !== "main")
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(flow => (
                      <div key={flow.id} className={styles.flowItem}>
                        <div className={styles.flowInfo}>
                          <div className={styles.flowIcon} style={dynamicStyles.flowIcon}>
                            {flow.options?.[0]?.icon || "🔄"}
                          </div>
                          <div className={styles.flowDetails}>
                            <div className={styles.flowName}>{flow.name}</div>
                            <div className={styles.flowDescription}>
                              {flow.options?.length || 0} options
                            </div>
                          </div>
                        </div>
                        <div className={styles.flowActions}>
                          <button 
                            className={`${styles.actionButtonSmall} ${styles.editButton}`}
                            style={dynamicStyles.editButton}
                            onClick={() => handleEditFlow(flow)}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = dynamicStyles.editButtonHover?.backgroundColor;
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = dynamicStyles.editButton?.backgroundColor;
                            }}
                          >
                            Edit
                          </button>
                          <button 
                            className={`${styles.actionButtonSmall} ${styles.deleteButton}`}
                            onClick={() => handleDeleteFlow(flow.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuidedChatManager;
