'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../utils/auth'; // Import useAuth
import ConversationTable from './ConversationTable';
import { PulseLoader } from 'react-spinners';
import styles from './ConversationLogs.module.css';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

const ConversationLogs = () => {
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();
    const { isAuthenticated } = useAuth(); // Get auth status

    const { data: conversationData, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['conversations', page, pageSize, searchQuery],
        queryFn: async () => {
            try {
                console.log('Fetching conversation logs...');
                const response = await api.get('/api/conversations', {
                    params: { page, page_size: pageSize, query: searchQuery }
                });
                console.log('Conversation logs API response:', response.status, response.statusText);
                return response.data;
            } catch (err) {
                console.error('Error fetching conversations:', err);
                if (err.response?.status === 401) {
                    throw new Error('Authentication error. Please try refreshing the data or log in again.');
                }
                throw err;
            }
        },
        keepPreviousData: true,
        retry: 1,
        retryDelay: 1000,
        enabled: isAuthenticated, // Only fetch if authenticated
    });

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setPage(1);
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    return (
        <div className={styles.container}>
            <h2 className={styles.heading}>Conversation Logs</h2>

            <div className={styles.searchContainer}>
                <input
                    type="search"
                    placeholder="Search conversations..."
                    className={styles.searchInput}
                    value={searchQuery}
                    onChange={handleSearchChange}
                />
            </div>

            <button 
                onClick={() => refetch()}
                className={styles.refreshButton}
                disabled={isLoading}
            >
                <RefreshCw size={16} className={isLoading ? styles.spin : ''} />
                Refresh Data
            </button>

            {isLoading && (
                <div className={styles.loadingContainer}>
                    <PulseLoader color="#4F46E5" size={10} />
                </div>
            )}

            {isError && (
                <div className={styles.errorContainer} role="alert">
                    <p className={styles.errorMessage}>{error.message}</p>
                    <button 
                        onClick={() => refetch()}
                        className={styles.refreshButton}
                        disabled={isLoading}
                    >
                        <RefreshCw size={16} className={isLoading ? styles.spin : ''} />
                        Try Again
                    </button>
                    {/* Removed redirect button for authentication errors */}
                </div>
            )}

            {conversationData && (
                <ConversationTable
                    conversations={conversationData}
                    page={page}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                />
            )}

            {!conversationData && !isLoading && !isError && (
                <div className={styles.emptyState}>
                    <p className={styles.emptyText}>No conversation logs found.</p>
                </div>
            )}
        </div>
    );
};

export default ConversationLogs;
