'use client';

import React from 'react';
import ContactAdminSubmissions from '../ContactAdminSubmissions';
import styles from '../AdminPanel.module.css';

export default function ContactSubmissionsPage() {
  return (
    <div className={styles.adminPageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Contact Submissions</h1>
        <p className={styles.pageDescription}>
          View and manage contact form submissions from users
        </p>
      </div>
      
      <div className={styles.adminContentWrapper}>
        <ContactAdminSubmissions />
      </div>
    </div>
  );
} 