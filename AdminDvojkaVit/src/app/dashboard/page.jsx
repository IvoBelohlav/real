'use client';

import { useState, useEffect } from 'react';
// Removed useSubscription import
// import { useSubscription } from '@/context/SubscriptionContext';
// Use the correct useAuth hook
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import styles from './Dashboard.module.css';
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // Import loading spinner
import { isReturningFromStripe, getCheckoutStatus } from '@/lib/stripeUtils';

export default function DashboardPage() {
  // Get user and loading state from the new AuthContext
  const { user, isLoading, refreshSession } = useAuth();

  // Mock stats - replace with actual data fetching if needed
  // Initialize stats with default values to prevent null reference errors
  const [stats, setStats] = useState({
    conversations: 0,
    widgets: 0,
    domains: 0 
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState(null);

  // Determine subscription status from the user object (allow active or trialing)
  const activeStatuses = ['active', 'trialing'];
  const isSubscribed = user?.subscription_status && activeStatuses.includes(user.subscription_status);
  const subscriptionStatusDisplay = user?.subscription_status ? user.subscription_status.charAt(0).toUpperCase() + user.subscription_status.slice(1) : 'Unknown';
  const subscriptionTierDisplay = user?.subscription_tier ? user.subscription_tier.charAt(0).toUpperCase() + user.subscription_tier.slice(1) : 'Unknown';

  // Add a state for storing widget embed code
  const [embedCode, setEmbedCode] = useState(null);

  // Add this inside the function component
  const [checkoutStatus, setCheckoutStatus] = useState(null);

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        // Check if user is available
        if (!user || !user.id) return;
        
        // You can replace this with an actual API call when ready
        // Example API call:
        // const response = await fetch('/api/dashboard/stats');
        // const data = await response.json();
        // setStats(data);
        
        // For now, use mock data
        setStats({
          conversations: 128, // Mock value
          widgets: user.subscription_status === 'active' ? 1 : 0,
          domains: 0 // This could be fetched from user authorized domains
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        // Keep the default stats on error
      }
    };

    fetchStats();
  }, [user]);

  // Add useEffect to check localStorage for subscription status backup
  useEffect(() => {
    // Retrieve stored subscription data if available 
    const storedStatus = localStorage.getItem('subscription_status');
    const storedTier = localStorage.getItem('subscription_tier');
    
    // Check if we should use stored data as a fallback
    if (storedStatus === 'active' && (!user || user.subscription_status !== 'active')) {
      console.log('Using cached subscription status from localStorage:', storedStatus);
      
      // Create a merged user object with the stored subscription data
      const mergedUser = {
        ...user,
        subscription_status: storedStatus,
        subscription_tier: storedTier || 'premium'
      };
      
      // Apply this merged user data to our UI
      setStats(prevStats => ({
        ...prevStats,
        widgets: 1 // Enable widgets for active subscription
      }));
      
      // Update UI elements directly if they exist
      setTimeout(() => {
        const statusDisplay = document.getElementById('subscription-status-display');
        const statusBadge = document.getElementById('subscription-status-badge');
        const tierDisplay = document.getElementById('subscription-tier-display');
        const widgetStatus = document.getElementById('widget-status-display');
        
        if (statusDisplay) statusDisplay.textContent = 'Active';
        if (tierDisplay) tierDisplay.textContent = 'Premium';
        if (statusBadge) statusBadge.className = `${styles.statusBadge} ${styles.statusActive}`;
        if (widgetStatus) {
          widgetStatus.textContent = 'Enabled';
          widgetStatus.className = `${styles.statsValue} ${styles.active}`;
        }
      }, 100);
    }
  }, [user, styles]);

  // Replace handleRefresh with our new implementation
  const handleRefreshSession = async () => {
    try {
    setIsRefreshing(true);
      setActivationError(null);
      const updatedUser = await refreshSession();
      console.log('Session refreshed successfully:', updatedUser);
      
      // Update UI elements with the latest subscription status
      const statusDisplay = document.getElementById('subscription-status-display');
      const statusBadge = document.getElementById('subscription-status-badge');
      const tierDisplay = document.getElementById('subscription-tier-display');
      
      if (statusDisplay && statusBadge && tierDisplay) {
        // Update subscription status text
        const newStatus = updatedUser?.subscription_status ? 
          updatedUser.subscription_status.charAt(0).toUpperCase() + updatedUser.subscription_status.slice(1) : 'Unknown';
        statusDisplay.textContent = newStatus;
        
        // Update subscription tier text
        const newTier = updatedUser?.subscription_tier ? 
          updatedUser.subscription_tier.charAt(0).toUpperCase() + updatedUser.subscription_tier.slice(1) : 'Unknown';
        tierDisplay.textContent = newTier;
        
        // Update badge styling
        if (updatedUser?.subscription_status === 'active') {
          statusBadge.className = `${styles.statusBadge} ${styles.statusActive}`;
        } else {
          statusBadge.className = `${styles.statusBadge} ${styles.statusInactive}`;
        }
        
        // Update stats if needed
        setStats(prevStats => ({
          ...prevStats,
          widgets: updatedUser.subscription_status === 'active' ? 1 : 0
        }));
        
        // Hide the test activation button and show success message if now active
        if (updatedUser?.subscription_status === 'active') {
          const buttons = document.querySelectorAll('button');
          buttons.forEach(btn => {
            if (btn.textContent.includes('Test Activate Subscription')) {
              btn.style.display = 'none';
            }
          });
        }
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      alert('Failed to refresh session. Please try again.');
    } finally {
    setIsRefreshing(false);
    }
  };

  // Update handleTestActivation to display widget code immediately
  const handleTestActivation = async () => {
    try {
      setIsActivating(true);
      setActivationError(null);
      
      // Call our test activation endpoint
      console.log('Calling test activation endpoint...');
      const response = await fetch('/api/test-activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Get the response body as text first (so we can debug it regardless of format)
      const responseText = await response.text();
      console.log(`Test activation response (${response.status}):`, responseText);
      
      if (response.ok) {
        // Try to parse as JSON if possible
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.warn('Could not parse response as JSON:', e);
          data = { message: 'Activation successful, but response was not valid JSON' };
        }
        
        console.log('Activation successful:', data);
        
        // Store subscription data in localStorage for persistence
        localStorage.setItem('subscription_status', 'active');
        localStorage.setItem('subscription_tier', 'premium');
        localStorage.setItem('has_api_key', data.api_key ? 'true' : 'false');
        
        // Store the widget embed code if available
        if (data.embed_code) {
          setEmbedCode(data.embed_code);
          localStorage.setItem('widget_embed_code', JSON.stringify(data.embed_code));
        }
        
        // Refresh the session without page reload
        console.log('Refreshing session...');
        const updatedUser = await refreshSession();
        console.log('Session refreshed successfully:', updatedUser);
        
        // Force UI update by updating stats based on new subscription status
        setStats(prevStats => ({
          ...prevStats,
          widgets: 1 // Set to 1 for active subscription
        }));
        
        // Update all UI elements
        // 1. Subscription status display
        const statusDisplay = document.getElementById('subscription-status-display');
        const statusBadge = document.getElementById('subscription-status-badge');
        const tierDisplay = document.getElementById('subscription-tier-display');
        
        if (statusDisplay && statusBadge) {
          statusDisplay.textContent = 'Active';
          statusBadge.className = `${styles.statusBadge} ${styles.statusActive}`;
        }
        
        if (tierDisplay) {
          tierDisplay.textContent = 'Premium';
        }
        
        // 2. Widget status display
        const widgetStatus = document.getElementById('widget-status-display');
        if (widgetStatus) {
          widgetStatus.textContent = 'Enabled';
          widgetStatus.className = `${styles.statsValue} ${styles.active}`;
        }
        
        // 3. Hide the test activation button
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
          if (btn.textContent.includes('Test Activate Subscription')) {
            btn.style.display = 'none';
          }
        });
        
        // Show success message
        alert('Subscription activated successfully! Your widget code is now ready.');
      } else {
        // Try to parse the error response as JSON
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          console.warn('Could not parse error response as JSON:', e);
          errorData = { error: responseText || 'Unknown error' };
        }
        
        const errorMessage = errorData.error || errorData.details || `HTTP Error ${response.status}`;
        console.error('Activation failed:', errorMessage, errorData);
        setActivationError(`Activation failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error during activation:', error);
      setActivationError(`Error during activation: ${error.message}`);
    } finally {
      setIsActivating(false);
    }
  };

  // Add a new function to handle debugging
  const handleDebugSession = async () => {
    try {
      console.log('Fetching debug session data...');
      const response = await fetch('/api/debug-session');
      const data = await response.json();
      
      // Log session data to console
      console.log('Session Debug Data:', data);
      
      // Format data for display in alert
      const sessionInfo = [
        `Session Info:`,
        `- Authenticated: ${data.authenticated}`,
        `- Email: ${data.session?.email || 'Not found'}`,
        `- User ID: ${data.session?.userId || 'Not found'}`,
        `- Session expires: ${data.session?.expires || 'N/A'}`
      ].join('\n');
      
      const dbUserInfo = data.databaseUser ? [
        `\nDatabase User:`,
        `- Found by: ${data.databaseUser.foundBy.join(', ')}`,
        `- Email: ${data.databaseUser.email}`,
        `- MongoDB ID: ${data.databaseUser._id}`,
        `- Subscription: ${data.databaseUser.subscription_status} (${data.databaseUser.subscription_tier})`,
        `- API Key: ${data.databaseUser.hasApiKey ? 'Present' : 'Missing'}`,
        `- Stripe Customer ID: ${data.databaseUser.hasStripeCustomerId ? 'Present' : 'Missing'}`,
        `- Stripe Subscription ID: ${data.databaseUser.hasStripeSubscriptionId ? 'Present' : 'Missing'}`
      ].join('\n') : '\nDatabase User: Not found';
      
      // Display results in alert (consider replacing with a modal in the future)
      alert(`${sessionInfo}${dbUserInfo}\n\nFull details in console.`);
    } catch (error) {
      console.error('Error debugging session:', error);
      alert(`Error debugging session: ${error.message}. See console for details.`);
    }
  };

  // Add a useEffect to load embed code from localStorage on component mount
  useEffect(() => {
    // Check if we have stored embed code in localStorage
    const storedEmbedCode = localStorage.getItem('widget_embed_code');
    if (storedEmbedCode) {
      try {
        setEmbedCode(JSON.parse(storedEmbedCode));
      } catch (e) {
        console.error('Failed to parse stored embed code:', e);
      }
    }
  }, []);

  // Replace the Stripe return detection useEffect with this fixed implementation:
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Check if we're returning from Stripe
        if (isReturningFromStripe(window.location.href)) {
          console.log('[Dashboard] Detected return from Stripe checkout');
          
          // Get the status from URL parameters
          const status = getCheckoutStatus(window.location.href);
          setCheckoutStatus(status);
          
          // Remove the query parameters to clean up the URL
          if (window.history && window.history.replaceState) {
            const url = window.location.href.split('?')[0];
            window.history.replaceState({}, document.title, url);
          }
        }
      } catch (error) {
        console.error('[Dashboard] Error detecting Stripe return:', error);
      }
    }
  }, []);

  // Use the isLoading state from useAuth
  if (isLoading) {
    // Use a shared loading spinner component
    return <LoadingSpinner />;
  }

  // Handle case where user data might still be missing after loading (shouldn't happen ideally)
  if (!user) {
     return <p>Error: User data not available. Please try logging in again.</p>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.welcomeBar}>
        <h1 className={styles.welcomeTitle}>
          {/* Use username or email if name is not available */}
          Welcome back, {user.username || user.name || user.email}!
        </h1>
        <p className={styles.welcomeSubtitle}>
          Here's an overview of your widget activity and statistics.
        </p>
      </div>

      {/* Optional: Add a button to manually refresh session data */}
      {/* <button onClick={handleRefresh} disabled={isRefreshing}>
        {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
      </button> */}

      {checkoutStatus && (
        <div className={`mb-4 p-4 rounded ${
          checkoutStatus.status === 'success' 
            ? 'bg-green-100 text-green-800' 
            : checkoutStatus.status === 'canceled' 
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-blue-100 text-blue-800'
        }`}>
          {checkoutStatus.status === 'success' && (
            <p>Your payment was successful! Your subscription should now be active.</p>
          )}
          {checkoutStatus.status === 'canceled' && (
            <p>Your payment was canceled. You can try again when you're ready.</p>
          )}
          {checkoutStatus.status === 'processing' && (
            <p>Your payment is being processed. Your subscription will be updated once complete.</p>
          )}
          {checkoutStatus.status === 'unknown' && (
            <p>You've returned from the payment process. Please check your subscription status.</p>
          )}
        </div>
      )}

      <div className={styles.statsGrid}>
        {/* Subscription Card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <span className={styles.icon}>📊</span>
            Subscription
          </h3>
          <div className={styles.subscriptionStatus}>
            <div id="subscription-status-badge" className={`${styles.statusBadge} ${user?.subscription_status === 'active' ? styles.statusActive : styles.statusInactive}`}>
              <span id="subscription-status-display">{subscriptionStatusDisplay}</span>
          </div>
            <p className={styles.planText}>Plan: <span id="subscription-tier-display">{subscriptionTierDisplay}</span></p>
            
            {/* Show subscribe button only if inactive */}
            {user?.subscription_status !== 'active' && (
              <Link href="/billing" className={styles.subscribeButton}>
               Subscribe Now
             </Link>
          )}
            
            {/* Always show billing link */}
            <Link href="/billing" className={styles.manageBillingLink}>
              Manage Billing
            </Link>
            
            {/* Test activation button */}
            {user?.subscription_status !== 'active' && (
              <button
                onClick={handleTestActivation}
                disabled={isActivating || isRefreshing}
                className="mt-4 w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition duration-200"
              >
                {isActivating ? 'Activating...' : 'Test Activate Subscription'}
              </button>
            )}
            
            {/* Refresh session button */}
            <button
              onClick={handleRefreshSession}
              disabled={isActivating || isRefreshing}
              className="mt-2 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition duration-200"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh Session'}
            </button>
            
            {/* Show error message if activation failed */}
            {activationError && (
              <div className="mt-2 p-3 bg-red-100 text-red-700 rounded text-sm">
                {activationError}
              </div>
            )}
            
            {/* Debug information */}
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
              <p>Status: {user?.subscription_status || 'unknown'}</p>
              <p>Tier: {user?.subscription_tier || 'unknown'}</p>
              <p>API Key: {user?.api_key ? '✓ Present' : '✗ Missing'}</p>
              <p>Customer ID: {user?.stripe_customer_id || user?.stripeCustomerId ? '✓ Present' : '✗ Missing'}</p>
              <p>Subscription ID: {user?.stripe_subscription_id || user?.stripeSubscriptionId ? '✓ Present' : '✗ Missing'}</p>
              <button 
                onClick={handleDebugSession}
                className="mt-2 w-full bg-gray-500 text-white py-1 px-2 rounded text-xs hover:bg-gray-600 transition duration-200"
              >
                Debug Session
              </button>
            </div>
          </div>
        </div>

         {/* Conversations Card */}
         <div className={styles.statsCard}>
           <div className={styles.statsHeader}>
             <span className={styles.statsIcon}>💬</span>
             <h2 className={styles.statsTitle}>Total Conversations</h2>
           </div>
           <div className={styles.statsValue}>
             {stats.conversations} {/* Replace with actual data later */}
           </div>
           {/* Link to admin conversations if admin, otherwise maybe different view? */}
           <Link href="/admin/conversations" className={styles.statsLink}>
             View Conversations
           </Link>
         </div>

         {/* Widgets Card - Simplified to 1 widget */}
         <div className={styles.statsCard}>
           <div className={styles.statsHeader}>
             <span className={styles.statsIcon}>🔌</span>
             <h2 className={styles.statsTitle}>Widget Status</h2>
           </div>
           <div id="widget-status-display" className={`${styles.statsValue} ${isSubscribed ? styles.active : styles.inactive}`}>
             {isSubscribed ? 'Enabled' : 'Disabled'}
           </div>
           <Link href="/widget" className={styles.statsLink}>
             Configure Widget
           </Link>
         </div>

         {/* Domains Card */}
         <div className={styles.statsCard}>
           <div className={styles.statsHeader}>
             <span className={styles.statsIcon}>🌐</span>
             <h2 className={styles.statsTitle}>Authorized Domains</h2>
           </div>
           <div className={styles.statsValue}>
             {stats.domains} {/* Update if user.authorized_domains is populated */}
           </div>
           {/* Link to domain management page */}
           <Link href="/widget/domains" className={styles.statsLink}>
             Manage Domains
           </Link>
         </div>
      </div>

      {/* Widget Installation Section - Updated Logic */}
      <div className={styles.widgetInstallSection}>
        <h2 className={styles.sectionTitle}>Widget Installation</h2>
        {/* Use updated isSubscribed check with localStorage fallback */}
        {(isSubscribed || localStorage.getItem('subscription_status') === 'active') && (user?.api_key || localStorage.getItem('has_api_key') === 'true') ? (
          // If subscribed (active/trialing) and has API key, link to installation page
          <Link href="/dashboard/installation" className={styles.widgetConfigCard}>
             <h3 className={styles.widgetConfigTitle}>Get Embed Code</h3>
             <p className={styles.widgetConfigDesc}>
               View instructions and copy the code snippet to install the widget on your website.
             </p>
             <span className={styles.widgetConfigArrow}>→</span>
           </Link>
        ) : (
          <div className={styles.subscriptionRequired}>
            <div className={styles.lockIcon}>🔒</div>
            <h3 className={styles.lockedTitle}>This feature requires an active subscription</h3>
            <p className={styles.lockedDesc}>
              Your widget installation code will be available after subscribing to a plan.
            </p>
            <Link href="/checkout" className={styles.upgradeButton}>
              Subscribe Now
            </Link>
          </div>
        )}
      </div>

      <div className={styles.quickLinksSection}>
        <h2 className={styles.sectionTitle}>Quick Links</h2>
        
        <div className={styles.quickLinksGrid}>
          <Link href={isSubscribed || localStorage.getItem('subscription_status') === 'active' ? "/widget" : "/checkout"} 
                className={`${styles.quickLinkCard} ${isSubscribed || localStorage.getItem('subscription_status') === 'active' ? '' : styles.lockedFeature}`}>
            <span className={styles.quickLinkIcon}>{isSubscribed || localStorage.getItem('subscription_status') === 'active' ? '🔧' : '🔒'}</span>
            <div className={styles.quickLinkContent}>
              <h3 className={styles.quickLinkTitle}>Widget Configuration</h3>
              <p className={styles.quickLinkDesc}>
                {isSubscribed || localStorage.getItem('subscription_status') === 'active' 
                  ? "Customize appearance, behavior, and advanced settings" 
                  : "Subscribe to access widget configuration options"}
              </p>
            </div>
          </Link>
          
          <Link href="/dashboard/billing" className={styles.quickLinkCard}>
            <span className={styles.quickLinkIcon}>💳</span>
            <div className={styles.quickLinkContent}>
              <h3 className={styles.quickLinkTitle}>Billing & Subscription</h3>
              <p className={styles.quickLinkDesc}>
                View plans, manage payment methods, and billing history
              </p>
            </div>
          </Link>
          
          <Link href={isSubscribed || localStorage.getItem('subscription_status') === 'active' ? "/dashboard/domains" : "/checkout"} 
                className={`${styles.quickLinkCard} ${isSubscribed || localStorage.getItem('subscription_status') === 'active' ? '' : styles.lockedFeature}`}>
            <span className={styles.quickLinkIcon}>{isSubscribed || localStorage.getItem('subscription_status') === 'active' ? '🌐' : '🔒'}</span>
            <div className={styles.quickLinkContent}>
              <h3 className={styles.quickLinkTitle}>Domain Management</h3>
              <p className={styles.quickLinkDesc}>
                {isSubscribed || localStorage.getItem('subscription_status') === 'active' 
                  ? "Control which domains can use your widget for enhanced security" 
                  : "Subscribe to access domain management features"}
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Display widget embed code if available */}
      {(embedCode || isSubscribed) && (
        <div className={styles.embedCodeSection}>
          <h2 className={styles.sectionTitle}>Your Widget Embed Code</h2>
          {embedCode ? (
            <>
              <p className={styles.embedInstructions}>
                Copy and paste this code into your website:
              </p>
              <div className={styles.codeBox}>
                <h3 className={styles.codeTitle}>HTML</h3>
                <pre className={styles.code}>{embedCode.html}</pre>
                <button
                  className={styles.copyButton}
                  onClick={() => {
                    navigator.clipboard.writeText(embedCode.html);
                    alert('HTML code copied to clipboard!');
                  }}
                >
                  Copy HTML
                </button>
              </div>
              <div className={styles.codeBox}>
                <h3 className={styles.codeTitle}>JavaScript</h3>
                <pre className={styles.code}>{embedCode.javascript}</pre>
                <button
                  className={styles.copyButton}
                  onClick={() => {
                    navigator.clipboard.writeText(embedCode.javascript);
                    alert('JavaScript code copied to clipboard!');
                  }}
                >
                  Copy JavaScript
                </button>
              </div>
              <div className={styles.instructionsBox}>
                <h3 className={styles.instructionsTitle}>Installation Instructions</h3>
                <ol className={styles.instructionsList}>
                  <li>Add the HTML code where you want the widget to appear</li>
                  <li>Place the JavaScript code just before the closing &lt;/body&gt; tag</li>
                  <li>The widget will automatically load when your page loads</li>
                </ol>
              </div>
            </>
          ) : (
            <div className={styles.loadingContainer}>
              <p>Loading your widget code...</p>
              <Link href="/widget" className={styles.configButton}>
                Configure Widget
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
