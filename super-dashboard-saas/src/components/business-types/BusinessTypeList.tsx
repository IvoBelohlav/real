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
        className="min-w-full divide-y divide-border" // Use border color
      >
        {/* Apply dark theme header styles */}
        <thead className="bg-muted/50"> {/* Use muted background */}
          <tr>
            <th scope="col" className="px-5 py-3.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="flex items-center">
                <Layers size={16} className="mr-1.5 text-primary" /> {/* Use primary color */}
                Type Name
              </div>
            </th>
            <th scope="col" className="px-5 py-3.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="flex items-center">
                <Hash size={16} className="mr-1.5 text-primary" />
                Key Features Count
              </div>
            </th>
            <th scope="col" className="px-5 py-3.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="flex items-center">
                <Calendar size={16} className="mr-1.5 text-primary" />
                Comparison Metrics Count
              </div>
            </th>
            <th scope="col" className="px-5 py-3.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        {/* Apply dark theme body styles */}
        <tbody className="bg-card divide-y divide-border"> {/* Use card background and border */}
          {businessTypes.map((bt) => (
            <motion.tr
              key={bt.id}
              variants={rowVariants}
              className="hover:bg-muted/50 transition-colors duration-150 group" // Use muted hover
            >
              <td className="px-5 py-4 whitespace-nowrap">
                {/* Use foreground text */}
                <div className="text-sm font-medium text-foreground">{bt.type}</div>
              </td>
              <td className="px-5 py-4 whitespace-nowrap">
                {/* Use secondary badge style */}
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                  {bt.key_features?.length || 0}
                </div>
              </td>
              <td className="px-5 py-4 whitespace-nowrap">
                {/* Use secondary badge style */}
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                  {bt.comparison_metrics?.length || 0}
                </div>
              </td>
              <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                {/* Use primary button style (small variant) */}
                <motion.button
                  variants={buttonVariants}
                  initial="initial"
                  whileHover="hover"
                  onClick={() => onEdit(bt)}
                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-colors duration-200"
                  aria-label={`Edit ${bt.type}`}
                >
                  <Edit size={14} className="mr-1" /> Edit
                </motion.button>
                {/* Use destructive button style (small variant) */}
                <motion.button
                  variants={buttonVariants}
                  initial="initial"
                  whileHover="hover"
                  onClick={() => onDelete(bt.id!)}
                  className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-destructive-foreground bg-destructive hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-destructive transition-colors duration-200 ${isLoadingDelete ? 'opacity-50 cursor-not-allowed' : ''}`}
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
