'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchApi } from '@/lib/api'; // Assuming fetchApi handles errors
import { useRouter } from 'next/navigation'; // Import useRouter
import { User } from '@/types'; // Import the User type

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter(); // Initialize router

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // --- IMPORTANT ---
      // FastAPI's default OAuth2PasswordRequestForm expects form data, not JSON.
      // We need to send data as 'application/x-www-form-urlencoded'.
      const formData = new URLSearchParams();
      formData.append('username', email); // FastAPI uses 'username' field for email by default
      formData.append('password', password);

      // Corrected endpoint to /api/auth/login
      const loginResponse = await fetchApi('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      // Login response contains tokens and api_key
      const { access_token, refresh_token, api_key } = loginResponse; // Destructure login response

      if (!access_token) {
          setError('Login failed: Missing access token from server response.');
          setIsLoading(false);
          return;
      }
       if (!api_key) {
           setError('Login failed: API key missing from server response.');
           setIsLoading(false);
           return;
       }

      // --- Step 2: Fetch user data using the access token ---
      try {
          // Store token temporarily to use it for the next fetch
          localStorage.setItem('authToken', access_token); // Store token to be used by fetchApi

          const userData: User = await fetchApi('/api/users/me'); // Fetch user details

          if (userData) {
              // --- Step 3: Call auth context login ---
              login(userData, access_token, api_key); // Pass fetched user data, token, and api_key
              router.push('/dashboard'); // Redirect to dashboard on successful login
          } else {
              setError('Login failed: Could not retrieve user details after login.');
              localStorage.removeItem('authToken'); // Clean up stored token if user fetch fails
          }
      } catch (userFetchError: any) {
          console.error('Failed to fetch user data after login:', userFetchError);
          setError(`Login succeeded but failed to fetch user details: ${userFetchError.message}`);
          localStorage.removeItem('authToken'); // Clean up stored token
      }

    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email address
        </label>
        <div className="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <div className="mt-1">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Add remember me and forgot password later if needed */}

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
    </form>
  );
}
