'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // Assuming a loading spinner component exists or will be created

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until loading is finished before checking authentication
    if (!isLoading && !isAuthenticated) {
      // Redirect to login page if not authenticated
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading indicator while checking auth status
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // If authenticated and not loading, render the children (the protected page content)
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // If not authenticated and not loading (should have been redirected, but return null as fallback)
  return null;
};

export default AuthGuard;
