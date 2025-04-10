'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '../../lib/api';
import styles from '../auth/login/login.module.css';

export default function VerifyEmail() {
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Verifying your email...');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. No token provided.');
        return;
      }

      try {
        const result = await authAPI.verifyEmail(token);
        
        if (result.success) {
          setStatus('success');
          setMessage('Email verified successfully! You can now log in.');
          // Redirect to login page after 3 seconds
          setTimeout(() => {
            router.push('/auth/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(result.error || 'Failed to verify email. Please try again.');
        }
      } catch (error) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Email Verification</h1>
        
        {status === 'verifying' && (
          <div className={styles.info}>
            {message}
          </div>
        )}
        
        {status === 'success' && (
          <div className={styles.success}>
            {message}
          </div>
        )}
        
        {status === 'error' && (
          <div className={styles.error}>
            {message}
          </div>
        )}
        
        <div className={styles.register}>
          <Link href="/auth/login">Go to Login</Link>
        </div>
      </div>
    </div>
  );
} 