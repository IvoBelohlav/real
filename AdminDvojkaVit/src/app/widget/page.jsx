'use client';

import { useState, useEffect } from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/components/layout/AuthProvider';
import Link from 'next/link';
import styles from './Widget.module.css';

// Import admin components
import AddBusinessTypeForm from '@/app/admin/AddBusinessTypeForm';
import AdminNavigation from '@/app/admin/AdminNavigation';
import BusinessTypeManagement from '@/app/admin/BusinessTypeManagement';
import ProductList from '@/app/admin/ProductList';
import WidgetConfigForm from '@/app/admin/WidgetConfigForm';
import AdminStatistics from '@/app/admin/AdminStatistics';
import GuidedChatManager from '@/app/admin/GuidedChatManager';
import ConversationLogs from '@/app/admin/ConversationLogs';
import ContactAdminSubmissions from '@/app/admin/ContactAdminSubmissions';
import WidgetFAQManager from '@/app/admin/WidgetFAQManager';
import ShopInfoManager from '@/app/admin/ShopInfoManager';
import dynamic from 'next/dynamic';

// Dynamically import more complex components to avoid SSR issues
const AddProductForm = dynamic(() => import('@/app/admin/AddProductForm'), { ssr: false });

export default function WidgetConfigurationPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const { 
    isSubscribed, 
    subscription, 
    isLoading: isLoadingSubscription,
    canAccessWidget,
    checkSubscriptionStatus
  } = useSubscription();
  
  const [embedCode, setEmbedCode] = useState(null);
  const [isLoadingCode, setIsLoadingCode] = useState(true);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('embed');
  const [showBusinessTypeForm, setShowBusinessTypeForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [defaultBusinessType, setDefaultBusinessType] = useState('');
  
  // Fetch embed code if user is subscribed
  useEffect(() => {
    const fetchEmbedCode = async () => {
      if (!isSubscribed) {
        setIsLoadingCode(false);
        return;
      }
      
      try {
        setIsLoadingCode(true);
        const response = await fetch('/api/widget/embed-code');
        if (!response.ok) {
          throw new Error('Failed to fetch embed code');
        }
        const data = await response.json();
        setEmbedCode(data);
      } catch (err) {
        console.error('Error fetching embed code:', err);
        setError('Failed to load your widget embed code. Please try again later.');
      } finally {
        setIsLoadingCode(false);
      }
    };

    fetchEmbedCode();
  }, [isSubscribed]);
  
  // Handle adding new business type
  const handleAddBusinessType = () => {
    setShowBusinessTypeForm(true);
  };

  // Handle business type form close
  const handleBusinessTypeFormClose = () => {
    setShowBusinessTypeForm(false);
  };
  
  // Handle adding new product
  const handleAddProduct = () => {
    setShowProductForm(true);
  };
  
  // Handle product form close
  const handleProductFormClose = () => {
    setShowProductForm(false);
  };
  
  // Handle business type added
  const handleBusinessTypeAdded = (data) => {
    setShowBusinessTypeForm(false);
    // Update the business type if needed
    if (data && data.category) {
      setDefaultBusinessType(data.category);
    }
  };

  // Handle manual subscription check
  const handleCheckSubscription = async () => {
    setIsCheckingSubscription(true);
    try {
      const result = await checkSubscriptionStatus();
      console.log('Subscription check result:', result);
      if (!result) {
        setError('No active subscription found. Please subscribe to access this feature.');
      }
    } finally {
      setIsCheckingSubscription(false);
    }
  };

  if (isLoadingAuth || isLoadingSubscription || (isLoadingCode && isSubscribed)) {
    return (
      <div className={`${styles.container} ${styles.root}`}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading widget configuration...</p>
        </div>
      </div>
    );
  }

  // If user is not subscribed, show subscription required message
  if (!isSubscribed) {
    return (
      <div className={`${styles.container} ${styles.root}`}>
        <div className={styles.subscriptionRequired}>
          <div className={styles.lockIcon}>🔒</div>
          <h2 className={styles.title}>Subscription Required</h2>
          <p className={styles.message}>
            Widget configuration is only available for users with an active subscription.
            Upgrade your plan to access advanced widget customization options, including appearance, behavior, and integration settings.
          </p>
          <div className={styles.buttonContainer}>
            <Link href="/checkout" className={styles.subscribeButton}>
              View Subscription Plans
            </Link>
            <button 
              onClick={handleCheckSubscription}
              disabled={isCheckingSubscription}
              className={styles.checkButton}
            >
              {isCheckingSubscription ? 'Checking...' : 'Check Subscription Status'}
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${styles.root}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>Widget Configuration</h1>
        <p className={styles.subtitle}>
          Customize your widget to match your brand and requirements
        </p>
      </div>
      
      <div className={styles.tabsContainer}>
        <div className={styles.tabsList}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'embed' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('embed')}
          >
            Embed Code
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'business-types' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('business-types')}
          >
            Business Types
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'products' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Products
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'statistics' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('statistics')}
          >
            Statistics
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'guided-chat' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('guided-chat')}
          >
            Guided Chat
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'widget-config' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('widget-config')}
          >
            Widget Config
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'shop-info' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('shop-info')}
          >
            Shop Info
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'conversations' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('conversations')}
          >
            Conversation Logs
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'contact-submissions' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('contact-submissions')}
          >
            Contact Submissions
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'widget-faqs' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('widget-faqs')}
          >
            FAQs
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'agent-chat' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('agent-chat')}
          >
            Human Support
          </button>
        </div>
        
        {/* Embed Code Tab */}
        {activeTab === 'embed' && (
          <div className={styles.tabContent}>
            <h2 className={styles.sectionTitle}>Your Widget Embed Code</h2>
            <p className={styles.embedInstructions}>
              Copy and paste this code into your website to start using the widget:
            </p>
            
            <div className={styles.codeBox}>
              <h3 className={styles.codeTitle}>HTML</h3>
              <pre className={styles.code}>{embedCode?.html || '<!-- Loading code... -->'}</pre>
              <button 
                className={styles.copyButton}
                onClick={() => {
                  navigator.clipboard.writeText(embedCode?.html || '');
                  alert('HTML code copied to clipboard!');
                }}
              >
                Copy HTML
              </button>
            </div>
            
            <div className={styles.codeBox}>
              <h3 className={styles.codeTitle}>JavaScript</h3>
              <pre className={styles.code}>{embedCode?.javascript || '// Loading code...'}</pre>
              <button 
                className={styles.copyButton}
                onClick={() => {
                  navigator.clipboard.writeText(embedCode?.javascript || '');
                  alert('JavaScript code copied to clipboard!');
                }}
              >
                Copy JavaScript
              </button>
            </div>
            
            <div className={styles.instructionsBox}>
              <h3 className={styles.instructionsTitle}>Installation Instructions</h3>
              <ol className={styles.instructionsList}>
                <li>Add the HTML code where you want the widget to appear</li>
                <li>Place the JavaScript code just before the closing &lt;/body&gt; tag</li>
                <li>The widget will automatically load when your page loads</li>
                <li>Configure your widget using the tabs above</li>
              </ol>
            </div>
          </div>
        )}
        
        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Products</h2>
              <button 
                className={styles.addButton}
                onClick={handleAddProduct}
              >
                Add Product
              </button>
            </div>
            
            <p className={styles.settingsDescription}>
              Manage products that your widget can recommend and discuss
            </p>
            
            {showProductForm && (
              <div className={styles.formOverlay}>
                <AddProductForm 
                  onClose={handleProductFormClose}
                  defaultBusinessType={defaultBusinessType}
                />
              </div>
            )}
            
            {!showProductForm && (
              <div className={styles.adminContentWrapper}>
                <ProductList />
              </div>
            )}
          </div>
        )}
        
        {/* Business Types Tab */}
        {activeTab === 'business-types' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Business Types</h2>
              <button 
                className={styles.addButton}
                onClick={handleAddBusinessType}
              >
                Add Business Type
              </button>
            </div>
            
            <p className={styles.settingsDescription}>
              Configure business types for your widget's knowledge base
            </p>
            
            {showBusinessTypeForm && (
              <div className={styles.formOverlay}>
                <AddBusinessTypeForm 
                  onClose={handleBusinessTypeFormClose} 
                  onBusinessConfigAdded={handleBusinessTypeAdded}
                />
              </div>
            )}
            
            {!showBusinessTypeForm && (
              <div className={styles.adminContentWrapper}>
                <BusinessTypeManagement />
              </div>
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'statistics' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Widget Statistics</h2>
            </div>
            
            <p className={styles.settingsDescription}>
              View analytics and usage statistics for your widget
            </p>
            
            <div className={styles.adminContentWrapper}>
              <AdminStatistics />
            </div>
          </div>
        )}

        {/* Guided Chat Tab */}
        {activeTab === 'guided-chat' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Guided Chat Management</h2>
            </div>
            
            <p className={styles.settingsDescription}>
              Create and manage guided chat flows for your widget
            </p>
            
            <div className={styles.adminContentWrapper}>
              <GuidedChatManager />
            </div>
          </div>
        )}

        {/* Widget Config Tab */}
        {activeTab === 'widget-config' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Widget Configuration</h2>
            </div>
            
            <p className={styles.settingsDescription}>
              Customize the appearance and behavior of your widget
            </p>
            
            <div className={styles.adminContentWrapper}>
              <WidgetConfigForm />
            </div>
          </div>
        )}

        {/* Shop Info Tab */}
        {activeTab === 'shop-info' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Shop Information</h2>
            </div>
            
            <p className={styles.settingsDescription}>
              Manage your shop details and information
            </p>
            
            <div className={styles.adminContentWrapper}>
              <ShopInfoManager />
            </div>
          </div>
        )}

        {/* Conversations Tab */}
        {activeTab === 'conversations' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Conversation Logs</h2>
            </div>
            
            <p className={styles.settingsDescription}>
              View and analyze widget conversations with users
            </p>
            
            <div className={styles.adminContentWrapper}>
              <ConversationLogs />
            </div>
          </div>
        )}

        {/* Contact Submissions Tab */}
        {activeTab === 'contact-submissions' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Contact Submissions</h2>
            </div>
            
            <p className={styles.settingsDescription}>
              View and manage contact form submissions from users
            </p>
            
            <div className={styles.adminContentWrapper}>
              <ContactAdminSubmissions />
            </div>
          </div>
        )}

        {/* Widget FAQs Tab */}
        {activeTab === 'widget-faqs' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Widget FAQs</h2>
            </div>
            
            <p className={styles.settingsDescription}>
              Manage frequently asked questions for your widget
            </p>
            
            <div className={styles.adminContentWrapper}>
              <WidgetFAQManager />
            </div>
          </div>
        )}

        {/* Human Support Tab */}
        {activeTab === 'agent-chat' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Human Support</h2>
            </div>
            
            <p className={styles.settingsDescription}>
              Manage and respond to live customer inquiries
            </p>
            
            <div className={styles.adminContentWrapper}>
              <div className={styles.notImplementedMessage}>
                <h2>Coming Soon</h2>
                <p>The Human Support feature is currently being developed.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 