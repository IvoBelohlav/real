'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BusinessType } from '@/types';
import { Edit, Trash2, Layers, Hash, Calendar } from 'lucide-react';

interface BusinessTypeListProps {
  businessTypes: BusinessType[];
  onEdit: (businessType: BusinessType) => void;
  onDelete: (businessTypeId: string) => void;
  isLoadingDelete: boolean;
}

const tableVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 200
    }
  }
};

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 }
};

const BusinessTypeList: React.FC<BusinessTypeListProps> = ({ businessTypes, onEdit, onDelete, isLoadingDelete }) => {
  return (
    <div className="overflow-x-auto">
      <motion.table 
        variants={tableVariants}
        initial="hidden"
        animate="visible"
        className="min-w-full divide-y divide-gray-200"
      >
        <thead className="bg-blue-50">
          <tr>
            <th scope="col" className="px-5 py-3.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              <div className="flex items-center">
                <Layers size={16} className="mr-1.5 text-blue-500" />
                Type Name
              </div>
            </th>
            <th scope="col" className="px-5 py-3.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              <div className="flex items-center">
                <Hash size={16} className="mr-1.5 text-blue-500" />
                Key Features Count
              </div>
            </th>
            <th scope="col" className="px-5 py-3.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              <div className="flex items-center">
                <Calendar size={16} className="mr-1.5 text-blue-500" />
                Comparison Metrics Count
              </div>
            </th>
            <th scope="col" className="px-5 py-3.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {businessTypes.map((bt) => (
            <motion.tr 
              key={bt.id}
              variants={rowVariants}
              className="hover:bg-blue-50 transition-colors duration-150 group"
            >
              <td className="px-5 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{bt.type}</div>
              </td>
              <td className="px-5 py-4 whitespace-nowrap">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {bt.key_features?.length || 0}
                </div>
              </td>
              <td className="px-5 py-4 whitespace-nowrap">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {bt.comparison_metrics?.length || 0}
                </div>
              </td>
              <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <motion.button
                  variants={buttonVariants}
                  initial="initial"
                  whileHover="hover"
                  onClick={() => onEdit(bt)}
                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  aria-label={`Edit ${bt.type}`}
                >
                  <Edit size={14} className="mr-1" /> Edit
                </motion.button>
                <motion.button
                  variants={buttonVariants}
                  initial="initial"
                  whileHover="hover"
                  onClick={() => onDelete(bt.id!)}
                  className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200 ${isLoadingDelete ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isLoadingDelete || !bt.id}
                  aria-label={`Delete ${bt.type}`}
                >
                  <Trash2 size={14} className="mr-1" /> Delete
                </motion.button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </motion.table>
    </div>
  );
};

export default BusinessTypeList;
