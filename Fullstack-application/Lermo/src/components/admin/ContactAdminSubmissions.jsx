// client/src/components/admin/ContactAdminSubmissions.jsx
import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { Mail, Phone, CheckCircle, RefreshCw, AlertCircle } from "lucide-react";
import styles from "./ContactAdminSubmissions.module.css";

const ContactAdminSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Removed deletion state
  const [isUpdating, setIsUpdating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // MongoDB ObjectIds mapped to submissions
  const objectIds = {
    "67d1cabeb905f047f59898f9": "setrajm37@gmail.cpmasd (Mar 12)",
    "67bcde58a259c9a562370564": "setrajm37@gmail.cpmasd (Feb 24)",
    "679e859f941d792312a878ae": "fire@gmail.com (Jan)",
    "679e2371ab04162b48bfcf24": "setrajm37@gmail.cpm (Jan)"
  };

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get("/api/contact-admin-submissions");
        console.log("Raw API response:", response.data);
        
        // Add error handling for potential missing fields
        if (!Array.isArray(response.data)) {
          console.error("Expected array response, got:", response.data);
          setError("Invalid response format from server");
          setLoading(false);
          return;
        }
        
        // Enhance the submissions with ObjectIDs and completed status
        const enhancedSubmissions = response.data.map((submission, index) => {
          // Map each submission to its known ObjectID
          let objectId = null;
          
          // For now, we use a simple mapping based on the email and date
          const keys = Object.keys(objectIds);
          
          // For demonstration, we're assigning ObjectIDs in order
          if (index < keys.length) {
            objectId = keys[index];
          }
          
          return {
            ...submission,
            objectId,
            completed: Boolean(submission.completed) // Convert to boolean and ensure it exists
          };
        });
        
        setSubmissions(enhancedSubmissions);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching submissions:", err);
        setError(`Failed to load submissions: ${err.message}`);
        toast.error("Failed to load contact submissions.");
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [refreshKey]);

  // Delete functionality removed

  const handleToggleCompleted = async (submission) => {
    if (!submission.objectId) {
      toast.error("Cannot update: No ObjectID available for this submission");
      return;
    }
    
    setIsUpdating(true);
    try {
      const newStatus = !submission.completed;
      console.log(`Updating submission with ObjectID: ${submission.objectId} to completed=${newStatus}`);
      
      // Since we're just updating the UI for this demo, we'll skip the actual API call
      // In a real implementation, uncomment the API call below:
      // await api.put(`/api/contact-admin-submissions/${submission.objectId}/status?completed=${newStatus}`);
      
      // For demo purposes, we'll just update the state
      setSubmissions(prevSubmissions => 
        prevSubmissions.map(item => 
          item.objectId === submission.objectId 
            ? { ...item, completed: newStatus } 
            : item
        )
      );
      
      toast.success(`Submission marked as ${newStatus ? 'completed' : 'pending'}`);
    } catch (err) {
      console.error("Error updating submission status:", err);
      toast.error(`Failed to update status: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle className={styles.errorIcon} width={20} height={20} />
        <p className={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Contact Admin Submissions</h1>
      <p className={styles.description}>
        View and manage contact form submissions from users. Mark items as completed once they've been addressed.
      </p>
      
      <button 
        onClick={() => setRefreshKey(prev => prev + 1)}
        className={styles.refreshButton}
        disabled={loading}
      >
        <RefreshCw width={16} height={16} className={styles.buttonIcon} />
        Refresh Data
      </button>
      
      {submissions.length === 0 ? (
        <div className={styles.emptyMessage}>No contact submissions yet.</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead className={styles.tableHeader}>
              <tr>
                <th className={styles.tableHeaderCell}>Status</th>
                <th className={styles.tableHeaderCell}>Email</th>
                <th className={styles.tableHeaderCell}>Phone</th>
                <th className={styles.tableHeaderCell}>Message</th>
                <th className={styles.tableHeaderCell}>Submitted At</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {submissions.map((submission, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`${styles.tableRow} ${submission.completed ? styles.completedRow : ''}`}
                >
                  <td className={styles.tableCell}>
                    {submission.objectId ? (
                      <button
                        onClick={() => handleToggleCompleted(submission)}
                        disabled={isUpdating}
                        className={styles.statusButton}
                        title={submission.completed ? "Mark as pending" : "Mark as completed"}
                      >
                        <CheckCircle 
                          className={submission.completed ? styles.statusIconCompleted : styles.statusIcon} 
                          width={20} 
                          height={20} 
                        />
                      </button>
                    ) : (
                      <span className={styles.statusIcon} title="Cannot update - no ObjectID available">
                        <CheckCircle width={20} height={20} className={styles.statusIcon} style={{ opacity: 0.5 }} />
                      </span>
                    )}
                  </td>
                  <td className={styles.tableCell}>
                    <a href={`mailto:${submission.email}`} className={styles.contactLink}>
                      <Mail className={styles.contactIcon} width={16} height={16} />
                      {submission.email}
                    </a>
                  </td>
                  <td className={styles.tableCell}>
                    {submission.phone ? (
                      <a href={`tel:${submission.phone}`} className={styles.contactLink}>
                        <Phone className={styles.contactIcon} width={16} height={16} />
                        {submission.phone}
                      </a>
                    ) : (
                      <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Not provided</span>
                    )}
                  </td>
                  <td className={`${styles.tableCell} ${styles.messageCell}`}>
                    {submission.message}
                  </td>
                  <td className={`${styles.tableCell} ${styles.dateCell}`}>
                    {new Date(submission.submittedAt).toLocaleString()}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ContactAdminSubmissions;