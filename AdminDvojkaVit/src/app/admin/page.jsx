"use client";

import React from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { useSubscription } from '@/context/SubscriptionContext';
import styles from './Dashboard.module.css';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { isSubscribed, subscription } = useSubscription();
  
  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.welcomeBar}>
        <h1 className={styles.welcomeTitle}>
          Welcome to the Admin Dashboard
        </h1>
        <p className={styles.welcomeSubtitle}>
          Manage your application settings, users, and configurations
        </p>
      </div>
      
      <div className={styles.statsGrid}>
        <div className={styles.statsCard}>
          <h3 className={styles.statsTitle}>User Status</h3>
          <div className={styles.statsValue}>
            {user ? user.email : 'Not logged in'}
          </div>
          <p className={styles.statsDescription}>
            Current logged in user
          </p>
        </div>
        
        <div className={styles.statsCard}>
          <h3 className={styles.statsTitle}>Subscription</h3>
          <div className={styles.statsValue}>
            <span className={isSubscribed ? styles.active : styles.inactive}>
              {isSubscribed ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className={styles.statsDescription}>
            Your current subscription status
          </p>
        </div>
        
        <div className={styles.statsCard}>
          <h3 className={styles.statsTitle}>Widget Status</h3>
          <div className={styles.statsValue}>Ready</div>
          <p className={styles.statsDescription}>
            Your widget is configured and ready to use
          </p>
        </div>
        
        <div className={styles.statsCard}>
          <h3 className={styles.statsTitle}>Today's Date</h3>
          <div className={styles.statsValue}>
            {new Date().toLocaleDateString()}
          </div>
          <p className={styles.statsDescription}>
            Current date
          </p>
        </div>
      </div>
      
      <div className={styles.sectionTitle}>Quick Links</div>
      <div className={styles.quickLinks}>
        <a href="/admin/products" className={styles.quickLink}>
          <div className={styles.quickLinkIcon}>📦</div>
          <div className={styles.quickLinkTitle}>Products</div>
          <div className={styles.quickLinkDescription}>
            Manage your product catalog
          </div>
        </a>
        
        <a href="/admin/business-types" className={styles.quickLink}>
          <div className={styles.quickLinkIcon}>🏢</div>
          <div className={styles.quickLinkTitle}>Business Types</div>
          <div className={styles.quickLinkDescription}>
            Configure business categories
          </div>
        </a>
        
        <a href="/widget" className={styles.quickLink}>
          <div className={styles.quickLinkIcon}>⚙️</div>
          <div className={styles.quickLinkTitle}>Widget Config</div>
          <div className={styles.quickLinkDescription}>
            Configure your widget appearance
          </div>
        </a>
      </div>
    </div>
  );
} 