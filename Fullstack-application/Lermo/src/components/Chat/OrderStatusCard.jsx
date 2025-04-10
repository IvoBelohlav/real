import React from 'react';
import PropTypes from 'prop-types';
import styles from './OrderStatusCard.module.css'; // Create this CSS module

// Helper to format date string (assuming ISO string)
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('cs-CZ', { // Use Czech locale
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (e) {
    return dateString; // Fallback
  }
};

// Helper to format currency
const formatCurrency = (amount, currency = 'CZK') => {
    try {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: currency }).format(amount);
    } catch (e) {
        return `${amount} ${currency}`; // Fallback
    }
};

const OrderStatusCard = ({ order }) => {
  if (!order) {
    return null;
  }

  // Determine status badge style (similar to dashboard page)
  const getStatusClass = (status) => {
    const lowerStatus = status?.toLowerCase() || '';
    if (lowerStatus.includes('shipped') || lowerStatus.includes('odesláno')) return styles.statusShipped;
    if (lowerStatus.includes('delivered') || lowerStatus.includes('doručeno')) return styles.statusDelivered;
    if (lowerStatus.includes('cancelled') || lowerStatus.includes('zrušeno')) return styles.statusCancelled;
    return styles.statusProcessing; // Default for pending/processing
  };

  return (
    <div className={styles.card}>
      <h4 className={styles.title}>Order Status: #{order.order_number || order.platform_order_id}</h4>
      <div className={styles.detailRow}>
        <span className={styles.label}>Status:</span>
        <span className={`${styles.statusBadge} ${getStatusClass(order.status)}`}>
          {order.status || 'N/A'}
        </span>
      </div>
      <div className={styles.detailRow}>
        <span className={styles.label}>Order Date:</span>
        <span className={styles.value}>{formatDate(order.order_date)}</span>
      </div>
       <div className={styles.detailRow}>
        <span className={styles.label}>Total:</span>
        <span className={styles.value}>{formatCurrency(order.total_amount, order.currency)}</span>
      </div>
      {order.estimated_delivery_date && (
        <div className={styles.detailRow}>
          <span className={styles.label}>Est. Delivery:</span>
          <span className={styles.value}>{formatDate(order.estimated_delivery_date)}</span>
        </div>
      )}
      {order.tracking_number && (
        <div className={styles.detailRow}>
          <span className={styles.label}>Tracking:</span>
          {/* TODO: Make this a real link based on carrier */}
          <a href="#" className={styles.trackingLink} title={`Carrier: ${order.carrier || 'N/A'}`}>
            {order.tracking_number}
          </a>
        </div>
      )}
       {/* Optionally display items */}
       {order.items && order.items.length > 0 && (
         <div className={styles.itemsSection}>
            <span className={styles.label}>Items:</span>
            <ul className={styles.itemList}>
                {order.items.slice(0, 3).map((item, index) => ( // Show max 3 items
                    <li key={index} className={styles.item}>
                        {item.quantity}x {item.name}
                    </li>
                ))}
                {order.items.length > 3 && <li className={styles.itemMore}>...and more</li>}
            </ul>
         </div>
       )}
    </div>
  );
};

OrderStatusCard.propTypes = {
  order: PropTypes.shape({
    id: PropTypes.string,
    platform_order_id: PropTypes.string.isRequired,
    order_number: PropTypes.string,
    status: PropTypes.string.isRequired,
    order_date: PropTypes.string.isRequired,
    total_amount: PropTypes.number.isRequired,
    currency: PropTypes.string,
    tracking_number: PropTypes.string,
    carrier: PropTypes.string,
    estimated_delivery_date: PropTypes.string,
    items: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string.isRequired,
        quantity: PropTypes.number.isRequired,
    }))
  }).isRequired,
};

export default OrderStatusCard;
