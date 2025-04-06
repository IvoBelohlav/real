'use client';

import React, { useState } from 'react'; // Removed unused useEffect import
import { loadStripe } from '@stripe/stripe-js';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext'; // Import useSubscription
import LoadingSpinner from '@/components/shared/LoadingSpinner';

// Define plan structure (adjust based on your actual plans)
interface Plan {
  id: string; // e.g., 'free', 'basic', 'premium'
  name: string;
  price: string;
  features: string[];
  stripePriceId: string;
  tierId: 'basic' | 'premium' | 'enterprise'; // Add tier identifier
}

// Define the three plans
const plans: Plan[] = [
  {
    id: 'basic_monthly',
    tierId: 'basic',
    name: 'Basic Plan',
    price: 'CZK 999/month',
    features: [
      '5 Domains',
      '500 Conversations / month',
      'Unlimited Widget FAQs',
      '15 Guided Chat Flows',
      '50 Products in Catalog',
      'Standard Email Support',
    ],
    stripePriceId: 'price_1RAIdCR4qkxDUOaXTJ7tN1HU',
  },
  {
    id: 'premium_monthly',
    tierId: 'premium',
    name: 'Premium Plan',
    price: 'CZK 2,500/month',
    features: [
      '15 Domains',
      '1,500 Conversations / month',
      'Unlimited Widget FAQs',
      '25 Guided Chat Flows',
      '100 Products in Catalog',
      'Analytics Dashboard Access',
      'Priority Email Support',
    ],
    stripePriceId: 'price_1RAIdbR4qkxDUOaXOszn1Fs2',
  },
  {
    id: 'enterprise_monthly',
    tierId: 'enterprise',
    name: 'Enterprise Plan',
    price: 'From CZK 15,000/month', // Indicate starting price
    features: [
      '50 Domains',
      'Unlimited Conversations',
      'Unlimited Widget FAQs',
      '100 Guided Chat Flows',
      '500 Products in Catalog',
      'Analytics Dashboard Access',
      'Dedicated Support',
      'Custom Integrations',
    ],
    stripePriceId: 'price_1RAIeIR4qkxDUOaXS39pud7M',
  },
];

// Load Stripe outside of component render to avoid recreating on every render
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

