'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { markStripeReturn } from '@/lib/stripeUtils';

export default function PaymentCancelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  
  useEffect(() => {
    // Get session ID from URL if available
    const sessionId = searchParams.get('session_id');
    
    // Mark that we're returning from Stripe
    markStripeReturn(sessionId);
    
    // Store cancellation in localStorage for dashboard to display
    localStorage.setItem('payment_canceled', 'true');
    
    // Set up countdown for redirect
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(timer);
  }, [searchParams, router]);
  
  const handleManualRedirect = () => {
    router.push('/dashboard');
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-yellow-600 mb-2">Payment Cancelled</h1>
          <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        </div>
        
        <p className="text-gray-700 mb-4">
          Your payment was cancelled. No charges were made.
        </p>
        
        <p className="text-gray-500 mb-6">
          Redirecting to dashboard in {countdown} seconds...
        </p>
        
        <button
          onClick={handleManualRedirect}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Return to Dashboard Now
        </button>
      </div>
    </div>
  );
} 