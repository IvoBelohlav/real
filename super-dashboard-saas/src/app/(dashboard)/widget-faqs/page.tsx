'use client';

import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Link from 'next/link';
// Import the manager component
import WidgetFAQManager from '@/components/widget-faqs/WidgetFAQManager';

export default function WidgetFAQsPage() {
  const { hasActiveSubscription, isLoading: isSubscriptionLoading } = useSubscription();

  if (isSubscriptionLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  // Render subscription required message if not active - Apply dark theme styles
  // Adjust this check based on whether FAQ management requires a subscription
  if (!hasActiveSubscription) {
    return (
      <div className="space-y-6"> {/* Added spacing */}
        <h1 className="text-2xl font-semibold text-foreground mb-6">Widget FAQs</h1>
        {/* Use card styling with warning colors */}
        <div className="bg-card border-l-4 border-yellow-500 text-yellow-500 p-4 rounded shadow-md" role="alert">
          <p className="font-bold text-foreground">Subscription Required</p>
          <p className="text-muted-foreground">You need an active subscription to manage Widget FAQs.</p>
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
      <h1 className="text-2xl font-semibold text-foreground">Manage Widget FAQs</h1>
      <p className="text-muted-foreground">
        Add, edit, or remove Frequently Asked Questions that can be displayed or searched within the chat widget.
      </p>
      {/* Render the manager component inside a dark theme card */}
      <div className="bg-card shadow rounded-lg p-6 border border-border">
         <WidgetFAQManager /> {/* This component will need styling too */}
      </div>
    </div>
  );
}
