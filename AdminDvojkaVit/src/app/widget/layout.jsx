'use client';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { AuthProvider } from '../../components/layout/AuthProvider';

export default function Layout({ children }) {
  return (
    <AuthProvider>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </AuthProvider>
  );
} 