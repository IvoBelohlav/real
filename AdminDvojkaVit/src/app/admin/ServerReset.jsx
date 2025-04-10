import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import styles from './ServerReset.module.css';

const ServerReset = () => {
  const [showConfirm, setShowConfirm] = useState(false);

  const resetMutation = useMutation({
    mutationFn: () => api.post('/api/admin/reset-server'),
    onSuccess: () => {
      toast.success('Server reset successful');
      setShowConfirm(false);
      window.location.reload();
    },
    onError: (error) => {
      toast.error(`Reset failed: ${error.response?.data?.detail || error.message}`);
      setShowConfirm(false);
    },
  });

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className={styles.resetButton}
      >
        Reset Server
      </button>
    );
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <AlertCircle className={styles.alertIcon} />
          <h3 className={styles.modalTitle}>Confirm Server Reset</h3>
        </div>
        
        <p className={styles.modalDescription}>
          This will delete all data except user accounts. This action cannot be undone.
        </p>
        
        <div className={styles.modalActions}>
          <button
            onClick={() => setShowConfirm(false)}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            className={styles.confirmButton}
          >
            {resetMutation.isPending ? 'Resetting...' : 'Reset Server'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServerReset;