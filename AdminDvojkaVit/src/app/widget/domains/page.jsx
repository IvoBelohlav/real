'use client';

import { useState, useEffect } from 'react';
// Import the configured api instance instead of default axios
import api from '../../../lib/api';
import styles from './Domains.module.css';

export default function Domains() {
  const [domains, setDomains] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use the configured 'api' instance
      const response = await api.get('/subscriptions/authorized-domains'); // Use relative path
      setDomains(response.data.domains || []);
    } catch (err) {
      setError('Failed to load authorized domains. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!newDomain) return;

    try {
      setAdding(true);
      setError(null);
      setSuccess(null);

      // Use the configured 'api' instance
      await api.post('/subscriptions/authorized-domains', { domain: newDomain }); // Use relative path

      setSuccess(`Domain "${newDomain}" has been added successfully.`);
      setNewDomain('');
      fetchDomains(); // Refresh list after adding
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add domain. Please try again.'); // Show backend error if available
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveDomain = async (domain) => {
    if (!window.confirm(`Are you sure you want to remove "${domain}" from authorized domains?`)) {
      return;
    }

    try {
      setRemoving(true);
      setError(null);
      setSuccess(null);

      // Use the configured 'api' instance
      // Assuming backend expects domain in URL path for DELETE based on common REST practices
      // Adjust if backend expects { data: { domain } }
      await api.delete(`/subscriptions/authorized-domains/${encodeURIComponent(domain)}`); // Use relative path and path param

      setSuccess(`Domain "${domain}" has been removed successfully.`);
      fetchDomains(); // Refresh list after removing
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove domain. Please try again.'); // Show backend error if available
      console.error(err);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Domain Management</h1>
      <p className={styles.description}>
        Manage which domains are authorized to use your widget. Only requests from these domains will be allowed.
        If no domains are specified, your widget will work on any domain.
      </p>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.addDomainForm}>
        <h2 className={styles.subtitle}>Add New Domain</h2>
        <form onSubmit={handleAddDomain} className={styles.form}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              className={styles.input}
              disabled={adding}
            />
            <button
              type="submit"
              className={styles.addButton}
              disabled={adding || !newDomain}
            >
              {adding ? 'Adding...' : 'Add Domain'}
            </button>
          </div>
          <p className={styles.helper}>
            You can use wildcards for subdomains, e.g., <code>*.example.com</code>
          </p>
        </form>
      </div>

      <div className={styles.domainsList}>
        <h2 className={styles.subtitle}>Authorized Domains</h2>

        {loading ? (
          <div className={styles.loading}>Loading domains...</div>
        ) : domains.length === 0 ? (
          <div className={styles.noDomains}>
            <p>No domains have been authorized yet.</p>
            <p className={styles.note}>
              Note: When no domains are specified, your widget will work on any domain.
              For security, we recommend adding specific domains.
            </p>
          </div>
        ) : (
          <>
            <p className={styles.domainCount}>
              {domains.length} domain{domains.length !== 1 ? 's' : ''} authorized
            </p>
            <ul className={styles.domains}>
              {domains.map((domain) => (
                <li key={domain} className={styles.domainItem}>
                  <span className={styles.domain}>{domain}</span>
                  <button
                    onClick={() => handleRemoveDomain(domain)}
                    className={styles.removeButton}
                    disabled={removing}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className={styles.securityInfo}>
        <h2 className={styles.subtitle}>About Domain Validation</h2>
        <p>
          Domain validation is a security feature that restricts your widget to work only on domains you have explicitly authorized.
          This prevents unauthorized usage of your API key on other websites.
        </p>
        <h3 className={styles.listTitle}>How it works:</h3>
        <ul className={styles.securityList}>
          <li>When a visitor loads your widget on a website, the widget sends your API key to our server</li>
          <li>Our server checks if the request is coming from an authorized domain</li>
          <li>If the domain is authorized (or if no domains are specified), the request is allowed</li>
          <li>If the domain is not authorized, the request is blocked</li>
        </ul>
      </div>
    </div>
  );
}
