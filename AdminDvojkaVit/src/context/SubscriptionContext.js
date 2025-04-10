'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import axios from 'axios';

// Create the subscription context
const SubscriptionContext = createContext();

// Subscription provider component
export function SubscriptionProvider({ children }) {
  const { user } = useAuth() || {}; // Add a fallback empty object
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [features, setFeatures] = useState({
    widgetAccess: false,
    multiDomain: false,
    analytics: false,
    prioritySupport: false,
    customBranding: false
  });

  // Check for payment success in URL and update subscription status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const sessionId = url.searchParams.get('session_id');
      const checkoutSuccess = url.searchParams.get('checkout_success') === 'true';
      
      // If we have session_id in URL or checkout_success=true, mark as subscribed
      if (sessionId || checkoutSuccess) {
        console.log('Detected successful payment in URL');
        const subscriptionData = {
          id: sessionId || 'mock_subscription_id',
          status: 'active',
          plan: 'premium',
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          features: {
            widgetAccess: true,
            multiDomain: true,
            analytics: true,
            prioritySupport: true,
            customBranding: true
          }
        };
        
        setSubscription(subscriptionData);
        setFeatures(subscriptionData.features);
        localStorage.setItem('userSubscription', JSON.stringify(subscriptionData));
        console.log('Subscription saved to localStorage from URL parameters');
      }
    }
  }, []);

  // Check if there's a subscription in localStorage
  useEffect(() => {
    const loadSavedSubscription = () => {
      if (typeof window !== 'undefined') {
        try {
          const savedSubscription = localStorage.getItem('userSubscription');
          console.log('Checking localStorage for subscription:', savedSubscription ? 'Found' : 'Not found');
          
          if (savedSubscription) {
            const parsedSubscription = JSON.parse(savedSubscription);
            
            // Check if subscription is still valid (not expired)
            const now = new Date();
            const expiryDate = new Date(parsedSubscription.expiryDate);
            
            if (expiryDate > now) {
              console.log('Valid subscription found in localStorage, expires:', expiryDate.toLocaleString());
              setSubscription(parsedSubscription);
              setFeatures(parsedSubscription.features || {
                widgetAccess: true,
                multiDomain: true,
                analytics: true,
                prioritySupport: true,
                customBranding: true
              });
            } else {
              // Subscription expired, remove from localStorage
              console.log('Subscription expired, removing from localStorage');
              localStorage.removeItem('userSubscription');
            }
          }
        } catch (error) {
          console.error('Error loading subscription from localStorage:', error);
        }
      }
      setIsLoading(false);
    };

    loadSavedSubscription();
  }, []);

  // Force a manual check for subscription status
  const checkSubscriptionStatus = async () => {
    setIsLoading(true);
    
    try {
      // Check localStorage first
      if (typeof window !== 'undefined') {
        const savedSubscription = localStorage.getItem('userSubscription');
        if (savedSubscription) {
          const parsedSubscription = JSON.parse(savedSubscription);
          const now = new Date();
          const expiryDate = new Date(parsedSubscription.expiryDate);
          
          if (expiryDate > now) {
            setSubscription(parsedSubscription);
            setFeatures(parsedSubscription.features || {
              widgetAccess: true,
              multiDomain: true,
              analytics: true,
              prioritySupport: true,
              customBranding: true
            });
            setIsLoading(false);
            return true;
          } else {
            localStorage.removeItem('userSubscription');
          }
        }
      }
      
      // Otherwise check API
      const response = await axios.get('/api/subscriptions/status?check=true');
      
      if (response.data.active) {
        const subscriptionData = {
          id: response.data.id,
          status: response.data.status,
          plan: response.data.plan,
          expiryDate: response.data.current_period_end,
          features: {
            widgetAccess: true,
            multiDomain: response.data.plan !== 'basic',
            analytics: response.data.plan !== 'basic',
            prioritySupport: response.data.plan === 'premium',
            customBranding: response.data.plan === 'premium'
          }
        };
        
        setSubscription(subscriptionData);
        setFeatures(subscriptionData.features);
        localStorage.setItem('userSubscription', JSON.stringify(subscriptionData));
        setIsLoading(false);
        return true;
      }
      
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsLoading(false);
      return false;
    }
  };

  // Check if user has access to a specific feature
  const hasAccess = (featureName) => {
    if (!subscription) return false;
    return features[featureName] || false;
  };

  // Value for the context
  const value = {
    subscription,
    isSubscribed: !!subscription,
    isLoading,
    features,
    hasAccess,
    checkSubscriptionStatus,
    // Helper functions to check specific features
    canAccessWidget: () => {
      console.log('Checking widget access:', !!subscription);
      return !!subscription; // Always grant widget access if subscribed
    },
    canUseMultiDomain: () => hasAccess('multiDomain'),
    canAccessAnalytics: () => hasAccess('analytics'),
    hasPrioritySupport: () => hasAccess('prioritySupport'),
    canCustomizeBranding: () => hasAccess('customBranding')
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

// Custom hook to use the subscription context
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
} 