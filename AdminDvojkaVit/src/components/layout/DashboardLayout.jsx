'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext'; // Corrected import path
import styles from './DashboardLayout.module.css';
import {
  LayoutDashboard,
  Settings,
  Globe,
  CreditCard,
  FileText,
  User,
  LogOut,
  ChevronRight,
  MessageSquare,
  Lock // Import Lock icon for disabled items
} from 'lucide-react';

// Define which paths require an active subscription
const protectedPaths = ['/widget', '/widget/domains'];

const navItems = [
  {
    path: '/dashboard',
    icon: <LayoutDashboard size={18} />,
    label: 'Dashboard',
    description: 'Overview of your account'
  },
  {
    path: '/widget',
    icon: <MessageSquare size={18} />,
    label: 'Widget Configuration',
    description: 'Customize your chat widget'
  },
  {
    path: '/widget/domains',
    icon: <Globe size={18} />,
    label: 'Domain Management',
    description: 'Manage authorized domains'
  },
  {
    path: '/billing',
    icon: <CreditCard size={18} />,
    label: 'Billing & Subscription',
    description: 'Manage your subscription'
  },
  {
    path: '/invoices',
    icon: <FileText size={18} />,
    label: 'Invoices',
    description: 'View billing history'
  },
  {
    path: '/account',
    icon: <User size={18} />,
    label: 'Account Settings',
    description: 'Manage your profile'
  },
];

export default function DashboardLayout({ children }) {
  // Corrected hook usage: useAuth() returns { user, isLoading, ... }
  const { user, isLoading, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [localStorageSubscribed, setLocalStorageSubscribed] = useState(false);

  // Check localStorage for subscription status (client-side only)
  useEffect(() => {
    // This runs only on client side
    const storedStatus = localStorage.getItem('subscription_status');
    if (storedStatus === 'active') {
      console.log('Found active subscription in localStorage');
      setLocalStorageSubscribed(true);
    }
  }, []);

  useEffect(() => {
    // Redirect to login if not authenticated and not loading
    if (!isLoading && !isAuthenticated) { // Use isLoading from useAuth
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]); // Use isLoading in dependency array

  if (isLoading) { // Use isLoading for conditional check
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null; // Don't render anything while redirecting
  }

  // Determine subscription status safely - use our localStorageSubscribed state
  const activeStatuses = ['active', 'trialing'];
  const isSubscribed = 
    (user?.subscription_status && activeStatuses.includes(user.subscription_status)) || 
    localStorageSubscribed;  // Use the state instead of directly checking localStorage

  // Filter nav items based on subscription status + localStorage check
  const accessibleNavItems = navItems.filter(item => {
    // If item path is not in protectedPaths, always show it
    if (!protectedPaths.includes(item.path)) {
      return true;
    }
    // If item path is protected, check both user subscription and localStorage
    return isSubscribed;
  });

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const isActive = (path) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <div className={styles.container}>
      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>
            <span className={styles.logoText}>Dvojkavit</span>
          </h2>
          <button className={styles.closeButton} onClick={closeMobileMenu}>
            &times;
          </button>
        </div>

        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {/* Placeholder for avatar logic - Safer access */}
            {user?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className={styles.userData}>
            {/* Safer access with fallback */}
            <p className={styles.userName}>{user?.username || user?.name || 'User'}</p>
            <p className={styles.userEmail}>{user?.email || 'No email'}</p>
          </div>
        </div>

        {/* Single Navigation Block */}
        <nav className={styles.navigation}>
          {/* Map over accessible items */}
          {accessibleNavItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
              onClick={closeMobileMenu}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navContent}>
                <span className={styles.navLabel}>{item.label}</span>
                {item.description && (
                  <span className={styles.navDescription}>{item.description}</span>
                )}
              </span>
              <ChevronRight size={16} className={styles.navArrow} />
            </Link>
          ))}
          {/* Replace the disabled items section with upgraded premium links */}
          {navItems.filter(item => protectedPaths.includes(item.path) && !isSubscribed).map((item) => {
            // Check localStorage one more time directly as a final fallback
            const storedStatus = typeof window !== 'undefined' ? localStorage.getItem('subscription_status') : null;
            const isLocallyActive = storedStatus === 'active';
            
            if (isLocallyActive) {
              // If we have an active subscription in localStorage, show a normal link
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
                  onClick={closeMobileMenu}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navContent}>
                    <span className={styles.navLabel}>{item.label}</span>
                    {item.description && (
                      <span className={styles.navDescription}>{item.description}</span>
                    )}
                  </span>
                  <ChevronRight size={16} className={styles.navArrow} />
                </Link>
              );
            } else {
              // Otherwise show disabled item with upgrade badge
              return (
                <div key={item.path} className={`${styles.navItem} ${styles.disabledNavItem}`}>
                  <span className={styles.navIcon}><Lock size={18} /></span>
                  <span className={styles.navContent}>
                    <span className={styles.navLabel}>{item.label}</span>
                    {item.description && (
                      <span className={styles.navDescription}>{item.description}</span>
                    )}
                  </span>
                  <span className={styles.upgradeBadge}>Upgrade</span>
                </div>
              );
            }
          })}
        </nav>
        {/* End Single Navigation Block */}

        <div className={styles.sidebarFooter}>
          <button className={styles.logoutButton} onClick={logout}>
            <LogOut size={18} className={styles.logoutIcon} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <button className={styles.menuButton} onClick={toggleMobileMenu}>
            ☰
          </button>
          <div className={styles.headerContent}>
            {/* Header content */}
          </div>
        </header>

        <div className={styles.content}>
          {children}
        </div>

        <footer className={styles.footer}>
          <p>© {new Date().getFullYear()} Dvojkavit. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
