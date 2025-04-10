'use client'; // Mark as a Client Component

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession, signOut, getSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation'; // Use next/navigation for App Router
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // Assuming this path
import { useRef } from 'react'; // Import useRef for interval ID
import { isReturningFromStripe, handleStripeReturn, markStripeReturn } from '@/lib/stripeUtils';

// Define the shape of the user object based on NextAuth session population
/**
 * @typedef {object} AuthUser
 * @property {string} id
 * @property {string} [name] // Optional, might be username
 * @property {string} [username]
 * @property {string} email
 * @property {string} [company_name]
 * @property {string} subscription_status
 * @property {string} subscription_tier
 * @property {string} [api_key]
 * @property {boolean} is_email_verified
 * @property {string} [token] // Access token (use with caution client-side)
 */

/**
 * @typedef {object} AuthContextType
 * @property {AuthUser | null} user
 * @property {boolean} isAuthenticated
 * @property {boolean} isLoading
 * @property {() => Promise<void>} logout
 * @property {() => Promise<void>} refreshSession // Function to manually trigger session refetch
 */

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  
  // Use next-auth session
  const { data: session, status } = useSession();
  
  // Set up state
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);

  // Helper for checking loading state from multiple sources
  const isSessionLoading = status === 'loading';
  const isUserDataLoaded = isAuthenticated ? !!(user && user.subscription_status !== undefined) : true;
  const isLoading = isSessionLoading || (isAuthenticated && !isUserDataLoaded) || isLoadingContext;

  // Set up session refresh interval (e.g., every 60 seconds)
  const SESSION_REFRESH_INTERVAL = 60000; // 60 seconds in ms

  // Initialize auth from session
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoadingContext(true);
      
      try {
        console.log('[AuthContext] Initializing authentication...');
        
        // Use session from next-auth if available
        if (status === 'authenticated' && session) {
          console.log('[AuthContext] Session authenticated:', session);
          
          // Fetch latest data from DB to ensure most current subscription details
          try {
            console.log('[AuthContext] Fetching latest user data from /api/users/me');
            const userResponse = await fetch('/api/users/me');
            
            if (userResponse.ok) {
              const userData = await userResponse.json();
              console.log('[AuthContext] User data from DB:', userData);
              
              // Merge the session and DB data
              const mergedUser = {
                ...session.user,
                ...userData,
                subscription_status: userData.subscription_status || session.user.subscription_status,
                subscription_tier: userData.subscription_tier || session.user.subscription_tier,
                api_key: userData.api_key || session.user.api_key,
                stripe_customer_id: userData.stripe_customer_id || userData.stripeCustomerId || session.user.stripe_customer_id,
                stripe_subscription_id: userData.stripe_subscription_id || userData.stripeSubscriptionId || session.user.stripe_subscription_id
              };
              
              console.log('[AuthContext] Merged user data:', mergedUser);
              setUser(mergedUser);
              setIsAuthenticated(true);
              setIsSubscriptionActive(
                mergedUser?.subscription_status && 
                ['active', 'trialing'].includes(mergedUser.subscription_status)
              );
            } else {
              // Fallback to session data if DB fetch fails
              console.log('[AuthContext] DB fetch failed, using session data');
              setUser(session.user);
              setIsAuthenticated(true);
              setIsSubscriptionActive(
                session.user?.subscription_status && 
                ['active', 'trialing'].includes(session.user.subscription_status)
              );
            }
          } catch (err) {
            console.error('[AuthContext] Error fetching user data:', err);
            // Still set user from session as fallback
            setUser(session.user);
            setIsAuthenticated(true);
            setIsSubscriptionActive(
              session.user?.subscription_status && 
              ['active', 'trialing'].includes(session.user.subscription_status)
            );
          }
        } else if (status === 'unauthenticated') {
          console.log('[AuthContext] User unauthenticated');
          setUser(null);
          setIsAuthenticated(false);
          setIsSubscriptionActive(false);
        }
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', error);
        setUser(null);
        setIsAuthenticated(false);
        setIsSubscriptionActive(false);
      } finally {
      setIsLoadingContext(false);
      }
    };
    
    initializeAuth();
  }, [status, session]);
  
  // Set up periodic session refresh
  useEffect(() => {
    // Skip refresh if not authenticated
    if (!isAuthenticated) return;
    
    console.log(`[AuthContext] Setting session refresh interval (${SESSION_REFRESH_INTERVAL}ms)`);
    
    const refreshInterval = setInterval(async () => {
      console.log('[AuthContext] Auto-refreshing session...');
      await refreshSession();
    }, SESSION_REFRESH_INTERVAL);
    
    // Clean up on unmount
    return () => clearInterval(refreshInterval);
  }, [isAuthenticated]);

  // Function to manually trigger a session update
  const refreshSession = async () => {
    try {
      console.log("[AuthContext] Manually refreshing session data");
      
      // Force clear any cached user data
      const response = await fetch('/api/users/me', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.error(`[AuthContext] Failed to refresh session: ${response.status}`);
        return null;
      }
      
      const userData = await response.json();
      console.log("[AuthContext] Refreshed user data:", userData);
      
      // Update the user state with latest data
      setUser(userData);
      setIsSubscriptionActive(
        userData?.subscription_status && 
        ['active', 'trialing'].includes(userData.subscription_status)
      );
      
      // Store the subscription status in localStorage for persistence
      if (userData?.subscription_status) {
        localStorage.setItem('subscription_status', userData.subscription_status);
        localStorage.setItem('subscription_tier', userData.subscription_tier || 'free');
      }
      
      return userData;
    } catch (error) {
      console.error("[AuthContext] Error refreshing session:", error);
      return null;
    }
  };

  // Add this function to fetch user data with a token
  const fetchCurrentUser = async (token) => {
    try {
      console.log('[Auth] Fetching current user with token');
      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Auth] Error fetching user data:', errorData);
        return null;
      }
      
      const userData = await response.json();
      console.log('[Auth] Successfully fetched user data');
      return userData;
    } catch (error) {
      console.error('[Auth] Error in fetchCurrentUser:', error);
      return null;
    }
  };

  // Add Stripe return detection to session restoration
  useEffect(() => {
    const restoreSession = async () => {
      try {
        console.log('[Auth] Attempting to restore session...');
        const storedToken = localStorage.getItem('token');
        
        // Check if returning from Stripe
        const isCheckoutReturn = typeof window !== 'undefined' && 
          (isReturningFromStripe(window.location.href) || 
          localStorage.getItem('checkout_returning') === 'true');
          
        if (isCheckoutReturn) {
          console.log('[Auth] Detected return from Stripe checkout!');
          markStripeReturn();
        }
        
        if (storedToken) {
          console.log('[Auth] Found stored token, fetching user data');
          
          // If returning from Stripe, use the special handler
          const userData = isCheckoutReturn 
            ? await handleStripeReturn(fetchCurrentUser)
            : await fetchCurrentUser(storedToken);
            
          if (userData) {
            console.log('[Auth] Session restored successfully');
            
            // Update state with user data
            setUser(userData);
          setIsAuthenticated(true);
            
            // Set subscription status
            setIsSubscriptionActive(
              userData.subscription_status === 'active' || 
              userData.subscription_status === 'trialing'
            );
            
            return true;
          } else {
            console.log('[Auth] Token invalid or expired, clearing local storage');
            localStorage.removeItem('token');
            localStorage.removeItem('authUser');
            return false;
          }
        } else {
          console.log('[Auth] No token found in localStorage');
          return false;
        }
      } catch (error) {
        console.error('[Auth] Error restoring session:', error);
        return false;
      }
    };
    
    restoreSession();
  }, []);

  // Update login function to store token and user data properly
  const login = async (email, password) => {
    try {
      console.log(`[Auth] Attempting to log in user: ${email}`);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      // Get response as text first for debugging
      const textResponse = await response.text();
      console.log(`[Auth] Login response: ${textResponse}`);
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (error) {
        console.error('[Auth] Error parsing login response:', error);
        return { success: false, error: 'Invalid response from server' };
      }
      
      if (!response.ok) {
        console.error('[Auth] Login failed:', data.error);
        return { success: false, error: data.error || 'Login failed' };
      }
      
      // On successful login
      const { token, user } = data;
      if (token && user) {
        console.log('[Auth] Login successful, saving token and user data');
        
        // Store token in localStorage
        localStorage.setItem('token', token);
        
        // Store relevant user data
        setUser(user);
      setIsAuthenticated(true);
        setIsSubscriptionActive(
          user.subscription_status === 'active' || 
          user.subscription_status === 'trialing'
        );
        
        // Also store session flag to help with redirect detection
        localStorage.setItem('isLoggedIn', 'true');
        
        return { success: true };
      } else {
        console.error('[Auth] Login response missing token or user data');
        return { success: false, error: 'Invalid response format' };
      }
    } catch (error) {
      console.error('[Auth] Error during login:', error);
      return { success: false, error: error.message || 'An error occurred' };
    }
  };

  // Update logout function to clear all authentication data
  const logout = async () => {
    try {
      console.log('[Auth] Logging out user');
      
      // Clear localStorage items
      localStorage.removeItem('token');
      localStorage.removeItem('authUser');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('subscription_status');
      localStorage.removeItem('subscription_tier');
      localStorage.removeItem('has_api_key');
      localStorage.removeItem('stripe_customer_id');
      localStorage.removeItem('stripe_subscription_id');
      
      // Clear any stripe checkout or payment session markers
      localStorage.removeItem('stripe_session_id');
      localStorage.removeItem('payment_pending');
      localStorage.removeItem('checkout_returning');
      
      // If using NextAuth, sign out there too
      try {
        await signOut({ redirect: false });
      } catch (signOutError) {
        console.warn('[Auth] NextAuth signOut error:', signOutError);
      }
      
      // Reset state
      setUser(null);
      setIsAuthenticated(false);
      setIsSubscriptionActive(false);
      
      // Redirect to login page
      router.push('/auth/login');
      
      return { success: true };
    } catch (error) {
      console.error('[Auth] Error during logout:', error);
      return { success: false, error: error.message };
    }
  };

  // Provide the auth context
  const contextValue = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshSession,
    register: async (userData) => {
      try {
        console.log('[AuthContext] Attempting to register user:', userData.email);
        
        // Call registration API
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });
        
        // Get response as text first for debugging
        const responseText = await response.text();
        console.log(`[AuthContext] Registration response (${response.status}):`, responseText);
        
        // Parse the JSON (if possible)
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('[AuthContext] Failed to parse registration response:', parseError);
          return {
            success: false,
            error: `Server returned invalid JSON response: ${responseText.substring(0, 100)}...`
          };
        }
        
        if (!response.ok) {
          console.error('[AuthContext] Registration failed with status:', response.status, data);
          return {
            success: false,
            error: data.error || `Registration failed with status ${response.status}`
          };
        }
        
        console.log('[AuthContext] Registration successful:', data);
        return {
          success: true,
          data
        };
      } catch (error) {
        console.error('[AuthContext] Registration error:', error);
        return {
          success: false,
          error: `Registration error: ${error.message || 'Unknown error'}`
        };
      }
    },
    fetchCurrentUser,
    isSubscriptionActive
  };

  // Optional: Show a loading spinner for the initial session check
  // if (isLoading) {
  //   return <LoadingSpinner />;
  // }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
