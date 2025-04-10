'use client';

import React from 'react';
import WidgetConfigForm from './WidgetConfigForm';
import { AuthProvider } from '@/components/layout/AuthProvider';
import styles from './WidgetConfigManager.module.css';

export default function WidgetConfigManager() {
  const handleSubmit = async (config) => {
    try {
      const response = await fetch('/api/widget-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save widget configuration');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error saving widget config:', error);
      throw error;
    }
  };

  return (
    <AuthProvider>
      <div className={styles.container}>
        <h1 className={styles.title}>Widget Configuration</h1>
        <WidgetConfigForm onSubmit={handleSubmit} />
      </div>
    </AuthProvider>
  );
} 