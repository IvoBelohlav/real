import api from '../utils/api';

const chatService = {
    async guestAuth() {
      return await api.post('/api/auth/guest');
    },
    async sendMessage(query, conversationHistory = [], language = "cs") {
        const payload = {
            query,
            conversation_history: conversationHistory,
            language
        };
        return await api.post('/api/chat/message', payload);
    }
};

export default chatService;