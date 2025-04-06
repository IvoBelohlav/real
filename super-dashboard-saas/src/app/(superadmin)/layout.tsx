// src/app/(superadmin)/layout.tsx
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation'; // Use next/navigation for App Router
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Link from 'next/link';

// Basic Super Admin Layout Component
export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect non-superadmins away if not loading and user data is available
    if (!isLoading && user && !user.is_super_admin) {
      console.warn("Redirecting non-superadmin from superadmin layout.");
      router.push('/dashboard'); // Redirect to the main dashboard or login page
    }
    // Redirect logged-out users
    if (!isLoading && !user) {
        console.warn("Redirecting logged-out user from superadmin layout.");
        router.push('/login');
    }
  }, [user, isLoading, router]);

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // If user is not loaded or not a super admin, render null or a message while redirecting
  if (!user || !user.is_super_admin) {
    // Or return null if you want a blank screen during redirect
    return (
         <div className="flex justify-center items-center min-h-screen">
            <p>Access Denied. Redirecting...</p>
            <LoadingSpinner />
         </div>
    );
  }

  // Render the layout for authenticated super admins
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-red-800 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Super Admin Panel</h1>
          <nav>
            <Link href="/superadmin/users" className="mr-4 hover:text-gray-300">Users</Link>
            {/* Add other super admin links here */}
            <button onClick={logout} className="bg-white text-red-800 px-3 py-1 rounded hover:bg-gray-200">
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4">
        {children}
      </main>
      <footer className="bg-gray-200 p-4 text-center text-sm text-gray-600">
        Super Admin Footer
      </footer>
    </div>
  );
}
