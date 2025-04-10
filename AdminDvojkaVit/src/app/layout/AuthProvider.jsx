'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import { isAuthenticated, getAuthToken, removeAuthToken } from '@/utils/auth';

// Create the Auth context
const AuthContext = createContext();

// Custom hook to use the Auth context
export function useAuth() {
  return useContext(AuthContext);
}

// Provider component that wraps your app and makes auth object available to any child component that calls useAuth()
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch the current user
  const fetchCurrentUser = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!isAuthenticated()) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const token = getAuthToken();
      const response = await fetch('/api/auth/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid or expired
          removeAuthToken();
          setUser(null);
          // Redirect to widget page
          setIsLoading(false);
          window.location.href = '/widget';
        } else {
          throw new Error('Failed to fetch user data');
        }
      } else {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to login a user
  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to login');
      }

      // Store token
      localStorage.setItem('authToken', data.token);

      // Fetch user data
      await fetchCurrentUser();

      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Function to logout a user
  const logout = () => {
    removeAuthToken();
    setUser(null);
    // Optionally redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
  };

  // Effect to fetch the current user on mount
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Context value
  const value = {
    user,
    isLoading,
    error,
    login,
    logout,
    fetchCurrentUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider; 