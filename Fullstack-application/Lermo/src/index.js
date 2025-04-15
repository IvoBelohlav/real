import React from 'react';
import ReactDOM from 'react-dom/client';
// Import CSS as text to inject into Shadow DOM if using specific loaders,
// otherwise, we'll link the generated CSS file.
// import globalCss from './index.css?raw'; // Example if using Vite/Rollup raw loader
// import moduleCss from './index.module.css?raw'; // Example
import indexModuleStylesContent from './index.module.css'; // Keep this for direct injection
import App from './App';
import reportWebVitals from './reportWebVitals';
import { setApiKey, setApiBaseUrl } from './utils/api';
// *** Import from the CORRECT, SINGLE library version ***
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Ensure the init function only runs once
let isWidgetInitialized = false;

// Create a global namespace for the widget API
window.LermoWidget = {
  init: (config = {}) => {
    // --- Prevent re-initialization ---
    if (isWidgetInitialized) {
        console.warn("Lermo Widget already initialized. Skipping.");
        return;
    }
    // ---------------------------------
    
    console.log('Initializing Lermo Widget with config:', config);

    // Extract configuration
    const {
      apiKey,
      apiUrl
      // containerId and container options are no longer needed
    } = config;

    // --- Create the container element ---
    const widgetRootId = 'lermo-unique-widget-root'; // Use the same ID as before
    let containerEl = document.getElementById(widgetRootId);

    // If container already exists (e.g., from a previous failed init or HMR), reuse it
    if (!containerEl) {
        containerEl = document.createElement('div');
        containerEl.id = widgetRootId;
        // Apply positioning styles directly to the host element
        containerEl.style.position = 'fixed';
        containerEl.style.bottom = '20px'; // Adjust as needed
        containerEl.style.right = '20px'; // Adjust as needed
        containerEl.style.zIndex = '2147483647'; // Max z-index on host
        containerEl.style.width = 'auto'; // Avoid inheriting width
        containerEl.style.height = 'auto'; // Avoid inheriting height
        document.body.appendChild(containerEl); // Append directly to body
        console.log('Lermo Widget container created and appended to body.');
    } else {
        console.log('Lermo Widget container already exists. Reusing.');
        // Ensure styles are reapplied if reusing
        containerEl.style.position = 'fixed';
        containerEl.style.bottom = '20px';
        containerEl.style.right = '20px';
        containerEl.style.zIndex = '2147483647';
        containerEl.style.width = 'auto'; 
        containerEl.style.height = 'auto'; 
    }
    // ------------------------------------

    // Set API key for requests - REQUIRED
    if (apiKey) {
      setApiKey(apiKey);
    } else {
      console.error('API key is required for Lermo Widget initialization');
      // Do not mark as initialized if critical config is missing
      return null; // Return null or indicate failure
    }

    // Set custom API URL if provided
    if (apiUrl) {
      setApiBaseUrl(apiUrl);
    }

    // --- Attach Shadow DOM ---
    let shadowRoot;
    if (containerEl.shadowRoot) {
        shadowRoot = containerEl.shadowRoot;
        console.log('Reusing existing Shadow DOM.');
        // Clear previous content if reusing for HMR or re-init attempts
        shadowRoot.innerHTML = ''; 
    } else {
        shadowRoot = containerEl.attachShadow({ mode: 'open' });
        console.log('Attached new Shadow DOM.');
    }
    
    // --- Create mount point inside Shadow DOM ---
    const shadowMountPoint = document.createElement('div');
    shadowMountPoint.id = 'lermo-shadow-root-content';
    shadowMountPoint.style.height = '100%'; // Ensure it fills the container
    shadowMountPoint.style.width = '100%';
    shadowRoot.appendChild(shadowMountPoint);

    // --- Inject Styles into Shadow DOM ---
    // 1. Link to the main bundled CSS file (adjust href if needed based on build output)
    //    Common names: main.css, index.css, bundle.css. Check your build output folder.
    const linkElement = document.createElement('link');
    linkElement.setAttribute('rel', 'stylesheet');
    // *** Use the full S3 URL for the CSS file ***
    linkElement.setAttribute('href', 'https://lermoplus.s3.eu-north-1.amazonaws.com/static/css/main.0135319e.css'); // Use full S3 URL
    shadowRoot.appendChild(linkElement);
    console.log('Linked main CSS bundle inside Shadow DOM using full URL.');

    // 2. Inject critical global styles directly
    const styleElement = document.createElement('style');
    // Ensure indexModuleStylesContent is treated as a string
    const indexCssString = typeof indexModuleStylesContent === 'string' ? indexModuleStylesContent : ''; 
    styleElement.textContent = `
      /* --- CSS Reset inside Shadow DOM --- */
      #lermo-shadow-root-content {
        all: initial; /* Reset inherited styles */
        display: block; /* Re-apply display block */
        height: 100%; 
        width: 100%;
        position: relative; /* Establish context for positioning inside */
        font-family: sans-serif; /* Set a default font stack */
      }
      #lermo-shadow-root-content *, 
      #lermo-shadow-root-content *::before, 
      #lermo-shadow-root-content *::after {
        all: revert; /* Revert properties for children, allowing component styles to apply */
        box-sizing: border-box; /* Re-apply box-sizing */
      }
      /* ----------------------------------- */

      /* Inject index.module.css content */
      ${indexCssString} 
    `;
    shadowRoot.appendChild(styleElement);
    console.log('Injected CSS reset and critical global styles into Shadow DOM.');
    
    // -----------------------------------------

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

    // Render the React application inside the SHADOW DOM mount point
    const root = ReactDOM.createRoot(shadowMountPoint); // Mount inside shadow root
    root.render(
      // StrictMode helps catch potential problems in development
      <React.StrictMode>
        {/* Provide the QueryClient to the entire App */}
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </React.StrictMode>
    );

    isWidgetInitialized = true; // Mark as initialized
    console.log('Lermo Widget initialized successfully.');
    // No need to return the container anymore as it's managed internally
  }
  // TODO: Add a 'destroy' method if needed:
  // destroy: () => { 
  //   const containerEl = document.getElementById('lermo-unique-widget-root');
  //   if (containerEl) {
  //     // Need a way to get the React root instance associated with shadowMountPoint
  //     // This might require storing the 'root' variable somewhere accessible.
  //     // For now, just removing the element:
  //     // root.unmount(); // This would be ideal if 'root' is accessible
  //     containerEl.remove();
  //     isWidgetInitialized = false;
  //     console.log('Lermo Widget destroyed.');
  //   }
  // }
};

// --- Ensure no auto-initialization logic remains ---


// Web Vitals reporting (optional)
reportWebVitals();
