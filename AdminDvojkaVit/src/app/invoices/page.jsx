'use client';

import { useState, useEffect } from 'react';
// Ensure the configured api instance is imported
import api from '../../lib/api';
import { useAuth } from '../../components/layout/AuthProvider';
import styles from './Invoices.module.css';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [success, setSuccess] = useState(null);
  const { user, refreshToken, logout } = useAuth(); // Get refreshToken and logout from context

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError(null);

        try {
            // Use the configured 'api' instance
            const response = await api.get('/invoices'); // Use relative path
            setInvoices(response.data.invoices || []);
        } catch (initialError) {
            console.warn("Initial fetchInvoices failed, attempting token refresh:", initialError.message);
            // If initial fetch fails (potentially 401), try refreshing the token
            const refreshed = await refreshToken();
            if (refreshed) {
                console.log("Token refreshed successfully, retrying fetchInvoices...");
                try {
                    // Retry fetching invoices with the new token
                    const response = await api.get('/invoices');
                    setInvoices(response.data.invoices || []);
                } catch (retryError) {
                    setError('Failed to load invoices even after token refresh. Please login again.');
                    console.error("Error fetching invoices after refresh:", retryError);
                    logout(); // Log out if retry fails
                }
            } else {
                // Refresh failed, likely need to log in again
                setError('Session expired. Please login again.');
                logout(); // Log out if refresh fails
            }
        }
      } catch (err) { // This outer catch might not be needed anymore
        setError('Failed to load invoices. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Don't rely on user object from context initially,
    // as it might be stale. Trigger fetch directly.
    // if (user) {
    fetchInvoices();
    // }
  }, [refreshToken, logout]); // Add dependencies

  const handleDownload = async (invoice) => {
    try {
      setDownloadingId(invoice.stripeInvoiceId);

      // Open PDF in a new tab if PDF URL is available
      if (invoice.pdfUrl) {
        window.open(invoice.pdfUrl, '_blank');
      } else {
        setError('Invoice PDF is not available for download.');
      }
    } catch (err) {
      setError('Failed to download invoice. Please try again.');
      console.error(err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSendEmail = async (invoice) => {
    try {
      setSendingEmailId(invoice.stripeInvoiceId);
      setError(null);
      setSuccess(null);

      // Use the configured 'api' instance
      await api.post('/invoices', { // Use relative path
        invoiceId: invoice.stripeInvoiceId
      });

      setSuccess('Invoice has been sent to your email address.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to send invoice to email. Please try again.');
      console.error(err);
    } finally {
      setSendingEmailId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100); // Stripe amounts are in cents
  };

  if (loading) {
    return <div className={styles.loading}>Loading invoices...</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Invoices</h1>
      <p className={styles.description}>
        View and download your invoice history.
      </p>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {invoices.length === 0 ? (
        <div className={styles.noInvoices}>
          <p>You don't have any invoices yet.</p>
        </div>
      ) : (
        <div className={styles.invoicesTable}>
          <div className={styles.tableHeader}>
            <div className={styles.headerCell}>Invoice</div>
            <div className={styles.headerCell}>Date</div>
            <div className={styles.headerCell}>Period</div>
            <div className={styles.headerCell}>Amount</div>
            <div className={styles.headerCell}>Status</div>
            <div className={styles.headerCell}>Actions</div>
          </div>

          {invoices.map((invoice) => (
            <div key={invoice.stripeInvoiceId} className={styles.tableRow}>
              <div className={styles.cell}>
                #{invoice.stripeInvoiceId.slice(-8)}
              </div>
              <div className={styles.cell}>
                {formatDate(invoice.createdAt)}
              </div>
              <div className={styles.cell}>
                {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
              </div>
              <div className={styles.cell}>
                {formatCurrency(invoice.amount, invoice.currency)}
              </div>
              <div className={styles.cell}>
                <span className={`${styles.status} ${styles[invoice.status]}`}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>
              <div className={styles.cell}>
                <div className={styles.actions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleDownload(invoice)}
                    disabled={downloadingId === invoice.stripeInvoiceId}
                  >
                    {downloadingId === invoice.stripeInvoiceId ? 'Opening...' : 'Download'}
                  </button>

                  <button
                    className={styles.actionButton}
                    onClick={() => handleSendEmail(invoice)}
                    disabled={sendingEmailId === invoice.stripeInvoiceId}
                  >
                    {sendingEmailId === invoice.stripeInvoiceId ? 'Sending...' : 'Email'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.subscriptionLink}>
        <a href="/billing" className={styles.link}>
          ← Back to Subscription Management
        </a>
      </div>
    </div>
  );
}
