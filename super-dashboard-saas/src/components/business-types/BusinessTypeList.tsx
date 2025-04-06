'use client';

import React from 'react';
import { BusinessType } from '@/types'; // Import the BusinessType type

interface BusinessTypeListProps {
  businessTypes: BusinessType[];
  onEdit: (businessType: BusinessType) => void;
  onDelete: (businessTypeId: string) => void;
  isLoadingDelete: boolean;
}

const BusinessTypeList: React.FC<BusinessTypeListProps> = ({ businessTypes, onEdit, onDelete, isLoadingDelete }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type Name
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Attributes Count
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Query Patterns Count
            </th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {businessTypes.map((bt) => (
            <tr key={bt.id}>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{bt.type}</div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {bt.attributes ? Object.keys(bt.attributes).length : 0}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {bt.query_patterns?.length || 0}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <button
                  onClick={() => onEdit(bt)}
                  className="text-indigo-600 hover:text-indigo-900"
                  aria-label={`Edit ${bt.type}`}
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(bt.id!)} // Assuming id is always present after fetch
                  className={`text-red-600 hover:text-red-900 ${isLoadingDelete ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isLoadingDelete || !bt.id}
                  aria-label={`Delete ${bt.type}`}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BusinessTypeList;
