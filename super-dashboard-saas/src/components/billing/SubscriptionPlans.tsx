'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { CheckCircle2, Sparkles } from 'lucide-react';

// Define plan structure
interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
  stripePriceId: string;
  tierId: 'basic' | 'premium' | 'enterprise';
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
    price: 'From CZK 15,000/month',
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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    }
  }
};

const planCardVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
};

const featureVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100 } }
};

export default function SubscriptionPlans() {
  const { user } = useAuth();
  const { subscription: currentSubscription, isLoading: isFetchingStatus, error: contextError, refetchSubscription, hasActiveSubscription } = useSubscription();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleCheckout = async (priceId: string) => {
    if (!stripePromise || !user) return;
    setIsCheckoutLoading(priceId);
    setLocalError(null);

    try {
      const response = await fetchApi('/api/subscriptions/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ priceId }),
      });

      console.log(`Raw response from fetchApi:`, response);
      const session = response;
      console.log(`Session object received:`, session);
      console.log(`Type of session object: ${typeof session}`);

      if (!session || !session.session_id) {
          console.error('Check failed: session or session.session_id is missing.');
          console.log(`Failing session object:`, session);
          throw new Error('Failed to process checkout session ID from backend response.');
      }
      console.log(`Using session_id directly: ${session.session_id}`);

      const stripe = await stripePromise;
       if (!stripe) {
        console.error('Stripe.js failed to load.');
         throw new Error('Stripe.js failed to load.');
       }

       const { error: stripeRedirectError } = await stripe.redirectToCheckout({ sessionId: session.session_id });

       if (stripeRedirectError) {
        console.error('Stripe redirect error:', stripeRedirectError);
        throw new Error(`Stripe redirect failed: ${stripeRedirectError.message || 'Unknown Stripe redirect error'}`);
      }
      console.log('Stripe redirectToCheckout called, but no error reported and no redirect occurred.');

    } catch (err: any) {
      console.error('Error in handleCheckout:', err);
      if (err.message.startsWith('Stripe redirect failed:')) {
         setLocalError(err.message);
      } else if (err.message.startsWith('Failed to create checkout session')) {
         setLocalError('Error receiving session data from backend.');
      } else {
         setLocalError(`Checkout process failed: ${err.message || 'An unknown error occurred.'}`);
      }
    } finally {
      setIsCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
     if (!stripePromise || !user) return;
     setIsCheckoutLoading('manage');
     setLocalError(null);

     try {
        const session = await fetchApi('/api/subscriptions/create-portal-session', {
            method: 'POST',
            body: JSON.stringify({})
        });

        console.log("Received session object in frontend:", session);
        console.log("Type of session object:", typeof session);
        if (session && typeof session === 'object') {
            console.log("Keys in session object:", Object.keys(session));
            console.log("Value of session.portal_url:", session.portal_url);
            console.log("Value of session.url (just in case):", session.url);
        }

        if (!session || !session.portal_url) {
            console.error("Check failed: session object or session.portal_url is missing/falsy.");
            throw new Error('Failed to create billing portal session.');
        }

        window.location.href = session.portal_url;

     } catch (err: any) {
        console.error('Manage subscription failed:', err);
        setLocalError(err.message || 'An error occurred while redirecting to manage subscription.');
        setIsCheckoutLoading(null);
     }
  };

  if (!stripePromise) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-red-600 p-4 bg-red-50 rounded-lg shadow border border-red-200"
      >
        Stripe is not configured. Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your environment variables.
      </motion.div>
    );
  }

  if (isFetchingStatus) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center items-center p-16"
      >
        <LoadingSpinner />
      </motion.div>
    );
  }

  const currentPlan = plans.find(p => p.stripePriceId === currentSubscription?.planId);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
       {(contextError || localError) && (
         <motion.div 
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ type: "spring" }}
           className="text-red-500 bg-red-50 p-4 rounded-lg border border-red-200 shadow-sm"
         >
           {contextError || localError}
         </motion.div>
       )}

       {currentPlan && hasActiveSubscription && (
         <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ type: "spring", stiffness: 100 }}
           className="bg-white shadow-lg rounded-xl p-6 border-2 border-blue-500 mb-8 relative overflow-hidden"
         >
           <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
             CURRENT PLAN
           </div>
           <div className="flex items-start justify-between">
             <div>
               <h3 className="text-lg font-medium text-gray-900 mb-2">Your Current Plan</h3>
               <p className="text-2xl font-bold text-blue-600 mb-1">
                 {currentPlan.name}
               </p>
               {currentSubscription?.status && (
                 <div className="flex items-center">
                   <span className="text-sm text-gray-600 capitalize flex items-center mr-2">
                     <span className={`w-2 h-2 rounded-full mr-1.5 ${
                       currentSubscription.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                     }`}></span>
                     Status: {currentSubscription.status}
                   </span>
                 </div>
               )}
             </div>
             <motion.button
               whileHover={{ scale: 1.03 }}
               whileTap={{ scale: 0.97 }}
               onClick={handleManageSubscription}
               disabled={isCheckoutLoading === 'manage'}
               className="mt-1 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
             >
               {isCheckoutLoading === 'manage' ? <LoadingSpinner /> : 'Manage Subscription'}
             </motion.button>
           </div>
         </motion.div>
       )}

       <motion.div 
         variants={containerVariants} 
         className="grid grid-cols-1 md:grid-cols-3 gap-8"
       >
         {plans.map((plan, index) => {
           const currentPlanId = currentSubscription?.planId;
           const isCurrentActivePlan = hasActiveSubscription &&
             (currentPlanId === plan.stripePriceId || 
              (currentPlanId && currentPlanId.toLowerCase() === plan.tierId));
           const isEnterprise = plan.tierId === 'enterprise';
           const isPremium = plan.tierId === 'premium';

           return (
             <motion.div
               key={plan.id}
               variants={planCardVariants}
               whileHover={{ y: -5, transition: { type: "spring", stiffness: 300 } }}
               className={`bg-white rounded-xl p-6 flex flex-col border-2 transition-all duration-300 relative
                 ${isCurrentActivePlan 
                   ? 'border-green-500 shadow-lg shadow-green-100' 
                   : isPremium 
                     ? 'border-blue-500 shadow-lg' 
                     : 'border-gray-200 shadow-md hover:shadow-lg hover:border-blue-300'}`}
             >
               {isPremium && !isCurrentActivePlan && (
                 <div className="absolute -top-4 -right-4 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full transform rotate-12 shadow-md">
                   POPULAR
                 </div>
               )}
               
               <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
               <p className="mt-2 text-3xl font-extrabold text-blue-700">{plan.price}</p>
               
               <ul className="mt-6 space-y-3 text-sm text-gray-600 flex-grow">
                 {plan.features.map((feature, idx) => (
                   <motion.li 
                     key={feature} 
                     variants={featureVariants}
                     className="flex items-center"
                   >
                     <CheckCircle2 className="w-5 h-5 mr-2 text-blue-500 flex-shrink-0" />
                     {feature}
                   </motion.li>
                 ))}
               </ul>
               
               <div className="mt-8">
                 {isCurrentActivePlan ? (
                   <div className="text-center py-3 px-4 border-2 border-green-500 bg-green-50 rounded-lg">
                     <p className="text-sm font-medium text-green-700 flex items-center justify-center">
                       <CheckCircle2 size={16} className="mr-1.5" /> Current Plan
                     </p>
                   </div>
                 ) : isEnterprise ? (
                   <motion.a
                     whileHover={{ scale: 1.03 }}
                     whileTap={{ scale: 0.97 }}
                     href="mailto:your-sales-email@example.com?subject=Enterprise Plan Inquiry"
                     className="w-full inline-flex items-center justify-center px-4 py-3 border border-blue-300 text-sm font-medium rounded-lg shadow-sm text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                   >
                     <Sparkles size={16} className="mr-1.5" /> Contact Sales
                   </motion.a>
                 ) : (
                   <motion.button
                     whileHover={{ scale: 1.03 }}
                     whileTap={{ scale: 0.97 }}
                     onClick={() => handleCheckout(plan.stripePriceId)}
                     disabled={isCheckoutLoading === plan.stripePriceId}
                     className={`w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg shadow-md ${
                       isPremium 
                         ? 'text-white bg-blue-600 hover:bg-blue-700' 
                         : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                     } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200`}
                   >
                     {isCheckoutLoading === plan.stripePriceId ? <LoadingSpinner /> : 'Subscribe'}
                   </motion.button>
                 )}
               </div>
             </motion.div>
           );
         })}
       </motion.div>
    </motion.div>
  );
}