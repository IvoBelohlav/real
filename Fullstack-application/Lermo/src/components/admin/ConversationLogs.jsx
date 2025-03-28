import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import ConversationTable from './ConversationTable';
import { PulseLoader } from 'react-spinners';
import styles from './ConversationLogs.module.css';

const ConversationLogs = () => {
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: conversationData, isLoading, isError, error } = useQuery({
        queryKey: ['conversations', page, pageSize, searchQuery],
        queryFn: async () => {
            const response = await api.get('/api/conversations', {
                params: { page, page_size: pageSize, query: searchQuery }
            });
            return response.data;
        },
        keepPreviousData: true
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

            {isLoading && (
                <div className={styles.loadingContainer}>
                    <PulseLoader color="#4F46E5" size={10} />
                </div>
            )}

            {isError && (
                <div className={styles.errorContainer} role="alert">
                    Error loading conversation logs: {error.message}
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