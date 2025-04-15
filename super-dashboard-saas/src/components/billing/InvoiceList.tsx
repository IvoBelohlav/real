'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getInvoices } from '@/lib/api';
import { Invoice } from '@/types';
import { format } from 'date-fns';
import { ExternalLink, FileDown, Receipt, Calendar, Banknote, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const tableVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    }
  }
};

const rowVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

const hoverButtonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 }
};

const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedInvoices = await getInvoices();
        setInvoices(fetchedInvoices);
      } catch (err) {
        console.error("Error fetching invoices:", err);
        setError(err instanceof Error ? err.message : "Failed to load invoices.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const formatCurrency = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(amount);
    } catch (e) {
      console.warn(`Failed to format currency ${currency}:`, e);
      return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
    }
  };

  const handleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    if (sortField === 'date') {
      const dateA = new Date(a.created).getTime();
      const dateB = new Date(b.created).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else {
      return sortDirection === 'asc' 
        ? a.amount_due - b.amount_due 
        : b.amount_due - a.amount_due;
    }
  });

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center items-center p-16"
      >
        <LoadingSpinner />
      </motion.div>
    );
  }

  if (error) {
    return (
      // Apply dark theme error styles
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center p-4 bg-destructive/80 text-destructive-foreground rounded-lg border border-destructive shadow-sm"
      >
        <AlertTriangle className="h-5 w-5 mr-2 text-destructive-foreground" />
        <p>Error: {error}</p>
      </motion.div>
    );
  }

  const getSortIcon = (field: 'date' | 'amount') => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1 inline-block">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    // Apply dark theme card styles
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.5 }}
      className="border rounded-xl shadow-md overflow-hidden bg-card border-border" // Use card bg and border
    >
      {/* Apply dark theme header styles */}
      <div className="p-5 bg-muted/50 border-b border-border"> {/* Use muted bg and border */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Receipt className="h-6 w-6 text-primary mr-2" /> {/* Use primary color */}
            <h3 className="text-xl font-semibold text-foreground">Invoice History</h3> {/* Use foreground text */}
          </div>
        </div>
      </div>

      <div className="p-4">
        {invoices.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-10"
          >
            {/* Use muted text */}
            <p className="text-muted-foreground">No invoices found.</p>
          </motion.div>
        ) : (
          // Apply dark theme table container styles
          <div className="overflow-x-auto rounded-lg border border-border">
            <motion.table
              variants={tableVariants}
              initial="hidden"
              animate="show"
              className="min-w-full divide-y divide-border" // Use border color
            >
              {/* Apply dark theme table header styles */}
              <thead className="bg-muted/50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors duration-200"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      Date
                      {getSortIcon('date')}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors duration-200"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center">
                      <Banknote className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      Amount
                      {getSortIcon('amount')}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <AnimatePresence>
                {/* Apply dark theme table body styles */}
                <motion.tbody className="bg-card divide-y divide-border">
                  {sortedInvoices.map((invoice) => (
                    <motion.tr
                      key={invoice.id}
                      variants={rowVariants}
                      exit={{ opacity: 0, x: -10 }}
                      className="hover:bg-muted/50 transition-colors duration-150" // Use muted hover
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* Apply dark theme text colors */}
                        <div className="text-sm font-medium text-foreground">
                          {format(new Date(invoice.created), 'PP')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(invoice.created), 'p')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">
                          {formatCurrency(invoice.amount_due, invoice.currency)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* Apply dark theme badge styles */}
                        <span className={`px-3 py-1.5 inline-flex items-center text-xs font-semibold rounded-full ${
                          invoice.status === 'paid' ? 'bg-green-700/20 text-green-400' :
                          invoice.status === 'open' ? 'bg-yellow-700/20 text-yellow-400' :
                          'bg-muted text-muted-foreground' // Use muted for other statuses
                        }`}>
                          <span className={`w-2 h-2 mr-1.5 rounded-full ${
                            invoice.status === 'paid' ? 'bg-green-500' :
                            invoice.status === 'open' ? 'bg-yellow-500' :
                            'bg-gray-500' // Keep gray or map to muted
                          }`}></span>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {/* Apply dark theme button styles */}
                        {invoice.hosted_invoice_url && (
                          <motion.a
                            whileHover="hover"
                            initial="initial"
                            variants={hoverButtonVariants}
                            href={invoice.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 border border-border rounded-md shadow-sm text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-colors duration-200"
                          >
                            <ExternalLink className="mr-1.5 h-4 w-4" /> View
                          </motion.a>
                        )}
                        {invoice.invoice_pdf && (
                          <motion.a
                            whileHover="hover"
                            initial="initial"
                            variants={hoverButtonVariants}
                            href={invoice.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="inline-flex items-center px-3 py-1.5 border border-border rounded-md shadow-sm text-sm font-medium text-secondary-foreground bg-secondary hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-colors duration-200"
                          >
                            <FileDown className="mr-1.5 h-4 w-4" /> PDF
                          </motion.a>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </AnimatePresence>
            </motion.table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default InvoiceList;
