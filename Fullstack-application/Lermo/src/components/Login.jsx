import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuthToken } from '../utils/auth';
import { toast } from 'react-toastify';
import styles from './Login.module.css';
import '../assets/main.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {

      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: email,
          password: password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.access_token) {
          setAuthToken(data.access_token);
          // Store refresh token
          localStorage.setItem('refresh_token', data.refresh_token);
          toast.success('Login successful!');
          navigate('/admin', { replace: true });
        } else {
          toast.error('Invalid response from server');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      toast.error('Network error. Please check your connection.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <div className={styles.formContent}>
          <h2 className={styles.title}>
            Admin Login
          </h2>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <div>
              <label htmlFor="email" className={styles.srOnly}>Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={styles.emailInput}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className={styles.srOnly}>Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={styles.passwordInput}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={styles.button}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;