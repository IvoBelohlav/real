'use client';

import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Link from 'next/link';
// Import the viewer component
import ConversationLogViewer from '@/components/conversations/ConversationLogViewer';

export default function ConversationsPage() {
  const { hasActiveSubscription, isLoading: isSubscriptionLoading } = useSubscription();

  if (isSubscriptionLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  // Render subscription required message if not active
  // Adjust this check based on whether this feature requires a subscription - Apply dark theme styles
  if (!hasActiveSubscription) {
    return (
      <div className="space-y-6"> {/* Added spacing */}
        <h1 className="text-2xl font-semibold text-foreground mb-6">Conversation Logs</h1>
        {/* Use card styling with warning colors */}
        <div className="bg-card border-l-4 border-yellow-500 text-yellow-500 p-4 rounded shadow-md" role="alert">
          <p className="font-bold text-foreground">Subscription Required</p>
          <p className="text-muted-foreground">You need an active subscription to view Conversation Logs.</p>
          <Link href="/billing" className="mt-2 inline-block text-primary hover:text-primary/80 font-semibold cursor-pointer">
              View Subscription Plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Apply dark theme text colors */}
      <h1 className="text-2xl font-semibold text-foreground">Conversation Logs</h1>
      <p className="text-muted-foreground">
        Review past conversations handled by the chat widget.
      </p>
      {/* Render the viewer component inside a dark theme card */}
      <div className="bg-card shadow rounded-lg p-6 border border-border">
         <ConversationLogViewer /> {/* This component will need styling too */}
      </div>
    </div>
  );
}
