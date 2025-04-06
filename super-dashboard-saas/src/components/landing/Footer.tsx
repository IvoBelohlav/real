'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const Footer: React.FC = () => {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }} // Delay slightly after CTA
      className="py-8 bg-gray-100 text-gray-600 text-sm px-4"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center">
        <p>&copy; {new Date().getFullYear()} SuperDashboard SaaS. All rights reserved.</p>
        <div className="flex space-x-4 mt-4 sm:mt-0">
          {/* Add relevant links if needed */}
          {/* <Link href="/privacy" className="hover:text-blue-600">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-blue-600">Terms of Service</Link> */}
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;
