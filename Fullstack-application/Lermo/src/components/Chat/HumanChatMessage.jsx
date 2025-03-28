// src/components/Chat/HumanChatMessage.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { User, Users, AlertCircle } from 'lucide-react';
import styles from './HumanChatMessage.module.css';

const HumanChatMessage = ({ 
  message, 
  theme = 'light',
  primaryColor = '#E01E26',
  secondaryColor = '#B61319'
}) => {
  // Determine message sender type
  const getSenderType = () => {
    return message.sender_type || 'user';
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    // If timestamp is a string, convert to Date
    const date = typeof timestamp === 'string' 
      ? new Date(timestamp) 
      : timestamp;
    
    try {
      return formatDistanceToNow(date, { 
        addSuffix: true,
        locale: cs 
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  };

  // Get container class based on sender type
  const getContainerClass = () => {
    const senderType = getSenderType();
    switch (senderType) {
      case 'system':
        return `${styles.messageContainer} ${styles.messageContainerSystem}`;
      case 'user':
        return `${styles.messageContainer} ${styles.messageContainerUser}`;
      case 'agent':
        return `${styles.messageContainer} ${styles.messageContainerAgent}`;
      default:
        return styles.messageContainer;
    }
  };

  // Get appropriate icon based on sender type
  const getIcon = () => {
    const senderType = getSenderType();
    
    switch (senderType) {
      case 'system':
        return <AlertCircle size={18} />;
      case 'agent':
        return <Users size={18} />;
      case 'user':
      default:
        return <User size={18} />;
    }
  };

  // Custom styles based on theme colors
  const getCustomStyles = () => {
    const senderType = getSenderType();
    
    switch (senderType) {
      case 'user':
        return {
          background: primaryColor,
          color: '#ffffff',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem'
        };
      case 'agent':
        return {
          background: theme === 'light' ? '#f3f4f6' : '#374151',
          color: theme === 'light' ? '#111827' : '#f3f4f6',
          borderColor: secondaryColor,
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem'
        };
      case 'system':
        return {
          background: theme === 'light' ? '#fff3cd' : '#4d4215',
          color: theme === 'light' ? '#664d03' : '#ffe69c',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem'
        };
      default:
        return {
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem'
        };
    }
  };
  
  return (
    <motion.div
      className={getContainerClass()}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div 
        className={styles.messageBubble}
        style={getCustomStyles()}
      >
        {/* Message header with sender type and timestamp */}
        <div className={styles.messageHeader}>
          <span className={styles.messageIcon}>{getIcon()}</span>
          <span className={styles.messageSender}>
            {getSenderType() === 'user' ? 'Vy' : 
             getSenderType() === 'agent' ? 'Operátor' : 'Systém'}
          </span>
          {message.timestamp && (
            <span className={styles.messageTimestamp}>
              {formatTimestamp(message.timestamp)}
            </span>
          )}
        </div>
        
        {/* Message content */}
        <div className={styles.messageContent}>
          {message.content}
        </div>
      </div>
    </motion.div>
  );
};

export default HumanChatMessage;