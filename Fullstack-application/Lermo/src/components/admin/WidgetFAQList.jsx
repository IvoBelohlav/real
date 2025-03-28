// src/components/Admin/WidgetFAQList.jsx
import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../utils/api";
import { toast } from "react-toastify";
import { AlertCircle, Edit, Trash2 } from "lucide-react";
import styles from "./WidgetFAQList.module.css";

const WidgetFAQList = ({ onEdit, data: faqResponse, isLoading }) => {
  const queryClient = useQueryClient();

  // We're now receiving the data from props rather than fetching it directly
  console.log('WidgetFAQList render - data:', faqResponse, 'isLoading:', isLoading);

  const deleteQAMutation = useMutation({
    mutationFn: (faqId) => {
      console.log(`Deleting FAQ with ID: ${faqId}`);
      return api.delete(`/api/widget-faqs/${faqId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["widgetFaqs"] });
      toast.success("Widget FAQ Item deleted successfully");
    },
    onError: (error) => {
      console.error('Error deleting FAQ:', error);
      toast.error(`Failed to delete Widget FAQ item: ${error.message}`);
    },
  });

  const handleDelete = async (faqId) => {
    if (window.confirm("Are you sure you want to delete this Widget FAQ item?")) {
      deleteQAMutation.mutate(faqId);
    }
  };

  const handleEdit = (faq) => {
    // Enhanced debugging
    console.log('Edit button clicked for FAQ:', faq);
    console.log('FAQ ID:', faq.id, 'Type:', typeof faq.id);
    console.log('Full FAQ object:', JSON.stringify(faq, null, 2));
    
    // Make sure we have a valid ID before passing it to the parent
    if (!faq.id) {
      console.error('FAQ is missing ID!', faq);
      toast.error('Cannot edit FAQ: Missing ID');
      return;
    }
    
    onEdit(faq);
  };

  if (isLoading)
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
      </div>
    );

  if (!faqResponse) {
    return (
      <div className={styles.error} role="alert">
        <AlertCircle className={styles.errorIcon} width={20} height={20} />
        <span className={styles.errorMessage}>
          Failed to load Widget FAQ items. Please try again.
        </span>
      </div>
    );
  }

  // Add a check for invalid data format
  if (faqResponse && Array.isArray(faqResponse) && faqResponse.some(faq => !faq.id)) {
    console.error('Some FAQs are missing ID property!', faqResponse);
  }

  return (
    <div>
      <h3 className={styles.title}>Widget FAQs</h3>
      {faqResponse?.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>No Widget FAQs configured yet.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeader}>Question</th>
                <th className={styles.tableHeader}>Answer</th>
                <th className={styles.tableHeader}>Category</th>
                <th className={styles.tableHeader}>Order</th>
                <th className={styles.tableHeader}>Actions</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {faqResponse.map((faq) => (
                <tr key={faq.id || 'unknown'} className={styles.tableRow}>
                  <td className={styles.tableCell}>{faq.question}</td>
                  <td className={styles.tableCell}>{faq.answer}</td>
                  <td className={styles.tableCellNormal}>{faq.category || '-'}</td>
                  <td className={styles.tableCellNormal}>{faq.widget_order || '-'}</td>
                  <td className={styles.tableCellNormal}>
                    <button
                      onClick={() => handleEdit(faq)}
                      className={styles.editButton}
                    >
                      <Edit size={14} style={{ marginRight: '4px' }} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(faq.id)}
                      className={styles.deleteButton}
                    >
                      <Trash2 size={14} style={{ marginRight: '4px' }} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WidgetFAQList;