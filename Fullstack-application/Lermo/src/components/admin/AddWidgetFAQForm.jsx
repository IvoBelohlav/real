import React, { useState } from "react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from "../../utils/api";
import { toast } from 'react-toastify';
import styles from './WidgetFAQForm.module.css';

const AddWidgetFAQForm = ({ onClose }) => {
  const queryClient = useQueryClient();
  console.log('AddWidgetFAQForm render');
  
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    keywords: "",
    category: "",
    language: "cs",
    show_in_widget: true,
    widget_order: "",
  });

  const addFAQMutation = useMutation({
    mutationFn: async (newFAQ) => {
      console.log('Adding new FAQ:', newFAQ);
      try {
        const response = await api.post('/api/widget-faqs', newFAQ);
        console.log('Add FAQ response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error adding FAQ:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('FAQ added successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['widgetFaqs'] });
      toast.success('Widget FAQ item added successfully!');
      onClose();
    },
    onError: (error) => {
      console.error('Add mutation error:', error);
      toast.error(`Failed to add Widget FAQ item: ${error.message}`);
    }
  });

  const handleChange = (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log('Form submitted with data:', formData);
    
    // Process the data for submission
    const dataToSubmit = {
      ...formData,
      keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
      widget_order: formData.widget_order ? parseInt(formData.widget_order, 10) : null,
    };
    
    console.log('Processed data for submission:', dataToSubmit);
    addFAQMutation.mutate(dataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="question">
          Question
        </label>
        <input
          className={styles.input}
          id="question"
          name="question"
          type="text"
          placeholder="Question"
          value={formData.question}
          onChange={handleChange}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="answer">
          Answer
        </label>
        <textarea
          className={styles.textarea}
          id="answer"
          name="answer"
          placeholder="Answer"
          value={formData.answer}
          onChange={handleChange}
          rows="4"
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="keywords">
          Keywords (comma-separated)
        </label>
        <input
          className={styles.input}
          id="keywords"
          name="keywords"
          type="text"
          placeholder="Keyword 1, Keyword 2, ..."
          value={formData.keywords}
          onChange={handleChange}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="category">
          Category
        </label>
        <input
          className={styles.input}
          id="category"
          name="category"
          type="text"
          placeholder="Category"
          value={formData.category}
          onChange={handleChange}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="widget_order">
          Widget Order (lower number = higher priority)
        </label>
        <input
          type="number"
          id="widget_order"
          name="widget_order"
          className={styles.input}
          placeholder="Widget Order"
          value={formData.widget_order}
          onChange={handleChange}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.checkboxContainer}>
          <input
            type="checkbox"
            id="show_in_widget"
            name="show_in_widget"
            checked={formData.show_in_widget}
            onChange={handleChange}
            className={styles.checkbox}
          />
          <span className={styles.checkboxLabel}>Show in Widget</span>
        </label>
      </div>

      {/* Submit and Cancel buttons */}
      <div className={styles.actionButtons}>
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
          disabled={addFAQMutation.isPending}
        >
          {addFAQMutation.isPending ? "Adding..." : "Add FAQ"}
        </button>
      </div>
    </form>
  );
};

export default AddWidgetFAQForm; 