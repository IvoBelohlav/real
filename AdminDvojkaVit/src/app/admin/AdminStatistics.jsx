'use client';

'use client';

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, MessageSquare, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../utils/auth'; // Import useAuth
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import styles from './AdminStatistics.module.css';
import { useRouter } from 'next/navigation';

const StatCard = ({ title, value, icon: Icon, color }) => {
  // Map color prop to CSS module class
  const getIconClass = () => {
    switch (color) {
      case 'text-blue-500':
        return styles.iconBlue;
      case 'text-green-500':
        return styles.iconGreen;
      case 'text-purple-500':
        return styles.iconPurple;
      case 'text-orange-500':
        return styles.iconOrange;
      default:
        return styles.iconBlue;
    }
  };

  return (
    <div className={styles.statCard}>
      <div className={styles.statCardHeader}>
        <div className={styles.statTitle}>{title}</div>
        <Icon className={getIconClass()} />
      </div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
};

const AdminStatistics = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth(); // Get authentication status

  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      try {
        console.log('Fetching admin statistics...');
        const response = await api.get('/api/admin/stats');
        console.log('Statistics API response:', response.status, response.statusText);
        
        if (response.status !== 200) {
          throw new Error(`Failed to fetch stats: ${response.status}`);
        }
        return response.data;
      } catch (err) {
        console.error('Error fetching stats:', err);
        if (err.response?.status === 401) {
          throw new Error('Authentication error. Please try refreshing the data or log in again.');
        }
        throw err;
      }
    },
    refetchInterval: 60000,
    retry: 1,
    retryDelay: 1000,
    enabled: isAuthenticated, // Only fetch if authenticated
  });

  if (isLoading) {
    return (
      <div className={styles.statsContainer}>
        <div className={styles.statsGrid}>
          {/* Skeleton for Stat Cards */}
          {[...Array(4)].map((_, index) => (
            <div key={index} className={styles.statCard}>
              <div className={styles.statCardHeader}>
                <Skeleton width={100} height={16} />
                <Skeleton circle={true} width={20} height={20} />
              </div>
              <Skeleton width={80} height={32} className={styles.skeletonMarginTop} />
            </div>
          ))}
        </div>

        <div className={styles.chartsGrid}>
          {/* Skeleton for Charts */}
          {[...Array(2)].map((_, index) => (
            <div key={index} className={styles.chartContainer}>
              <Skeleton width={150} height={16} className={styles.skeletonMarginBottom} />
              <Skeleton height={288} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.errorMessage}>
        <p className={styles.errorText}>Error: {error.message}</p>
        <button 
          onClick={() => refetch()}
          className={styles.refreshButton}
          disabled={isLoading}
        >
          <RefreshCw size={16} />
          Try Again
        </button>
        {/* Removed redirect button for authentication errors */}
      </div>
    );
  }
  
  // Add a check to ensure stats data exists before trying to render with it
  if (!stats) {
    // Render nothing or a specific message if stats are unavailable after loading/error checks
    // This prevents the runtime error when stats is undefined after an error.
    return (
      <div className={styles.statsContainer}>
        <p>Statistics data is currently unavailable.</p>
         {/* Optionally keep the refresh button visible */}
         <button 
           onClick={() => refetch()}
           className={styles.refreshButton}
           disabled={isLoading}
         >
           <RefreshCw size={16} />
           Try Again
         </button>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      // Use optional chaining and provide a default value
      value: stats.totalUsers?.toLocaleString() ?? 'N/A', 
      icon: Users,
      color: "text-blue-500"
    },
    {
      title: "Active Users",
      value: stats.activeUsers?.toLocaleString() ?? 'N/A',
      icon: TrendingUp,
      color: "text-green-500"
    },
    {
      title: "Total Messages",
      value: stats.totalMessages?.toLocaleString() ?? 'N/A',
      icon: MessageSquare,
      color: "text-purple-500"
    },
    {
      title: "Avg Response Time",
      value: stats.averageResponseTime ? `${stats.averageResponseTime.toFixed(1)}s` : 'N/A',
      icon: Clock,
      color: "text-orange-500"
    }
  ];

  return (
    <div className={styles.statsContainer}>
      <div className={styles.statsHeader}>
        <h2 className={styles.heading}>Admin Statistics</h2>
        <button 
          onClick={() => refetch()}
          className={styles.refreshButton}
          disabled={isLoading}
        >
          <RefreshCw size={16} />
          Refresh Data
        </button>
      </div>
      
      <div className={styles.statsGrid}>
        {statCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitle}>Daily Messages</div>
          </div>
          <div className={styles.chartContent}>
            <ResponsiveContainer width="100%" height="100%">
              {/* Ensure data exists before rendering chart */}
              <BarChart data={stats.dailyStats ?? []}> 
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="messages" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitle}>Monthly Users</div>
          </div>
          <div className={styles.chartContent}>
            <ResponsiveContainer width="100%" height="100%">
              {/* Ensure data exists before rendering chart */}
              <BarChart data={stats.monthlyUsers ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStatistics;
