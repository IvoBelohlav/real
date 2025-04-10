'use client';

import { useState, useEffect } from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import Link from 'next/link';
import styles from './Widget.module.css';

export default function WidgetPage() {
  const { isSubscribed, isLoading, canAccessWidget } = useSubscription();
  const [embedCode, setEmbedCode] = useState(null);
  const [isLoadingCode, setIsLoadingCode] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmbedCode = async () => {
      try {
        setIsLoadingCode(true);
        // Call your API to get the embed code
        const response = await fetch('/api/widget/embed-code');
        if (!response.ok) {
          throw new Error('Failed to fetch embed code');
        }
        const data = await response.json();
        setEmbedCode(data);
        setIsLoadingCode(false);
      } catch (err) {
        console.error('Error fetching embed code:', err);
        setError('Failed to load your widget embed code. Please try again later.');
        setIsLoadingCode(false);
      }
    };

    if (isSubscribed && canAccessWidget()) {
      fetchEmbedCode();
    } else {
      setIsLoadingCode(false);
    }
  }, [isSubscribed, canAccessWidget]);

  if (isLoading || isLoadingCode) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading widget configurations...</p>
        </div>
      </div>
    );
  }

  // If user is not subscribed, show subscription CTA
  if (!isSubscribed) {
    return (
      <div className={styles.container}>
        <div className={styles.subscriptionRequired}>
          <div className={styles.lockIcon}>🔒</div>
          <h1 className={styles.title}>Premium Feature</h1>
          <p className={styles.message}>
            The widget configuration is only available to premium subscribers.
            Upgrade your account to access this feature and many more benefits.
          </p>
          <Link href="/checkout" className={styles.upgradeButton}>
            Upgrade to Premium
          </Link>
        </div>
      </div>
    );
  }

  // If user doesn't have widget access specifically
  if (!canAccessWidget()) {
    return (
      <div className={styles.container}>
        <div className={styles.subscriptionRequired}>
          <div className={styles.lockIcon}>⚠️</div>
          <h1 className={styles.title}>Feature Not Available</h1>
          <p className={styles.message}>
            Your current subscription plan doesn't include widget access.
            Please contact support if you believe this is an error.
          </p>
          <Link href="/dashboard" className={styles.backButton}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Widget Configuration</h1>
      
      {error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <>
          <div className={styles.configSection}>
            <div className={styles.embedSection}>
              <h2 className={styles.sectionTitle}>Your Widget Embed Code</h2>
              <p className={styles.embedInstructions}>
                Copy and paste this code into your website to start using the widget:
              </p>
              
              <div className={styles.codeBox}>
                <h3 className={styles.codeTitle}>HTML</h3>
                <pre className={styles.code}>{embedCode?.html}</pre>
                <button 
                  className={styles.copyButton}
                  onClick={() => {
                    navigator.clipboard.writeText(embedCode?.html);
                    alert('HTML code copied to clipboard!');
                  }}
                >
                  Copy HTML
                </button>
              </div>
              
              <div className={styles.codeBox}>
                <h3 className={styles.codeTitle}>JavaScript</h3>
                <pre className={styles.code}>{embedCode?.javascript}</pre>
                <button 
                  className={styles.copyButton}
                  onClick={() => {
                    navigator.clipboard.writeText(embedCode?.javascript);
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
            </div>
            
            <div className={styles.settingsSection}>
              <h2 className={styles.sectionTitle}>Widget Settings</h2>
              <p className={styles.settingsDescription}>
                Customize your widget appearance and behavior:
              </p>
              
              <div className={styles.settingsForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="widgetTheme">Widget Theme</label>
                  <select id="widgetTheme" className={styles.select}>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System Preference)</option>
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="widgetPosition">Widget Position</label>
                  <select id="widgetPosition" className={styles.select}>
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="top-left">Top Left</option>
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="widgetSize">Widget Size</label>
                  <select id="widgetSize" className={styles.select}>
                    <option value="medium">Medium</option>
                    <option value="small">Small</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                
                <button className={styles.saveButton}>
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 