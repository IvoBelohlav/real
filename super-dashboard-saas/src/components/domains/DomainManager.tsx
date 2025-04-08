'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

// Updated interface to match backend's DomainResponseItem
interface Domain {
  id: string;
  domain_name: string;
  // Removed is_verified and created_at as they are not sent by the backend currently
}

export default function DomainManager() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [isLoading, setIsLoading] = useState(false); // For add/delete operations
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch domains on mount
  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    setIsFetching(true);
    setError(null);
    try {
      // fetchApi now returns the array directly based on backend changes
      const fetchedDomainsArray: Domain[] = await fetchApi('/api/domains');
      // Ensure the response is an array before setting state
      setDomains(Array.isArray(fetchedDomainsArray) ? fetchedDomainsArray : []);
    } catch (err: any) {
      console.error("Failed to fetch domains:", err);
      // Ensure error is a string
      setError(err instanceof Error ? err.message : String(err) || "Could not load domains.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleAddDomain = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newDomain.trim()) return;

    setIsLoading(true);
    setError(null);
    const domainToAdd = newDomain.trim();

    try {
      // Corrected endpoint:
      const addedDomain = await fetchApi('/api/domains', {
        method: 'POST',
        // Corrected field name to match backend Pydantic model
        body: JSON.stringify({ domain: domainToAdd }),
      });
      // fetchApi now returns the updated array directly based on backend changes
      const updatedDomainsArray: Domain[] = addedDomain;
      // Ensure the response is an array before setting state
      setDomains(Array.isArray(updatedDomainsArray) ? updatedDomainsArray : []);
      setNewDomain(''); // Clear input field
    } catch (err: any) {
      console.error("Failed to add domain:", err);
      // Ensure error is a string
      setError(err instanceof Error ? err.message : String(err) || `Failed to add domain "${domainToAdd}".`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    // Optional: Add confirmation dialog here
    // if (!confirm(`Are you sure you want to delete this domain?`)) return;

    setIsLoading(true); // Use general loading or specific ID loading if preferred
    setError(null);

    try {
      // Encode the domainId to handle special characters like '/' and ':' correctly in the path
      const encodedDomainId = encodeURIComponent(domainId);
      // The delete endpoint now also returns the updated list
      const updatedDomainsArray: Domain[] = await fetchApi(`/api/domains/${encodedDomainId}`, {
        method: 'DELETE',
      });
       // Ensure the response is an array before setting state
      setDomains(Array.isArray(updatedDomainsArray) ? updatedDomainsArray : []);
    } catch (err: any) {
      console.error("Failed to delete domain:", err);
      // Ensure error is a string
      setError(err instanceof Error ? err.message : String(err) || "Failed to delete domain.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {error && <p className="text-red-500 bg-red-100 p-3 rounded">{error}</p>}

      {/* Add Domain Form */}
      <form onSubmit={handleAddDomain} className="flex items-end space-x-4">
        <div className="flex-grow">
          <label htmlFor="new-domain" className="block text-sm font-medium text-gray-700">
            Add New Domain
          </label>
          <input
            type="text"
            id="new-domain"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="example.com"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !newDomain.trim()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? <LoadingSpinner /> : 'Add Domain'}
        </button>
      </form>

      {/* Domain List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
          {isFetching ? (
            <li className="px-6 py-4 text-center text-gray-500"><LoadingSpinner /></li>
          // No longer need !Array.isArray check here as setDomains ensures it's an array
          ) : domains.length === 0 ? (
             <li className="px-6 py-4 text-center text-gray-500">No domains added yet.</li>
          ) : (
            domains.map((domain) => (
              <li key={domain.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{domain.domain_name}</p>
                  {/* Optionally show verification status later */}
                  {/* <p className={`text-xs ${domain.is_verified ? 'text-green-600' : 'text-yellow-600'}`}>
                    {domain.is_verified ? 'Verified' : 'Pending Verification'}
                  </p> */}
                </div>
                <button
                  onClick={() => handleDeleteDomain(domain.id)}
                  disabled={isLoading}
                  className="ml-4 inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  Delete
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
