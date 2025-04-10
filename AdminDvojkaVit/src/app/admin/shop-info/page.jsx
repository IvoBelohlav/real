'use client';

import React from 'react';
import ShopInfoManager from '../ShopInfoManager';
import styles from '../AdminPanel.module.css';

export default function ShopInfoPage() {
  return (
    <div className={styles.adminPageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Shop Information</h1>
        <p className={styles.pageDescription}>
          Manage your shop details and information
        </p>
      </div>
      
      <div className={styles.adminContentWrapper}>
        <ShopInfoManager />
      </div>
    </div>
  );
} 