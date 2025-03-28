import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Loader } from 'lucide-react';
import humanChatService from '../../services/humanChatService';
import { toast } from 'react-toastify';
import styles from './HumanChatButton.module.css';

const HumanChatButton = ({ 
  conversationId, 
  isAvailable = true, 
  onHumanChatRequested,
  theme = 'light',
  primaryColor = '#4F46E5'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleRequestHumanChat = async () => {
    if (!conversationId) {
      console.error('No conversation ID provided');
      toast.error('Cannot request human chat: No conversation ID');
      return;
    }
    
    if (!isAvailable) {
      toast.info('Human chat is not currently available');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Use the updated service method
      const response = await humanChatService.requestHumanChat(conversationId);
      
      if (response.data?.success) {
        toast.success('Human chat request successful');
        if (onHumanChatRequested) {
          onHumanChatRequested(response.data.session);
        }
      } else {
        toast.error('Failed to request human chat');
      }
    } catch (error) {
      console.error('Error requesting human chat:', error);
      
      // Extract and display useful error message
      let errorMsg = 'Error requesting human support';
      if (error.response) {
        // Handle structured error responses
        const responseData = error.response.data;
        if (responseData.detail && typeof responseData.detail === 'string') {
          errorMsg = responseData.detail;
        } else if (responseData.message) {
          errorMsg = responseData.message;
        }
      }
      
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.button
      onClick={handleRequestHumanChat}
      className={styles.button}
      style={{ 
        backgroundColor: isAvailable ? primaryColor : '#9CA3AF',
        cursor: isAvailable ? 'pointer' : 'not-allowed',
        opacity: isAvailable ? 1 : 0.7
      }}
      whileHover={isAvailable ? { scale: 1.05 } : {}}
      whileTap={isAvailable ? { scale: 0.95 } : {}}
      disabled={!isAvailable || isLoading}
    >
      {isLoading ? (
        <Loader className={styles.loadingIcon} />
      ) : (
        <Phone className={styles.icon} />
      )}
      {isLoading ? 'Connecting...' : 'Chat with Human Support'}
    </motion.button>
  );
};

export default HumanChatButton;