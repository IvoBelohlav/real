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

// Basic Modal structure (can be replaced with a shared component later)
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-start z-50 p-4 pt-16 overflow-y-auto"> {/* Adjusted padding-top */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 my-8"> {/* Added margin-y */}
          <div className="flex justify-between items-center mb-4 sticky top-0 bg-white py-2 z-10"> {/* Sticky header */}
            <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto pr-2"> {/* Adjusted max-height */}
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
      <h2 className="text-xl font-semibold text-gray-800">Conversation History</h2>

      {/* Conversation List/Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {conversations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {conversations.map((conv) => (
                  <tr key={conv.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500" title={conv.session_id}>
                        {conv.session_id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(conv.start_time)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(conv.end_time)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{conv.messages?.length || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedConversation(conv)}
                        className="text-indigo-600 hover:text-indigo-900"
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
          <p className="text-center text-gray-500 py-6">No conversation logs found.</p>
        )}
      </div>

       {/* Conversation Detail Modal */}
       <Modal isOpen={!!selectedConversation} onClose={() => setSelectedConversation(null)} title={`Conversation: ${selectedConversation?.session_id.substring(0,8)}...`}>
         {selectedConversation && (
           <div className="space-y-3">
             {selectedConversation.messages.map((msg, index) => (
               <div key={index} className={`p-3 rounded-lg max-w-[85%] ${
                 msg.sender === 'user' ? 'bg-blue-100 ml-auto' :
                 msg.sender === 'agent' ? 'bg-yellow-100 mr-auto' : // Example style for agent
                 'bg-gray-100 mr-auto' // Default for bot
               }`}>
                 <p className="text-sm text-gray-800">{msg.text}</p>
                 <p className="text-xs text-gray-500 mt-1 text-right">{msg.sender} - {formatDate(msg.timestamp)}</p>
               </div>
             ))}
           </div>
         )}
       </Modal>
    </div>
  );
};

export default ConversationLogViewer;
