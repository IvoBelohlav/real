'use client';

import React from 'react';
import GuidedChatManager from '../GuidedChatManager';
import styles from '../AdminPanel.module.css';

export default function GuidedChatPage() {
  return (
    <div className={styles.adminPageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Guided Chat Management</h1>
        <p className={styles.pageDescription}>
          Create and manage guided chat flows for your widget
        </p>
      </div>
      
      <div className={styles.adminContentWrapper}>
        <GuidedChatManager />
      </div>
    </div>
  );
} 