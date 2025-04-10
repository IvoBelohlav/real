'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './ConfirmDialog.module.css';

/**
 * A reusable confirmation dialog component
 * 
 * @param {Object} props 
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {Function} props.onClose - Function to call when dialog is closed
 * @param {Function} props.onConfirm - Function to call when action is confirmed
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Dialog message content
 * @param {string} props.confirmText - Text for confirm button (default: "Confirm")
 * @param {string} props.cancelText - Text for cancel button (default: "Cancel")
 * @param {string} props.confirmButtonClass - Additional class for confirm button
 * @param {string} props.type - Dialog type: 'danger', 'warning', or 'info' (default: 'warning')
 */
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = '',
  type = 'warning',
}) => {
  const dialogRef = useRef(null);

  // Handle escape key press
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // Handle click outside of dialog
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target) && isOpen) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getTypeClass = () => {
    switch (type) {
      case 'danger':
        return styles.danger;
      case 'info':
        return styles.info;
      case 'warning':
      default:
        return styles.warning;
    }
  };

  return (
    <div className={styles.dialogOverlay}>
      <div ref={dialogRef} className={`${styles.dialogContainer} ${getTypeClass()}`}>
        <div className={styles.dialogHeader}>
          <h2 className={styles.dialogTitle}>{title}</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className={styles.dialogContent}>
          <p className={styles.dialogMessage}>{message}</p>
        </div>
        <div className={styles.dialogActions}>
          <button
            className={`${styles.cancelButton}`}
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            className={`${styles.confirmButton} ${styles[type]} ${confirmButtonClass}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog; 