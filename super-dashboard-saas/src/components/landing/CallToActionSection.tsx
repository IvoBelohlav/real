'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

const CallToActionSection: React.FC = () => {
  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  return (
    <motion.section
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className="py-16 md:py-24 bg-blue-600 text-white px-4"
    >
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-block mb-4"
        >
          <Sparkles className="h-10 w-10 text-yellow-300" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-3xl md:text-4xl font-bold mb-6"
        >
          Ready to Boost Your Website's Engagement?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-lg text-blue-100 mb-8 max-w-xl mx-auto"
        >
          Sign up today and start converting more visitors into loyal customers.
        </motion.p>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link href="/register">
            <span className="inline-flex items-center justify-center bg-white hover:bg-gray-100 text-blue-600 font-bold py-3 px-8 rounded-lg shadow-lg transition duration-300 ease-in-out cursor-pointer text-lg transform hover:scale-105">
              Sign Up Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </span>
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default CallToActionSection;
