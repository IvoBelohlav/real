import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Users,
    MessageSquare,
    Clock,
    Settings,
    BookPlus,
    FileText,
    HelpCircle,
    Building,
    BarChart2,
    TrendingUp,
    Mailbox,
    ListChecks
} from 'lucide-react';
import api from '../../utils/api';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
    // Fetch admin stats using react-query
    const { data: stats, isLoading, isError, error } = useQuery({
        queryKey: ['adminStats'],
        queryFn: async () => {
            const response = await api.get('/api/admin/stats');
            return response.data;
        },
        refetchInterval: 60000, // Refetch data every minute
    });

    const quickAccessCards = [
        {
            title: "Widget Config",
            description: "Customize chat widget appearance",
            icon: Settings,
            path: "/admin/widget-config",
            colorClasses: {
                bg: styles.bgBlue,
                text: styles.textBlue
            }
        },
        {
            title: "Widget FAQs",
            description: "Manage frequently asked questions",
            icon: HelpCircle,
            path: "/admin/widget-faqs",
            colorClasses: {
                bg: styles.bgPurple,
                text: styles.textPurple
            }
        },
        {
            title: "Statistics",
            description: "View key performance indicators",
            icon: BarChart2,
            path: "/admin/statistics",
            colorClasses: {
                bg: styles.bgGreen,
                text: styles.textGreen
            }
        },
        {
            title: "Conversation Logs",
            description: "Review user-bot conversations",
            icon: ListChecks,
            path: "/admin/conversations",
            colorClasses: {
                bg: styles.bgOrange,
                text: styles.textOrange
            }
        },
        {
            title: "Contact Submissions",
            description: "View user contact form submissions",
            icon: Mailbox,
            path: "/admin/contact-submissions",
            colorClasses: {
                bg: styles.bgTeal,
                text: styles.textTeal
            }
        },
        {
            title: "QA Management",
            description: "Manage chatbot's knowledge base",
            icon: FileText,
            path: "/admin/qa",
            colorClasses: {
                bg: styles.bgYellow,
                text: styles.textYellow
            }
        },
        {
            title: "Business Types",
            description: "Manage business categories and configurations",
            icon: Building,
            path: "/admin/business-types",
            colorClasses: {
                bg: styles.bgIndigo,
                text: styles.textIndigo
            }
        },
        {
            title: "Guided Chat",
            description: "Design interactive chat flows",
            icon: BookPlus,
            path: "/admin/guided-chat",
            colorClasses: {
                bg: styles.bgPink,
                text: styles.textPink
            }
        }
    ];

    if (isLoading) {
        return (
            <div className={styles.container}>
                <h1 className={styles.title}>Admin Dashboard</h1>
                <p className={styles.loadingText}>Loading dashboard data...</p>
                <div className={styles.statsGrid}>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className={styles.statCard}>
                            <Skeleton height={24} width={120} />
                            <Skeleton height={40} width={80} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className={styles.container}>
                <h1 className={styles.title}>Admin Dashboard</h1>
                <div className={styles.errorContainer} role="alert">
                    <strong className={styles.errorBold}>Error!</strong>
                    <span> Failed to load dashboard data: {error.message}</span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Admin Dashboard</h1>
            </div>

            {/* Statistics Cards */}
            <div className={styles.statsGrid}>
                <StatCard
                    title="Total Users"
                    value={stats?.totalUsers?.toLocaleString() || 0}
                    icon={Users}
                    color={styles.textBlue}
                />
                <StatCard
                    title="Active Users (24h)"
                    value={stats?.activeUsers?.toLocaleString() || 0}
                    icon={TrendingUp}
                    color={styles.textGreen}
                />
                <StatCard
                    title="Total Messages"
                    value={stats?.totalMessages?.toLocaleString() || 0}
                    icon={MessageSquare}
                    color={styles.textPurple}
                />
                <StatCard
                    title="Avg. Response Time"
                    value={`${stats?.averageResponseTime?.toFixed(1) || 0}s`}
                    icon={Clock}
                    color={styles.textOrange}
                />
            </div>

            {/* Quick Access Cards */}
            <div className={styles.quickAccessGrid}>
                {quickAccessCards.map((card, index) => (
                    <a
                        key={index}
                        href={card.path}
                        className={styles.quickAccessCard}
                    >
                        <div className={`${styles.iconContainer} ${card.colorClasses.bg}`}>
                            <card.icon className={card.colorClasses.text} size={22} />
                        </div>
                        <h3 className={styles.cardTitle}>{card.title}</h3>
                        <p className={styles.cardDescription}>{card.description}</p>
                    </a>
                ))}
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className={styles.statCard}>
    <div className={styles.statCardHeader}>
      <div className={styles.statCardTitle}>{title}</div>
      <Icon className={color} size={20} />
    </div>
    <div className={styles.statCardValue}>{value}</div>
  </div>
);

export default AdminDashboard;