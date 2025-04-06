'use client';

'use client';

import React from 'react'; // Removed useState
import WidgetConfigForm from '@/components/widget/WidgetConfigForm';
import WidgetPreview from '@/components/widget/WidgetPreview';
import { useSubscription } from '@/contexts/SubscriptionContext'; // Import subscription hook
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // Import spinner
import Link from 'next/link'; // Import Link
// Removed Dispatch, SetStateAction import as they are no longer needed here

// Removed local WidgetConfig interface and defaultConfig - these are now handled within the form/types

export default function WidgetConfigPage() {
  const { hasActiveSubscription, isLoading: isSubscriptionLoading } = useSubscription();
  // Removed useState for config and handleConfigChange handler

  // Render loading state while checking subscription
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
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Widget Configuration</h1>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded" role="alert">
          <p className="font-bold">Subscription Required</p>
          <p>You need an active subscription to configure the widget.</p>
          <Link href="/billing">
            <span className="mt-2 inline-block text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer">
              View Subscription Plans
            </span>
          </Link>
        </div>
      </div>
    );
  }

  // Render configuration page if subscribed
  return (
    <div className="space-y-6"> {/* Added space-y for consistent spacing */}
      <h1 className="text-2xl font-semibold text-gray-900">Widget Configuration</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section in a Card */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Settings</h2>
          <WidgetConfigForm />
        </div>

        {/* Preview Section in a Card */}
        <div className="lg:col-span-1 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Preview</h2>
          <WidgetPreview />
        </div>
      </div>
    </div>
  );
}
