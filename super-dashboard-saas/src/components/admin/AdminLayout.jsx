import React, { Suspense, lazy } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminNavigation from "./AdminNavigation";
// import AdminStatistics from "./AdminStatistics"; <--- Make sure this import is REMOVED (no longer directly used here)
import AdminDashboard from "./AdminDashboard"; // Ensure this import is present
import '../../assets/main.css';
import styles from './AdminLayout.module.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
    },
  },
});

const LoadingFallback = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.loadingSpinner}></div>
  </div>
);

const AdminLayout = () => {
  const location = useLocation();
  const isDashboard = location.pathname === "/admin" || location.pathname === "/admin/";
  // const isStatistics = location.pathname === "/admin/statistics"; <--- Make sure this line is REMOVED or commented out - Not needed here

  return (
    <QueryClientProvider client={queryClient}>
      <div className={styles.layout}>
        {/* Sidebar */}
        <div className={styles.sidebar}>
          <AdminNavigation />
        </div>
        
        {/* Main Content */}
        <div className={styles.mainContent}>
          <main className={styles.mainInner}>
            <div className={styles.contentContainer}>
              <Suspense fallback={<LoadingFallback />}>
                <div className={styles.contentItems}>
                  {/* Only render AdminDashboard for the dashboard route 
                      and don't render it when using the Outlet component */}
                  {isDashboard ? <AdminDashboard /> : <Outlet />}
                </div>
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
};

export default AdminLayout;