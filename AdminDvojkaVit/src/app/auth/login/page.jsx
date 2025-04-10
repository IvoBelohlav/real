'use client'; // Ensure this is a client component

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Import useRouter for redirection
import { useAuth } from '@/context/AuthContext'; // Import AuthContext hook
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter(); // Get router instance
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth(); // Use login from AuthContext

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form inputs
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use login from AuthContext
      const result = await login(email, password);

      if (!result.success) {
        // Handle error case
        console.error('Login Error:', result.error);
        setError(result.error || 'Invalid email or password.');
      } else {
        // Login successful, redirect to dashboard
        console.log('Login successful, redirecting...');
        localStorage.setItem('isLoggedIn', 'true'); // Set a flag for session persistence
        router.push('/dashboard'); // Redirect to dashboard on success
      }
    } catch (error) {
      // Catch network errors or other unexpected issues
      console.error('Login submission error:', error);
      setError('An error occurred connecting to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Sign in to your account</h1>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="email-address" className={styles.label}>
              Email address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={styles.input}
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className={styles.forgotPassword}>
            <Link href="/auth/forgot-password">Forgot your password?</Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={styles.button}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className={styles.register}>
          Or <Link href="/auth/register">create a new account</Link>
        </div>

        <div className={styles.backLink}>
          <Link href="/landing">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
