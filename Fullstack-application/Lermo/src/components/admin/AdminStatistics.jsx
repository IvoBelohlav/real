import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, MessageSquare, Clock, TrendingUp } from 'lucide-react';
import api from '../../utils/api';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import styles from './AdminStatistics.module.css';

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
  const {
    data: stats,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const response = await api.get('/api/admin/stats');
      if (response.status !== 200) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }
      return response.data;
    },
    refetchInterval: 60000,
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
        Error: {error.message}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers?.toLocaleString(),
      icon: Users,
      color: "text-blue-500"
    },
    {
      title: "Active Users",
      value: stats.activeUsers?.toLocaleString(),
      icon: TrendingUp,
      color: "text-green-500"
    },
    {
      title: "Total Messages",
      value: stats.totalMessages?.toLocaleString(),
      icon: MessageSquare,
      color: "text-purple-500"
    },
    {
      title: "Avg Response Time",
      value: `${stats.averageResponseTime?.toFixed(1)}s`,
      icon: Clock,
      color: "text-orange-500"
    }
  ];

  return (
    <div className={styles.statsContainer}>
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
              <BarChart data={stats.dailyStats}>
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
              <BarChart data={stats.monthlyUsers}>
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