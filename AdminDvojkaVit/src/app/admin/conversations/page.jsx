'use client';

import React from 'react';
import ConversationLogs from '../ConversationLogs';
import styles from '../AdminPanel.module.css';

export default function ConversationsPage() {
  return (
    <div className={styles.adminPageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Conversation Logs</h1>
        <p className={styles.pageDescription}>
          View and analyze widget conversations with users
        </p>
      </div>
      
      <div className={styles.adminContentWrapper}>
        <ConversationLogs />
      </div>
    </div>
  );
} 