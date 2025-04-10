import React from 'react';
import { MessageSquare, ArrowRight } from 'lucide-react';
import styles from './guidedChatAdmin.module.css';

const ChatPreview = ({ option, allFlows = [] }) => {
  // Safely extract data with error handling
  const safeOption = option || {};
  
  // We need to normalize the botResponse from various potential formats
  const normalizeBotResponse = () => {
    try {
      // Get bot response from different possible sources
      const botResponse = safeOption.botResponse || safeOption.bot_response || {};
      
      // Handle string format
      if (typeof botResponse === 'string') {
        return { text: botResponse, followUp: '' };
      }
      
      // Handle object format with different potential field names
      return {
        text: botResponse.text || botResponse.message || botResponse.content || '',
        followUp: botResponse.followUp || botResponse.follow_up || ''
      };
    } catch (err) {
      console.error("Error normalizing bot response:", err);
      return { text: '', followUp: '' };
    }
  };
  
  // Get normalized bot response
  const normalizedResponse = normalizeBotResponse();
  const botText = normalizedResponse.text || '';
  const botFollowUp = normalizedResponse.followUp || '';
  
  // Get next flow info
  const nextFlowName = safeOption.next_flow || '';
  const nextFlow = nextFlowName ? allFlows.find(flow => flow.name === nextFlowName) : null;

  return (
    <div className={styles.chatPreviewComponent}>
      <div className={styles.chatPreviewHeader}>
        <MessageSquare size={18} />
        <span>Chat Preview</span>
      </div>
      <div className={styles.chatPreviewBody}>
        <div className={styles.botMessageContainer}>
          <div className={styles.botAvatar}>🤖</div>
          <div className={styles.botMessageContent}>
            <div className={styles.botMessage}>{botText || 'Bot will respond here...'}</div>
            {botFollowUp && (
              <div className={styles.botMessageFollowup}>{botFollowUp}</div>
            )}
          </div>
        </div>

        {safeOption.text && (
          <div className={styles.chatPreviewOptions}>
            <div className={styles.userOption}>
              <span className={styles.userOptionIcon}>{safeOption.icon || '💬'}</span>
              <span className={styles.userOptionText}>{safeOption.text}</span>
            </div>
          </div>
        )}

        {nextFlowName && (
          <div className={styles.nextFlowIndicator}>
            <ArrowRight size={16} />
            <span>Next Flow: {nextFlowName}</span>
            {nextFlow && (
              <span className="ml-1 text-gray-500">({nextFlow.options?.length || 0} options)</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPreview; 