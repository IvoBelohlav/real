import React, { useState, useEffect, useCallback } from "react";
import { PlusCircle, CircleHelp, Code, FileText, Settings, Plus, Wrench } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../utils/api";
import GuidedFlowEditor from "./GuidedFlowEditor";
import GuidedChatManagerManual from "./GuidedChatManagerManual";
import styles from './fixedGuidedChatManager.module.css';
import { useQuery } from '@tanstack/react-query';

// Add a proper auth token getter
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

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
  const [loading, setLoading] = useState(true); // This is the correct loading state
  const [editingFlow, setEditingFlow] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const API_BASE = 'http://localhost:8000';

  const { data: flowsData, isLoading, error } = useQuery({
    queryKey: ['guided-chat-flows'],
    queryFn: async () => {
      const response = await api.get('/api/guided-chat-flow');
      return response.data;
    }
  });

  const fetchFlows = useCallback(async () => {
    try {
      setLoading(true); // Using the correct state setter
      
      // Use vanilla fetch for direct API access
      const apiUrl = `${API_BASE}/api/guided-flows/`;
      const token = getAuthToken();
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
      }
      
      const flowData = await response.json();
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
      setLoading(false); // Using the correct state setter
    }
  }, []);

  const handleCreateMainFlow = async () => {
    try {
      setLoading(true); // Using the correct state setter
      
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
      
      // Use vanilla fetch to avoid any potential issues with axios interceptors
      const apiUrl = `${API_BASE}/api/guided-flows/`;
      const token = getAuthToken();
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: jsonString
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log("API response:", responseData);

      toast.success("Created main guided flow");
      fetchFlows(); // Reload flows
    } catch (error) {
      console.error("Error creating main flow:", error);
      toast.error(`Failed to create main flow: ${error.message}`);
    } finally {
      setLoading(false); // Using the correct state setter
    }
  };

 const handleCreateFlow = async () => {
    try {
      setLoading(true); // Using the correct state setter
      
      const flowName = prompt("Enter a name for the new flow:");
      if (!flowName) {
        setLoading(false); // Using the correct state setter
        return;
      }

      // Validate flow name
      if (flows.some((f) => f.name === flowName)) {
        toast.error(`A flow with the name "${flowName}" already exists`);
        setLoading(false); // Using the correct state setter
        return;
      }

      if (!/^[a-z0-9_]+$/.test(flowName)) {
        toast.error(
            "Flow name must contain only lowercase letters, numbers, and underscores"
        );
        setLoading(false); // Using the correct state setter
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
      
      // Use vanilla fetch to avoid any potential issues with axios interceptors
      const apiUrl = `${API_BASE}/api/guided-flows/`;
      const token = getAuthToken();
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: jsonString
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
      }
      
      const responseData = await response.json();
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
      setLoading(false); // Using the correct state setter
    }
  };

  const handleEditFlow = (flow) => {
    setEditingFlow(flow);
  };

  const handleCloseEditor = () => {
    setEditingFlow(null);
  };

  // Function to detect circular references
  const detectCircularReferences = (flow, allFlows) => {
    // Find flow by name helper
    const findFlowByName = (name) => allFlows.find(f => f.name === name);
    
    // Helper to check for cycles in the flow graph
    const checkForCycles = (flowName, path = new Set()) => {
      // If we've seen this flow in our current path, it's a cycle
      if (path.has(flowName)) {
        return true;
      }
      
      // Add current flow to path
      const newPath = new Set(path);
      newPath.add(flowName);
      
      // Get the flow by name
      const currentFlow = flowName === flow.name 
        ? flow  // Use the updated flow, not the one from allFlows
        : findFlowByName(flowName);
      
      if (!currentFlow || !currentFlow.options) {
        return false;
      }
      
      // Check each next_flow reference
      for (const option of currentFlow.options) {
        if (option.next_flow && option.next_flow !== '') {
          if (checkForCycles(option.next_flow, newPath)) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    // Start checking from the current flow
    return checkForCycles(flow.name);
  };

  // Handle saving a flow
  const handleSaveFlow = async (updatedFlow) => {
    try {
      setLoading(true); // Using the correct state setter
      
      console.log("Received flow to save:", updatedFlow);
      
      // Create a completely minimal object with only primitive values
      const minimalPayload = {
        id: updatedFlow.id,
        name: updatedFlow.name,
        options: []
      };
      
      // Manually process each option to ensure no shared references or circular structures
      for (const option of updatedFlow.options) {
        // Basic properties with default values
        const cleanOption = {
          id: option.id || null,
          text: typeof option.text === 'string' ? option.text : '',
          icon: typeof option.icon === 'string' ? option.icon : '💬',
          order: typeof option.order === 'number' ? option.order : 0,
          next_flow: ''
        };
        
        // Handle next_flow carefully - prevent any possible circular references
        if (typeof option.next_flow === 'string' && option.next_flow !== '') {
          // Don't allow self-references to the same flow
          if (option.next_flow !== updatedFlow.name) {
            cleanOption.next_flow = option.next_flow;
          } else {
            console.warn(`Prevented self-reference: option ${option.id} pointing to its own flow ${updatedFlow.name}`);
          }
        }
        
        // Create a fresh bot_response object
        let botResponseText = '';
        let botResponseFollowUp = '';
        
        // Extract text and followUp carefully
        if (option.bot_response) {
          if (typeof option.bot_response === 'string') {
            botResponseText = option.bot_response;
          } else if (typeof option.bot_response === 'object') {
            botResponseText = typeof option.bot_response.text === 'string' ? option.bot_response.text : '';
            botResponseFollowUp = typeof option.bot_response.followUp === 'string' ? option.bot_response.followUp : '';
          }
        }
        
        // Add a fresh bot_response object
        cleanOption.bot_response = {
          text: botResponseText,
          followUp: botResponseFollowUp
        };
        
        // Add the clean option to our payload
        minimalPayload.options.push(cleanOption);
      }
      
      // Convert to JSON string to ensure no circular references
      const jsonString = JSON.stringify(minimalPayload);
      console.log("Clean JSON being sent to API:", jsonString);
      
      // Use vanilla fetch to avoid any potential issues with axios interceptors
      const apiUrl = `${API_BASE}/api/guided-flows/${updatedFlow.id}/`;
      const token = getAuthToken();
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: jsonString
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log("API response:", responseData);
      
      toast.success(`Saved flow: ${updatedFlow.name}`);
      fetchFlows(); // Reload flows after save
      handleCloseEditor();
    } catch (error) {
      console.error("Error saving flow:", error);
      toast.error(`Failed to save flow: ${error.message}`);
    } finally {
      setLoading(false); // Using the correct state setter
    }
  };

  // Helper function
  const hasStructuralChanges = (originalFlow, updatedFlow) => {
    // If option count changed, it's a structural change
    if (originalFlow.options.length !== updatedFlow.options.length) {
      return true;
    }
    
    // Check if any next_flow references changed
    for (let i = 0; i < updatedFlow.options.length; i++) {
      const updatedOption = updatedFlow.options[i];
      const originalOption = originalFlow.options.find(o => o.id === updatedOption.id);
      
      if (!originalOption) {
        return true; // New option added
      }
      
      if (originalOption.next_flow !== updatedOption.next_flow) {
        return true; // Next flow reference changed
      }
    }
    
    return false; // Only text/emoji changes
  };

  const handleDeleteFlow = async (flowId) => {
    try {
      setLoading(true); // Using the correct state setter
      
      if (!window.confirm("Are you sure you want to delete this flow?")) {
        setLoading(false);
        return;
      }

      // Use vanilla fetch for direct API access
      const apiUrl = `${API_BASE}/api/guided-flows/${flowId}/`;
      const token = getAuthToken();
      
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (!response.ok) {
        if (response.status !== 204) { // 204 No Content is success for DELETE
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
        }
      }

      toast.success("Deleted flow");
      await fetchFlows(); // Reload flows
    } catch (error) {
      console.error("Error deleting flow:", error);
      toast.error(`Failed to delete flow: ${error.message}`);
    } finally {
      setLoading(false); // Using the correct state setter
    }
  };

  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  const toggleManual = () => {
    setShowManual(!showManual);
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
      </div>
    );
  }

  if (error) {
    return <div>Error loading flows: {error.message}</div>;
  }

  const mainFlow = flows?.find(flow => flow.name === 'main') || {
    name: 'Main Flow',
    description: 'The primary flow that users will interact with first',
    options: []
  };

  const secondaryFlows = flows?.filter(flow => flow.name !== 'main') || [];

  return (
    <div className={styles.container}>
      <div className={styles.headerCard}>
        <div className={styles.headerContent}>
          <div className={styles.headerContentLeft}>
            <h1 className={styles.headerTitle}>Guided Chat Manager</h1>
            <p className={styles.headerDescription}>
              Configure and manage guided chat flows to help users navigate your services.
            </p>
          </div>
          <button
            className={styles.headerButton}
            onClick={toggleManual}
          >
            <Wrench size={20} />
            Documentation
          </button>
        </div>
      </div>

      {showManual && <GuidedChatManagerManual />}

      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderLeft}>
          <Code size={24} className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Flow Management</h2>
        </div>
        <button
          className={styles.addButton}
          onClick={handleCreateFlow}
        >
          <Plus size={20} />
          Create New Flow
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
        </div>
      ) : (
        <div className={styles.gridContainer}>
          <div
            className={styles.mainFlowCard}
          >
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderLeft}>
                <div className={styles.iconContainer}>
                  <Wrench size={24} />
                </div>
                <h3 className={styles.flowTitle}>Main Flow</h3>
              </div>
              <p className={styles.flowDescription}>
                The primary flow that users see when starting a conversation
              </p>
            </div>
            <button
              className={styles.editButton}
              onClick={() => handleEditFlow(mainFlow)}
            >
              Configure Main Flow
            </button>
          </div>
        </div>
      )}

      <div className={styles.secondaryFlowsHeader}>
        <FileText size={24} className={styles.secondaryFlowsIcon} />
        <h2 className={styles.secondaryFlowsTitle}>Secondary Flows</h2>
      </div>

      {secondaryFlows.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>No secondary flows created yet</p>
          <button
            className={styles.addButton}
            onClick={handleCreateFlow}
          >
            <Plus size={20} />
            Create Secondary Flow
          </button>
        </div>
      ) : (
        <div className={styles.flowsGrid}>
          {secondaryFlows.map((flow) => (
            <div
              key={flow.id}
              className={styles.flowCard}
            >
              <div className={styles.flowCardHeader}>
                <div className={styles.flowCardHeaderLeft}>
                  <span className={styles.flowIcon}>{flow.options[0]?.icon || "🔄"}</span>
                  <h3 className={styles.flowCardTitle}>{flow.name}</h3>
                </div>
                <span className={styles.flowBadge}>
                  {flow.options.length} options
                </span>
              </div>
              <div className={styles.flowCardActions}>
                <button
                  className={styles.editFlowButton}
                  onClick={() => handleEditFlow(flow)}
                >
                  Edit Flow
                </button>
                <button
                  className={styles.deleteFlowButton}
                  onClick={() => handleDeleteFlow(flow.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingFlow && (
        <GuidedFlowEditor
          flow={editingFlow}
          onClose={handleCloseEditor}
          onSave={handleSaveFlow}
          isMainFlow={editingFlow.name === "main"}
          existingFlows={flows}
        />
      )}
    </div>
  );
};

export default GuidedChatManager; 