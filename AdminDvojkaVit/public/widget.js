/**
 * Dvojkavit Chat Widget
 * Version: 1.0.0
 * A lightweight chat widget for websites
 */

(function(window) {
  'use strict';

  // Widget configuration defaults
  const DEFAULT_CONFIG = {
    position: 'bottom-right',
    primaryColor: '#0070F3',
    greeting: 'How can I help you today?',
    autoOpen: false,
    buttonText: 'Chat with us',
    widgetTitle: 'Customer Support',
    avatarUrl: '',
    cssOverrides: '',
    enableTypingIndicator: true,
    showTimestamp: true,
    enableAttachments: false,
    allowTranscriptDownload: false,
    showBranding: true
  };

  // Main widget class
  class DvojkavitChatWidget {
    constructor() {
      this.config = {};
      this.initialized = false;
      this.open = false;
      this.container = null;
      this.button = null;
      this.chatWindow = null;
      this.messagesContainer = null;
      this.inputField = null;
      this.apiBase = 'https://api.dvojkavit.com';
      this.messages = [];
      this.conversation = null;
      this.typingTimeout = null;
    }

    /**
     * Initialize the widget with configuration
     * @param {Object} userConfig - User configuration options
     */
    init(userConfig) {
      if (this.initialized) {
        console.warn('Dvojkavit Chat Widget already initialized');
        return;
      }

      // Merge default and user configuration
      this.config = { ...DEFAULT_CONFIG, ...userConfig };

      if (!this.config.apiKey) {
        console.error('Dvojkavit Chat Widget: API key is required');
        return;
      }

      // Create and inject widget elements
      this.createWidgetElements();
      this.attachEventListeners();
      this.initializeStyles();
      
      // Set initialized flag
      this.initialized = true;

      // Auto-open widget if configured
      if (this.config.autoOpen) {
        setTimeout(() => this.openWidget(), 1000);
      }

      // Log widget initialization
      console.log('Dvojkavit Chat Widget initialized');
    }

    /**
     * Create and inject widget HTML elements
     */
    createWidgetElements() {
      // Create container
      this.container = document.createElement('div');
      this.container.className = 'dvojkavit-chat-container';
      this.container.dataset.position = this.config.position;
      
      // Create chat button
      this.button = document.createElement('button');
      this.button.className = 'dvojkavit-chat-button';
      this.button.innerHTML = `
        <span class="dvojkavit-button-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </span>
        <span class="dvojkavit-button-text">${this.config.buttonText}</span>
      `;
      
      // Create chat window
      this.chatWindow = document.createElement('div');
      this.chatWindow.className = 'dvojkavit-chat-window';
      this.chatWindow.innerHTML = `
        <div class="dvojkavit-chat-header">
          <div class="dvojkavit-chat-title">${this.config.widgetTitle}</div>
          <button class="dvojkavit-chat-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="dvojkavit-chat-messages"></div>
        <div class="dvojkavit-chat-input-container">
          <textarea class="dvojkavit-chat-input" placeholder="Type your message..."></textarea>
          <button class="dvojkavit-chat-send">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      `;
      
      // Add elements to container
      this.container.appendChild(this.button);
      this.container.appendChild(this.chatWindow);
      
      // Add container to document
      document.body.appendChild(this.container);
      
      // Cache message container and input field
      this.messagesContainer = this.container.querySelector('.dvojkavit-chat-messages');
      this.inputField = this.container.querySelector('.dvojkavit-chat-input');
      
      // Add initial greeting message
      if (this.config.greeting) {
        this.addBotMessage(this.config.greeting);
      }
    }

    /**
     * Attach event listeners to widget elements
     */
    attachEventListeners() {
      // Toggle widget on button click
      this.button.addEventListener('click', () => this.toggleWidget());
      
      // Close widget when close button is clicked
      const closeButton = this.container.querySelector('.dvojkavit-chat-close');
      closeButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeWidget();
      });
      
      // Send message on send button click
      const sendButton = this.container.querySelector('.dvojkavit-chat-send');
      sendButton.addEventListener('click', () => this.sendMessage());
      
      // Send message on Enter key (but allow Shift+Enter for new line)
      this.inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    /**
     * Initialize widget styles
     */
    initializeStyles() {
      // Create style element
      const style = document.createElement('style');
      style.textContent = `
        .dvojkavit-chat-container {
          position: fixed;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          font-size: 14px;
          line-height: 1.5;
        }
        
        .dvojkavit-chat-container[data-position="bottom-right"] {
          right: 20px;
          bottom: 20px;
        }
        
        .dvojkavit-chat-container[data-position="bottom-left"] {
          left: 20px;
          bottom: 20px;
        }
        
        .dvojkavit-chat-button {
          background-color: ${this.config.primaryColor};
          color: white;
          border: none;
          border-radius: 50%;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .dvojkavit-chat-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        
        .dvojkavit-button-text {
          display: none;
        }
        
        .dvojkavit-chat-window {
          display: none;
          position: absolute;
          bottom: 70px;
          right: 0;
          width: 350px;
          height: 500px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          flex-direction: column;
        }
        
        .dvojkavit-chat-container[data-position="bottom-left"] .dvojkavit-chat-window {
          right: auto;
          left: 0;
        }
        
        .dvojkavit-chat-window.open {
          display: flex;
          animation: dvChatFadeIn 0.3s ease;
        }
        
        .dvojkavit-chat-header {
          background-color: ${this.config.primaryColor};
          color: white;
          padding: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .dvojkavit-chat-title {
          font-weight: 600;
        }
        
        .dvojkavit-chat-close {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .dvojkavit-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .dvojkavit-message {
          max-width: 80%;
          padding: 10px 15px;
          border-radius: 18px;
          position: relative;
          word-wrap: break-word;
        }
        
        .dvojkavit-message-user {
          background-color: ${this.config.primaryColor};
          color: white;
          align-self: flex-end;
          border-bottom-right-radius: 4px;
        }
        
        .dvojkavit-message-bot {
          background-color: #f0f0f0;
          color: #333;
          align-self: flex-start;
          border-bottom-left-radius: 4px;
        }
        
        .dvojkavit-message-timestamp {
          font-size: 10px;
          opacity: 0.7;
          margin-top: 5px;
          text-align: right;
        }
        
        .dvojkavit-typing-indicator {
          display: inline-block;
          padding: 10px 15px;
          background-color: #f0f0f0;
          border-radius: 18px;
          border-bottom-left-radius: 4px;
          margin-top: 5px;
          align-self: flex-start;
        }
        
        .dvojkavit-typing-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #777;
          margin-right: 3px;
          animation: dvTypingAnimation 1.4s infinite both;
        }
        
        .dvojkavit-typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .dvojkavit-typing-dot:nth-child(3) {
          animation-delay: 0.4s;
          margin-right: 0;
        }
        
        .dvojkavit-chat-input-container {
          display: flex;
          padding: 10px;
          border-top: 1px solid #eee;
        }
        
        .dvojkavit-chat-input {
          flex: 1;
          border: 1px solid #ddd;
          border-radius: 20px;
          padding: 10px 15px;
          resize: none;
          outline: none;
          max-height: 100px;
          min-height: 20px;
          font-family: inherit;
        }
        
        .dvojkavit-chat-input:focus {
          border-color: ${this.config.primaryColor};
        }
        
        .dvojkavit-chat-send {
          background-color: ${this.config.primaryColor};
          color: white;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          margin-left: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          align-self: flex-end;
          transition: background-color 0.2s;
        }
        
        .dvojkavit-chat-send:hover {
          background-color: ${this.darkenColor(this.config.primaryColor, 10)};
        }
        
        .dvojkavit-branding {
          font-size: 11px;
          text-align: center;
          padding: 5px 0;
          color: #777;
        }
        
        .dvojkavit-branding a {
          color: ${this.config.primaryColor};
          text-decoration: none;
        }
        
        @keyframes dvChatFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes dvTypingAnimation {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        
        @media (max-width: 480px) {
          .dvojkavit-chat-window {
            width: calc(100vw - 40px);
            height: 60vh;
            max-height: 500px;
          }
          
          .dvojkavit-chat-container[data-position="bottom-right"] .dvojkavit-chat-window,
          .dvojkavit-chat-container[data-position="bottom-left"] .dvojkavit-chat-window {
            right: 0;
            left: 0;
            bottom: 80px;
          }
          
          .dvojkavit-chat-button {
            width: 50px;
            height: 50px;
          }
        }
        
        ${this.config.cssOverrides || ''}
      `;
      
      // Add style to head
      document.head.appendChild(style);
    }

    /**
     * Toggle widget open/closed state
     */
    toggleWidget() {
      if (this.open) {
        this.closeWidget();
      } else {
        this.openWidget();
      }
    }

    /**
     * Open the chat widget
     */
    openWidget() {
      if (!this.open) {
        this.chatWindow.classList.add('open');
        this.open = true;
        this.inputField.focus();
        
        // Create a conversation if one doesn't exist
        if (!this.conversation) {
          this.createConversation();
        }
      }
    }

    /**
     * Close the chat widget
     */
    closeWidget() {
      if (this.open) {
        this.chatWindow.classList.remove('open');
        this.open = false;
      }
    }

    /**
     * Create a new conversation with the server
     */
    createConversation() {
      fetch(`${this.apiBase}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey
        },
        body: JSON.stringify({
          source: window.location.href,
          referrer: document.referrer
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.conversationId) {
          this.conversation = data.conversationId;
        } else {
          console.error('Failed to create conversation');
        }
      })
      .catch(error => {
        console.error('Error creating conversation:', error);
      });
    }

    /**
     * Send a user message
     */
    sendMessage() {
      const message = this.inputField.value.trim();
      
      if (!message) return;
      
      // Clear input field
      this.inputField.value = '';
      
      // Add message to UI
      this.addUserMessage(message);
      
      // Show typing indicator
      if (this.config.enableTypingIndicator) {
        this.showTypingIndicator();
      }
      
      // Send message to server
      if (this.conversation) {
        this.sendMessageToServer(message);
      } else {
        // Create conversation first if it doesn't exist
        fetch(`${this.apiBase}/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.config.apiKey
          },
          body: JSON.stringify({
            source: window.location.href,
            referrer: document.referrer
          })
        })
        .then(response => response.json())
        .then(data => {
          if (data.conversationId) {
            this.conversation = data.conversationId;
            this.sendMessageToServer(message);
          } else {
            this.hideTypingIndicator();
            this.addBotMessage('Sorry, I couldn\'t establish a connection. Please try again later.');
          }
        })
        .catch(error => {
          console.error('Error creating conversation:', error);
          this.hideTypingIndicator();
          this.addBotMessage('Sorry, I couldn\'t establish a connection. Please try again later.');
        });
      }
    }

    /**
     * Send a message to the server
     * @param {string} message - The message to send
     */
    sendMessageToServer(message) {
      fetch(`${this.apiBase}/conversations/${this.conversation}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey
        },
        body: JSON.stringify({ message })
      })
      .then(response => response.json())
      .then(data => {
        this.hideTypingIndicator();
        if (data.reply) {
          this.addBotMessage(data.reply);
        } else {
          this.addBotMessage('Sorry, I couldn\'t process your request. Please try again later.');
        }
      })
      .catch(error => {
        console.error('Error sending message:', error);
        this.hideTypingIndicator();
        this.addBotMessage('Sorry, I couldn\'t process your request. Please try again later.');
      });
    }

    /**
     * Add a user message to the chat
     * @param {string} message - The message text
     */
    addUserMessage(message) {
      const messageElement = document.createElement('div');
      messageElement.className = 'dvojkavit-message dvojkavit-message-user';
      messageElement.textContent = message;
      
      if (this.config.showTimestamp) {
        const timestamp = document.createElement('div');
        timestamp.className = 'dvojkavit-message-timestamp';
        timestamp.textContent = this.formatTime(new Date());
        messageElement.appendChild(timestamp);
      }
      
      this.messagesContainer.appendChild(messageElement);
      this.scrollToBottom();
      
      // Add to messages array
      this.messages.push({ type: 'user', text: message, timestamp: new Date() });
    }

    /**
     * Add a bot message to the chat
     * @param {string} message - The message text
     */
    addBotMessage(message) {
      const messageElement = document.createElement('div');
      messageElement.className = 'dvojkavit-message dvojkavit-message-bot';
      messageElement.textContent = message;
      
      if (this.config.showTimestamp) {
        const timestamp = document.createElement('div');
        timestamp.className = 'dvojkavit-message-timestamp';
        timestamp.textContent = this.formatTime(new Date());
        messageElement.appendChild(timestamp);
      }
      
      this.messagesContainer.appendChild(messageElement);
      this.scrollToBottom();
      
      // Add to messages array
      this.messages.push({ type: 'bot', text: message, timestamp: new Date() });
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
      // Remove existing indicator if any
      this.hideTypingIndicator();
      
      const indicator = document.createElement('div');
      indicator.className = 'dvojkavit-typing-indicator';
      indicator.innerHTML = `
        <span class="dvojkavit-typing-dot"></span>
        <span class="dvojkavit-typing-dot"></span>
        <span class="dvojkavit-typing-dot"></span>
      `;
      
      indicator.id = 'dvojkavit-typing';
      this.messagesContainer.appendChild(indicator);
      this.scrollToBottom();
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
      const indicator = document.getElementById('dvojkavit-typing');
      if (indicator) {
        indicator.remove();
      }
    }

    /**
     * Format time for message timestamps
     * @param {Date} date - The date to format
     * @returns {string} - Formatted time string
     */
    formatTime(date) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Scroll messages container to the bottom
     */
    scrollToBottom() {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    /**
     * Darken a hex color by a percentage
     * @param {string} color - Hex color string
     * @param {number} percent - Percentage to darken
     * @returns {string} - Darkened hex color
     */
    darkenColor(color, percent) {
      // Remove # if present
      color = color.replace('#', '');
      
      const num = parseInt(color, 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) - amt;
      const G = (num >> 8 & 0x00FF) - amt;
      const B = (num & 0x0000FF) - amt;
      
      return '#' + (
        0x1000000 +
        (R < 0 ? 0 : R) * 0x10000 +
        (G < 0 ? 0 : G) * 0x100 +
        (B < 0 ? 0 : B)
      ).toString(16).slice(1);
    }
  }

  // Create a singleton instance
  const instance = new DvojkavitChatWidget();
  
  // Expose public API
  window.DvojkavitChat = {
    init: (config) => instance.init(config),
    open: () => instance.openWidget(),
    close: () => instance.closeWidget(),
    toggle: () => instance.toggleWidget()
  };
})(window); 