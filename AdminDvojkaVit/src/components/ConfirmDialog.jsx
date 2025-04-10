'use client';

import { useState } from 'react';
import styles from './ConfirmDialog.module.css';

export default function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action', 
  message = 'Are you sure you want to proceed?',
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  isDangerous = false
}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className={styles.overlay} 
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div 
        className={styles.dialog} 
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        
        <div className={styles.buttonContainer}>
          <button 
            className={styles.cancelButton} 
            onClick={onClose}
          >
            {cancelButtonText}
          </button>
          <button 
            className={`${styles.confirmButton} ${isDangerous ? styles.dangerButton : ''}`} 
            onClick={handleConfirm}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
} 