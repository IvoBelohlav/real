'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/utils/api'; // Use the named import for the central API instance
import Link from 'next/link';
import styles from './Success.module.css';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function SubscriptionSuccessPage() {
  const { user, isLoading: isAuthLoading, refreshSession } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [embedCode, setEmbedCode] = useState(null);
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [error, setError] = useState(null);
  // Simplified status: 'waiting' (for session refresh), 'ready' (code fetched), 'error'
  const [activationStatus, setActivationStatus] = useState('waiting');
  const [hasFetchedCode, setHasFetchedCode] = useState(false); // Track if fetch attempt was made

  const activeStatuses = ['active', 'trialing'];

  // Function to fetch embed code using the central api instance
  const fetchEmbedCode = useCallback(async () => {
    // Ensure user and api_key are available before fetching
    if (!user?.api_key) {
      console.warn("[SuccessPage] Cannot fetch embed code: User or API key not available yet.");
      // If still waiting for activation via session refresh, don't set error yet.
      if (activationStatus !== 'waiting') {
         setError("Could not fetch embed code due to missing user data. Please refresh or contact support if the issue persists.");
         setActivationStatus('error');
      }
      return;
    }
    // Only fetch once
    if (hasFetchedCode || isLoadingCode) return;

    console.log("[SuccessPage] Attempting to fetch embed code...");
    setIsLoadingCode(true);
    setHasFetchedCode(true); // Mark that we've attempted the fetch
    setError(null);
    try {
      // Use the imported 'api' instance which should have auth interceptors
      const response = await api.get('/api/widget/embed-code');
      setEmbedCode(response.data);
      setActivationStatus('ready'); // Set status to ready only on successful fetch
      console.log("[SuccessPage] Embed code fetched successfully.");
    } catch (err) {
      console.error('[SuccessPage] Error fetching embed code:', err);
      setActivationStatus('error'); // Set status to error on fetch failure
      if (err.response?.status === 401) {
         setError('Authentication error fetching embed code. Please refresh.');
      } else {
         setError('Subscription activated, but failed to load your widget embed code. Please try refreshing or contact support.');
      }
    } finally { // Correctly placed finally block
      setIsLoadingCode(false);
    }
  }, [user?.api_key, activationStatus, hasFetchedCode, isLoadingCode]); // Dependencies updated


  // Effect to check session ID on mount and redirect if missing
  useEffect(() => {
    if (!sessionId) {
      console.warn("[SuccessPage] No session_id found in URL, redirecting to dashboard.");
      router.push('/dashboard');
    }
    // We expect AuthContext to handle session refresh automatically via its interval.
  }, [sessionId, router]);

  // Effect to fetch embed code *after* user data is loaded/refreshed and subscription is active
  useEffect(() => {
    // Wait for auth loading to finish and user data to be available
    if (!isAuthLoading && user) {
      if (activeStatuses.includes(user.subscription_status) && user.api_key) {
        // User is active and has API key, attempt to fetch code if not already done/in error
        if (activationStatus === 'waiting') {
           console.log("[SuccessPage] User session active with API key, fetching embed code.");
           fetchEmbedCode();
        }
      } else if (activeStatuses.includes(user.subscription_status) && !user.api_key) {
         // User is active but API key might still be generating via webhook/backend process
         console.warn("[SuccessPage] Subscription active, but API key not yet available in session. Waiting for next session refresh.");
         // Keep status as 'waiting'
      } else if (activationStatus === 'waiting') {
        // User loaded, but subscription isn't active yet in the session data.
        // This is the expected state while waiting for webhook and session refresh.
        console.log("[SuccessPage] Waiting for subscription activation via webhook and session refresh...");
      }
    } else if (!isAuthLoading && !user && activationStatus !== 'error') {
        // Auth loaded, but no user found - this shouldn't happen if logged in
        console.error("[SuccessPage] Auth loaded but no user session found.");
        setError("User session not found. Please log in again.");
        setActivationStatus('error');
    }
  }, [user, isAuthLoading, activationStatus, fetchEmbedCode]); // Dependencies updated


  // --- Render Logic ---
  // Show loading spinner while AuthContext is loading initial user data
  if (isAuthLoading && activationStatus === 'waiting') {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <LoadingSpinner />
          <p>Loading your account status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.successIcon}>✓</div>
        <h1 className={styles.title}>Subscription Successful!</h1>
        <p className={styles.message}>
          Thank you for subscribing! Your account should activate shortly. Premium features will be unlocked once activation is complete.
        </p>

        <div className={styles.embedSection}>
          {/* Show waiting state while activationStatus is 'waiting' and no error */}
          {activationStatus === 'waiting' && !error && (
            <div className={styles.activatingState}>
              <LoadingSpinner />
              <p>Waiting for account activation... (This may take a moment)</p>
              <p className={styles.subtleMessage}>Your session will refresh automatically once activation is complete.</p>
            </div>
          )}

          {/* Show loading code state specifically when fetching */}
           {activationStatus === 'ready' && isLoadingCode && (
             <div className={styles.activatingState}>
               <LoadingSpinner />
               <p>Loading your widget embed code...</p>
             </div>
           )}

          {/* Show embed code once ready and not loading */}
          {activationStatus === 'ready' && !isLoadingCode && embedCode && (
            <>
              <h2 className={styles.sectionTitle}>Your Widget Embed Code</h2>
              <p className={styles.embedInstructions}>
                Your subscription is active! Copy and paste this code into your website:
              </p>
              <div className={styles.codeBox}>
                <h3 className={styles.codeTitle}>HTML</h3>
                <pre className={styles.code}>{embedCode.html}</pre>
                <button
                  className={styles.copyButton}
                  onClick={() => navigator.clipboard.writeText(embedCode.html)}
                >
                  Copy HTML
                </button>
              </div>
              <div className={styles.codeBox}>
                <h3 className={styles.codeTitle}>JavaScript</h3>
                <pre className={styles.code}>{embedCode.javascript}</pre>
                <button
                  className={styles.copyButton}
                  onClick={() => navigator.clipboard.writeText(embedCode.javascript)}
                >
                  Copy JavaScript
                </button>
              </div>
              <div className={styles.instructionsBox}>
                 <h3 className={styles.instructionsTitle}>Installation Instructions</h3>
                 <ol className={styles.instructionsList}>
                   <li>Add the HTML code where you want the widget to appear.</li>
                   <li>Place the JavaScript code just before the closing {'<'} /body{'>'} tag.</li>
                   <li>The widget will automatically load when your page loads.</li>
                 </ol>
               </div>
            </>
          )}

          {/* Show error state */}
          {activationStatus === 'error' && (
             <div className={styles.errorState}>
               <p className={styles.error}>{error || "An unknown error occurred during activation or code fetching."}</p>
               {/* Provide a way to retry fetching the code if the error was specific to that */}
               {error?.includes("embed code") && (
                  <button onClick={fetchEmbedCode} className={styles.secondaryButton} disabled={isLoadingCode}>
                    {isLoadingCode ? 'Retrying...' : 'Retry Fetching Code'}
                  </button>
               )}
               <p className={styles.subtleMessage}>If the problem persists, please contact support.</p>
             </div>
           )}
        </div>

        <div className={styles.actionsContainer}>
          <Link href="/dashboard" className={styles.primaryButton}>
            Go to Dashboard
          </Link>
          {/* Show configure button only when ready */}
          {activationStatus === 'ready' && !isLoadingCode && embedCode && (
             <Link href="/widget" className={styles.secondaryButton}>
               Configure Widget
             </Link>
          )}
        </div>
      </div>
    </div>
  );
}
