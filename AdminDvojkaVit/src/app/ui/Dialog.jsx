'use client';

import React, { Fragment, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './Dialog.module.css';

// Custom Dialog component to replace @headlessui/react Dialog
const Dialog = ({ open, onClose, children, className = '' }) => {
  const dialogRef = useRef(null);

  // Handle escape key press
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [open, onClose]);

  // Handle click outside of dialog
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target) && open) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  // Handle prevent body scroll when dialog is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.dialogOverlay}>
      <div ref={dialogRef} className={`${styles.dialogContainer} ${className}`}>
        {children}
      </div>
    </div>
  );
};

// Dialog.Panel component
Dialog.Panel = ({ className = '', children }) => {
  return <div className={`${styles.dialogPanel} ${className}`}>{children}</div>;
};

// Dialog.Title component
Dialog.Title = ({ className = '', children }) => {
  return <div className={`${styles.dialogTitle} ${className}`}>{children}</div>;
};

// Dialog.Description component
Dialog.Description = ({ className = '', children }) => {
  return <div className={`${styles.dialogDescription} ${className}`}>{children}</div>;
};

// Simple transition component to replace Headless UI's Transition
const Transition = ({ show, enter, enterFrom, enterTo, leave, leaveFrom, leaveTo, children }) => {
  if (!show) return null;
  return <Fragment>{children}</Fragment>;
};

// Export components
export { Dialog, Transition }; 