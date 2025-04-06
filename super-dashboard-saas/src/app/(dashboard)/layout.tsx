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
import { usePathname } from 'next/navigation'; // Import usePathname
import clsx from 'clsx'; // Import clsx for conditional classes
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
      <AuthGuard> {/* Wrap the layout content with AuthGuard */}
        <SubscriptionProvider> {/* Wrap content further with SubscriptionProvider */}
          <div className="flex h-screen bg-gray-100">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-gradient-to-b from-gray-800 to-gray-900 text-gray-200 p-4 flex flex-col shadow-lg">
              <h2 className="text-2xl font-bold mb-8 text-white text-center">SuperDash</h2>
              <nav className="flex-1">
                <ul className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={clsx(
                            'flex items-center py-2.5 px-4 rounded transition duration-200 ease-in-out',
                            isActive
                              ? 'bg-blue-600 text-white shadow-inner' // Active state
                              : 'hover:bg-gray-700 hover:text-white' // Hover state
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
                            'flex items-center py-2.5 px-4 rounded transition duration-200 ease-in-out text-red-400 hover:bg-red-700 hover:text-white', // Distinct styling
                            pathname.startsWith('/superadmin')
                              ? 'bg-red-600 text-white shadow-inner' // Active state for superadmin section
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
              {/* Logout button */}
              <button
                onClick={logout}
                className="mt-auto w-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition duration-200 ease-in-out"
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
        </div>
        </SubscriptionProvider> {/* Close SubscriptionProvider */}
      </AuthGuard>
    </QueryClientProvider>
  );
}
