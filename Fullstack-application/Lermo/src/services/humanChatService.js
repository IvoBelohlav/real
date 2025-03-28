// src/services/humanChatService.js
import api from '../utils/api';
import { storage } from '../utils/storage';

const humanChatService = {
  /**
   * Request a human chat session
   * @param {string} conversationId - The ID of the AI conversation
   * @returns {Promise} - The API response with session details
   */
  requestHumanChat: (conversationId) => {
    // Get guest ID from storage or create new one
    let guestId = storage.get('guestId');
    if (!guestId) {
      guestId = `guest_${Math.random().toString(36).substring(2, 10)}`;
      storage.set('guestId', guestId);
    }

    // Send the conversation_id in the request body instead of as a query parameter
    return api.post('/api/human-chat/request', { conversation_id: conversationId }, {
      headers: {
        'X-Guest-ID': guestId,
        'Content-Type': 'application/json'
      }
    });
  },

  /**
   * Get all chat sessions for the current user
   * @param {string} status - Optional filter by session status
   * @returns {Promise} - The API response with sessions
   */
  getUserSessions: (status = null) => {
    const params = status ? { status } : {};
    return api.get('/api/human-chat/sessions', { params });
  },

  /**
   * Get details for a specific chat session
   * @param {string} sessionId - The ID of the chat session
   * @returns {Promise} - The API response with session details
   */
  getChatSession: (sessionId) => {
    return api.get(`/api/human-chat/sessions/${sessionId}`);
  },

  /**
   * Get messages for a specific chat session
   * @param {string} sessionId - The ID of the chat session
   * @param {number} limit - Maximum number of messages to retrieve
   * @param {string} before - ISO timestamp to get messages before
   * @returns {Promise} - The API response with messages
   */
  getChatMessages: (sessionId, limit = 50, before = null) => {
    const params = { limit };
    if (before) {
      params.before = before;
    }
    return api.get(`/api/human-chat/sessions/${sessionId}/messages`, { params });
  },

  /**
   * Close a chat session
   * @param {string} sessionId - The ID of the chat session
   * @param {string} reason - Reason for closing the session
   * @returns {Promise} - The API response
   */
  closeSession: (sessionId, reason = null) => {
    const params = reason ? { reason } : {};
    return api.post(`/api/human-chat/sessions/${sessionId}/close`, null, { params });
  },

  // Agent-specific methods remain unchanged
  getAgentStatus: () => {
    return api.get('/api/agent/status');
  },

  updateAgentStatus: (status) => {
    return api.post('/api/agent/status', null, { params: { status } });
  },

  getAgentSessions: (status = null) => {
    const params = status ? { status } : {};
    return api.get('/api/agent/sessions', { params });
  },

  getWaitingSessions: () => {
    return api.get('/api/agent/waiting-sessions');
  },

  claimSession: (sessionId) => {
    return api.post(`/api/agent/sessions/${sessionId}/claim`);
  }
};

export default humanChatService;