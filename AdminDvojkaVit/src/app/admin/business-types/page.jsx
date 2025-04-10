'use client';

import React from 'react';
import BusinessTypeManagement from '../BusinessTypeManagement';
import styles from '../AdminPanel.module.css';

export default function BusinessTypesPage() {
  return (
    <div className={`${styles.adminPageContainer} ${styles.root}`}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Business Types Management</h1>
        <p className={styles.pageDescription}>
          Manage the business types for your widget configuration
        </p>
      </div>
      
      <div className={styles.adminContentWrapper}>
        <BusinessTypeManagement />
      </div>
    </div>
  );
} 