import React from 'react';

/**
 * WidgetContainer component that wraps the entire widget application
 * and ensures proper isolation from the rest of the website
 */
const WidgetContainer = ({ children }) => {
  return (
    <div className="dvojkavit-widget-container" style={{
      // Ensure consistent base styles
      fontFamily: 'system-ui, sans-serif',
      boxSizing: 'border-box',
      lineHeight: 'normal',
      // Prevent external styles from affecting our widget
      isolation: 'isolate',
      // Reset specific properties that might be inherited
      margin: '0',
      padding: '0',
      // Ensure proper text rendering
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    }}>
      {/* This will contain all our widget content with proper CSS isolation */}
      {children}
    </div>
  );
};

export default WidgetContainer; 