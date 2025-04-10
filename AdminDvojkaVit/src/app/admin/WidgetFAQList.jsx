// src/components/Admin/WidgetFAQList.jsx
'use client';

import React, { useState } from 'react';
import { Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './WidgetFAQList.module.css';

const WidgetFAQList = ({ faqs = [], onFAQUpdated, onFAQDeleted }) => {
  const [expandedFaqs, setExpandedFaqs] = useState({});

  const toggleExpand = (id) => {
    setExpandedFaqs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/widget-faqs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete FAQ');
      }

      onFAQDeleted(id);
    } catch (err) {
      console.error('Error deleting FAQ:', err);
      alert('Failed to delete FAQ. Please try again.');
  }
  };

  return (
    <div className={styles.faqList}>
      {faqs.map((faq) => (
        <div key={faq.id} className={styles.faqItem}>
          <div className={styles.faqHeader}>
            <button
              className={styles.faqToggle}
              onClick={() => toggleExpand(faq.id)}
              aria-expanded={expandedFaqs[faq.id]}
            >
              {expandedFaqs[faq.id] ? (
                <ChevronUp size={18} />
              ) : (
                <ChevronDown size={18} />
              )}
              <span className={styles.faqQuestion}>{faq.question}</span>
            </button>
            <div className={styles.faqActions}>
                    <button
                      className={styles.editButton}
                onClick={() => alert('Edit functionality not implemented yet')}
                aria-label="Edit FAQ"
                    >
                <Edit size={16} />
                    </button>
                    <button
                className={styles.deleteButton}
                      onClick={() => handleDelete(faq.id)}
                aria-label="Delete FAQ"
                    >
                <Trash2 size={16} />
                    </button>
            </div>
          </div>
          {expandedFaqs[faq.id] && (
            <div className={styles.faqContent}>
              <div className={styles.faqAnswer}>{faq.answer}</div>
              <div className={styles.faqMeta}>
                <span className={styles.faqCategory}>
                  Category: {faq.category || 'Uncategorized'}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default WidgetFAQList;