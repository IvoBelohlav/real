'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../components/layout/AuthProvider';
import { getStripe, createCheckoutSession, createPortalSession, getSubscription } from '../../lib/stripe';
import { apiGet } from '../../lib/api-helpers';
import { testSubscriptionApi } from '../../lib/api-test';
import axios from 'axios';
import styles from './Billing.module.css';

export default function Billing() {
  const [plans, setPlans] = useState([
    {
      id: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID || 'price_1S0M6wR4qkxDUOaXBCa9bDaO',
      name: 'Premium Plan',
      price: 2500,
      currency: 'Kč',
      interval: 'month',
      maxWidgets: 10,
      maxDomains: 'Unlimited',
      maxConversations: 10000,
      advancedCustomization: true,
      prioritySupport: true,
      description: 'Complete solution for your website with unlimited widgets and domains.',
      highlight: true
    }
  ]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [stripeAvailable, setStripeAvailable] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [apiTestResults, setApiTestResults] = useState(null);
  const [testingApi, setTestingApi] = useState(false);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is still authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to view subscription information.');
        router.push('/auth/login'); // Redirect to login if not authenticated
        return;
      }
      
      // Check if Stripe is available on the backend
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const stripeStatusResponse = await apiGet(`${apiUrl}/api/payments/stripe-status`);
        
        if (!stripeStatusResponse.ok) {
          throw new Error(`HTTP error! status: ${stripeStatusResponse.status}`);
        }
        
        const stripeStatus = await stripeStatusResponse.json();
        
        if (stripeStatus.status === 'error') {
          setStripeAvailable(false);
          setError(stripeStatus.message || 'Stripe is not configured correctly on the server');
        } else {
          setStripeAvailable(true);
        }
      } catch (stripeCheckError) {
        console.error('Error checking Stripe status:', stripeCheckError);
        setStripeAvailable(false);
        setError('Unable to verify Stripe configuration. Subscription features may not work.');
      }
      
      // Fetch current subscription
      try {
        const subscription = await getSubscription();
        console.log('Subscription data:', subscription);
        setSubscription(subscription);
      } catch (subError) {
        console.error('Error fetching subscription:', subError);
        if (subError.message && subError.message.includes('401')) {
          setError('Your session has expired. Please log in again.');
          localStorage.removeItem('token');
          router.push('/auth/login');
        } else {
          setError('Failed to load subscription data. Please try again.');
        }
      }
    } catch (err) {
      console.error('Subscription fetch error:', err);
      setError('Failed to load subscription data. Please try again.');
      
      // Handle authentication errors
      if (err.message && err.message.includes('401')) {
        router.push('/auth/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for success or canceled URL parameters
    const successParam = searchParams.get('success');
    const canceledParam = searchParams.get('canceled');

    if (successParam === 'true') {
      setSuccess('Your subscription was successfully processed!');
    } else if (canceledParam === 'true') {
      setError('Subscription process was canceled. Please try again if you wish to subscribe.');
    }

    // Only fetch subscription data if user is authenticated
    if (user && user.authenticated) {
      fetchSubscriptionData();
    } else {
      setLoading(false);
    }
  }, [user, searchParams]);

  const handleSubscribe = async (priceId, plan) => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to subscribe.');
        router.push('/auth/login');
        return;
      }
      
      // Check if Stripe is available
      if (!stripeAvailable) {
        setError('Stripe is not configured correctly on the server. Subscription features are unavailable.');
        return;
      }
      
      // Instead of making an API call directly, redirect to our checkout page
      // This approach avoids issues with token refresh and authentication
      router.push(`/checkout?plan=${encodeURIComponent(priceId)}&name=${encodeURIComponent(plan.name)}&price=${encodeURIComponent(plan.price)}&interval=${encodeURIComponent(plan.interval)}&currency=${encodeURIComponent(plan.currency || '$')}`);
      
    } catch (err) {
      setError(`Failed to initiate subscription: ${err.message}`);
      console.error('Subscription error:', err);
    }
  };

  const handleManageSubscription = async () => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to manage your subscription.');
        router.push('/auth/login');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      // Create portal session
      try {
        const { url } = await createPortalSession();
        
        // Redirect to Stripe portal
        window.location.href = url;
      } catch (portalError) {
        console.error('Portal error:', portalError);
        
        // Handle authentication errors
        if (portalError.message && portalError.message.includes('401')) {
          setError('Your session has expired. Please log in again.');
          localStorage.removeItem('token');
          router.push('/auth/login');
        } else {
          setError('Failed to open subscription management portal. Please try again.');
        }
      }
    } catch (err) {
      setError('Failed to open subscription management portal. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApiTest = async () => {
    try {
      setTestingApi(true);
      setError(null);
      
      const results = await testSubscriptionApi();
      setApiTestResults(results);
      
      if (!results.success) {
        setError(results.message);
      }
    } catch (err) {
      console.error('API test error:', err);
      setError(`API test failed: ${err.message}`);
    } finally {
      setTestingApi(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getFeatureList = (plan) => {
    const features = [
      `${plan.maxWidgets} widget${plan.maxWidgets !== 1 ? 's' : ''}`,
      `${plan.maxDomains} authorized domain${plan.maxDomains !== 'Unlimited' && plan.maxDomains !== 1 ? 's' : ''}`,
      `${plan.maxConversations} conversation${plan.maxConversations !== 1 ? 's' : ''} per month`,
    ];
    
    if (plan.advancedCustomization) {
      features.push('Advanced customization options');
    }
    
    if (plan.prioritySupport) {
      features.push('Priority support');
    }
    
    return features;
  };

  const getCurrentPlanDetails = () => {
    if (!subscription) return null;
    
    // Check if this is a "real" subscription and not mock data
    // by verifying it has a proper Stripe subscription ID (starts with "sub_")
    if (!subscription.id || !subscription.id.startsWith('sub_')) {
      return null;
    }
    
    const planId = subscription.items?.data[0]?.price?.id;
    if (!planId) return null;
    
    const matchingPlan = plans.find(plan => plan.id === planId);
    if (!matchingPlan) return null;
    
    return {
      ...matchingPlan,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
    };
  };

  if (loading) {
    return <div className={styles.loading}>Loading subscription data...</div>;
  }

  const currentPlan = getCurrentPlanDetails();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Billing & Subscription</h1>
      
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}
      {!stripeAvailable && !error && (
        <div className={styles.error}>
          Stripe payment processing is not configured. Subscription functionality is limited.
        </div>
      )}
      
      {/* Debug section */}
      <div className={styles.debugSection}>
        <button 
          className={styles.debugButton}
          onClick={handleApiTest}
          disabled={testingApi}
        >
          {testingApi ? 'Testing API...' : 'Test API Connectivity'}
        </button>
        
        {apiTestResults && (
          <div className={styles.testResults}>
            <h4>API Test Results:</h4>
            <p className={apiTestResults.success ? styles.success : styles.error}>
              {apiTestResults.message}
            </p>
            <div className={styles.testDetails}>
              {apiTestResults.tests.map((test, index) => (
                <div key={index} className={styles.testItem}>
                  <p><strong>Endpoint:</strong> {test.endpoint}</p>
                  <p className={test.success ? styles.success : styles.error}>
                    <strong>Status:</strong> {test.success ? 'Success' : 'Failed'} 
                    {test.status && ` (${test.status})`}
                    {test.expectedStatuses && ` - Expected: ${test.expectedStatuses.join(' or ')}`}
                  </p>
                  {test.error && <p><strong>Error:</strong> {test.error}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {currentPlan && (
        <div className={styles.currentPlan}>
          <h2 className={styles.subtitle}>Your Current Plan</h2>
          <div className={styles.planInfo}>
            <div className={styles.planDetails}>
              <h3 className={styles.planName}>{currentPlan.name}</h3>
              <p className={styles.planPrice}>
                {currentPlan.currency === 'Kč' ? `${currentPlan.price} ${currentPlan.currency}` : `$${currentPlan.price}`} <span className={styles.interval}>/ {currentPlan.interval}</span>
              </p>
              
              <div className={styles.statusInfo}>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>Status:</span>
                  <span className={`${styles.statusValue} ${styles[currentPlan.status]}`}>
                    {currentPlan.status.charAt(0).toUpperCase() + currentPlan.status.slice(1)}
                  </span>
                </div>
                
                {currentPlan.currentPeriodEnd && (
                  <div className={styles.statusItem}>
                    <span className={styles.statusLabel}>Current period ends:</span>
                    <span className={styles.statusValue}>
                      {formatDate(currentPlan.currentPeriodEnd)}
                    </span>
                  </div>
                )}
              </div>
              
              <button
                className={styles.manageButton}
                onClick={handleManageSubscription}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Manage Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className={styles.availablePlans}>
        <h2 className={styles.subtitle}>
          {currentPlan ? 'Available Plans' : 'Choose a Plan'}
        </h2>
        
        <div className={styles.plansGrid}>
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`${styles.planCard} ${plan.highlight ? styles.highlightedPlan : ''}`}
            >
              {plan.highlight && <div className={styles.popularBadge}>Most Popular</div>}
              <h3 className={styles.planName}>{plan.name}</h3>
              <p className={styles.planPrice}>
                {plan.currency === 'Kč' ? `${plan.price} ${plan.currency}` : `$${plan.price}`} <span className={styles.interval}>/ {plan.interval}</span>
              </p>
              <p className={styles.planDescription}>{plan.description}</p>
              
              <ul className={styles.features}>
                {getFeatureList(plan).map((feature, index) => (
                  <li key={index} className={styles.feature}>
                    <span className={styles.checkmark}>✓</span> {feature}
                  </li>
                ))}
              </ul>
              
              <div className={styles.pricing}>
                <div className={styles.totalRow}>
                  <span>Subtotal</span>
                  <span>{plan.currency === 'Kč' ? `${plan.price} ${plan.currency}` : `$${plan.price}`} /{plan.interval}</span>
                </div>
                
                <div className={styles.totalRow}>
                  <span>Tax</span>
                  <span>Included</span>
                </div>
                
                <div className={`${styles.totalRow} ${styles.finalTotal}`}>
                  <span>Total</span>
                  <span>{plan.currency === 'Kč' ? `${plan.price} ${plan.currency}` : `$${plan.price}`} /{plan.interval}</span>
                </div>
              </div>
              
              <button
                className={styles.subscribeButton}
                onClick={() => handleSubscribe(plan.id, plan)}
                disabled={subscribing || (currentPlan && currentPlan.id === plan.id) || !stripeAvailable}
              >
                {subscribing ? 'Subscribing...' : 
                 (currentPlan && currentPlan.id === plan.id) ? 'Current Plan' : 
                 !stripeAvailable ? 'Unavailable' : 'Subscribe'}
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className={styles.paymentHistory}>
        <h2 className={styles.subtitle}>Payment History</h2>
        <p className={styles.historyLink}>
          <a href="/invoices" className={styles.link}>
            View your invoices and payment history →
          </a>
        </p>
      </div>
    </div>
  );
} 