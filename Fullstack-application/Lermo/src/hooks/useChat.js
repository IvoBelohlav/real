import { useState, useCallback } from 'react';
import api from '../utils/api';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (text, guestId) => {
    setMessages(prevMessages => [...prevMessages, { text, sender: 'user' }]);
    setLoading(true);
    
    try {
      const response = await api.post('/api/chat/message', {
        query: text,
        guest_id: guestId,
      });
      // Extract personalized_recommendations as well
      const { reply, followup_questions = [], source = '', metadata = {}, personalized_recommendations = [] } = response.data; 
  
      setMessages(prevMessages => [
        ...prevMessages,
        {
          text: reply,
          sender: 'bot',
          followUp: followup_questions,
          source,
          metadata,
          personalized_recommendations // Add the recommendations here
        },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prevMessages => [
        ...prevMessages,
        { text: 'Došlo k chybě', sender: 'system' },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { messages, sendMessage, loading };
};
