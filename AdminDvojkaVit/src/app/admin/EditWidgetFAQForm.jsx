import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../utils/api";
import { toast } from "react-toastify";
import styles from './WidgetFAQForm.module.css';

const EditWidgetFAQForm = ({ onClose, faqId }) => { 
  const queryClient = useQueryClient();
  console.log('EditWidgetFAQForm - faqId:', faqId, 'type:', typeof faqId);

  // Check if faqId is valid
  useEffect(() => {
    if (!faqId) {
      console.error('EditWidgetFAQForm received invalid faqId:', faqId);
    } else {
      console.log('EditWidgetFAQForm received valid faqId:', faqId);
    }
  }, [faqId]);

  const { data: faqItem, isLoading, error } = useQuery({ 
    queryKey: ["widgetFaq", faqId],
    queryFn: async () => {
      if (!faqId) {
        console.error('Cannot fetch FAQ: faqId is falsy', faqId);
        return null;
      }
      
      console.log(`Fetching FAQ with ID: ${faqId}`);
      try {
        const response = await api.get(`/api/widget-faqs/${faqId}`);
        console.log('Fetched FAQ data:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching FAQ:', error);
        throw error;
      }
    },
    enabled: !!faqId,
    retry: 1,
  });

  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    keywords: "",
    category: "",
    language: "cs",
    show_in_widget: true,
    widget_order: "",
  });

  useEffect(() => {
    if (faqItem) {
      console.log('Setting form data from faqItem:', faqItem);
      setFormData({
        question: faqItem.question || "",
        answer: faqItem.answer || "",
        keywords: Array.isArray(faqItem.keywords) ? faqItem.keywords.join(", ") : "",
        category: faqItem.category || "",
        language: faqItem.language || "cs",
        show_in_widget: faqItem.show_in_widget !== undefined ? faqItem.show_in_widget : true,
        widget_order: faqItem.widget_order !== null ? faqItem.widget_order.toString() : "",
      });
    } else {
      console.log('No faqItem data available to set form data');
    }
  }, [faqItem]);

  const updateFAQMutation = useMutation({
    mutationFn: (updatedFAQ) => {
      console.log(`Updating FAQ with ID: ${faqId}`, updatedFAQ);
      try {
        return api.put(`/api/widget-faqs/${faqId}`, updatedFAQ);
      } catch (error) {
        console.error('Error updating FAQ:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('FAQ updated successfully:', data);
      queryClient.invalidateQueries({ queryKey: ["widgetFaqs"] });
      queryClient.invalidateQueries({ queryKey: ["widgetFaq", faqId] });
      toast.success("Widget FAQ item updated successfully!");
      onClose();
    },
    onError: (error) => {
      console.error('Update mutation error:', error);
      toast.error(`Failed to update Widget FAQ item: ${error.message}`);
    },
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
      keywords: formData.keywords.split(",").map((k) => k.trim()).filter(k => k),
      widget_order: formData.widget_order ? parseInt(formData.widget_order, 10) : null,
    };
    
    console.log('Processed data for submission:', dataToSubmit);
    updateFAQMutation.mutate(dataToSubmit);
  };

  if (isLoading) {
    return <div className={styles.formGroup}>Loading FAQ item...</div>;
  }
  
  if (error) {
    console.error('Error in edit form:', error);
    return (
      <div className={styles.formGroup}>
        <div className={styles.error}>Error loading FAQ item: {error.message}</div>
        <div className={styles.actionButtons}>
          <button
            onClick={onClose}
            className={styles.cancelButton}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // If we don't have data but we're not loading or have an error, show a message
  if (!faqItem && !isLoading && !error) {
    return (
      <div className={styles.formGroup}>
        <div>No FAQ data found for ID: {faqId}</div>
        <div className={styles.actionButtons}>
          <button
            onClick={onClose}
            className={styles.cancelButton}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

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
          disabled={updateFAQMutation.isPending}
        >
          {updateFAQMutation.isPending ? "Updating..." : "Update FAQ"}
        </button>
      </div>
    </form>
  );
};

export default EditWidgetFAQForm; 