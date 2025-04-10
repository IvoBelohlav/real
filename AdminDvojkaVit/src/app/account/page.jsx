'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../components/layout/AuthProvider';
import ConfirmDialog from '../../components/ConfirmDialog';
import styles from './Account.module.css';

export default function Account() {
  const { user, logout } = useAuth();
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteVerification, setDeleteVerification] = useState('');

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        company: user.company || ''
      });
      setLoading(false);
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSavingProfile(true);
      setError(null);
      setSuccess(null);
      
      await axios.put('/api/users/profile', profileForm);
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    
    try {
      setChangingPassword(true);
      setError(null);
      setSuccess(null);
      
      await axios.put('/api/users/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      setSuccess('Password changed successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Current password is incorrect.');
      } else {
        setError('Failed to change password. Please try again.');
      }
      console.error(err);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteVerification !== 'DELETE') {
      setError('Please type DELETE to confirm account deletion.');
      setShowDeleteConfirm(false);
      return;
    }
    
    try {
      await axios.delete('/api/users/account');
      logout();
    } catch (err) {
      setError('Failed to delete account. Please try again or contact support.');
      console.error(err);
    } finally {
      setShowDeleteConfirm(false);
      setDeleteVerification('');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading account information...</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Account Settings</h1>
      
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}
      
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Profile Information</h2>
        <form onSubmit={handleProfileSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="firstName" className={styles.label}>First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={profileForm.firstName}
                onChange={handleProfileChange}
                className={styles.input}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="lastName" className={styles.label}>Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={profileForm.lastName}
                onChange={handleProfileChange}
                className={styles.input}
                required
              />
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={profileForm.email}
              onChange={handleProfileChange}
              className={styles.input}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="company" className={styles.label}>Company (Optional)</label>
            <input
              type="text"
              id="company"
              name="company"
              value={profileForm.company}
              onChange={handleProfileChange}
              className={styles.input}
            />
          </div>
          
          <div className={styles.buttonContainer}>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={savingProfile}
            >
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
      
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="currentPassword" className={styles.label}>Current Password</label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              className={styles.input}
              required
            />
          </div>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="newPassword" className={styles.label}>New Password</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                className={styles.input}
                required
                minLength={8}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                className={styles.input}
                required
                minLength={8}
              />
            </div>
          </div>
          
          <div className={styles.buttonContainer}>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={changingPassword}
            >
              {changingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
      
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Danger Zone</h2>
        <div className={styles.dangerZone}>
          <div className={styles.dangerInfo}>
            <h3 className={styles.dangerTitle}>Delete Account</h3>
            <p className={styles.dangerDescription}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </div>
          <button 
            className={styles.deleteButton}
            onClick={() => setShowDeleteConfirm(true)}
            type="button"
          >
            Delete Account
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteVerification('');
        }}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message={
          <>
            <p>This action cannot be undone. All your data will be permanently deleted.</p>
            <p>Please type <strong>DELETE</strong> to confirm:</p>
            <input
              type="text"
              value={deleteVerification}
              onChange={(e) => setDeleteVerification(e.target.value)}
              className={styles.input}
              style={{ marginTop: '10px' }}
            />
          </>
        }
        confirmButtonText="Delete Account"
        cancelButtonText="Cancel"
        isDangerous={true}
      />
    </div>
  );
} 