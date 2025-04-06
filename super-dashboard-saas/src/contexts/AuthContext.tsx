'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { User } from '@/types'; // Import the User type

// Define the shape of the context data
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  apiKey: string | null; // Add apiKey state
  login: (userData: User, token: string, apiKey: string) => void; // Add apiKey to login params
  logout: () => void;
  isLoading: boolean;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null); // Add state for apiKey
  const [isLoading, setIsLoading] = useState(true); // Start loading until checked

  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('authToken');
      const storedApiKey = localStorage.getItem('apiKey'); // Also check for stored API key

      if (token) {
        try {
          // Fetch user data using the stored token
          // Assuming /api/users/me returns user data including the api_key
          const userData: User & { api_key?: string } = await fetchApi('/api/users/me'); // Expect api_key in response

          if (userData) {
             setUser(userData);
             setIsAuthenticated(true);
             // If API key is in response, store it; otherwise use stored key
             const currentApiKey = userData.api_key || storedApiKey;
             if (currentApiKey) {
                setApiKey(currentApiKey);
                localStorage.setItem('apiKey', currentApiKey); // Ensure it's stored
             } else {
                 console.warn('API key not found in user data or local storage.');
                 localStorage.removeItem('apiKey'); // Clear if not found
             }
          } else {
             // Handle case where API returns null/undefined for a valid token
             localStorage.removeItem('authToken');
             localStorage.removeItem('apiKey');
          }
        } catch (error) {
          console.error('Failed to fetch user data or invalid token:', error);
          localStorage.removeItem('authToken'); // Clear invalid token
          localStorage.removeItem('apiKey'); // Clear associated API key
          setIsAuthenticated(false); // Ensure state reflects logout on error
          setUser(null);
          setApiKey(null);
        }
      }
      setIsLoading(false); // Finished loading check
    };

    checkAuthStatus();
  }, []); // Empty dependency array ensures this runs only once on mount

  const login = (userData: User, token: string, userApiKey: string) => { // Add apiKey param
    localStorage.setItem('authToken', token);
    localStorage.setItem('apiKey', userApiKey); // Store API key
    setUser(userData);
    setApiKey(userApiKey); // Set API key in state
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('apiKey'); // Clear API key on logout
    setUser(null);
    setApiKey(null); // Clear API key state
    setIsAuthenticated(false);
    // Optional: Redirect to login page
    window.location.href = '/login'; // Redirect on logout
  };

  const value = {
    isAuthenticated,
    user,
    apiKey, // Provide apiKey in context
    login,
    logout,
    isLoading,
  };

  // Render loading state until authentication check is complete
  // This prevents rendering children components that might rely on auth state prematurely
  // if (isLoading) {
  //    return <div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>; // Or a dedicated loading screen
  // }


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create a hook for easy consumption of the context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
