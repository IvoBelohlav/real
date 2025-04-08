'use client';

import React from 'react'; // Removed useState, useEffect
import { Steps } from 'intro.js-react';
import 'intro.js/introjs.css'; // Core CSS
// You might want to choose a theme or create a custom one
// import 'intro.js/themes/introjs-modern.css'; // Comment out or remove default theme if desired
import styles from './DashboardTutorial.module.css'; // Import custom styles

// Removed useSubscription import as it's no longer needed here for auto-start
import { useTutorial } from '@/contexts/TutorialContext'; // Import the new context hook

// Define steps for intro.js
// Note: intro.js uses data-intro and data-step attributes on the target elements
const TOUR_STEPS = [
  {
    intro: 'Welcome to your dashboard! Let\'s take a quick tour of the main features.',
    // No element needed for the initial step, it appears centered
  },
  {
    element: '[data-intro="sidebar-nav"]', // Target the sidebar nav
    intro: 'Use this sidebar to navigate between different sections of your dashboard.',
    position: 'right',
  },
  {
    element: '[data-intro="nav-dashboard"]', // Target the main dashboard link
    intro: 'This is your main dashboard overview.',
    position: 'right',
  },
  {
    element: '[data-intro="nav-widget-config"]', // Target widget config link
    intro: 'Configure your chat widget\'s appearance and behavior here.',
    position: 'right',
  },
  {
    element: '[data-intro="nav-installation"]', // Target installation link
    intro: 'Find instructions on how to install the chat widget on your website.',
    position: 'right',
  },
  {
    element: '[data-intro="nav-account"]', // Target account link
    intro: 'Manage your account settings and profile information here.',
    position: 'right',
  },
  // --- Detailed Product Steps Start ---
  {
    element: '[data-intro="nav-products"]',
    intro: '<strong>Click here</strong> to navigate to the product management section.', // Updated instruction
    position: 'right',
  },
  {
    element: '[data-intro="product-manager-container"]', // Target the main container of ProductManager
    intro: 'This is the product management area. Find the <strong>"Add New Product" button</strong> (usually top-right) and click it to open the form.', // Adjusted instruction
    position: 'bottom',
  },
  // Removed the step that targeted add-product-area as it wasn't highlighting reliably
  {
    element: '[data-intro="product-modal"]', // Target the modal itself when it opens
    intro: 'This form allows you to add or edit product details.',
    position: 'bottom', // Position relative to the modal
    // Note: This step assumes the modal is open. We might need logic in the app to trigger this step *after* the modal opens.
  },
  {
    element: '[data-intro="product-name-field"]', // Target the name field container
    intro: 'Enter the name of your product here.',
    position: 'bottom',
  },
  {
    element: '[data-intro="product-description-field"]', // Target the description field container
    intro: 'Provide a detailed description for your product.',
    position: 'bottom',
  },
  {
    element: '[data-intro="product-category-field"]', // Target the category field container
    intro: 'Assign a category to help organize your products.',
    position: 'bottom',
  },
  {
    element: '[data-intro="product-businesstype-field"]', // Target the business type field container
    intro: 'Select the relevant business type for this product.',
    position: 'bottom',
  },
  {
    element: '[data-intro="product-features-field"]', // Target the features tag input container
    intro: 'Add key features of your product as tags.',
    position: 'top',
  },
  {
    element: '[data-intro="product-pricing-field"]', // Target the pricing fieldset
    intro: 'Set the pricing details (one-time, monthly, annual) and currency.',
    position: 'top',
  },
  {
    element: '[data-intro="product-image-field"]', // Target the image upload container
    intro: 'Upload an image for your product. <strong>Important: Please use only WEBP format images (.webp) for optimal performance.</strong>',
    position: 'top',
  },
  {
    element: '[data-intro="product-submit-button"]', // Target the submit button
    intro: 'Once you have filled in all the details, click here to save the product.',
    position: 'top',
  },
  {
    element: '[data-intro="product-list-area"]', // Target the product list area
    intro: 'Your added or edited product will appear in this list.',
    position: 'bottom',
  },
  // --- Detailed Product Steps End ---
  {
    element: '[data-intro="nav-guided-chat"]',
    intro: 'Set up and manage guided conversation flows for your widget.',
    position: 'right',
  },
  {
      element: '[data-intro="nav-conversations"]',
      intro: 'View logs of conversations users have had with your widget.',
      position: 'right',
  },
  {
      element: '[data-intro="nav-billing"]',
      intro: 'Manage your subscription plan and view billing history.',
      position: 'right',
  },
  // Add more steps for other key features as needed
];

const DashboardTutorial: React.FC = () => {
  // Use the context to control the tutorial state
  const { isTutorialRunning, endTutorial } = useTutorial();

  // Remove the useEffect for automatic start

  const onExit = () => {
    // Call the context function to end the tutorial
    endTutorial();
  };

  // Options for intro.js (optional, customize as needed)
  const introJsOptions = {
    nextLabel: 'Next &rarr;',
    prevLabel: '&larr; Back',
    doneLabel: 'Done',
    skipLabel: 'Skip',
    tooltipClass: styles.customTooltip, // Apply the custom tooltip class
    showProgress: true, // Enable the progress bar
    // Add other intro.js options here if needed
    // e.g., buttonClass: 'customButton'
  };

  return (
    <Steps
      enabled={isTutorialRunning} // Control visibility via context state
      steps={TOUR_STEPS}
      initialStep={0}
      onExit={onExit}
      options={introJsOptions}
    />
  );
};

export default DashboardTutorial;
