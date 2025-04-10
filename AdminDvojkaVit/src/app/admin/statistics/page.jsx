"use client";

import React from 'react';
import AdminStatistics from '../AdminStatistics';
import styles from '../AdminPanel.module.css';

export default function StatisticsPage() {
  return (
    <div className={styles.adminPageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Widget Statistics</h1>
        <p className={styles.pageDescription}>
          View analytics and usage statistics for your widget
        </p>
      </div>
      
      <div className={styles.adminContentWrapper}>
        <AdminStatistics />
      </div>
    </div>
  );
} 