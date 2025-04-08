// Dashboard Layout (Authenticated Routes)
'use client'; // Add this for hooks

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthGuard from '@/components/auth/AuthGuard';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { TutorialProvider } from '@/contexts/TutorialContext'; // Import TutorialProvider
import DashboardTutorial from '@/components/tutorial/DashboardTutorial';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  FiHome, FiSettings, FiMessageSquare, FiUsers, FiBox, FiInfo, FiBriefcase,
  FiMail, FiBarChart2, FiCode, FiGlobe, FiCreditCard, FiUser, FiLogOut,
  FiShield // Import an icon for Super Admin
} from 'react-icons/fi';

// Create a client
const queryClient = new QueryClient();

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout, user } = useAuth(); // Get user from context
  const pathname = usePathname(); // Get current path

  // Define navigation items with icons
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: FiHome },
    { href: '/widget-config', label: 'Widget Config', icon: FiSettings },
    { href: '/widget-faqs', label: 'Widget FAQs', icon: FiMessageSquare },
    { href: '/guided-chat', label: 'Guided Chat', icon: FiUsers }, // Example icon, adjust as needed
    { href: '/products', label: 'Products', icon: FiBox },
    { href: '/shop-info', label: 'Shop Info', icon: FiInfo },
    { href: '/business-types', label: 'Business Types', icon: FiBriefcase },
    { href: '/contact-submissions', label: 'Contact Submissions', icon: FiMail },
    { href: '/conversations', label: 'Conversations', icon: FiBarChart2 }, // Example icon
    { href: '/installation', label: 'Installation', icon: FiCode },
    { href: '/domains', label: 'Domains', icon: FiGlobe },
    { href: '/billing', label: 'Billing', icon: FiCreditCard },
    { href: '/account', label: 'Account', icon: FiUser },
  ];

  // Function to get the page title based on pathname
  const getPageTitle = () => {
    const currentItem = navItems.find(item => pathname.startsWith(item.href));
    return currentItem ? currentItem.label : 'Dashboard'; // Default title
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard>
        <SubscriptionProvider>
          <TutorialProvider> {/* Wrap SubscriptionProvider with TutorialProvider */}
            <div className="flex h-screen bg-gray-100">
              {/* Sidebar Navigation */}
              {/* Updated for Clean/Minimalist Theme */}
              <aside className="w-64 bg-white text-gray-800 p-6 flex flex-col shadow-lg border-r border-gray-200"> {/* Reverted bg to white */}
              <h2 className="text-2xl font-bold mb-10 text-gray-900 text-center">SuperDash</h2> {/* Increased margin */}
              {/* Add data-intro attribute for intro.js */}
              <nav className="flex-1" data-intro="sidebar-nav" data-step="2">
                <ul className="space-y-2"> {/* Increased spacing */}
                  {navItems.map((item, index) => { // Add index for data-step
                    const isActive = pathname.startsWith(item.href);
                    // Generate data-intro attribute based on href
                    const introAttribute = `nav-${item.href.replace('/', '') || 'dashboard'}`;
                    // Determine step number (start from 3 as step 1 is body, step 2 is nav)
                    const stepNumber = index + 3;
                    return (
                      // Add data-intro and data-step to the Link or li if needed
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          data-intro={introAttribute} // Add data-intro here
                          data-step={stepNumber}      // Add data-step here
                          className={clsx(
                            'flex items-center py-2.5 px-4 rounded transition duration-200 ease-in-out text-gray-700', // Reverted default text color to slightly darker gray-700
                            isActive
                              ? 'bg-blue-600 text-white font-medium' // Active state: removed shadow, added font-medium
                              : 'hover:bg-blue-100 hover:text-blue-700' // Hover state: branded hover
                          )}
                        >
                          <item.icon className="mr-3 h-5 w-5" /> {/* Icon */}
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}

                  {/* Conditionally render Super Admin link */}
                  {user?.is_super_admin && (
                     <li>
                        <Link
                          href="/superadmin/users" // Link to the super admin users page
                          className={clsx(
                            'flex items-center py-2.5 px-4 rounded transition duration-200 ease-in-out text-red-600 hover:bg-red-100 hover:text-red-700', // Distinct styling for light theme
                            pathname.startsWith('/superadmin')
                              ? 'bg-red-600 text-white font-medium' // Active state: removed shadow, added font-medium
                              : ''
                          )}
                        >
                          <FiShield className="mr-3 h-5 w-5" /> {/* Super Admin Icon */}
                          Super Admin
                        </Link>
                      </li>
                  )}
                </ul>
              </nav>
              {/* Logout button - Updated for Light Theme */}
              <button
                onClick={logout}
                className="mt-auto w-full flex items-center justify-center bg-transparent border border-red-300 text-red-600 hover:bg-red-50 py-2 px-4 rounded transition duration-200 ease-in-out" // Adjusted logout button style
              >
                <FiLogOut className="mr-2 h-5 w-5" />
                Logout
              </button>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden">
              {/* Top bar/header */}
              <header className="bg-white shadow-md p-4 border-b border-gray-200 flex justify-between items-center">
                <h1 className="text-xl font-semibold text-gray-800">{getPageTitle()}</h1> {/* Dynamic Title */}
                {/* User Email Display */}
                {user && (
                  <div className="text-sm text-gray-600">
                    Logged in as: <span className="font-medium">{user.email}</span>
                  </div>
                )}
              </header>
              {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {children}
            </div>
          </main>
          <ToastContainer
            position="bottom-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
          <DashboardTutorial />
        </div>
        </TutorialProvider> {/* Close TutorialProvider */}
      </SubscriptionProvider>
    </AuthGuard>
  </QueryClientProvider>
  );
}
