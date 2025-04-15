'use client'; // Required for hooks like useState, useEffect, useAuth

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // To potentially display user info
import { fetchApi } from '@/lib/api'; // Import fetchApi
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Link from 'next/link'; // Import Link for navigation
import { FiCreditCard, FiSettings, FiBarChart2, FiArrowRight } from 'react-icons/fi'; // Import icons for cards
// Import Recharts components
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Define types for historical data points
interface HistoryPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

// Define types for dashboard data including history
interface DashboardStats {
  // Totals
  totalConversations: number;
  authorizedDomains: number;
  totalMessages: number;
  activeWidgets: number;
  widgetViews?: number; // Optional, as it's a placeholder in backend
  average_conversation_length?: number; // Added average length
  // Historical Data
  conversation_history: HistoryPoint[];
  message_history: HistoryPoint[]; // Placeholder from backend
}

// Enhanced Card component with icon and optional link
interface InfoCardProps {
  title: string;
  icon: React.ElementType; // Accept icon component
  children: React.ReactNode;
  linkTo?: string; // Optional link destination
  className?: string;
}

// Apply dark theme styles using CSS variables
const InfoCard: React.FC<InfoCardProps> = ({ title, icon: Icon, children, linkTo, className }) => (
  <div className={`bg-card shadow rounded-lg p-6 transition duration-300 ease-in-out hover:shadow-lg border border-border ${className}`}>
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-lg font-medium text-card-foreground">{title}</h3>
      <Icon className="h-6 w-6 text-muted-foreground" /> {/* Use muted foreground for icon */}
    </div>
    <div className="mb-4">{children}</div>
    {linkTo && (
      <Link href={linkTo} className="text-sm font-medium text-primary hover:text-primary/80 flex items-center"> {/* Use primary color for link */}
        Go to {title} <FiArrowRight className="ml-1 h-4 w-4" />
      </Link>
    )}
  </div>
);


