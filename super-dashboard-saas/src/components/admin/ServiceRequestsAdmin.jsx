import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  MessageCircle
} from 'lucide-react';
import styles from './ServiceRequestsAdmin.module.css';

// API client helper
const apiRequest = async (url, options = {}) => {
  const baseUrl = '';  // Use relative paths
  
  try {
    const response = await fetch(`${baseUrl}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    // Handle non-JSON responses (like HTML error pages)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      return { data: [] }; // Return empty data for non-JSON success responses
    }
    
    // Parse JSON data
    const data = await response.json();
    return { data };
  } catch (error) {
    console.error(`API request failed: ${error.message}`);
    throw error;
  }
};

const ServiceRequestsAdmin = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [adminNotes, setAdminNotes] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  // Fetch service requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const response = await apiRequest('/api/service-requests/');
        setRequests(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching service requests:', err);
        setError('Failed to load service requests. The API may not be configured correctly.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  // Handle refresh
  const handleRefresh = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/service-requests/');
      setRequests(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to refresh data. Please try again.');
      console.error('Error refreshing service requests:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle status update
  const updateRequestStatus = async (requestId, newStatus) => {
    try {
      setActionLoading(prev => ({ ...prev, [requestId]: true }));
      
      const response = await apiRequest(`/api/service-requests/${requestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          admin_notes: adminNotes[requestId] || ''
        })
      });
      
      // Update the requests list with the updated request
      setRequests(prev => 
        prev.map(req => req.id === requestId ? response.data : req)
      );
      
      // Clear admin notes for this request
      setAdminNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[requestId];
        return newNotes;
      });
      
    } catch (err) {
      setError(`Failed to update request status. ${err.message}`);
      console.error('Error updating request status:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  // Filter requests based on status, type, and search term
  const filteredRequests = requests.filter(request => {
    // Filter by status
    if (statusFilter !== 'all' && request.status !== statusFilter) {
      return false;
    }
    
    // Filter by type
    if (typeFilter !== 'all' && request.request_type !== typeFilter) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        (request.subject_id && request.subject_id.toLowerCase().includes(searchLower)) ||
        (request.subject_name && request.subject_name.toLowerCase().includes(searchLower)) ||
        (request.description && request.description.toLowerCase().includes(searchLower)) ||
        (request.user_email && request.user_email.toLowerCase().includes(searchLower)) ||
        (request.user_name && request.user_name.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });

  // Toggle request expansion
  const toggleRequestExpansion = (requestId) => {
    setExpandedRequest(expandedRequest === requestId ? null : requestId);
  };

  // Handle admin notes change
  const handleNotesChange = (requestId, value) => {
    setAdminNotes(prev => ({
      ...prev,
      [requestId]: value
    }));
  };

  // Get status badge component
  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending':
        return (
          <div className={`${styles.statusBadge} ${styles.pendingBadge}`}>
            <Clock size={14} className={styles.badgeIcon} />
            Čeká na zpracování
          </div>
        );
      case 'in_progress':
        return (
          <div className={`${styles.statusBadge} ${styles.inProgressBadge}`}>
            <RefreshCw size={14} className={styles.badgeIcon} />
            Zpracovává se
          </div>
        );
      case 'completed':
        return (
          <div className={`${styles.statusBadge} ${styles.completedBadge}`}>
            <CheckCircle size={14} className={styles.badgeIcon} />
            Dokončeno
          </div>
        );
      case 'rejected':
        return (
          <div className={`${styles.statusBadge} ${styles.rejectedBadge}`}>
            <XCircle size={14} className={styles.badgeIcon} />
            Zamítnuto
          </div>
        );
      default:
        return (
          <div className={`${styles.statusBadge} ${styles.unknownBadge}`}>
            <AlertTriangle size={14} className={styles.badgeIcon} />
            Neznámý stav
          </div>
        );
    }
  };

  // Get request type display
  const getRequestTypeDisplay = (type) => {
    switch(type) {
      case 'delete_order':
        return 'Zrušení objednávky';
      case 'change_order':
        return 'Úprava objednávky';
      case 'return_item':
        return 'Vrácení zboží';
      case 'support':
        return 'Technická podpora';
      case 'other':
        return 'Ostatní';
      default:
        return 'Neznámý typ';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('cs-CZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Empty state - no data
  const renderEmptyState = () => (
    <div className={styles.emptyState}>
      <MessageCircle className={styles.emptyIcon} />
      <h3 className={styles.emptyTitle}>Žádné požadavky k zobrazení</h3>
      <p className={styles.emptyText}>
        {requests.length === 0 
          ? "Zatím zde nejsou žádné požadavky zákazníků." 
          : "Upravte filtry pro zobrazení požadavků."}
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <RefreshCw size={32} className={styles.loadingIcon} />
          <p className={styles.loadingText}>Načítání požadavků...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorMessage}>
          <AlertTriangle size={24} className={styles.errorIcon} />
          <p className={styles.errorText}>{error}</p>
        </div>
        <button 
          onClick={handleRefresh}
          className={styles.retryButton}
        >
          <RefreshCw size={16} className={styles.retryIcon} />
          Zkusit znovu
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.sectionBlock}>
        <h1 className={styles.heading}>Správa požadavků zákazníků</h1>
        
        {/* Search and filters */}
        <div className={styles.filterContainer}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Hledat podle objednávky, jména, emailu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <Search className={styles.searchIcon} size={18} />
          </div>
          
          <div className={styles.filterControls}>
            <div className={styles.selectContainer}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.select}
              >
                <option value="all">Všechny stavy</option>
                <option value="pending">Čekající</option>
                <option value="in_progress">Zpracovává se</option>
                <option value="completed">Dokončené</option>
                <option value="rejected">Zamítnuté</option>
              </select>
              <Filter className={styles.filterIcon} size={16} />
            </div>
            
            <div className={styles.selectContainer}>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={styles.select}
              >
                <option value="all">Všechny typy</option>
                <option value="delete_order">Zrušení objednávky</option>
                <option value="change_order">Úprava objednávky</option>
                <option value="return_item">Vrácení zboží</option>
                <option value="support">Technická podpora</option>
                <option value="other">Ostatní</option>
              </select>
              <Filter className={styles.filterIcon} size={16} />
            </div>
            
            <button
              onClick={handleRefresh}
              className={styles.refreshButton}
              aria-label="Refresh data"
            >
              <RefreshCw size={18} className={styles.refreshIcon} />
            </button>
          </div>
        </div>
        
        {/* Request count */}
        <p className={styles.countText}>
          Zobrazeno {filteredRequests.length} z {requests.length} požadavků
        </p>
      </div>
      
      {/* Request list */}
      {filteredRequests.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className={styles.requestsContainer}>
          {filteredRequests.map(request => (
            <div 
              key={request.id} 
              className={styles.requestCard}
            >
              {/* Request header */}
              <div 
                onClick={() => toggleRequestExpansion(request.id)}
                className={styles.requestHeader}
              >
                <div className={styles.requestInfo}>
                  {request.request_type === 'delete_order' && (
                    <div className={`${styles.requestTypeIcon} ${styles.deleteTypeIcon}`}>
                      <XCircle size={20} />
                    </div>
                  )}
                  {request.request_type === 'change_order' && (
                    <div className={`${styles.requestTypeIcon} ${styles.changeTypeIcon}`}>
                      <RefreshCw size={20} />
                    </div>
                  )}
                  {request.request_type === 'support' && (
                    <div className={`${styles.requestTypeIcon} ${styles.supportTypeIcon}`}>
                      <Clock size={20} />
                    </div>
                  )}
                  <div>
                    <h3 className={styles.requestTitle}>
                      {getRequestTypeDisplay(request.request_type)}
                      {request.subject_id && ` - ${request.subject_id}`}
                    </h3>
                    <p className={styles.requestMeta}>
                      {request.user_name || request.user_email || 'Anonymní uživatel'} • {formatDate(request.created_at)}
                    </p>
                  </div>
                </div>
                
                <div className={styles.statusContainer}>
                  {getStatusBadge(request.status)}
                  {expandedRequest === request.id ? (
                    <ChevronUp size={20} className={styles.chevronIcon} />
                  ) : (
                    <ChevronDown size={20} className={styles.chevronIcon} />
                  )}
                </div>
              </div>
              
              {/* Expanded content */}
              {expandedRequest === request.id && (
                <div className={styles.expandedContent}>
                  <div className={styles.detailsGrid}>
                    <div className={styles.detailsSection}>
                      <h4 className={styles.detailsHeading}>Detaily požadavku</h4>
                      <div className={styles.detailsBox}>
                        <p className={styles.detailItem}>
                          <span className={styles.detailLabel}>Typ:</span> {getRequestTypeDisplay(request.request_type)}
                        </p>
                        {request.subject_id && (
                          <p className={styles.detailItem}>
                            <span className={styles.detailLabel}>ID objektu:</span> {request.subject_id}
                          </p>
                        )}
                        {request.subject_name && (
                          <p className={styles.detailItem}>
                            <span className={styles.detailLabel}>Název objektu:</span> {request.subject_name}
                          </p>
                        )}
                        <p className={styles.detailItem}>
                          <span className={styles.detailLabel}>Popis:</span> {request.description}
                        </p>
                        <p className={styles.detailItem}>
                          <span className={styles.detailLabel}>Stav:</span> {getStatusBadge(request.status)}
                        </p>
                        <p className={styles.detailItem}>
                          <span className={styles.detailLabel}>Vytvořeno:</span> {formatDate(request.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className={styles.detailsSection}>
                      <h4 className={styles.detailsHeading}>Informace o uživateli</h4>
                      <div className={styles.detailsBox}>
                        {request.user_name && (
                          <p className={styles.detailItem}>
                            <span className={styles.detailLabel}>Jméno:</span> {request.user_name}
                          </p>
                        )}
                        {request.user_email && (
                          <p className={styles.detailItem}>
                            <span className={styles.detailLabel}>Email:</span> {request.user_email}
                          </p>
                        )}
                        {request.user_phone && (
                          <p className={styles.detailItem}>
                            <span className={styles.detailLabel}>Telefon:</span> {request.user_phone}
                          </p>
                        )}
                        {request.conversation_id && (
                          <p className={styles.detailItem}>
                            <span className={styles.detailLabel}>ID konverzace:</span> {request.conversation_id}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Admin actions */}
                  <div className={styles.adminSection}>
                    <h4 className={styles.detailsHeading}>Správa požadavku</h4>
                    
                    {/* Admin notes */}
                    <div>
                      <label htmlFor={`notes-${request.id}`} className={styles.notesLabel}>
                        Poznámky administrátora
                      </label>
                      <textarea
                        id={`notes-${request.id}`}
                        rows={3}
                        placeholder="Zadejte poznámky k tomuto požadavku..."
                        className={styles.notesTextarea}
                        value={adminNotes[request.id] || request.admin_notes || ''}
                        onChange={(e) => handleNotesChange(request.id, e.target.value)}
                      />
                    </div>
                    
                    {/* Action buttons */}
                    <div className={styles.actionButtons}>
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateRequestStatus(request.id, 'in_progress')}
                            disabled={actionLoading[request.id]}
                            className={`${styles.actionButton} ${styles.inProgressButton}`}
                          >
                            {actionLoading[request.id] ? (
                              <RefreshCw size={16} className={styles.buttonIcon} />
                            ) : (
                              <Clock size={16} className={styles.buttonIcon} />
                            )}
                            Začít zpracovávat
                          </button>
                          
                          <button
                            onClick={() => updateRequestStatus(request.id, 'completed')}
                            disabled={actionLoading[request.id]}
                            className={`${styles.actionButton} ${styles.completeButton}`}
                          >
                            {actionLoading[request.id] ? (
                              <RefreshCw size={16} className={styles.buttonIcon} />
                            ) : (
                              <CheckCircle size={16} className={styles.buttonIcon} />
                            )}
                            Označit jako dokončené
                          </button>
                          
                          <button
                            onClick={() => updateRequestStatus(request.id, 'rejected')}
                            disabled={actionLoading[request.id]}
                            className={`${styles.actionButton} ${styles.rejectButton}`}
                          >
                            {actionLoading[request.id] ? (
                              <RefreshCw size={16} className={styles.buttonIcon} />
                            ) : (
                              <XCircle size={16} className={styles.buttonIcon} />
                            )}
                            Zamítnout
                          </button>
                        </>
                      )}
                      
                      {request.status === 'in_progress' && (
                        <>
                          <button
                            onClick={() => updateRequestStatus(request.id, 'completed')}
                            disabled={actionLoading[request.id]}
                            className={`${styles.actionButton} ${styles.completeButton}`}
                          >
                            {actionLoading[request.id] ? (
                              <RefreshCw size={16} className={styles.buttonIcon} />
                            ) : (
                              <CheckCircle size={16} className={styles.buttonIcon} />
                            )}
                            Označit jako dokončené
                          </button>
                          
                          <button
                            onClick={() => updateRequestStatus(request.id, 'rejected')}
                            disabled={actionLoading[request.id]}
                            className={`${styles.actionButton} ${styles.rejectButton}`}
                          >
                            {actionLoading[request.id] ? (
                              <RefreshCw size={16} className={styles.buttonIcon} />
                            ) : (
                              <XCircle size={16} className={styles.buttonIcon} />
                            )}
                            Zamítnout
                          </button>
                        </>
                      )}
                      
                      {(request.status === 'completed' || request.status === 'rejected') && (
                        <button
                          onClick={() => updateRequestStatus(request.id, 'in_progress')}
                          disabled={actionLoading[request.id]}
                          className={`${styles.actionButton} ${styles.reopenButton}`}
                        >
                          {actionLoading[request.id] ? (
                            <RefreshCw size={16} className={styles.buttonIcon} />
                          ) : (
                            <RefreshCw size={16} className={styles.buttonIcon} />
                          )}
                          Znovu otevřít
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServiceRequestsAdmin;