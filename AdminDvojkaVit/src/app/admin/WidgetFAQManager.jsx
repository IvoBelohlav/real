// src/components/Admin/WidgetFAQManager.js

'use client';

import React, { useState, useEffect } from 'react';
import { PlusCircle, RefreshCw } from 'lucide-react';
import WidgetFAQList from './WidgetFAQList';
import AddWidgetFAQForm from './AddWidgetFAQForm';
import styles from './WidgetFAQManager.module.css';

export default function WidgetFAQManager() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchFAQs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching FAQs...');
      
      // Debug info about the API request
      const apiKey = localStorage.getItem('apiKey');
      const authToken = localStorage.getItem('authToken');
      console.log(`API Key available: ${apiKey ? 'Yes (starts with ' + apiKey.substring(0, 5) + '...)' : 'No'}`);
      console.log(`Auth Token available: ${authToken ? 'Yes' : 'No'}`);
      
      const response = await fetch('/api/admin/widget-faqs');
      console.log('FAQ API Response:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error('Failed to fetch FAQs');
      }

      const data = await response.json();
      console.log(`Fetched ${data.length} FAQs successfully`);
      setFaqs(data);
    } catch (err) {
      console.error('Error fetching FAQs:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError('Failed to load FAQs. ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFAQs();
  }, []);

  const handleFAQAdded = (newFAQ) => {
    setFaqs((prevFaqs) => [...prevFaqs, newFAQ]);
    setIsAddModalOpen(false);
  };

  const handleFAQUpdated = (updatedFAQ) => {
    setFaqs((prevFaqs) =>
      prevFaqs.map((faq) => (faq.id === updatedFAQ.id ? updatedFAQ : faq))
    );
  };

  const handleFAQDeleted = (deletedId) => {
    setFaqs((prevFaqs) => prevFaqs.filter((faq) => faq.id !== deletedId));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Widget FAQs</h1>
        <div className={styles.actions}>
          <button
            className={styles.refreshButton}
            onClick={fetchFAQs}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? styles.spin : ''} />
            <span>Refresh</span>
          </button>
          <button
            className={styles.addButton}
            onClick={() => setIsAddModalOpen(true)}
          >
            <PlusCircle size={16} />
            <span>Add FAQ</span>
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading FAQs...</p>
        </div>
      ) : faqs.length === 0 ? (
        <div className={styles.empty}>
          <p>No FAQs found. Add your first FAQ to help your users.</p>
          <button
            className={styles.addEmptyButton}
            onClick={() => setIsAddModalOpen(true)}
          >
            <PlusCircle size={18} />
            <span>Add First FAQ</span>
          </button>
        </div>
      ) : (
        <WidgetFAQList
          faqs={faqs}
          onFAQUpdated={handleFAQUpdated}
          onFAQDeleted={handleFAQDeleted}
        />
      )}

      {isAddModalOpen && (
        <AddWidgetFAQForm
          onClose={() => setIsAddModalOpen(false)}
          onFAQAdded={handleFAQAdded}
        />
      )}
    </div>
  );
}    