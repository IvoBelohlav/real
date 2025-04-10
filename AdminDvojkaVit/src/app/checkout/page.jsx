'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Corrected import path
import axios from 'axios';
import styles from './Checkout.module.css';

export default function CheckoutPage() {
  const { user, isLoading } = useAuth();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [priceId, setPriceId] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Fetch or create a price when the component mounts
    const fetchPrice = async () => {
      try {
        // Try to fetch existing prices first
        const pricesResponse = await axios.get('/api/payments/prices');
        
        if (pricesResponse.data.prices && pricesResponse.data.prices.length > 0) {
          // Use the first available price
          setPriceId(pricesResponse.data.prices[0].id);
          console.log('Using existing price:', pricesResponse.data.prices[0]);
        } else {
          // If no prices exist, create a new one
          const createResponse = await axios.get('/api/payments/create-price');
          if (createResponse.data.success) {
            setPriceId(createResponse.data.price.id);
            console.log('Created new price:', createResponse.data.price);
          }
        }
      } catch (error) {
        console.error('Error fetching/creating price:', error);
        setErrorMessage('Failed to initialize checkout. Please try again later.');
      }
    };

    fetchPrice();
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    
    if (!priceId) {
      setErrorMessage('Price not available. Please try again later.');
      return;
    }

    setIsCreatingSession(true);
    setErrorMessage('');
    
    try {
      const response = await axios.post('/api/payments/create-session', {
        priceId,
        email: user?.email || '',
      });
      
      if (response.data.success && response.data.url) {
        window.location.href = response.data.url;
      } else {
        setErrorMessage('Failed to create checkout session. Please try again.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setErrorMessage(`Failed to create checkout session: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsCreatingSession(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading subscription details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Complete Your Subscription</h1>
        {errorMessage && <div className={styles.error}>{errorMessage}</div>}
      </div>
      
      <div className={styles.checkoutContainer}>
        <div className={styles.orderSummary}>
          <h2 className={styles.sectionTitle}>Order Summary</h2>
          <div className={styles.planCard}>
            <div className={styles.planHeader}>
              <h3 className={styles.planName}>Premium Plan</h3>
              <div className={styles.planPricing}>
                <span className={styles.planPrice}>2500 Kč</span>
                <span className={styles.planInterval}>/month</span>
              </div>
            </div>
            
            <div className={styles.planFeatures}>
              <div className={styles.planFeature}>
                <span className={styles.featureIcon}>✓</span>
                <span>Unlimited widgets for your website</span>
              </div>
              <div className={styles.planFeature}>
                <span className={styles.featureIcon}>✓</span>
                <span>Multiple domains support</span>
              </div>
              <div className={styles.planFeature}>
                <span className={styles.featureIcon}>✓</span>
                <span>Advanced analytics & insights</span>
              </div>
              <div className={styles.planFeature}>
                <span className={styles.featureIcon}>✓</span>
                <span>Priority customer support</span>
              </div>
              <div className={styles.planFeature}>
                <span className={styles.featureIcon}>✓</span>
                <span>Custom branding options</span>
              </div>
            </div>
          </div>
          
          <div className={styles.totals}>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <span>2500 Kč /month</span>
            </div>
            <div className={styles.totalRow}>
              <span>Taxes</span>
              <span>Calculated at checkout</span>
            </div>
            <div className={`${styles.totalRow} ${styles.finalTotal}`}>
              <span>Total</span>
              <span>2500 Kč /month</span>
            </div>
          </div>
        </div>
        
        <div className={styles.checkoutForm}>
          <h2 className={styles.sectionTitle}>Payment Method</h2>
          <p className={styles.secureText}>
            <span className={styles.lockIcon}>🔒</span> Secure checkout provided by Stripe
          </p>
          
          <form onSubmit={handleSubscribe} className={styles.form}>
            <button 
              type="submit" 
              className={styles.checkoutButton}
              disabled={isCreatingSession || !priceId}
            >
              {isCreatingSession ? (
                <>
                  <div className={styles.buttonSpinner}></div>
                  Processing...
                </>
              ) : 'Proceed to Payment'}
            </button>
          </form>
          
          <div className={styles.securityInfo}>
            <div className={styles.securityItem}>
              <span className={styles.securityIcon}>🔒</span>
              <span>Your payment information is encrypted and secure</span>
            </div>
            <div className={styles.securityItem}>
              <span className={styles.securityIcon}>📅</span>
              <span>Subscription renews automatically. Cancel anytime</span>
            </div>
            <div className={styles.securityItem}>
              <span className={styles.securityIcon}>💳</span>
              <span>We accept all major credit cards</span>
            </div>
          </div>
          
          <div className={styles.paymentLogos}>
            <div className={styles.paymentLogo}>Visa</div>
            <div className={styles.paymentLogo}>Mastercard</div>
            <div className={styles.paymentLogo}>Amex</div>
          </div>
        </div>
      </div>
      
      <div className={styles.backLink}>
        <a href="/dashboard" className={styles.backButton}>
          <span className={styles.backIcon}>←</span> Back to Dashboard
        </a>
      </div>
    </div>
  );
}
