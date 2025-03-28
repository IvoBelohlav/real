import React, { useCallback, useMemo, useState } from "react";
import { PlusCircle, Save, ZoomIn, ZoomOut, Maximize, HelpCircle, Trash, MessageSquare, List, X } from "lucide-react";

import ReactFlow, {
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Panel,
    MiniMap,
  } from 'reactflow';

  import 'reactflow/dist/style.css';
  import styles from './guidedChatAdmin.module.css';
  import FlowNode from './FlowNode';
  import ChatPreview from './ChatPreview';

  const nodeTypes = {
    flowNode: FlowNode,
  };

const VisualFlowBuilder = ({ flow, allFlows, onSave }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [showHelpTip, setShowHelpTip] = useState(false);
    const [showOverview, setShowOverview] = useState(false);

    const handleDeleteNode = useCallback(
        (nodeId) => {
          setNodes((nds) => nds.filter((node) => node.id !== nodeId));
          setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
        },
        [setNodes, setEdges]
      );

    const handlers = useMemo(() => ({
      onChange: (nodeId, field, value) => {
        setNodes(nds =>
          nds.map(node => {
            if (node.id === nodeId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  [field]: value,
                  availableFlows: node.data.availableFlows,
                  // Keep the existing handlers as they are used locally
                  onChange: node.data.onChange,
                  onIconChange: node.data.onIconChange,
                  onBotResponseChange: node.data.onBotResponseChange,
                  onDelete: node.data.onDelete
                }
              };
            }
            return node;
          })
        );
      },
      onBotResponseChange: (nodeId, field, value) => {
        setNodes(nds =>
          nds.map(node => {
            if (node.id === nodeId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  botResponse: {
                    ...node.data.botResponse,
                    [field]: value
                  }
                }
              };
            }
            return node;
          })
        );
      }
    }), [setNodes]);

    // Helper to normalize bot_response to botResponse
    const normalizeBotResponse = (option) => {
      // If the backend data uses bot_response (snake_case), convert it to botResponse (camelCase)
      const botResponse = option.bot_response || option.botResponse || {};
      
      // If botResponse is a string, convert it to an object
      if (typeof botResponse === 'string') {
        return { text: botResponse, followUp: '' };
      }
      
      // If it's an object with text property, use that
      if (botResponse.text !== undefined) {
        return {
          text: botResponse.text || '',
          followUp: botResponse.followUp || botResponse.follow_up || ''
        };
      }
      
      // Handle potential backend format differences
      return {
        text: botResponse.message || botResponse.content || '',
        followUp: botResponse.followUp || botResponse.follow_up || ''
      };
    };

    React.useEffect(() => {
      if (flow?.options) {
        const flowNodes = flow.options.map((option, index) => {
          // Normalize the bot response data
          const normalizedBotResponse = normalizeBotResponse(option);
          
          return {
            id: option.id,
            type: 'flowNode',
            position: { x: 300 * (index % 3), y: 250 * Math.floor(index / 3) },
            data: {
              ...option,
              // Ensure botResponse is properly formatted
              botResponse: normalizedBotResponse,
              // Maintain backward compatibility
              bot_response: option.bot_response,
              // Other properties
              availableFlows: allFlows?.filter(f => f.name !== flow.name) || [],
              onChange: handlers.onChange.bind(null, option.id),
              onIconChange: (value) => handlers.onChange(option.id, 'icon', value),
              onBotResponseChange: (field, value) => handlers.onBotResponseChange(option.id, field, value),
              onDelete: handleDeleteNode
            }
          };
        });

        const flowEdges = flow.options
          .filter(option => option.next_flow)
          .map(option => ({
            id: `e-${option.id}-${option.next_flow}`,
            source: option.id,
            target: option.next_flow,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#2563eb', strokeWidth: 2 }
          }));

        console.log("Flow nodes created:", flowNodes);
        setNodes(flowNodes);
        setEdges(flowEdges);
      } else {
        setNodes([]); // Ensure nodes are reset if flow or flow.options is null/undefined
        setEdges([]); // Ensure edges are reset as well
      }
    }, [flow, allFlows, handlers, setNodes, setEdges, handleDeleteNode]);

    const onConnect = useCallback((params) => {
      // Prevent self-references
      if (params.source === params.target) {
        console.warn("Self-reference prevented: A flow option cannot connect to itself");
        return;
      }
      
      // Check for direct circular references between two nodes
      const targetNode = nodes.find(n => n.id === params.target);
      if (targetNode && targetNode.data.next_flow === params.source) {
        console.warn("Circular reference prevented: Cannot create a direct loop between nodes");
        return;
      }
      
      // Update the source node's next_flow property
      const sourceNode = nodes.find(n => n.id === params.source);
      if (sourceNode) {
        handlers.onChange(sourceNode.id, 'next_flow', params.target);
      }
      
      // Add the edge
      setEdges(eds => addEdge({ 
        ...params, 
        type: 'smoothstep', 
        animated: true, 
        style: { stroke: '#2563eb', strokeWidth: 2 } 
      }, eds));
    }, [nodes, handlers, setEdges]);

    const handleAddNode = useCallback(() => {
        const newNodeId = `temp-${Date.now()}`;
        
        // Calculate position for the new node
        let maxY = 0;
        nodes.forEach(node => {
          if (node.position.y > maxY) {
            maxY = node.position.y;
          }
        });
        
        // Add new node below existing nodes
        const newNodeY = nodes.length > 0 ? maxY + 250 : 50;
        const newNodeX = 300;
        
        const newNode = {
          id: newNodeId,
          type: 'flowNode',
          position: { x: newNodeX, y: newNodeY },
          data: {
            text: '',
            icon: '💬',
            botResponse: { text: '', followUp: '' },
            availableFlows: allFlows?.filter(f => f.name !== flow.name) || [],
            onChange: handlers.onChange.bind(null, newNodeId),
            onIconChange: (value) => handlers.onChange(newNodeId, 'icon', value),
            onBotResponseChange: (field, value) => handlers.onBotResponseChange(
              newNodeId,
              field,
              value
            ),
            onDelete: handleDeleteNode,
          }
        };
        setNodes(nds => [...nds, newNode]);

      }, [flow?.name, allFlows, handlers, setNodes, handleDeleteNode, nodes]);

      const handleSave = useCallback(() => {
        try {
          // Create a completely fresh array of options with no shared references
          // and only the minimal data needed by the API
          const cleanOptions = [];
          
          // Process each node separately
          for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const order = i; // Use index as order for simplicity and consistency
            
            // Extract text and ensure it's a string
            const text = typeof node.data.text === 'string' ? node.data.text : '';
            
            // Extract icon and ensure it's a string
            const icon = typeof node.data.icon === 'string' ? node.data.icon : '💬';
            
            // Extract next_flow, ensure it's not self-referential and is a string
            let nextFlow = '';
            if (typeof node.data.next_flow === 'string' && node.data.next_flow.trim() !== '') {
              // Prevent self-references and references to the current flow
              if (node.data.next_flow !== node.id && node.data.next_flow !== flow.name) {
                nextFlow = node.data.next_flow;
              } else {
                console.warn(`Prevented self-reference: ${node.id} -> ${node.data.next_flow}`);
              }
              
              // Special case for problem flows (like web_solutions)
              if (flow.name === 'web_solutions' || 
                  nextFlow === 'web_solutions' || 
                  flow.name === node.data.next_flow) {
                console.warn(`Preventing potential circular reference in flow ${flow.name}`);
                nextFlow = ''; // Remove the reference for safety
              }
            }
            
            // Extract bot response data carefully
            let botResponseText = '';
            let botResponseFollowUp = '';
            
            // Handle different bot response formats
            const br = node.data.botResponse || node.data.bot_response;
            if (br) {
              if (typeof br === 'string') {
                botResponseText = br;
              } else if (typeof br === 'object') {
                botResponseText = typeof br.text === 'string' ? br.text : 
                                 (typeof br.message === 'string' ? br.message : '');
                botResponseFollowUp = typeof br.followUp === 'string' ? br.followUp : 
                                     (typeof br.follow_up === 'string' ? br.follow_up : '');
              }
            }
            
            // Create a clean option object with only primitive values
            cleanOptions.push({
              id: !flow.id && node.id.startsWith('temp-') ? null : node.id,
              text: text,
              icon: icon,
              order: order,
              next_flow: nextFlow,
              bot_response: {
                text: botResponseText,
                followUp: botResponseFollowUp
              }
            });
          }
          
          // Sort by order (though they should already be in order)
          cleanOptions.sort((a, b) => a.order - b.order);
          
          // Create a minimal flow object with only the data needed
          const minimalFlow = {
            id: flow.id,
            name: flow.name,
            options: cleanOptions
          };
          
          // Log the data for debugging
          console.log("Clean flow payload being sent to API:", JSON.stringify(minimalFlow));
          
          // Send to parent component for saving
          onSave(minimalFlow);
        } catch (error) {
          console.error("Error preparing flow data:", error);
          alert("There was an error preparing the flow data. Please try again or check the console for details.");
        }
      }, [nodes, flow, onSave]);
      
    const toggleHelpTip = () => {
      setShowHelpTip(!showHelpTip);
    };

    // Add toggle for overview panel
    const toggleOverview = () => {
      setShowOverview(!showOverview);
    };

    return (
      <div className="h-[800px] w-full border rounded-lg bg-gray-100 shadow-lg relative overflow-hidden">
        {/* Flow Info Banner */}
        <div className="absolute top-0 left-0 z-10 bg-white bg-opacity-90 m-4 p-3 rounded-lg shadow-md">
          <h3 className="text-lg font-bold text-gray-800 mb-1">Flow: <span className="text-blue-600">{flow?.name || 'New Flow'}</span></h3>
          <p className="text-sm text-gray-600">
            Nodes: {nodes.length} | Connections: {edges.length}
          </p>
        </div>
        
        {/* Overview Button */}
        <div className="absolute top-0 right-52 z-10">
          <button 
            onClick={toggleOverview}
            className="m-4 bg-blue-50 hover:bg-blue-100 p-2 rounded-full shadow-md transition-all duration-200 text-blue-700"
            title="Show/Hide Overview"
          >
            <List size={24} />
          </button>
        </div>
        
        {/* Overview Panel */}
        {showOverview && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-4/5 max-h-[80vh] overflow-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <MessageSquare size={20} />
                  <span>Flow Overview: {flow?.name || 'New Flow'}</span>
                </h3>
                <button 
                  onClick={toggleOverview}
                  className="text-gray-500 hover:text-gray-800 rounded-full w-8 h-8 flex items-center justify-center"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nodes.map((node) => (
                  <div key={node.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="font-semibold flex items-center gap-2 mb-2">
                      <span className="text-xl">{node.data.icon || '💬'}</span>
                      <span>{node.data.text || 'Unnamed Option'}</span>
                    </div>
                    <ChatPreview 
                      option={{
                        id: node.id,
                        text: node.data.text,
                        icon: node.data.icon,
                        botResponse: node.data.botResponse,
                        next_flow: node.data.next_flow
                      }} 
                      allFlows={allFlows} 
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Help Tooltip */}
        <div className="absolute top-0 right-28 z-10">
          <button 
            onClick={toggleHelpTip}
            className="m-4 bg-blue-50 hover:bg-blue-100 p-2 rounded-full shadow-md transition-all duration-200 text-blue-700"
            title="Show/Hide Help"
          >
            <HelpCircle size={24} />
          </button>
          
          {showHelpTip && (
            <div className="absolute top-14 right-0 w-72 bg-white p-4 rounded-lg shadow-lg border border-gray-200 text-sm">
              <h4 className="font-bold text-gray-900 mb-2">Flow Editor Help</h4>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <div className="mt-1 text-blue-500 shrink-0"><PlusCircle size={16} /></div>
                  <div>Add nodes with the <b>Add Node</b> button</div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 text-red-500 shrink-0"><Trash size={16} /></div>
                  <div>Delete nodes by clicking the trash icon</div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 text-blue-500">↔</div>
                  <div>Connect nodes by dragging from right dot to left dot</div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 text-green-500 shrink-0"><Save size={16} /></div>
                  <div>Save your changes when done</div>
                </li>
              </ul>
            </div>
          )}
        </div>
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[20, 20]}
          defaultZoom={0.9}
          minZoom={0.5}
          maxZoom={1.5}
          attributionPosition="bottom-right"
          connectionLineStyle={{ stroke: '#2563eb', strokeWidth: 2 }}
          connectionLineType="smoothstep"
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Control"
        >
          <Background gap={20} size={1} color="#d1d5db" />
          <Controls showInteractive={true} />
          <MiniMap 
            nodeStrokeColor="#3b82f6"
            nodeColor="#93c5fd"
            nodeBorderRadius={8}
          />

          <Panel position="top-right" className="bg-white bg-opacity-90 p-3 rounded-lg shadow-md space-y-2">
            <button
              onClick={handleAddNode}
              className="flow-button flow-button-primary bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 shadow-md transition-all duration-200 ease-in-out hover:shadow-lg w-full"
            >
              <PlusCircle size={18} />
              <span>Add Node</span>
            </button>
            <button
              onClick={handleSave}
              className="flow-button flow-button-success bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 shadow-md transition-all duration-200 ease-in-out hover:shadow-lg w-full"
            >
              <Save size={18} />
              <span>Save Flow</span>
            </button>
          </Panel>
          
          {/* Node count display */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white bg-opacity-90 p-6 rounded-xl shadow-md text-center">
                <div className="text-5xl mb-4 text-blue-500">👋</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Nodes Yet</h3>
                <p className="text-gray-600 mb-4">Click the "Add Node" button to get started</p>
                <div className="text-blue-600 animate-bounce">
                  <PlusCircle size={32} className="mx-auto" />
                </div>
              </div>
            </div>
          )}
        </ReactFlow>
      </div>
    );

  };
  export default VisualFlowBuilder;