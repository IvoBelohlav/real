'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSubscription } from '@/contexts/SubscriptionContext'; // Corrected path
import { useAuth } from '@/contexts/AuthContext'; // Corrected path
import { fetchApi } from '@/lib/api'; // Corrected path
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // Corrected path

export default function SubscriptionSuccessPage() {
  const { user } = useAuth(); // Added
  const { refetchSubscription, isLoading: isSubscriptionLoading, error: subscriptionError, hasActiveSubscription } = useSubscription(); // Renamed isLoading, error
  const [apiKey, setApiKey] = useState<string | null>(null); // Added state for API key
  const [isLoadingKey, setIsLoadingKey] = useState<boolean>(false); // Added state for key loading
  const [errorApiKey, setErrorApiKey] = useState<string | null>(null); // Added state for key error

  // 1. Refetch subscription status on mount
  useEffect(() => {
    console.log('Subscription Success Page: Refetching subscription status...');
    const timer = setTimeout(() => {
      refetchSubscription();
    }, 1500);
    return () => clearTimeout(timer);
  }, [refetchSubscription]);

  // 2. Fetch API Key once subscription is confirmed active
  useEffect(() => {
    const fetchApiKey = async () => {
      if (!user) return; // Should have user if subscription is active, but check anyway

      setIsLoadingKey(true);
      setErrorApiKey(null);
      try {
        const data = await fetchApi('/api/api-keys/current');
        if (data && data.api_key) {
          setApiKey(data.api_key);
        } else {
          throw new Error('API key not found in the server response.');
        }
      } catch (err: any) {
        console.error('Failed to fetch API key on success page:', err);
        setErrorApiKey(err.message || 'Failed to load your API key.');
        setApiKey(null);
      } finally {
        setIsLoadingKey(false);
      }
    };

    // Trigger fetch only when subscription is loaded, active, and user is present
    if (!isSubscriptionLoading && hasActiveSubscription && user) {
      fetchApiKey();
    }
     // Reset key state if subscription becomes inactive or user logs out
     else if (!isSubscriptionLoading && (!hasActiveSubscription || !user)) {
        setApiKey(null);
        setIsLoadingKey(false);
        setErrorApiKey(null);
     }

  }, [user, hasActiveSubscription, isSubscriptionLoading]); // Dependencies for fetching API key

  // Function to render the installation code snippet
  const renderInstallationCode = () => {
    if (isLoadingKey) {
      return (
        <div className="my-4 flex flex-col items-center">
          <LoadingSpinner />
          <p className="text-gray-400 mt-2 text-sm">Loading installation code...</p> {/* text-gray-600 -> text-gray-400 */}
        </div>
      );
    }

    if (errorApiKey) {
      return <p className="text-red-400 bg-red-900 bg-opacity-30 p-3 rounded mt-4">Error loading installation code: {errorApiKey}</p>; {/* Adjusted error colors */}
    }

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

      return (
        <div className="mt-6 border-t border-gray-700 pt-6"> {/* Added border-gray-700 */}
          <h2 className="text-lg font-semibold text-white mb-3">Get Started: Install Your Widget</h2> {/* text-gray-800 -> text-white */}
          <p className="text-gray-400 mb-4 text-sm"> {/* text-gray-600 -> text-gray-400 */}
            Copy and paste this complete HTML template to create a test page for the Lermo widget. You can also extract just the widget container and scripts to integrate into your existing website.
          </p>
          <pre className="bg-gray-800 text-gray-200 p-3 rounded overflow-x-auto text-xs"> {/* bg-gray-900 -> bg-gray-800, text-white -> text-gray-200 */}
            <code>{embedCode}</code>
          </pre>
          <button
            onClick={() => navigator.clipboard.writeText(embedCode)}
            className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500" // Indigo -> Purple
          >
            Copy Code
          </button>
          <p className="mt-4 text-xs text-gray-400"> {/* text-gray-500 -> text-gray-400 */}
            Need help? Check the full{' '}
            <Link href="/installation" className="text-purple-400 hover:underline cursor-pointer">
              Installation Guide
            </Link>.
          </p>
        </div>
      );
    }
    // Fallback if key is null without error (shouldn't happen if logic is correct)
    return <p className="text-gray-500 mt-4 text-sm">Could not retrieve installation code.</p>; // Kept gray-500 for subtle fallback
  }; // End of renderInstallationCode function definition


  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-6 bg-black"> {/* bg-gray-50 -> bg-black */}
      {/* Increased max-w-lg for more space */}
      <div className="bg-gray-900 p-8 rounded-lg shadow-lg max-w-lg w-full border border-gray-700"> {/* bg-white -> bg-gray-900, added shadow-lg, border */}
        <svg className="w-16 h-16 mx-auto text-purple-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> {/* text-green-500 -> text-purple-500 */}
        <h1 className="text-2xl font-semibold text-white mb-3">Payment Successful!</h1> {/* text-gray-800 -> text-white */}

        {/* Subscription Verification Status */}
        {isSubscriptionLoading && (
          <div className="my-4 flex flex-col items-center">
            <LoadingSpinner />
            <p className="text-gray-400 mt-2 text-sm">Verifying your subscription status...</p> {/* text-gray-600 -> text-gray-400 */}
          </div>
        )}
        {subscriptionError && !isSubscriptionLoading && (
           <p className="text-red-400 my-4 text-sm">Error verifying subscription: {subscriptionError}. Please check your dashboard or contact support.</p> // text-red-600 -> text-red-400
        )}
        {!isSubscriptionLoading && !subscriptionError && hasActiveSubscription && (
           <p className="text-green-400 font-medium mb-4">Your subscription is now active. Thank you!</p> // text-green-700 -> text-green-400
        )}
        {!isSubscriptionLoading && !subscriptionError && !hasActiveSubscription && (
           <p className="text-yellow-400 my-4 text-sm">Verifying subscription... If activation takes longer than expected, please check back shortly or contact support.</p> // text-orange-600 -> text-yellow-400
        )}

        {/* Installation Code Section (Rendered conditionally) */}
        {!isSubscriptionLoading && hasActiveSubscription && renderInstallationCode()}

        {/* Navigation Buttons */}
        <div className="mt-8 space-y-3 border-t border-gray-700 pt-6"> {/* Added border-gray-700 */}
          <Link href="/dashboard">
            <span className="block w-full text-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"> {/* Indigo -> Purple */}
              Go to Dashboard
            </span>
          </Link>
          {/* Keep link to full installation page if needed, or remove if redundant */}
          {/* <Link href="/installation">
            <span className="block w-full text-center px-6 py-2 border border-indigo-600 text-base font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              View Full Installation Guide
            </span>
          </Link> */}
        </div>
      </div>
    </div>
  );
}
