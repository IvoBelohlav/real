'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { ConversationLog, ConversationsResponse, ConversationMessage } from '@/types';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

// Helper to format date
const formatDate = (dateString?: string | null) => { // Allow null
  if (!dateString) return 'N/A';
  try {
    // Ensure it's a valid date string before attempting to format
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString; // Return original string if invalid date
    }
    return date.toLocaleString();
  } catch (e) {
    return dateString; // Return original if formatting fails
  }
};

// Basic Modal structure - Apply dark theme styles
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
      // Use background/80 for overlay, add backdrop blur
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-start z-50 p-4 pt-16 overflow-y-auto">
        {/* Use card styling for modal content */}
        <div className="relative bg-card rounded-lg shadow-xl w-full max-w-3xl p-6 my-8 border border-border">
          {/* Style header with foreground and border, make sticky */}
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-border sticky top-0 bg-card py-2 z-10">
            <h3 className="text-lg font-medium leading-6 text-foreground">{title}</h3>
            {/* Style close button */}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground focus:outline-none text-2xl">&times;</button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
              {children}
          </div>
        </div>
      </div>
    );
  };

const ConversationLogViewer: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<ConversationLog | null>(null);

  // Fetch Conversations
  const { data: response, isLoading, isError, error } = useQuery<ConversationsResponse, Error>({
    queryKey: ['conversations'],
    queryFn: () => fetchApi('/api/conversations'), // Matches backend endpoint
  });

  const conversations = response?.conversations || [];

  // --- Render Logic ---
  if (isLoading) {
    return <div className="flex justify-center p-4"><LoadingSpinner /></div>;
  }

  if (isError) {
    return <div className="text-red-600 bg-red-100 p-4 rounded">Error loading conversations: {error?.message}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header - Already styled */}
      <h2 className="text-xl font-semibold text-foreground">Conversation History</h2>

      {/* Conversation List/Table - Already styled */}
      <div className="bg-card shadow overflow-hidden sm:rounded-md border border-border">
        {conversations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Session ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Time</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">End Time</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Messages</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {conversations.map((conv) => (
                  <tr key={conv.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-muted-foreground" title={conv.session_id}>
                        {conv.session_id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate(conv.start_time)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate(conv.end_time)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{conv.messages?.length || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedConversation(conv)}
                        className="text-primary hover:text-primary/80"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">No conversation logs found.</p>
        )}
      </div>

       {/* Conversation Detail Modal - Already styled */}
       <Modal isOpen={!!selectedConversation} onClose={() => setSelectedConversation(null)} title={`Conversation: ${selectedConversation?.session_id.substring(0,8)}...`}>
         {selectedConversation && (
           <div className="space-y-3">
             {selectedConversation.messages.map((msg, index) => (
               <div key={index} className={`p-3 rounded-lg max-w-[85%] ${
                 msg.sender === 'user' ? 'bg-primary text-primary-foreground ml-auto' : // User message
                 msg.sender === 'agent' ? 'bg-accent text-accent-foreground mr-auto' : // Agent message (example)
                 'bg-muted text-muted-foreground mr-auto' // Bot/System message
               }`}>
                 <p className="text-sm">{msg.text}</p>
                 {/* Adjust timestamp text color slightly */}
                 <p className="text-xs text-muted-foreground/70 mt-1 text-right">{msg.sender} - {formatDate(msg.timestamp)}</p>
               </div>
             ))}
           </div>
         )}
       </Modal>
    </div>
  );
};

export default ConversationLogViewer;
