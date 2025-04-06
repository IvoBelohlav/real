'use client';

import React, { useState } from 'react';
import { fetchApi } from '@/lib/api';
// import { useRouter } from 'next/navigation'; // Import if redirecting after registration

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState(''); // Add username state
  const [companyName, setCompanyName] = useState(''); // Add company name state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // const router = useRouter(); // Initialize router if needed for redirect

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      // Use correct endpoint /api/auth/register and send all required fields
      const response = await fetchApi('/api/auth/register', { // Correct endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Include username and company_name
        body: JSON.stringify({ email, username, password, company_name: companyName }),
      });

      // Assuming successful registration returns a success message
      console.log('Registration successful:', response);
      setSuccessMessage('Registration successful! Please check your email to verify your account.');
      setEmail('');
      setUsername(''); // Clear username
      setCompanyName(''); // Clear company name
      setPassword('');
      setConfirmPassword('');
      // Optionally redirect to login page or a success page
      // router.push('/login?registered=true');

    } catch (err: any) {
      console.error('Registration failed:', err);
      // Check if the error response has specific details
      const detail = err.response?.data?.detail || err.message;
      setError(detail || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {successMessage && <p className="text-green-600 text-sm">{successMessage}</p>}
      <div>
        <label
          htmlFor="email-register" // Use unique id
          className="block text-sm font-medium text-gray-700"
        >
          Email address
        </label>
        <div className="mt-1">
          <input
            id="email-register"
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

       {/* Username Field */}
       <div>
        <label
          htmlFor="username-register"
          className="block text-sm font-medium text-gray-700"
        >
          Username
        </label>
        <div className="mt-1">
          <input
            id="username-register"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={isLoading}
          />
        </div>
      </div>

       {/* Company Name Field */}
       <div>
        <label
          htmlFor="company-name-register"
          className="block text-sm font-medium text-gray-700"
        >
          Company Name (Optional)
        </label>
        <div className="mt-1">
          <input
            id="company-name-register"
            name="companyName"
            type="text"
            autoComplete="organization"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={isLoading}
          />
        </div>
      </div>


      <div>
        <label
          htmlFor="password-register" // Use unique id
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <div className="mt-1">
          <input
            id="password-register"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={isLoading}
          />
        </div>
      </div>

       <div>
        <label
          htmlFor="confirm-password"
          className="block text-sm font-medium text-gray-700"
        >
          Confirm Password
        </label>
        <div className="mt-1">
          <input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </div>
    </form>
  );
}
