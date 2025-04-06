'use client';

import React from 'react';
import DomainManager from '@/components/domains/DomainManager'; // Import the component

export default function DomainsPage() {
  return (
    <div className="space-y-6"> {/* Added space-y */}
      <h1 className="text-2xl font-semibold text-gray-900">Domain Management</h1> {/* Removed bottom margin */}
      <p className="text-gray-600"> {/* Removed margins */}
        Add or remove domains where your chat widget is allowed to appear.
      </p>
      {/* Render the manager component inside a card */}
      <div className="bg-white shadow rounded-lg p-6">
        <DomainManager />
      </div>
    </div>
  );
}
