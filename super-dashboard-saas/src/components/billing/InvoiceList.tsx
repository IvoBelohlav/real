'use client';

import React, { useState, useEffect } from 'react';
import { getInvoices } from '@/lib/api';
import { Invoice } from '@/types';
import { format } from 'date-fns';
// Removed imports for Card, Table, Button from @/components/ui
import { ExternalLink, FileDown } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // Assuming this exists

const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
      // Fallback formatting
      return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center p-4"><LoadingSpinner /></div>;
  }

  if (error) {
    return <p className="text-red-500 p-4">Error: {error}</p>;
  }

  return (
    <div className="border rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 bg-gray-50 border-b">
        <h3 className="text-lg font-semibold">Invoice History</h3>
      </div>
      <div className="p-4">
        {invoices.length === 0 ? (
          <p className="text-gray-500">No invoices found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{format(new Date(invoice.created), 'PP')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.amount_due, invoice.currency)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {invoice.hosted_invoice_url && (
                        <a
                          href={invoice.hosted_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <ExternalLink className="mr-1 h-4 w-4" /> View
                        </a>
                      )}
                      {invoice.invoice_pdf && (
                         <a
                           href={invoice.invoice_pdf}
                           target="_blank"
                           rel="noopener noreferrer"
                           download
                           className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                         >
                           <FileDown className="mr-1 h-4 w-4" /> PDF
                         </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceList;
