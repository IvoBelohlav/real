'use client';

// Restore original imports
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie'; // Restore Cookies
import { authAPI } from '../../lib/api';
import api from '../../lib/api'; // Keep api import if needed elsewhere, but checkAuth won't use it now

// Create authentication context
const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Function to handle login (Reverted)
  const login = async (email, password) => {
    try {
      const result = await authAPI.login(email, password);

      if (result.success) {
        // Backend returns tokens in body again
        const { access_token, refresh_token } = result.data;

        // Store token in cookie and localStorage for API requests
        Cookies.set('auth_token', access_token, { expires: 7 }); // 7 days
        localStorage.setItem('token', access_token);

        if (refresh_token) {
          Cookies.set('refresh_token', refresh_token, { expires: 30 }); // 30 days
          localStorage.setItem('refresh_token', refresh_token);
        }

        // Fetch user data after successful login
        // We need user data for the context
        await checkAuth(); // This will now read the token and potentially fetch user data

        // Redirect to dashboard
        router.push('/dashboard');

        return { success: true };
      }

      return result; // Return the error from the API
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed. Please try again.'
      };
    }
  };

  // Function to handle registration (Unchanged)
  const register = async (userData) => {
    try {
      const result = await authAPI.register(userData);
      return result;
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Registration failed. Please try again.'
      };
    }
  };

  // Function to handle logout (Reverted - simple cleanup)
  const logout = useCallback(() => {
    // Remove tokens from cookies and localStorage
    Cookies.remove('auth_token');
    Cookies.remove('refresh_token');
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');

    // Clear user from state
    setUser(null);
    // Redirect to login page
    router.push('/auth/login');
    // No backend call needed in this model
  }, [router]);

  // Function to refresh the token (Restored)
  const refreshToken = useCallback(async () => {
    try {
      const refresh = Cookies.get('refresh_token') || localStorage.getItem('refresh_token');

      if (!refresh) {
        throw new Error('No refresh token available');
      }

      // Use directApi as refresh endpoint might not be proxied via /api
      const response = await directApi.post('/api/auth/refresh', { refresh_token: refresh });

      if (!response.data.access_token) { // Check response structure from backend
         throw new Error('Token refresh failed - no access token received');
      }

      const { access_token, refresh_token: new_refresh_token } = response.data;

      // Update tokens
      Cookies.set('auth_token', access_token, { expires: 7 });
      localStorage.setItem('token', access_token);

      if (new_refresh_token) {
        Cookies.set('refresh_token', new_refresh_token, { expires: 30 });
        localStorage.setItem('refresh_token', new_refresh_token);
      }

      return true; // Indicate success
    } catch (error) {
      console.error('Token refresh error:', error);
      logout(); // Logout if refresh fails
      return false; // Indicate failure
    }
  }, [logout]); // Added logout dependency

  // Function to check if user is authenticated (Reverted - checks token presence)
  // Optionally add a call to fetch user data if token exists
  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const token = Cookies.get('auth_token') || localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Basic check: Assume authenticated if token exists.
      // For better UX, you could decode the token client-side (less secure)
      // or make an API call to /users/me to get fresh user data.
      // Let's add the API call for robustness.
      try {
          const userResponse = await authAPI.getCurrentUser(); // Uses api instance with interceptor
          if (userResponse.success && userResponse.data) {
              setUser(userResponse.data);
          } else {
              // Token might be invalid/expired, try refreshing
              const refreshed = await refreshToken();
              if (refreshed) {
                  const refreshedUserResponse = await authAPI.getCurrentUser();
                  if (refreshedUserResponse.success && refreshedUserResponse.data) {
                      setUser(refreshedUserResponse.data);
                  } else {
                      throw new Error("Failed to fetch user after refresh");
                  }
              } else {
                   throw new Error("Refresh token failed");
              }
          }
      } catch (apiError) {
          console.error('Auth check API error:', apiError);
          logout(); // Logout if token is invalid or refresh fails
          return; // Exit checkAuth
      }

    } catch (error) {
      // Catch any other unexpected errors during checkAuth
      console.error('Unexpected error during auth check:', error);
      logout(); // Ensure logout on unexpected errors
    } finally {
        setLoading(false);
    }
  }, [logout, refreshToken]); // Added dependencies

  // Reset password request (Unchanged)
  const requestPasswordReset = async (email) => {
    try {
      const result = await authAPI.requestPasswordReset(email);
      return result;
    } catch (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        error: 'Password reset request failed. Please try again.'
      };
    }
  };

  // Check auth status on component mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Context value (Restored refreshToken)
  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshToken, // Restored
    requestPasswordReset,
    isAuthenticated: !!user,
    checkAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
