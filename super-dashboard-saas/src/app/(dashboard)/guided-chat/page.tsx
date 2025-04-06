'use client';

import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Link from 'next/link';
// Import the manager component
import GuidedChatManager from '@/components/guided-chat/GuidedChatManager';

export default function GuidedChatPage() {
  const { hasActiveSubscription, isLoading: isSubscriptionLoading } = useSubscription();

  if (isSubscriptionLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  // Render subscription required message if not active
  if (!hasActiveSubscription) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Guided Chat Flows</h1>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded" role="alert">
          <p className="font-bold">Subscription Required</p>
          <p>You need an active subscription to manage Guided Chat Flows.</p>
          <Link href="/billing">
            <span className="mt-2 inline-block text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer">
              View Subscription Plans
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6"> {/* Added space-y */}
      <h1 className="text-2xl font-semibold text-gray-900">Manage Guided Chat Flows</h1>
      <p className="text-gray-600">
        Create, edit, and visualize conversational flows for the widget's guided mode.
      </p>
      {/* Render the manager component inside a card */}
      <div className="bg-white shadow rounded-lg p-6">
         <GuidedChatManager />
      </div>
    </div>
  );
}
