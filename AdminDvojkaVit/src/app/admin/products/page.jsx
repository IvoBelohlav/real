'use client';

import React from 'react';
import ProductList from '../ProductList';
import styles from '../AdminPanel.module.css';

export default function ProductsPage() {
  return (
    <div className={styles.adminPageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Products Management</h1>
        <p className={styles.pageDescription}>
          Manage your product catalog for your widget
        </p>
      </div>
      
      <div className={styles.adminContentWrapper}>
        <ProductList />
      </div>
    </div>
  );
} 