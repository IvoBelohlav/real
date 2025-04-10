'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { markStripeReturn } from '@/lib/stripeUtils';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Processing your payment...');
  const { fetchCurrentUser, refreshSession } = useAuth();
  
  useEffect(() => {
    async function handlePaymentSuccess() {
      try {
        // Get session ID from URL if available
        const sessionId = searchParams.get('session_id');
        
        // Mark that we're returning from Stripe
        markStripeReturn(sessionId);
        
        // Display a message about processing
        setMessage('Payment successful! Updating your subscription status...');
        
        // Attempt to refresh user data
        if (refreshSession) {
          await refreshSession();
        } else if (fetchCurrentUser) {
          const token = localStorage.getItem('token');
          if (token) {
            await fetchCurrentUser(token);
          }
        }
        
        // Set success flag and redirect after a short delay
        setMessage('Payment complete! Redirecting to dashboard...');
        localStorage.setItem('payment_success', 'true');
        
        // Redirect to dashboard after a short delay to ensure user sees success message
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } catch (error) {
        console.error('Error handling payment success:', error);
        setMessage('There was an issue processing your payment status. Redirecting to dashboard...');
        
        // Still redirect to dashboard after a failure, just with a slightly longer delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      }
    }
    
    handlePaymentSuccess();
  }, [searchParams, router, refreshSession, fetchCurrentUser]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h1>
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        </div>
        
        <p className="text-gray-700 mb-4">{message}</p>
        
        <div className="mt-4">
          <LoadingSpinner size="sm" />
        </div>
        
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
} 