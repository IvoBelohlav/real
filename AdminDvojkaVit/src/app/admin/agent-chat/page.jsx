'use client';

import React from 'react';
import styles from '../AdminPanel.module.css';

export default function AgentChatPage() {
  return (
    <div className={styles.adminPageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Human Support</h1>
        <p className={styles.pageDescription}>
          Manage and respond to live customer inquiries
        </p>
      </div>
      
      <div className={styles.adminContentWrapper}>
        <div className={styles.notImplementedMessage}>
          <h2>Coming Soon</h2>
          <p>The Human Support feature is currently being developed.</p>
        </div>
      </div>
    </div>
  );
} 