export default function SubscriptionPlans() {
  const { user } = useAuth();
  // Use state from context instead of local state
  const { subscription: currentSubscription, isLoading: isFetchingStatus, error: contextError, refetchSubscription, hasActiveSubscription } = useSubscription();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(null); // Loading state specifically for checkout/manage buttons
  const [localError, setLocalError] = useState<string | null>(null); // Local errors for checkout/manage actions


  const handleCheckout = async (priceId: string) => {
    if (!stripePromise || !user) return;
    setIsCheckoutLoading(priceId);
    setLocalError(null);

    try {
      // 1. Call backend to create a Stripe Checkout Session
      const response = await fetchApi('/api/subscriptions/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ priceId }),
      });

      // Log the raw response for debugging
      console.log(`Raw response from fetchApi:`, response);

      // Assuming fetchApi returns the parsed JSON directly
      const session = response; // Or response.data if fetchApi wraps it

      // Log the session object *immediately* before use
      console.log(`Session object received:`, session);
      console.log(`Type of session object: ${typeof session}`);

      // Check if session and session.session_id exist (trusting logs)
      if (!session || !session.session_id) {
          console.error('Check failed: session or session.session_id is missing.');
          console.log(`Failing session object:`, session);
          throw new Error('Failed to process checkout session ID from backend response.');
      }
      // Log the ID we are about to use
      console.log(`Using session_id directly: ${session.session_id}`);

      // 2. Redirect to Stripe Checkout
      const stripe = await stripePromise;
       if (!stripe) {
        console.error('Stripe.js failed to load.'); // Specific log
         throw new Error('Stripe.js failed to load.');
       }

       // Use session.session_id directly from the response object
       const { error: stripeRedirectError } = await stripe.redirectToCheckout({ sessionId: session.session_id });

       if (stripeRedirectError) {
        console.error('Stripe redirect error:', stripeRedirectError);
        // Throw a more specific error for the catch block
        throw new Error(`Stripe redirect failed: ${stripeRedirectError.message || 'Unknown Stripe redirect error'}`);
      }
      // If redirect doesn't happen and there's no error, log it.
      console.log('Stripe redirectToCheckout called, but no error reported and no redirect occurred.');

    } catch (err: any) {
      console.error('Error in handleCheckout:', err); // Log the actual error object
      // Distinguish between API error and Stripe redirect error
      if (err.message.startsWith('Stripe redirect failed:')) {
         setLocalError(err.message); // Show the specific Stripe redirect error
      } else if (err.message.startsWith('Failed to create checkout session')) {
         setLocalError('Error receiving session data from backend.'); // More specific message
      } else {
         setLocalError(`Checkout process failed: ${err.message || 'An unknown error occurred.'}`);
      }
    } finally {
      setIsCheckoutLoading(null);
      // Optionally refetch subscription status after checkout attempt,
      // though webhook is the more reliable way to update status.
      // refetchSubscription();
    }
  };

  const handleManageSubscription = async () => {
     if (!stripePromise || !user) return;
     setIsCheckoutLoading('manage');
     setLocalError(null);

     try {
        // 1. Call backend to create a Stripe Billing Portal Session
        const session = await fetchApi('/api/subscriptions/create-portal-session', { // Corrected path
            method: 'POST',
            // Send an empty body to satisfy FastAPI's requirement for the request parameter,
            // as the fields within CustomerPortalRequest are optional.
            body: JSON.stringify({})
        });

        // Add detailed logging to inspect the received session object
        console.log("Received session object in frontend:", session);
        console.log("Type of session object:", typeof session);
        if (session && typeof session === 'object') {
            console.log("Keys in session object:", Object.keys(session));
            console.log("Value of session.portal_url:", session.portal_url);
            console.log("Value of session.url (just in case):", session.url);
        }

        if (!session || !session.portal_url) {
            // Check for 'portal_url' instead of 'url'
            console.error("Check failed: session object or session.portal_url is missing/falsy.");
            throw new Error('Failed to create billing portal session.');
        }

        // 2. Redirect user to the Billing Portal using 'portal_url'
        window.location.href = session.portal_url;

     } catch (err: any) {
        console.error('Manage subscription failed:', err);
        setLocalError(err.message || 'An error occurred while redirecting to manage subscription.');
        setIsCheckoutLoading(null); // Set loading false here in case of error before redirect
     }
     // No finally setIsCheckoutLoading(null) here because the page redirects on success
  };


  if (!stripePromise) {
    return <div className="text-red-600">Stripe is not configured. Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your environment variables.</div>;
  }

  if (isFetchingStatus) {
    return <LoadingSpinner />;
  }

  // Determine the user's current active plan based on context
  const currentPlan = plans.find(p => p.stripePriceId === currentSubscription?.planId);

  return (
    <div className="space-y-8">
       {/* Display context error OR local error */}
       {(contextError || localError) && <p className="text-red-500 bg-red-100 p-3 rounded">{contextError || localError}</p>}

       {/* Current Subscription Info & Manage Button */}
       {currentPlan && hasActiveSubscription && ( // Show only if subscribed to a known plan
         <div className="bg-white shadow rounded-lg p-6 border border-indigo-600 mb-8">
           <h3 className="text-lg font-medium text-gray-900 mb-2">Your Current Plan</h3>
           <p className="text-xl font-semibold text-indigo-700">
             {currentPlan.name} {/* Show the name of the current plan */}
           </p>
           {currentSubscription?.status && <p className="text-sm text-gray-600 capitalize">Status: {currentSubscription.status}</p>}
           {/* Add logic to show renewal date if available from context */}
           {/* {currentSubscription?.currentPeriodEnd && <p className="text-sm text-gray-500">Renews on: {new Date(currentSubscription.currentPeriodEnd * 1000).toLocaleDateString()}</p>} */}
           <button
             onClick={handleManageSubscription}
             disabled={isCheckoutLoading === 'manage'} // Keep loading state logic
             className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
           >
             {isCheckoutLoading === 'manage' ? <LoadingSpinner /> : 'Manage Subscription'}
           </button>
         </div>
       )}

       {/* Display Plan Cards */}
       {!isFetchingStatus && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8"> {/* Use grid for multiple cards */}
           {plans.map((plan) => {
             const isCurrentPlan = currentPlan?.id === plan.id;
             const isEnterprise = plan.tierId === 'enterprise'; // Check if it's the enterprise plan

             return (
               <div key={plan.id} className={`bg-white shadow rounded-lg p-6 flex flex-col border ${isCurrentPlan ? 'border-2 border-green-500' : ''}`}>
                 <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                 <p className="mt-2 text-3xl font-bold text-gray-900">{plan.price}</p>
                 <ul className="mt-6 space-y-3 text-sm text-gray-600 flex-grow">
                   {plan.features.map((feature) => (
                     <li key={feature} className="flex items-center">
                       <svg className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                       {feature}
                     </li>
                   ))}
                 </ul>
                 <div className="mt-8">
                   {isCurrentPlan ? (
                     <p className="text-center text-sm font-medium text-green-600">Current Plan</p>
                   ) : isEnterprise ? (
                     <a // Use a link for Enterprise contact
                       href="mailto:your-sales-email@example.com?subject=Enterprise Plan Inquiry" // Replace with your sales email
                       className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                     >
                       Contact Sales
                     </a>
                   ) : (
                     <button
                       onClick={() => handleCheckout(plan.stripePriceId)}
                       disabled={!!isCheckoutLoading} // Disable if any checkout is loading
                       className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                     >
                       {isCheckoutLoading === plan.stripePriceId ? <LoadingSpinner /> : 'Subscribe'}
                     </button>
                   )}
                 </div>
               </div>
             );
           })}
         </div>
       )}
    </div>
  );
}
