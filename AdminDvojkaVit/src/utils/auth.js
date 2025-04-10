import api from './api';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // Correct named import
import Cookies from 'js-cookie'; // Import js-cookie

/**
 * Logs in a user with the given credentials
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const login = async (email, password) => {
  try {
    console.log(`Attempting login for: ${email}`);
    
    // Format credentials for FastAPI OAuth2 form request
    const formData = new URLSearchParams();
    formData.append('username', email); // FastAPI OAuth2 expects 'username'
    formData.append('password', password);
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    console.log(`Using API URL: ${apiUrl}`);
    
    // Direct fetch to avoid interceptors during login
    const response = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    console.log(`Login response status: ${response.status}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Login failed:', errorData);
      throw new Error(errorData.detail || `Login failed with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Login successful, received tokens:', data);
    
    // Store the tokens
    if (data.access_token) {
      localStorage.setItem('authToken', data.access_token);
      // Also set the cookie for middleware
      Cookies.set('auth_token', data.access_token, { expires: 7, path: '/' }); // Example: 7-day expiry
      console.log(`Access token stored (${data.access_token.slice(0, 10)}...) and cookie set`);
      
      if (data.refresh_token) {
        localStorage.setItem('refreshToken', data.refresh_token);
        console.log(`Refresh token stored (${data.refresh_token.slice(0, 10)}...)`);
      }
      
      // Store token_type if provided (usually 'bearer')
      if (data.token_type) {
        localStorage.setItem('tokenType', data.token_type);
        console.log(`Token type stored: ${data.token_type}`);
      }
      
      // After login, fetch the API key for the admin user
      console.log('Attempting to fetch API key after login...');
      const apiKeyFetched = await getAndStoreApiKey();
      console.log(`API key fetch status after login: ${apiKeyFetched}`);
      
      console.log('Tokens stored in localStorage');
      return { success: true };
    } else {
      console.error('No access token received from server');
      throw new Error('No access token received from server');
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message || 'Authentication failed' };
  }
};

/**
 * Fetch and store the API key for the currently logged in user
 * This is needed for accessing product-related endpoints that use API key auth
 */
export const getAndStoreApiKey = async () => {
  try {
    // We need to make an authenticated request to get the user's API key
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      console.error('No auth token available to fetch API key');
      return false;
    }
    
    const tokenType = getTokenType();
    
    // Fetch the user profile which should contain the API key
    const response = await fetch(`${apiUrl}/api/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `${tokenType} ${token}`,
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch user profile: ${response.status}`);
      return false;
    }
    
    const userData = await response.json();
    console.log('User profile fetched:', userData);
    
    if (userData.api_key) {
      localStorage.setItem('apiKey', userData.api_key);
      console.log(`API key stored: ${userData.api_key.slice(0, 5)}...`);
      return true;
    } else {
      console.error('No API key found in user profile');
      return false;
    }
  } catch (error) {
    console.error('Error fetching API key:', error);
    return false;
  }
};

/**
 * Gets the API key from local storage
 * @returns {string|null}
 */
export const getApiKey = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  return localStorage.getItem('apiKey');
};

/**
 * Logs out the current user
 */
export const logout = () => {
  if (typeof window !== 'undefined') {
    console.log('Logging out user, removing tokens and cookie');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenType');
    localStorage.removeItem('apiKey');
    // Remove the cookie for middleware
    Cookies.remove('auth_token', { path: '/' });
    
    // Redirect to widget page instead of login
    // window.location.href = '/widget'; // Commented out to prevent forced redirect on logout
  }
};

/**
 * Checks if the user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.log('isAuthenticated check: No token found');
    return false;
  }
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000; // Convert to seconds
    if (decoded.exp < currentTime) {
      console.log('isAuthenticated check: Token expired');
      // Optionally: Clear expired token here? Or let refresh handle it.
      // logout(); // Be careful with side effects here
      return false;
    }
    console.log('isAuthenticated check: Token exists and is not expired');
    return true;
  } catch (error) {
    console.error('isAuthenticated check: Error decoding token:', error);
    return false;
  }
};

/**
 * Gets the current authentication token
 * @returns {string|null}
 */
export const getToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const token = localStorage.getItem('authToken');
  return token;
};

/**
 * Gets user information from the JWT token
 * @returns {Object|null} User information or null if no token exists
 */
export const getUserInfo = () => {
  try {
    const token = getToken();
    if (!token) {
      console.log('getUserInfo: No token available');
      return null;
    }

    // Decode the token to get user info
    const decoded = jwtDecode(token); // Use correct named import function
    console.log('getUserInfo: Decoded token payload:', decoded);

    // Return user information from the token
    return {
      id: decoded.user_id,
      email: decoded.email,
      subscription_status: decoded.subscription_status || 'inactive',
      subscription_tier: decoded.subscription_tier || 'free'
    };
  } catch (error) {
    console.error('getUserInfo: Error decoding token:', error);
    return null;
  }
};

