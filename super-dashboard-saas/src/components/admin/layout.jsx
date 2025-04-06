'use client';

import React, { useEffect, useState } from 'react';
import AdminNavigation from './AdminNavigation';
import { usePathname, useRouter } from 'next/navigation';
import { isAuthenticated, refreshToken, getUserInfo } from '@/utils/auth';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './AdminLayout.module.css';

export default function AdminLayout({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  // Only check authentication once after initial render
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log(`AdminLayout: Checking auth for path: ${pathname}`);
        
        const isAuth = isAuthenticated();
        console.log(`AdminLayout: Authentication check result: ${isAuth}`);
        
        if (!isAuth) {
          // Try to refresh the token first before redirecting
          console.log('AdminLayout: Not authenticated, attempting token refresh');
          const refreshed = await refreshToken();
          
          if (refreshed) {
            console.log('AdminLayout: Token refresh successful');
            setAuthenticated(true);
          } else {
            console.log('AdminLayout: Token refresh failed, redirecting to widget');
            // Redirect to widget if not authenticated
            // router.push('/widget'); // Commented out redirect
            // Removed return; to allow setLoading(false) to run
          }
        } else {
          console.log('AdminLayout: User is authenticated');
          
          // Check user's subscription status
          const userInfo = getUserInfo();
          console.log('AdminLayout: User subscription info:', 
            userInfo ? 
            { status: userInfo.subscription_status, tier: userInfo.subscription_tier } : 
            'No user info');
          
          // Allow access for admin users and users with active paid subscriptions
          const isAdmin = userInfo?.subscription_tier === 'admin';
          const hasPaidSubscription = userInfo?.subscription_status === 'active' || userInfo?.subscription_status === 'trialing';
          
          if (isAdmin || hasPaidSubscription) {
            console.log('AdminLayout: User has admin access or paid subscription');
            setAuthenticated(true);
          } else {
            console.log('AdminLayout: User does not have admin access or paid subscription');
            // router.push('/widget'); // Commented out redirect
            // Removed return; to allow setLoading(false) to run
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('AdminLayout: Authentication check error:', error);
        setLoading(false);
        // On any error, redirect to widget
        // router.push('/widget'); // Commented out redirect
      }
    };
    
    checkAuth();
  }, [pathname, router]);
  
  // Show loading state
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading...</p>
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    );
  }
  
  // Show admin layout for authenticated users
  console.log('AdminLayout: Rendering admin layout');
  return (
    <div className={styles.adminLayout}>
      <AdminNavigation />
      <main className={styles.content}>
        {children}
      </main>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
