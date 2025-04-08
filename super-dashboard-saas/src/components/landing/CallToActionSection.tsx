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
      className="py-16 md:py-24 bg-gradient-to-r from-purple-600 to-indigo-700 text-white px-4 relative overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23FFFFFF\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50 z-0"></div>
      
      <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-3xl"></div>
      <div className="absolute bottom-[-150px] left-[-50px] w-[300px] h-[300px] rounded-full bg-gradient-to-tr from-indigo-500/30 to-blue-500/30 blur-3xl"></div>
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-block mb-4"
        >
          <Sparkles className="h-10 w-10 text-purple-200" />
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
          className="text-lg text-purple-100 mb-8 max-w-xl mx-auto"
        >
          Sign up today and start converting more visitors into loyal customers.
        </motion.p>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative z-10"
        >
          <Link href="/register">
            <span className="inline-flex items-center justify-center bg-white hover:bg-gray-100 text-purple-700 font-bold py-3 px-8 rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.5)] transition duration-300 ease-in-out cursor-pointer text-lg transform hover:scale-105 hover:shadow-[0_0_25px_rgba(168,85,247,0.6)]">
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