'use client';

'use client'; // Ensure this is a client component if it uses hooks or state

import React from 'react';
import SubscriptionPlans from '@/components/billing/SubscriptionPlans'; // Import the component
import InvoiceList from '@/components/billing/InvoiceList'; // Import the new InvoiceList component

export default function BillingPage() {
  return (
    <div className="space-y-6">
      {/* Apply dark theme text colors */}
      <h1 className="text-2xl font-semibold text-foreground">Billing & Subscription</h1>
      <p className="text-muted-foreground">
        Manage your subscription plan and view payment history.
      </p>
      {/* Render the SubscriptionPlans component inside a dark theme card */}
      <div className="bg-card shadow rounded-lg p-6 border border-border">
        <SubscriptionPlans /> {/* This component will need styling */}
      </div>

      {/* Render the InvoiceList component inside a dark theme card */}
      <div className="mt-6 bg-card shadow rounded-lg border border-border"> {/* Added card styles here */}
        <InvoiceList /> {/* This component will need styling */}
      </div>
    </div>
  );
}
