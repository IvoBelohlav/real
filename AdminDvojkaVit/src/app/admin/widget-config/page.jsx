'use client';

import React from 'react';
// Import WidgetConfigManager instead of WidgetConfigForm
import WidgetConfigManager from '../WidgetConfigManager';
import styles from '../AdminPanel.module.css';

export default function WidgetConfigPage() {
  return (
    <div className={styles.adminPageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Widget Configuration</h1>
        <p className={styles.pageDescription}>
          Customize the appearance and behavior of your widget
        </p>
      </div>

      <div className={styles.adminContentWrapper}>
        {/* Render WidgetConfigManager which handles data fetching and submission */}
        <WidgetConfigManager />
      </div>
    </div>
  );
}
