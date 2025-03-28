// src/components/Chat/HumanChatInterface.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  X, 
  MinusCircle, 
  Loader, 
  Users, 
  Clock,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'react-toastify';

import humanChatService from '../../services/humanChatService';
import websocketService from '../../services/websocketService';
import HumanChatMessage from './HumanChatMessage';
import styles from './HumanChatInterface.module.css';

const HumanChatInterface = ({ 
  session, 
  onClose, 
  theme = 'light',
  isMinimized = false,
  onMinimize,
  onMaximize
}) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState({});
  const [isMinimizedState, setIsMinimizedState] = useState(isMinimized);
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const messageInputRef = useRef(null);

  // Effect to load initial messages and setup WebSocket
  useEffect(() => {
    let isMounted = true;
    
    const setupChat = async () => {
      if (!session?.session_id) return;
      
      try {
        setIsLoading(true);
        
        // First fetch messages from API
        const response = await humanChatService.getChatMessages(session.session_id);
        if (isMounted) {
          setMessages(response.data || []);
        }
        
        // Then connect WebSocket
        await websocketService.connect(session.session_id);
        
        // Scroll to bottom
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Error setting up human chat:', error);
        toast.error('Nepodařilo se načíst zprávy. Zkuste to prosím později.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    setupChat();
    
    // Set up WebSocket event handlers
    const messageHandler = (data) => {
      if (!isMounted) return;
      
      console.log('WebSocket message received:', data);
      
      // eslint-disable-next-line default-case
      switch (data.type) {
        case 'history':
          setMessages(data.messages || []);
          break;
          
        case 'new_message':
          setMessages(prevMessages => {
            // Avoid duplicates
            if (prevMessages.some(msg => msg.message_id === data.message.message_id)) {
              return prevMessages;
            }
            return [...prevMessages, data.message];
          });
          break;
          
        case 'typing':
          handleTypingIndicator(data.user_id, data.is_typing);
          break;
          
        case 'user_joined':
          // Could show a notification that someone joined
          break;
          
        case 'user_left':
          // Could show a notification that someone left
          break;
          
        case 'agent_joined':
          toast.success('Operátor se připojil k chatu');
          setMessages(prevMessages => {
            if (data.message && !prevMessages.some(msg => msg.message_id === data.message.message_id)) {
              return [...prevMessages, data.message];
            }
            return prevMessages;
          });
          break;
          
        case 'session_closed':
          toast.info('Chat byl ukončen' + (data.reason ? `: ${data.reason}` : ''));
          setMessages(prevMessages => {
            if (data.message && !prevMessages.some(msg => msg.message_id === data.message.message_id)) {
              return [...prevMessages, data.message];
            }
            return prevMessages;
          });
          break;
      }
      
      // Scroll to bottom when new messages arrive
      setTimeout(scrollToBottom, 100);
    };
    
    const connectionHandler = (connected) => {
      if (!isMounted) return;
      setIsConnected(connected);
      
      if (connected) {
        toast.success('Připojeno k chatu');
      } else {
        toast.warn('Odpojeno od chatu. Pokouším se znovu připojit...');
      }
    };
    
    // Add the handlers
    const removeMessageHandler = websocketService.addMessageHandler(messageHandler);
    const removeConnectionHandler = websocketService.addConnectionHandler(connectionHandler);
    
    // Synchronize minimized state with props
    setIsMinimizedState(isMinimized);
    
    return () => {
      isMounted = false;
      removeMessageHandler();
      removeConnectionHandler();
      websocketService.disconnect();
    };
  }, [session?.session_id, isMinimized]);
  
  // Effect to scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Handle input change with debounced typing indicator
  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    
    // Clear previous timer
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    
    // Send typing indicator
    websocketService.sendTypingStatus(true);
    
    // Set timer to clear typing indicator after 2 seconds of inactivity
    typingTimerRef.current = setTimeout(() => {
      websocketService.sendTypingStatus(false);
    }, 2000);
  };
  
  // Handle typing indicator from other users
  const handleTypingIndicator = (userId, isTyping) => {
    setTypingUsers(prev => {
      if (isTyping) {
        return { ...prev, [userId]: true };
      } else {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      }
    });
  };
  
  // Handle sending a message
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !isConnected) return;
    
    const success = websocketService.sendChatMessage(messageInput.trim());
    
    if (success) {
      setMessageInput('');
      
      // Clear typing indicator
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      websocketService.sendTypingStatus(false);
      
      // Focus input for next message
      messageInputRef.current?.focus();
    } else {
      toast.error('Nepodařilo se odeslat zprávu. Zkontrolujte připojení.');
    }
  };
  
  // Handle closing the chat session
  const handleCloseSession = async () => {
    if (window.confirm('Opravdu chcete ukončit tento chat?')) {
      try {
        await humanChatService.closeSession(session.session_id, 'Ukončeno uživatelem');
        websocketService.disconnect();
        onClose();
      } catch (error) {
        console.error('Error closing session:', error);
        toast.error('Nepodařilo se ukončit chat. Zkuste to prosím později.');
      }
    }
  };
  
  // Handle minimizing/maximizing the chat
  const toggleMinimize = () => {
    const newState = !isMinimizedState;
    setIsMinimizedState(newState);
    
    if (newState) {
      onMinimize();
    } else {
      onMaximize();
      // Focus the input when maximizing
      setTimeout(() => messageInputRef.current?.focus(), 300);
    }
  };
  
  // Get status label and icon based on session status
  const getStatusInfo = () => {
    if (!session) return { label: 'Neznámý stav', Icon: Loader, color: '#9CA3AF' };
    
    switch (session.status) {
      case 'active':
        return { 
          label: 'Aktivní', 
          Icon: CheckCircle2, 
          color: '#10B981' 
        };
      case 'waiting':
        return { 
          label: 'Čeká na operátora', 
          Icon: Clock, 
          color: '#F59E0B' 
        };
      case 'closed':
        return { 
          label: 'Ukončeno', 
          Icon: X, 
          color: '#EF4444' 
        };
      default:
        return { 
          label: 'Neznámý stav', 
          Icon: Loader, 
          color: '#9CA3AF' 
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.Icon;
  
  return (
    <div className={`${styles.chatContainer} ${theme === 'dark' ? styles.chatContainerDark : ''}`}>
      <div className={`${styles.chatHeader} ${theme === 'dark' ? styles.chatHeaderDark : ''}`}>
        <div className={styles.chatTitle}>
          <Users size={20} />
          <span>Chat s operátorem</span>
        </div>
        
        <div className={`${styles.chatStatus} ${theme === 'dark' ? styles.chatStatusDark : ''} ${isConnected ? styles.chatStatusConnected : styles.chatStatusDisconnected}`}>
          <StatusIcon size={16} color={statusInfo.color} />
          <span>{statusInfo.label}</span>
        </div>
        
        <div className={styles.chatActions}>
          <button 
            className={`${styles.chatButton} ${theme === 'dark' ? styles.chatButtonDark : ''}`}
            onClick={toggleMinimize}
          >
            {isMinimizedState ? <MinusCircle size={20} /> : <X size={20} />}
          </button>
        </div>
      </div>
      
      <div className={styles.chatMessages}>
        {messages.map((message) => (
          <HumanChatMessage
            key={message.message_id}
            message={message}
            isUser={message.sender_type === 'user'}
            isAgent={message.sender_type === 'agent'}
            isSystem={message.sender_type === 'system'}
            theme={theme}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className={`${styles.chatInputContainer} ${theme === 'dark' ? styles.chatInputContainerDark : ''}`}>
        <form onSubmit={handleSendMessage} className={styles.chatForm}>
          <textarea
            ref={messageInputRef}
            value={messageInput}
            onChange={handleInputChange}
            placeholder="Napište zprávu..."
            className={`${styles.chatInput} ${theme === 'dark' ? styles.chatInputDark : ''}`}
            rows={1}
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!messageInput.trim() || !isConnected}
            className={`${styles.sendButton} ${theme === 'dark' ? styles.sendButtonDark : ''}`}
          >
            <Send size={20} />
          </button>
        </form>
        
        <AnimatePresence>
          {Object.keys(typingUsers).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`${styles.typingIndicator} ${theme === 'dark' ? styles.typingIndicatorDark : ''}`}
            >
              <span>Někdo píše</span>
              <div className={styles.typingDot} />
              <div className={styles.typingDot} />
              <div className={styles.typingDot} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HumanChatInterface;