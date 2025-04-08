'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from './AuthContext'; // Need auth status to fetch

interface Subscription {
  planId: string | null;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | null;
  // Add other relevant subscription fields if needed, e.g., current_period_end
}

interface SubscriptionContextProps {
  subscription: Subscription | null;
  isLoading: boolean;
  error: string | null;
  refetchSubscription: () => void;
  hasActiveSubscription: boolean; // Convenience flag
}

const SubscriptionContext = createContext<SubscriptionContextProps | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionStatus = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return; // No user, no subscription
    }

    setIsLoading(true);
    setError(null);
    try {
      // Use the correct endpoint prefix /api instead of /api/v1
      const subData = await fetchApi('/api/subscriptions/status');
      // Ensure subData conforms to Subscription interface or handle variations
      if (subData && typeof subData === 'object') {
         setSubscription({
            planId: subData.planId ?? null,
            status: subData.status ?? null,
            // map other fields if necessary
         });
      } else {
         setSubscription(null); // No active subscription found or invalid data
      }
    } catch (err) {
      console.error("Failed to fetch subscription status in context:", err);
      setError('Failed to load subscription details.');
      setSubscription(null); // Set to null on error
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove user dependency, fetch is triggered by useEffect below

  useEffect(() => {
    // Fetch only when auth loading is complete and we have a user
    if (!isAuthLoading && user) { // Check for user existence here
      fetchSubscriptionStatus();
    } else if (!isAuthLoading && !user) {
      // If auth is done and there's no user, clear subscription state
      setSubscription(null);
      setIsLoading(false);
      setError(null);
    }
    // Intentionally keep fetchSubscriptionStatus out of dependency array
    // We only want to trigger based on auth state and user presence changes
  }, [user, isAuthLoading]);

  const refetchSubscription = () => {
    // Refetch only if not loading and user exists
    if (!isLoading && user) {
        fetchSubscriptionStatus();
    }
  };

  // Derived state for easy checking
  const hasActiveSubscription = !!subscription && (subscription.status === 'active' || subscription.status === 'trialing');

  return (
    <SubscriptionContext.Provider value={{ subscription, isLoading, error, refetchSubscription, hasActiveSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextProps => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