/**
 * Gets the current token type (usually 'bearer')
 * @returns {string}
 */
export const getTokenType = () => {
  if (typeof window === 'undefined') {
    return 'bearer'; // Default
  }
  
  return localStorage.getItem('tokenType') || 'bearer';
};

/**
 * Refresh the JWT token
 * @returns {Promise<boolean>} Success or failure
 */
export const refreshToken = async () => {
  console.log('Attempting to refresh token');
  
  const currentRefreshToken = localStorage.getItem('refreshToken');
  
  if (!currentRefreshToken) {
    console.error('No refresh token available');
    return false;
  }
  
  console.log(`Using refresh token: ${currentRefreshToken.slice(0, 10)}...`);
  
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    console.log(`Making refresh request to: ${apiUrl}/api/auth/refresh`);
    
    const response = await fetch(`${apiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: currentRefreshToken }),
      credentials: 'omit' // Don't send or receive cookies
    });
    
    console.log(`Refresh token response status: ${response.status}`);
    
    if (!response.ok) {
      console.error(`Failed to refresh token, status: ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    console.log('Received new tokens from refresh:', data);
    
    if (data.access_token) {
      console.log(`Storing new access token: ${data.access_token.slice(0, 10)}...`);
      localStorage.setItem('authToken', data.access_token);
      // Also update the cookie for middleware
      Cookies.set('auth_token', data.access_token, { expires: 7, path: '/' }); // Example: 7-day expiry
      
      if (data.refresh_token) {
        console.log(`Storing new refresh token: ${data.refresh_token.slice(0, 10)}...`);
        localStorage.setItem('refreshToken', data.refresh_token);
      }
      
      // Store token_type if provided (usually 'bearer')
      if (data.token_type) {
        localStorage.setItem('tokenType', data.token_type);
        console.log(`Token type stored: ${data.token_type}`);
      }
      
      return true;
    }
    
    console.error('No access token in refresh response');
    return false;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
};

/**
 * Hook for managing authentication state in components
 * @returns {{ isAuthenticated: boolean, isApiKeyReady: boolean, login: Function, logout: Function, refreshToken: Function, getApiKey: Function }}
 */
export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isApiKeyReady, setIsApiKeyReady] = useState(false); // Add state for API key readiness
  const router = useRouter();
  
  useEffect(() => {
    const checkAuthStatus = async () => { // Make async
      const authenticated = isAuthenticated();
      console.log(`useAuth hook: user is ${authenticated ? 'authenticated' : 'not authenticated'}`);
      setIsLoggedIn(authenticated);
      // Also check if API key exists in storage when authenticated
      if (authenticated) {
        const key = getApiKey();
        if (key) {
          console.log('useAuth hook: API key found in storage.');
          setIsApiKeyReady(true);
        } else {
          // Attempt to fetch it if authenticated but key not ready
          console.log('useAuth hook: Authenticated but API key not ready, attempting fetch...');
          const fetched = await getAndStoreApiKey(); // Use the existing function
          setIsApiKeyReady(fetched);
          console.log(`useAuth hook: API key fetch attempt result: ${fetched}`);
        }
      } else {
        setIsApiKeyReady(false); // Not authenticated, so API key is not ready
      }
    };
    
    // Check immediately
    checkAuthStatus();
    
    // Set up a listener for storage events to handle cross-tab authentication
    const handleStorageChange = (e) => {
      if (e.key === 'authToken') {
        checkAuthStatus();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  const loginUser = async (email, password) => {
    console.log(`useAuth hook: logging in user ${email}`);
    const result = await login(email, password); // login now calls getAndStoreApiKey internally
    
    if (result.success) {
      console.log('useAuth hook: login successful');
      setIsLoggedIn(true);
      // API key should be stored by login function, update state
      const keyStored = !!getApiKey(); 
      setIsApiKeyReady(keyStored); 
      console.log(`useAuth hook: API key ready status after login: ${keyStored}`);
      return { success: true };
    }
    
    console.error('useAuth hook: login failed', result.error);
    return { success: false, error: result.error };
  };
  
  const logoutUser = () => {
    console.log('useAuth hook: logging out user');
    logout();
    setIsLoggedIn(false);
    setIsApiKeyReady(false); // Reset API key status on logout
    // Redirect to login page for consistency with interceptor
    router.push('/auth/login'); 
  };
  
  return {
    isAuthenticated: isLoggedIn,
    isApiKeyReady: isApiKeyReady, // Expose API key status
    login: loginUser,
    logout: logoutUser,
    refreshToken,
    getApiKey
  };
};

export default { 
  login, 
  logout, 
  isAuthenticated, 
  getToken, 
  getTokenType, 
  refreshToken, 
  useAuth, 
  getApiKey, 
  getAndStoreApiKey,
  getUserInfo 
};
