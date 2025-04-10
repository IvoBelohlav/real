import React from 'react';
import { format } from 'date-fns';
import styles from './ConversationTable.module.css';

const ConversationTable = ({ conversations, page, pageSize, onPageChange }) => {
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return format(date, 'yyyy-MM-dd HH:mm:ss');
    };

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead className={styles.tableHeader}>
                    <tr>
                        <th scope="col" className={styles.tableHeaderCell}>
                            Conversation ID
                        </th>
                        <th scope="col" className={styles.tableHeaderCell}>
                            Timestamp
                        </th>
                        <th scope="col" className={styles.tableHeaderCell}>
                            Query
                        </th>
                        <th scope="col" className={styles.tableHeaderCell}>
                            Response
                        </th>
                        <th scope="col" className={styles.tableHeaderCell}>
                            Source
                        </th>
                        <th scope="col" className={styles.tableHeaderCell}>
                            Confidence
                        </th>
                    </tr>
                </thead>
                <tbody className={styles.tableBody}>
                    {conversations.map((conversation) => (
                        <tr key={conversation.conversation_id} className={styles.tableRow}>
                            <td className={styles.idCell}>
                                {conversation.conversation_id}
                            </td>
                            <td className={styles.timestampCell}>
                                {formatDate(conversation.timestamp)}
                            </td>
                            <td className={styles.textCell}>
                                {conversation.query}
                            </td>
                            <td className={styles.textCell}>
                                {conversation.response}
                            </td>
                            <td className={styles.metaCell}>
                                {conversation.source}
                            </td>
                            <td className={styles.metaCell}>
                                {conversation.confidence_score?.toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className={styles.pagination}>
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className={styles.paginationButton}
                >
                    Previous
                </button>
                <span className={styles.pageInfo}>
                    Page <strong className={styles.pageNumber}>{page}</strong>
                </span>
                <button
                    onClick={() => onPageChange(page + 1)}
                    className={styles.paginationButton}
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default ConversationTable;