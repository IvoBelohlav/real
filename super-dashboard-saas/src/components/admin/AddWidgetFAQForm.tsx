'use client';

import React, { useState } from 'react';
import { Dialog } from '@/app/ui/Dialog';
import styles from './WidgetFAQForm.module.css';

const AddWidgetFAQForm = ({ onClose, onFAQAdded = () => {} }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim() || !answer.trim()) {
      setError('Question and answer are required');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/admin/widget-faqs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          answer,
          category,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add FAQ');
      }
      
      const newFAQ = await response.json();
      onFAQAdded(newFAQ);
    } catch (err) {
      console.error('Error adding FAQ:', err);
      setError(err.message || 'An error occurred while adding the FAQ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose}>
      <Dialog.Panel className={styles.formContainer}>
        <div className={styles.formHeader}>
          <Dialog.Title className={styles.formTitle}>Add New FAQ</Dialog.Title>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorMessage}>{error}</div>}
          
          <div className={styles.formGroup}>
            <label htmlFor="category" className={styles.label}>
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={styles.select}
              required
            >
              <option value="general">General</option>
              <option value="usage">Usage</option>
              <option value="billing">Billing</option>
              <option value="technical">Technical</option>
              <option value="account">Account</option>
            </select>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="question" className={styles.label}>
              Question
            </label>
            <input
              id="question"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className={styles.input}
              placeholder="Enter the frequently asked question"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="answer" className={styles.label}>
              Answer
            </label>
            <textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className={styles.textarea}
              placeholder="Enter the answer to the question"
              rows={4}
              required
            />
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add FAQ'}
            </button>
          </div>
        </form>
      </Dialog.Panel>
    </Dialog>
  );
};

export default AddWidgetFAQForm; 