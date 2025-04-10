import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { Trash, Eye, EyeOff } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import ChatPreview from './ChatPreview';
import styles from './guidedChatAdmin.module.css';

const FlowNode = ({ data, id }) => {
    const availableFlows = data.availableFlows || [];
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Ensure we have a properly structured botResponse
    const getBotResponse = () => {
        try {
            // Try to get botResponse from various sources
            const br = data.botResponse || data.bot_response || {};
            
            // Handle string case
            if (typeof br === 'string') {
                return { text: br, followUp: '' };
            }
            
            // Handle object with potential different formats
            return {
                text: br.text || br.message || br.content || '',
                followUp: br.followUp || br.follow_up || ''
            };
        } catch (err) {
            console.error("Error parsing bot response:", err);
            return { text: '', followUp: '' };
        }
    };

    // State variables for immediate updates
    const [text, setText] = useState(data.text || '');
    const [botResponseText, setBotResponseText] = useState(getBotResponse().text || '');
    const [botResponseFollowUp, setBotResponseFollowUp] = useState(getBotResponse().followUp || '');
    const [nextFlow, setNextFlow] = useState(data.next_flow || '');

    // Refs to hold the most up-to-date values
    const textRef = useRef(text);
    const botResponseTextRef = useRef(botResponseText);
    const botResponseFollowUpRef = useRef(botResponseFollowUp);
    const nextFlowRef = useRef(nextFlow);

    // Update refs whenever state changes
    useEffect(() => {
        textRef.current = text;
        botResponseTextRef.current = botResponseText;
        botResponseFollowUpRef.current = botResponseFollowUp;
        nextFlowRef.current = nextFlow;
    }, [text, botResponseText, botResponseFollowUp, nextFlow]);

    // Update state when 'data' prop changes
    useEffect(() => {
        setText(data.text || '');
        
        // Use our helper to extract botResponse data
        const botResponse = getBotResponse();
        setBotResponseText(botResponse.text || '');
        setBotResponseFollowUp(botResponse.followUp || '');
        
        setNextFlow(data.next_flow || '');
        
        // Debug
        console.log('FlowNode data updated:', {
            id,
            botResponse,
            originalResponse: data.botResponse || data.bot_response,
            text: data.text
        });
    }, [data, id]);

    // Handlers to update state and propagate changes using refs
    const handleTextChange = useCallback((value) => {
        setText(value);
        data.onChange('text', value);
    }, [data]);

    const handleBotResponseTextChange = useCallback((value) => {
        setBotResponseText(value);
        data.onBotResponseChange('text', value);
    }, [data]);

    const handleBotResponseFollowUpChange = useCallback((value) => {
        setBotResponseFollowUp(value);
        data.onBotResponseChange('followUp', value);
    }, [data]);

    const handleNextFlowChange = useCallback((value) => {
        setNextFlow(value);
        data.onChange('next_flow', value);
    }, [data]);

    const handleIconChange = useCallback((value) => {
        data.onIconChange(value);
        setShowEmojiPicker(false);
    }, [data]);

    const togglePreview = useCallback(() => {
        setShowPreview(!showPreview);
    }, [showPreview]);

    const optionData = {
        id,
        text,
        icon: data.icon,
        botResponse: {
            text: botResponseText,
            followUp: botResponseFollowUp
        },
        next_flow: nextFlow
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-4 min-w-[320px] border border-gray-300 relative transition-all duration-300 ease-in-out hover:shadow-xl">
            <div className="absolute top-2 right-2 flex gap-2">
                <button
                    onClick={togglePreview}
                    className="text-gray-500 hover:text-blue-600 transition-colors duration-200 ease-in-out focus:outline-none"
                    title={showPreview ? "Hide Preview" : "Show Preview"}
                >
                    {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                    onClick={() => data.onDelete(id)}
                    className="text-gray-500 hover:text-red-600 transition-colors duration-200 ease-in-out focus:outline-none"
                    title="Delete Node"
                >
                    <Trash size={16} />
                </button>
            </div>

            <Handle
                type="target"
                position={Position.Left}
                className={`${styles.flowHandle} ${styles.flowHandleTarget}`}
            />

            <Handle
                type="source"
                position={Position.Right}
                className={`${styles.flowHandle} ${styles.flowHandleSource}`}
            />

            <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowEmojiPicker(!showEmojiPicker);
                        }}
                        className={styles.flowEmojiButton}
                        title="Choose Emoji"
                    >
                        {data.icon || '💬'}
                    </button>
                    {showEmojiPicker && (
                        <div className="absolute z-10" onClick={(e) => e.stopPropagation()}>
                            <EmojiPicker
                                value={data.icon}
                                onChange={handleIconChange}
                            />
                        </div>
                    )}
                </div>
                <input
                    className={styles.flowNodeInput}
                    value={text}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="Option text"
                />
            </div>

            {showPreview && (
                <div className="mb-4">
                    <ChatPreview option={optionData} allFlows={availableFlows} />
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className={styles.flowNodeLabel}>
                        Bot Response
                    </label>
                    <textarea
                        className={styles.flowInput}
                        value={botResponseText}
                        onChange={(e) => handleBotResponseTextChange(e.target.value)}
                        placeholder="What should the bot say?"
                        rows={2}
                    />
                </div>

                <div>
                    <label className={styles.flowNodeLabel}>
                        Follow-up (optional)
                    </label>
                    <textarea
                        className={styles.flowInput}
                        value={botResponseFollowUp}
                        onChange={(e) => handleBotResponseFollowUpChange(e.target.value)}
                        placeholder="Additional message..."
                        rows={2}
                    />
                </div>

                <div>
                    <label className={styles.flowNodeLabel}>
                        Next Flow
                    </label>
                    <select
                        className={styles.flowSelect}
                        value={nextFlow}
                        onChange={(e) => handleNextFlowChange(e.target.value)}
                        style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,<svg width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M5 7.5L10 12.5L15 7.5\" stroke=\"%23666666\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>')", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
                    >
                        <option value="">No next flow</option>
                        {availableFlows.map((flow) => (
                            <option key={flow.id} value={flow.name}>
                                {flow.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default FlowNode;