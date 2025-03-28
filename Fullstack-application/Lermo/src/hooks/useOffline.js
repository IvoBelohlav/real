import { useState, useEffect } from 'react';


export const useOffline = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingMessages, setPendingMessages] = useState([]);
  
    useEffect(() => {
      window.addEventListener('online', () => setIsOnline(true));
      window.addEventListener('offline', () => setIsOnline(false));
      return () => {
        window.removeEventListener('online', () => setIsOnline(true));
        window.removeEventListener('offline', () => setIsOnline(false));
      };
    }, []);
  
    const savePendingMessage = (text) => {
      setPendingMessages(prev => [...prev, { text, timestamp: Date.now() }]);
    };
  
    return { isOnline, pendingMessages, savePendingMessage };
  };