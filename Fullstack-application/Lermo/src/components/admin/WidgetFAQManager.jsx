// src/components/Admin/WidgetFAQManager.js

import React, { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import WidgetFAQList from './WidgetFAQList.jsx';
import AddWidgetFAQForm from './AddWidgetFAQForm.jsx';
import EditWidgetFAQForm from './EditWidgetFAQForm.jsx';
import api from '../../utils/api'; // Import api
import { toast } from 'react-toastify';
import styles from './WidgetFAQManager.module.css';

const WidgetFAQManager = () => {
  const [showForm, setShowForm] = useState(false);
  const [editFaqId, setEditFaqId] = useState(null);

  // Add useQuery for fetching FAQs
  const {
    data,
    refetch,
    isLoading
  } = useQuery({
    queryKey: ['widgetFaqs'],
    queryFn: async () => {
      console.log('Fetching widget FAQs...');
      const response = await api.get('/api/widget-faqs');
      console.log('Fetched widget FAQs:', response.data);
      return response.data;
    },
  });

  const handleAdd = useCallback(() => {
    console.log('Opening add form dialog');
    setEditFaqId(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((faq) => {
    console.log('Opening edit form dialog for FAQ:', faq);
    if (!faq || !faq.id) {
      console.error('Cannot edit FAQ: Missing ID', faq);
      toast.error('Cannot edit FAQ: Missing ID');
      return;
    }
    
    // Store just the ID, not the entire FAQ object
    setEditFaqId(faq.id);
    setShowForm(true);
  }, []);

  const handleClose = useCallback(() => {
    console.log('Closing form dialog');
    setShowForm(false);
    setEditFaqId(null);
  }, []);

  const handleRefresh = useCallback(() => {
    console.log('Refreshing FAQs...');
    refetch();
  }, [refetch]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Widget FAQ Management</h1>
      <p className={styles.description}>
        Manage frequently asked questions that appear in the widget. These questions help users find answers quickly.
      </p>
      
      <div className={styles.headerContainer}>
        <div></div> {/* Empty div for flex spacing */}
        <div className={styles.buttonContainer}>
          <button
            onClick={handleRefresh}
            className={styles.refreshButton}
            disabled={isLoading}
          >
            <RefreshCw width={16} height={16} className={styles.buttonIcon} />
            Refresh FAQs
          </button>
          <button
            onClick={handleAdd}
            className={styles.addButton}
          >
            <PlusCircle width={16} height={16} className={styles.buttonIcon} />
            Add Widget FAQ
          </button>
        </div>
      </div>

      {/* Dialog for forms using Transition properly */}
      <Transition appear show={showForm} as={Fragment}>
        <Dialog as="div" className={styles.dialog} onClose={handleClose}>
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className={styles.dialogOverlay} />
            </Transition.Child>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span className={styles.dialogCentering} aria-hidden="true">
              &#8203;
            </span>
            
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className={styles.dialogContent}>
                <Dialog.Title as="h3" className={styles.dialogTitle}>
                  {editFaqId ? 'Edit Widget FAQ' : 'Add Widget FAQ'}
                </Dialog.Title>
                
                {editFaqId ? (
                  <div>
                    {/* Debug information */}
                    <div className={styles.hidden}>
                      <pre>Selected FAQ ID: {editFaqId}</pre>
                    </div>
                    
                    <EditWidgetFAQForm 
                      onClose={handleClose} 
                      faqId={editFaqId} 
                    />
                  </div>
                ) : (
                  <AddWidgetFAQForm onClose={handleClose} />
                )}
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      <WidgetFAQList onEdit={handleEdit} isLoading={isLoading} data={data} />
    </div>
  );
};

export default WidgetFAQManager;    