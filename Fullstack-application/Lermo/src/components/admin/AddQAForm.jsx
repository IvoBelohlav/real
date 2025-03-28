import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import styles from './AddQAForm.module.css';

const AddQAForm = ({ onClose, defaultShowInWidget = false }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [keywords, setKeywords] = useState('');
  const [category, setCategory] = useState('');
  const [showInWidget, setShowInWidget] = useState(defaultShowInWidget);
  const [widgetOrder, setWidgetOrder] = useState('');
  const [intent, setIntent] = useState('');
  const [intentKeywords, setIntentKeywords] = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);

  const queryClient = useQueryClient();

  const addQAMutation = useMutation({
    mutationFn: (newQA) => api.post('/api/qa', newQA),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa'] });
      onClose();
      toast.success('QA item added successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to add QA item: ${error.message}`);
    }
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    addQAMutation.mutate({
      question,
      answer,
      keywords: keywords.split(',').map(k => k.trim()),
      category,
      language: 'cze',
      show_in_widget: showInWidget,
      widget_order: widgetOrder ? parseInt(widgetOrder, 10) : null,
      intent,
      intent_keywords: intentKeywords.split(',').map(ik => ik.trim()),
      confidence_threshold: parseFloat(confidenceThreshold)
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.formContainer}>
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="question">
          Question
        </label>
        <input
          className={styles.input}
          id="question"
          type="text"
          placeholder="Question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          title="Enter the question you want to add to the QA system."
        />
        <p className={styles.helperText}>Enter the question you want to add.</p>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="answer">
          Answer
        </label>
        <textarea
          className={styles.textarea}
          id="answer"
          placeholder="Answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows="4"
          title="Provide the answer to the question."
        />
         <p className={styles.helperText}>Provide a detailed answer to the question.</p>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="keywords">
          Keywords (comma-separated)
        </label>
        <input
          className={styles.input}
          id="keywords"
          type="text"
          placeholder="Keyword 1, Keyword 2, ..."
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          title="Enter keywords related to the question, separated by commas. These help improve searchability."
        />
         <p className={styles.helperText}>Keywords for searchability (e.g., 'price, cost, amount').</p>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="category">
          Category
        </label>
        <input
          className={styles.input}
          id="category"
          type="text"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          title="Categorize the QA item for better organization."
        />
         <p className={styles.helperText}>Categorize for organization (e.g., 'Pricing', 'Features').</p>
      </div>

      {/* Fields for Widget FAQ */}
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="show_in_widget">
          Show in Widget
        </label>
        <input
          type="checkbox"
          id="show_in_widget"
          checked={showInWidget}
          onChange={(e) => setShowInWidget(e.target.checked)}
          className={styles.checkbox}
          title="Check this to display the FAQ in the widget."
        />
         <p className={styles.helperText}>Display this FAQ in the chat widget.</p>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="widget_order">
          Widget Order (lower number = higher priority)
        </label>
        <input
          type="number"
          id="widget_order"
          value={widgetOrder}
          onChange={(e) => setWidgetOrder(e.target.value)}
          className={styles.input}
          placeholder="Widget Order"
          title="Set the order in which this FAQ appears in the widget (lower number = higher priority)."
        />
         <p className={styles.helperText}>Order in widget FAQ list (optional, lower is higher).</p>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="intent">
          Intent
        </label>
        <input
          className={styles.input}
          id="intent"
          type="text"
          placeholder="Intent"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          title="Specify the intent for this QA item. This helps the chatbot understand user queries."
        />
         <p className={styles.helperText}>Intent classification (e.g., 'pricing_query', 'feature_inquiry').</p>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="intent_keywords">
          Intent Keywords (comma-separated)
        </label>
        <input
          className={styles.input}
          id="intent_keywords"
          type="text"
          placeholder="Intent Keyword 1, Intent Keyword 2, ..."
          value={intentKeywords}
          onChange={(e) => setIntentKeywords(e.target.value)}
          title="Keywords that help identify the intent, separated by commas."
        />
         <p className={styles.helperText}>Keywords to identify the intent (e.g., 'price intent keywords').</p>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="confidence_threshold">
          Confidence Threshold
        </label>
        <input
          className={styles.input}
          id="confidence_threshold"
          type="number"
          step="0.01"
          min="0"
          max="1"
          placeholder="0.7"
          value={confidenceThreshold}
          onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
          title="Set the confidence threshold for this QA item to be considered a match."
        />
         <p className={styles.helperText}>Confidence level for considering this QA a match (0-1).</p>
      </div>

      {/* Submit and Cancel buttons */}
      <div className={styles.buttonGroup}>
        <button
          className={styles.cancelButton}
          type="button"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className={styles.submitButton}
          type="submit"
        >
          Add QA
        </button>
      </div>
    </form>
  );
};

export default AddQAForm;