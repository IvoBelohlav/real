'use client';

'use client'; // Ensure this is a client component if it uses hooks or state

import React from 'react';
import SubscriptionPlans from '@/components/billing/SubscriptionPlans'; // Import the component
import InvoiceList from '@/components/billing/InvoiceList'; // Import the new InvoiceList component

export default function BillingPage() {
  return (
    <div className="space-y-6"> {/* Added space-y */}
      <h1 className="text-2xl font-semibold text-gray-900">Billing & Subscription</h1> {/* Removed bottom margin */}
      <p className="text-gray-600"> {/* Removed margins */}
        Manage your subscription plan and view payment history.
      </p>
      {/* Render the component inside a card */}
      {/* Render the SubscriptionPlans component inside a card */}
      <div className="bg-white shadow rounded-lg p-6">
        <SubscriptionPlans />
      </div>

      {/* Add the InvoiceList component */}
      <div className="mt-6"> {/* Add margin-top for spacing */}
        <InvoiceList />
      </div>
    </div>
  );
}
