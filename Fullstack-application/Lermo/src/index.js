import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';  // Regular CSS import instead of CSS Module
import App from './App';
import reportWebVitals from './reportWebVitals';
import { setApiKey, setApiBaseUrl } from './utils/api';

// Create a global namespace for the widget API
window.LermoWidget = {
  init: (config = {}) => {
    console.log('Initializing Lermo Widget with config:', config);
    
    // Extract configuration
    const { 
      apiKey, 
      apiUrl,
      containerId = 'lermo-widget-container' 
    } = config;
    
    // Set API key for requests
    if (apiKey) {
      setApiKey(apiKey);
    } else {
      console.error('API key is required for Lermo Widget initialization');
      return;
    }
    
    // Set custom API URL if provided
    if (apiUrl) {
      setApiBaseUrl(apiUrl);
    }
    
    // Find the container element
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container element with ID "${containerId}" not found`);
      return;
    }
    
    // Add widgetContainer class directly instead of using CSS Module
    container.className = `${container.className} widgetContainer`;
    
    // Render the app in the container
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log('Lermo Widget initialized successfully');
    return { container };
  }
};

// Auto-initialize if container is found and we're not explicitly loaded as a library
const autoInit = () => {
  const container = document.getElementById('lermo-widget-container');
  if (container && !window.LermoWidget.initialized) {
    console.log('Auto-initializing Lermo Widget');
    
    // Look for a data-api-key attribute on the container
    const apiKey = container.getAttribute('data-api-key');
    if (apiKey) {
      window.LermoWidget.init({ apiKey });
      window.LermoWidget.initialized = true;
    } else {
      console.warn('API key not found for auto-initialization. Widget will not function correctly.');
    }
  }
};

// Wait for DOM to be ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(autoInit, 1);
} else {
  document.addEventListener('DOMContentLoaded', autoInit);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();