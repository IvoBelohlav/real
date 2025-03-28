// src/services/websocketService.js
import { toast } from 'react-toastify';
import { getAuthToken } from '../utils/auth';
import { storage } from '../utils/storage';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.messageHandlers = [];
    this.connectionHandlers = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000; // 3 seconds initial reconnect time
    this.sessionId = null;
    this.reconnectTimer = null;
  }

  /**
   * Connect to a chat session WebSocket
   * @param {string} sessionId - The ID of the chat session to connect to
   * @returns {Promise} - Resolves when connected, rejects on failure
   */
  connect(sessionId) {
    return new Promise((resolve, reject) => {
      if (this.socket && this.isConnected && this.sessionId === sessionId) {
        resolve();
        return;
      }

      // Clean up existing connection if any
      this.disconnect();

      this.sessionId = sessionId;
      const token = getAuthToken();
      
      // Get guest ID if available
      const guestId = storage.get('guestId');
      
      // Determine correct WebSocket URL based on current environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const baseWsUrl = `${protocol}//${host}`;
      
      // Connect to the WebSocket with authentication token or guest ID
      let wsUrl = `${baseWsUrl}/api/ws/human-chat/${sessionId}`;
      
      // Add token if available
      if (token) {
        wsUrl += `?token=${encodeURIComponent(token)}`;
      } 
      // Otherwise add guest ID if available
      else if (guestId) {
        wsUrl += `?guest_id=${encodeURIComponent(guestId)}`;
      }
      
      try {
        console.log("Connecting WebSocket to:", wsUrl);
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
          console.log('WebSocket connected!');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.notifyConnectionHandlers(true);
          resolve();
        };

        this.socket.onclose = (event) => {
          console.log(`WebSocket disconnected: ${event.code} - ${event.reason}`);
          this.isConnected = false;
          this.notifyConnectionHandlers(false);
          
          // Attempt to reconnect if the close wasn't intentional
          if (event.code !== 1000 && event.code !== 1001) {
            this.attemptReconnect();
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (!this.isConnected) {
            reject(new Error('Failed to connect to WebSocket'));
          }
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.notifyMessageHandlers(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect() {
    if (this.socket) {
      // Clear any reconnect timers
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      try {
        // Only close if the socket is open
        if (this.socket.readyState === WebSocket.OPEN) {
          this.socket.close(1000, 'Client disconnected');
        }
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }

      this.socket = null;
      this.isConnected = false;
      this.sessionId = null;
      this.notifyConnectionHandlers(false);
    }
  }

  /**
   * Attempt to reconnect to the WebSocket
   */
  attemptReconnect() {
    // Don't try to reconnect if we're already at the maximum attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnect attempts reached');
      toast.error('Unable to reconnect to chat. Please refresh the page.');
      return;
    }

    // Use exponential backoff for reconnect timing
    const delay = Math.min(30000, this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts));
    console.log(`Attempting to reconnect in ${delay}ms...`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      
      if (this.sessionId) {
        console.log(`Reconnect attempt ${this.reconnectAttempts}...`);
        this.connect(this.sessionId).catch(error => {
          console.error('Reconnect failed:', error);
          
          // Try again if we haven't reached max attempts
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          } else {
            toast.error('Failed to reconnect to chat. Please refresh the page.');
          }
        });
      }
    }, delay);
  }

  /**
   * Send a message through the WebSocket
   * @param {Object} data - Message data to send
   * @returns {boolean} - Whether the message was sent successfully
   */
  sendMessage(data) {
    if (!this.socket || !this.isConnected) {
      toast.error('Not connected to chat. Please try again.');
      return false;
    }

    try {
      this.socket.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  /**
   * Add a handler function for incoming messages
   * @param {Function} handler - Function to handle incoming messages
   * @returns {Function} - Function to remove the handler
   */
  addMessageHandler(handler) {
    this.messageHandlers.push(handler);
    
    // Return a function to remove this handler
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Add a handler function for connection state changes
   * @param {Function} handler - Function to handle connection state (boolean)
   * @returns {Function} - Function to remove the handler
   */
  addConnectionHandler(handler) {
    this.connectionHandlers.push(handler);
    
    // Return a function to remove this handler
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Notify all message handlers of a new message
   * @param {Object} data - Message data
   */
  notifyMessageHandlers(data) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  /**
   * Notify all connection handlers of a connection state change
   * @param {boolean} isConnected - Whether the WebSocket is connected
   */
  notifyConnectionHandlers(isConnected) {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(isConnected);
      } catch (error) {
        console.error('Error in connection handler:', error);
      }
    });
  }

  /**
   * Send a chat message
   * @param {string} content - Message content
   * @returns {boolean} - Whether the message was sent successfully
   */
  sendChatMessage(content) {
    return this.sendMessage({
      type: 'message',
      content
    });
  }

  /**
   * Send typing indicator status
   * @param {boolean} isTyping - Whether the user is typing
   * @returns {boolean} - Whether the status was sent successfully
   */
  sendTypingStatus(isTyping) {
    return this.sendMessage({
      type: 'typing',
      is_typing: isTyping
    });
  }

  /**
   * Send request to close the session
   * @param {string} reason - Reason for closing the session
   * @returns {boolean} - Whether the request was sent successfully
   */
  requestCloseSession(reason) {
    return this.sendMessage({
      type: 'close_session',
      reason: reason || 'Chat closed by user'
    });
  }
}

// Create and export a singleton instance
const websocketService = new WebSocketService();
export default websocketService;