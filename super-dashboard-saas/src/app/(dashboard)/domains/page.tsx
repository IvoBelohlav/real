'use client';

import React from 'react';
import DomainManager from '@/components/domains/DomainManager'; // Import the component

export default function DomainsPage() {
  return (
    <div className="space-y-6">
      {/* Apply dark theme text colors */}
      <h1 className="text-2xl font-semibold text-foreground">Domain Management</h1>
      <p className="text-muted-foreground">
        Add or remove domains where your chat widget is allowed to appear.
      </p>
      {/* Render the manager component inside a dark theme card */}
      <div className="bg-card shadow rounded-lg p-6 border border-border">
        <DomainManager /> {/* This component will need styling */}
      </div>
    </div>
  );
}
