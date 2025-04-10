'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import axios from 'axios';
import { generateWidgetInstallationCode } from '@/lib/widget-utils';
import styles from './Installation.module.css';

export default function Installation() {
  const [apiKey, setApiKey] = useState('');
  const [widgetConfig, setWidgetConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchApiKeyAndConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch API key
        const apiKeyResponse = await axios.get('/api/api-keys');
        
        // Fetch widget configuration
        const configResponse = await axios.get('/api/widget/config');
        
        setApiKey(apiKeyResponse.data.apiKey || '');
        setWidgetConfig(configResponse.data.config || {});
      } catch (err) {
        setError('Failed to load API key or widget configuration. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchApiKeyAndConfig();
    }
  }, [user]);

  const handleCopyCode = () => {
    if (codeRef.current) {
      const code = codeRef.current.textContent;
      navigator.clipboard.writeText(code)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => {
          console.error('Failed to copy code:', err);
        });
    }
  };

  const installationCode = apiKey && widgetConfig 
    ? generateWidgetInstallationCode(apiKey, widgetConfig)
    : '';

  if (loading) {
    return <div className={styles.loading}>Loading installation details...</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Widget Installation</h1>
      <p className={styles.description}>
        Add the following code snippet to your website to enable the chat widget.
      </p>
      
      {error && <div className={styles.error}>{error}</div>}
      
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Installation Code</h2>
        <p className={styles.info}>
          This code should be added right before the closing <code>&lt;/body&gt;</code> tag in your HTML.
        </p>
        
        <div className={styles.codeContainer}>
          <pre className={styles.code} ref={codeRef}>
            {installationCode}
          </pre>
          
          <button 
            className={styles.copyButton}
            onClick={handleCopyCode}
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
      </div>
      
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Next Steps</h2>
        <ul className={styles.steps}>
          <li className={styles.step}>
            <strong>Configure your widget</strong> by visiting the{' '}
            <a href="/widget" className={styles.link}>Widget Settings</a> page.
          </li>
          <li className={styles.step}>
            <strong>Manage your domains</strong> by visiting the{' '}
            <a href="/widget/domains" className={styles.link}>Domain Management</a> page.
          </li>
          <li className={styles.step}>
            <strong>Test your widget</strong> after installation by opening your website and
            verifying the chat button appears.
          </li>
        </ul>
      </div>
      
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Need Help?</h2>
        <p className={styles.help}>
          If you're having trouble installing the widget, please check the{' '}
          <a href="/documentation" className={styles.link}>documentation</a> or{' '}
          <a href="/support" className={styles.link}>contact support</a>.
        </p>
      </div>
    </div>
  );
} 