export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth(); // Get user info and auth loading state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine subscription status and plan name from user context
  // Use the new subscription_tier_name field for display
  const subscriptionPlanName = user?.subscription_tier_name || 'Free'; // Default to Free if not set
  const subscriptionStatus = user?.subscription_status || 'inactive'; // Default to inactive
  const isActiveSubscription = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  // TODO: Fetch actual dashboard stats from the backend API
  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return; // Don't fetch if user isn't loaded yet
      setIsLoadingStats(true);
      setError(null);
      // Only fetch stats if the subscription is active
      if (!isActiveSubscription) {
        setError("Dashboard statistics require an active subscription.");
        setStats(null);
        setIsLoadingStats(false);
        return;
      }

      try {
        // Fetch actual stats from the backend
        const fetchedStats = await fetchApi('/api/dashboard/stats');
        // console.log("Fetched Stats from API:", fetchedStats); // Removed log

        // Map backend response fields to frontend state fields, including history
        const newStatsData: DashboardStats = {
          // Totals
          totalConversations: fetchedStats?.conversations ?? 0,
          authorizedDomains: fetchedStats?.domains ?? 0,
          totalMessages: fetchedStats?.messages ?? 0,
          activeWidgets: fetchedStats?.active_widgets ?? 0,
          widgetViews: fetchedStats?.widget_views ?? 0, // Include optional field
          average_conversation_length: fetchedStats?.average_conversation_length, // Map the new field
          // Historical Data
          conversation_history: fetchedStats?.conversation_history ?? [], // Default to empty array
          message_history: fetchedStats?.message_history ?? [], // Default to empty array
        };
        setStats(newStatsData);

      } catch (err: any) { // Type assertion for error handling
        console.error("Failed to fetch dashboard stats:", err);
        // Handle specific errors like 403 Forbidden if subscription check fails server-side
        if (err.message?.includes('403')) {
             setError("Access denied. Statistics require an active subscription.");
        } else {
             setError("Could not load dashboard statistics.");
        }
        setStats(null); // Clear stats on error
      } finally {
        setIsLoadingStats(false);
      }
    };

    if (!isAuthLoading) { // Fetch stats only after auth check is complete
        fetchStats();
    }
  }, [user, isAuthLoading]); // Re-fetch if user or auth loading state changes

  // Show loading spinner while auth or stats are loading
  if (isAuthLoading || isLoadingStats) {
    return <LoadingSpinner />;
  }

  // Show error message if stats fetching failed
  if (error) {
    return <div className="text-red-600 bg-red-100 p-4 rounded">{error}</div>;
  }

  // Determine widget status based on subscription
  // You might have a separate API call or logic for widget status
  const widgetEnabled = isActiveSubscription; // Simple example: widget enabled if subscription is active

  return (
    <div className="space-y-8">
      {/* Apply dark theme text color */}
      <h1 className="text-2xl font-semibold text-foreground">Dashboard Overview</h1>

      {/* Welcome message - Apply dark theme text color */}
      {user && <p className="text-muted-foreground">Welcome back, {user.email || 'User'}!</p>}

      {/* Grid for key info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Subscription Status Card - Apply dark theme text colors */}
        <InfoCard title="Subscription" icon={FiCreditCard} linkTo="/billing">
          <p className="text-2xl font-semibold text-foreground capitalize">
            {subscriptionPlanName} Plan {/* Use the display name */}
          </p>
          <p className={`mt-1 text-sm font-medium capitalize ${isActiveSubscription ? 'text-green-500' : 'text-red-500'}`}> {/* Adjusted green/red intensity */}
            Status: {subscriptionStatus} {/* Display the status */}
          </p>
        </InfoCard>

        {/* Widget Status Card - Apply dark theme text colors */}
        <InfoCard title="Chat Widget" icon={FiSettings} linkTo="/widget-config">
          <p className={`text-2xl font-semibold ${widgetEnabled ? 'text-green-500' : 'text-red-500'}`}> {/* Adjusted green/red intensity */}
            {widgetEnabled ? 'Enabled' : 'Disabled'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your chat widget is currently {widgetEnabled ? 'active' : 'inactive'} on authorized domains.
            {!widgetEnabled && <span className="text-red-500"> (Requires active subscription)</span>}
          </p>
        </InfoCard>

        {/* Statistics Card */}
        {/* Statistics Card - Apply dark theme text colors */}
        <InfoCard title="Statistics" icon={FiBarChart2} linkTo="/conversations"> {/* Link to conversations or a dedicated stats page */}
          {stats ? (
            <div className="space-y-3">
               <div>
                 <p className="text-sm font-medium text-muted-foreground">Total Conversations</p>
                 {/* Display fetched stats */}
                 <p className="text-2xl font-semibold text-foreground">{stats.totalConversations}</p>
               </div>
               <div>
                  <p className="text-sm font-medium text-muted-foreground">Authorized Domains</p>
                  <p className="text-2xl font-semibold text-foreground">{stats.authorizedDomains}</p>
                </div>
                {/* Added Total Messages */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Messages</p>
                  <p className="text-2xl font-semibold text-foreground">{stats.totalMessages}</p>
                </div>
                {/* Added Active Widgets */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Widgets</p>
                  <p className="text-2xl font-semibold text-foreground">{stats.activeWidgets}</p>
                </div>
                {/* Added Average Conversation Length */}
                {stats.average_conversation_length !== undefined && ( // Check if the value exists
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg. Conversation Length</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {stats.average_conversation_length.toFixed(1)} <span className="text-base font-normal text-muted-foreground">msgs/convo</span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Statistics data unavailable.</p>
           )}
            {/* TODO: Add link to detailed stats page if needed */}
         </InfoCard>
         {/* End of Statistics Card */}

      </div>
      {/* End of Grid */}

      {/* Conversation Trend Chart - Apply dark theme styles */}
      {stats && stats.conversation_history && stats.conversation_history.length > 0 && (
        <div className="bg-card shadow rounded-lg p-6 mt-8 border border-border"> {/* Use card background and border */}
          <h3 className="text-lg font-medium text-card-foreground mb-4">Conversation Trends (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={stats.conversation_history}
              margin={{
                top: 5, right: 30, left: 0, bottom: 5, // Adjusted left margin
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /> {/* Use border color for grid */}
              <XAxis
                dataKey="date"
                stroke="var(--muted-foreground)" // Use muted foreground for axis line and ticks
                tickFormatter={(tick) => {
                  // Show only month and day for brevity
                  const date = new Date(tick + 'T00:00:00Z'); // Ensure parsing as UTC date part
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                }}
                angle={-45} // Angle ticks slightly if needed
                textAnchor="end" // Adjust anchor for angled text
                height={50} // Increase height to accommodate angled labels
                interval="preserveStartEnd" // Show first and last tick
                // Consider showing fewer ticks if too crowded:
                // tickCount={7} // Example: Show ~7 ticks
              />
              <YAxis allowDecimals={false} stroke="var(--muted-foreground)" /> {/* Use muted foreground for axis line and ticks */}
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--popover)', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--popover-foreground)' }} // Use popover styles
                labelFormatter={(label) => new Date(label + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
              />
              <Legend wrapperStyle={{ color: 'var(--foreground)' }} /> {/* Style legend text */}
              <Line type="monotone" dataKey="count" name="Conversations" stroke="var(--primary)" strokeWidth={2} activeDot={{ r: 8, fill: 'var(--primary)' }} dot={{ r: 3, fill: 'var(--primary)' }} /> {/* Use primary color */}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* End of Conversation Trend Chart */}

      {/* Placeholder for Message Trend Chart (using message_history - currently placeholder data) */}
      {/*
      {stats && stats.message_history && stats.message_history.length > 0 && (
         <div className="bg-white shadow rounded-lg p-6 mt-8">
           <h3 className="text-lg font-medium text-gray-900 mb-4">Message Trends (Last 30 Days)</h3>
           <ResponsiveContainer width="100%" height={300}>
             <LineChart data={stats.message_history} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
               <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
               <XAxis dataKey="date" tickFormatter={(tick) => new Date(tick + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} angle={-45} textAnchor="end" height={50} interval="preserveStartEnd" />
               <YAxis allowDecimals={false} />
               <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '4px', border: '1px solid #ccc' }} labelFormatter={(label) => new Date(label + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })} />
               <Legend />
               <Line type="monotone" dataKey="count" name="Messages" stroke="#10b981" strokeWidth={2} activeDot={{ r: 8 }} dot={{ r: 3 }} /> // Green line
             </LineChart>
           </ResponsiveContainer>
         </div>
       )}
      */}
    </div>
  );
}
