'use client';

import React from 'react';
import WidgetFAQManager from '../WidgetFAQManager';
import styles from '../AdminPanel.module.css';

export default function WidgetFAQsPage() {
  return (
    <div className={styles.adminPageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Widget FAQs</h1>
        <p className={styles.pageDescription}>
          Manage frequently asked questions for your widget
        </p>
      </div>
      
      <div className={styles.adminContentWrapper}>
        <WidgetFAQManager />
      </div>
    </div>
  );
} 