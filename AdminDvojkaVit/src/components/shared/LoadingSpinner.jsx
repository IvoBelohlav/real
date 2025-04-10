import React from 'react';
import styles from './LoadingSpinner.module.css';

const LoadingSpinner = ({ size = 'medium', color = '#0070F3' }) => {
  const sizeClass = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large
  }[size] || styles.medium;

  return (
    <div className={`${styles.spinner} ${sizeClass}`} style={{ borderTopColor: color }}>
      <span className={styles.visuallyHidden}>Loading...</span>
    </div>
  );
};

export default LoadingSpinner; 