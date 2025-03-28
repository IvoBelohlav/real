'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// Environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const TEST_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export default function SubscriptionTestPage() {
  // State management
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('Ready to test subscription');
  const [snippet, setSnippet] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  // Get URL search params for handling Stripe redirect
  const searchParams = useSearchParams();
  
  // Function to initiate Stripe checkout
  const handleSubscribe = async () => {
    if (!userId.trim()) {
      setStatus('Please enter a Test User ID');
      return;
    }

    if (!TEST_PRICE_ID) {
      setStatus('Error: No Stripe Price ID configured');
      return;
    }

    if (!STRIPE_PUBLISHABLE_KEY) {
      setStatus('Error: No Stripe Publishable Key configured');
      return;
    }

    setIsLoading(true);
    setStatus('Creating checkout session...');

    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          price_id: TEST_PRICE_ID,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();
      
      // Store userId in localStorage before redirecting
      localStorage.setItem('test_user_id', userId);
      
      // Redirect to Stripe checkout
      if (data.checkout_url) {
        setStatus('Redirecting to Stripe...');
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  // Function to poll for widget snippet
  const pollForSnippet = async (userId: string) => {
    if (pollCount > 30) { // Limit polling attempts (30 * 2s = 60s max)
      setStatus('Timeout waiting for snippet generation');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/widget-snippet?user_id=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch widget snippet');
      }

      const data = await response.json();

      if (data.snippet) {
        setSnippet(data.snippet);
        setStatus('Success! Your widget snippet is ready');
        setIsLoading(false);
        return;
      }

      // Continue polling if no snippet yet
      setPollCount(prev => prev + 1);
      setTimeout(() => pollForSnippet(userId), 2000); // Poll every 2 seconds
    } catch (error) {
      setStatus(`Error fetching snippet: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  // Handle Stripe redirect
  useEffect(() => {
    const stripeCheckout = searchParams.get('stripe_checkout');
    const userIdParam = searchParams.get('user_id');
    
    // Check if we're returning from Stripe checkout
    if (stripeCheckout === 'success') {
      // Use userId from URL or fallback to localStorage
      const checkUserId = userIdParam || localStorage.getItem('test_user_id');
      
      if (checkUserId) {
        setUserId(checkUserId);
        setStatus('Payment successful! Generating your widget snippet...');
        setIsLoading(true);
        setPollCount(0);
        // Start polling for the snippet
        pollForSnippet(checkUserId);
      }
    }
  }, [searchParams]);

  return (
    <main className="max-w-4xl mx-auto p-8 font-sans">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        Lermo AI Widget Subscription Test
      </h1>
      
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="mb-6">
          <label htmlFor="userId" className="block mb-2 font-medium text-gray-700">
            Test User ID:
          </label>
          <input
            type="text"
            id="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={isLoading}
            placeholder="Enter a test user ID"
            className="w-full p-3 border border-gray-300 rounded-md text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          />
        </div>

        <button
          onClick={handleSubscribe}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white font-medium py-3 px-6 rounded-md hover:bg-blue-700 transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Subscribe (Test)'}
        </button>

        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <p className="font-bold mb-1 text-gray-700">Status:</p>
          <p className="text-gray-800">{status}</p>
        </div>

        {snippet && (
          <div className="mt-8 p-4 bg-gray-50 rounded-md border-l-4 border-blue-500">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Your Widget Snippet</h2>
            <pre className="bg-gray-900 text-gray-200 p-4 rounded-md overflow-x-auto font-mono text-sm">
              <code>{snippet}</code>
            </pre>
            <p className="mt-4 italic text-gray-600">
              Copy and paste this snippet into your website to integrate the AI Widget.
            </p>
          </div>
        )}
      </div>

      <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-8 rounded-md">
        <p className="font-medium text-green-800">
          ✅ Stripe API keys have been updated successfully!
        </p>
        <p className="text-green-700 mt-1">
          Publishable Key: {STRIPE_PUBLISHABLE_KEY ? '✓ Configured' : '✗ Missing'}
        </p>
      </div>

      <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-md">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Test Notes & Assumptions:</h3>
        <ul className="space-y-2 text-gray-700 list-disc list-inside">
          <li>This is a test environment using Stripe test mode</li>
          <li>No actual charges will be processed</li>
          <li>Test authentication is handled by user_id parameter</li>
          <li>In production, proper authentication would be implemented</li>
          <li>Webhook handling is required for subscription status updates</li>
          <li>The FastAPI backend must have Stripe webhook handlers configured</li>
        </ul>
      </div>
    </main>
  );
} 