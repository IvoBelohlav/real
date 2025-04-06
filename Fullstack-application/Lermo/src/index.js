import React from 'react';
import ReactDOM from 'react-dom/client';
import styles from './index.module.css'; // Ensure you have index.module.css for styling
import App from './App';
import reportWebVitals from './reportWebVitals';
import { setApiKey, setApiBaseUrl } from './utils/api';
// *** Import from the CORRECT, SINGLE library version ***
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Ensure the init function can only run once per container to prevent conflicts
const initializedContainers = new Set();

// Create a global namespace for the widget API
window.LermoWidget = {
  init: (config = {}) => {
    console.log('Initializing Lermo Widget with config:', config);

    // Extract configuration
    const {
      apiKey,
      apiUrl,
      containerId = 'lermo-widget-container', // Default container ID
      container // Optional direct selector string
    } = config;

    // Determine the target selector and find the element
    const targetSelector = container || `#${containerId}`;
    let containerEl = null;
    try {
       containerEl = document.querySelector(targetSelector);
    } catch (e) {
        console.error(`Invalid container selector "${targetSelector}":`, e);
        return null; // Return null or indicate failure
    }

    if (!containerEl) {
      console.error(`Container element "${targetSelector}" not found`);
      return null; // Return null or indicate failure
    }

    // --- Prevent re-initialization on the same container ---
    if (initializedContainers.has(containerEl)) {
        console.warn(`Lermo Widget already initialized for container "${targetSelector}". Skipping.`);
        // Optionally return the existing container reference
        return { container: containerEl };
    }
    // ------------------------------------------------------

    // Set API key for requests - REQUIRED
    if (apiKey) {
      setApiKey(apiKey);
    } else {
      console.error('API key is required for Lermo Widget initialization');
      // Do not mark as initialized if critical config is missing
      return null; // Return null or indicate failure
    }

    // Mark as initialized AFTER essential checks pass
    initializedContainers.add(containerEl);

    // Set custom API URL if provided
    if (apiUrl) {
      setApiBaseUrl(apiUrl);
    }

    // Add a specific class for widget styling using CSS Modules (if available)
    // Check if styles object and widgetContainer key exist
    if (styles && styles.widgetContainer) {
      containerEl.classList.add(styles.widgetContainer);
    } else {
      // Fallback class if CSS module isn't set up or doesn't have the key
      containerEl.classList.add('lermo-widget-default-container-style');
      console.warn('index.module.css or widgetContainer class not found. Applying default class.');
    }


    // Create a new QueryClient instance for this widget instance
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false, // Common setting for widgets
          retry: 1,                   // Sensible default retry
          staleTime: 30000,           // Cache data for 30 seconds
        },
      },
    });

    // Render the React application inside the target container
    const root = ReactDOM.createRoot(containerEl);
    root.render(
      // StrictMode helps catch potential problems in development
      <React.StrictMode>
        {/* Provide the QueryClient to the entire App */}
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </React.StrictMode>
    );

    console.log('Lermo Widget initialized successfully for', targetSelector);
    // Return reference to the container element upon successful init
    return { container: containerEl };
  }
  // You could add a 'destroy' method here later if needed
  // destroy: (containerSelectorOrId) => { ... find root, unmount, remove from initializedContainers ... }
};

// --- REMOVED ALL AUTO-INITIALIZATION LOGIC ---
// Ensures initialization only happens via explicit window.LermoWidget.init() call


// Web Vitals reporting (optional)
reportWebVitals();