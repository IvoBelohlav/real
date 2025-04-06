'use client';

import React, { useState, useEffect } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext'; // Corrected path
import { useAuth } from '@/contexts/AuthContext'; // Corrected path
import { fetchApi } from '@/lib/api'; // Corrected path
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // Corrected path
import Link from 'next/link';

export default function InstallationPage() {
  const { user } = useAuth();
  const { hasActiveSubscription, isLoading: isSubscriptionLoading } = useSubscription();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoadingKey, setIsLoadingKey] = useState<boolean>(false); // Initialize as false, useEffect will set true
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiKey = async () => {
      // No need to check user here again as it's a dependency, but doesn't hurt
      if (!user || !hasActiveSubscription) return;

      setIsLoadingKey(true); // Set loading before async call
      setError(null);
      try {
        // Use the correct endpoint path /api/api-keys/current
        const data = await fetchApi('/api/api-keys/current');
        if (data && data.api_key) { // Backend returns 'api_key'
          setApiKey(data.api_key); // Use 'api_key' from response
        } else {
          // Provide a more specific error if key is missing in a successful response
          throw new Error('API key not found in the server response.');
        }
      } catch (err: any) {
        console.error('Failed to fetch API key:', err);
        setError(err.message || 'Failed to load your API key.');
        setApiKey(null); // Ensure apiKey is null on error
      } finally {
        setIsLoadingKey(false); // Ensure loading is set to false in all cases
      }
    };

    // Only attempt fetch if subscription status is loaded, user exists, and has subscription
    if (!isSubscriptionLoading && user && hasActiveSubscription) {
      fetchApiKey();
    } else if (!isSubscriptionLoading && (!user || !hasActiveSubscription)) {
      // If subscription status is known but prerequisites aren't met,
      // ensure loading is false and key is null.
      setIsLoadingKey(false);
      setApiKey(null);
      // Optionally clear error if the reason is just no subscription/login
      // setError(null);
    }
    // If isSubscriptionLoading is true, do nothing and wait for the effect to re-run when it becomes false.

  }, [user, hasActiveSubscription, isSubscriptionLoading]); // Correct dependencies

  const renderContent = () => {
    // Prioritize loading states
    if (isSubscriptionLoading || isLoadingKey) {
      return <LoadingSpinner />;
    }

    // Check for subscription requirement next
    if (!hasActiveSubscription) {
      return (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded" role="alert">
          <p className="font-bold">Subscription Required</p>
          <p>You need an active subscription to access the widget installation code.</p>
          <Link href="/billing" legacyBehavior>
            {/* Use legacyBehavior or wrap Link directly around content */}
            <a className="mt-2 inline-block text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer">
              View Subscription Plans
            </a>
          </Link>
        </div>
      );
    }

    // Check for errors after loading and subscription checks
    if (error) {
       return <p className="text-red-500 bg-red-100 p-3 rounded">Error: {error}</p>;
    }

    // If we have the API key (implies successful fetch, active subscription, no errors)
    if (apiKey) {
      // Use the new embed code template provided by the user
      const embedCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="stylesheet" href="https://lermoplus.s3.eu-north-1.amazonaws.com/static/css/main.7448fe63.css">
</head>
<body>
  <div id="widget-parent">
      <div id="lermo-widget-container">
      </div>
  </div>

  <script src="https://lermoplus.s3.eu-north-1.amazonaws.com/static/js/main.d69c8370.js" defer></script>

  <script>
    function initializeWidget() {
        if (window.LermoWidget && typeof window.LermoWidget.init === 'function') {
            try {
                window.LermoWidget.init({
                    apiKey: "${apiKey}",
                    containerId: 'lermo-widget-container'
                });
            } catch (error) {
                console.error('Error:', error);
            }
        }
    }
    window.setTimeout(initializeWidget, 300);
  </script>
</body>
</html>`;

      return ( // Keep only this return statement for the apiKey block
        <div className="bg-white shadow rounded-lg p-6"> {/* Wrap content in a card */}
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Embed Your Widget</h2>
          <p className="text-gray-600 mb-4">
            Copy and paste this complete HTML template to create a test page for the Lermo widget. You can also extract just the widget container and scripts to integrate into your existing website.
          </p>
          <pre className="bg-gray-900 text-white p-4 rounded overflow-x-auto text-sm">
            <code>{embedCode}</code>
          </pre>
          <button
            onClick={() => navigator.clipboard.writeText(embedCode)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Copy Code
          </button>
          <p className="mt-6 text-sm text-gray-500">
            Your unique API Key is included. Make sure this key remains confidential.
            Need to configure your widget's appearance or behavior? Go to the{' '}
            <Link href="/widget-config" legacyBehavior>
              <a className="text-indigo-600 hover:underline cursor-pointer">Widget Config</a>
            </Link> page.
          </p>
        </div>
      );
    }

    // Fallback case: Loading is done, user has subscription, no error occurred, but apiKey is still null.
    // This might indicate an issue with the API response structure not caught above.
    return <p className="text-gray-500">Could not retrieve your API key. Please try refreshing the page or contact support if the issue persists.</p>;
  };

  // Main component return structure - Calls renderContent()
  return (
    <div className="space-y-6"> {/* Added space-y */}
      <h1 className="text-2xl font-semibold text-gray-900">Widget Installation</h1> {/* Removed mb-6 */}
      {renderContent()} {/* Call the render function here */}
    </div>
  );
}
