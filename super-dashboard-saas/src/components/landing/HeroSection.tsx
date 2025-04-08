'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Use Next.js Image component
import { motion } from 'framer-motion';
import styles from './HeroSection.module.css'; // CSS Module for specific styles

const HeroSection: React.FC = () => {
  return (
    <section className={`relative overflow-hidden pt-40 pb-20 md:pt-48 md:pb-28 ${styles.heroGradient}`} id="home">
      {/* Background Elements */}
      <div className={styles.heroPattern}></div>
      <div className={`${styles.heroBlob} ${styles.heroBlob1}`}></div>
      <div className={`${styles.heroBlob} ${styles.heroBlob2}`}></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center md:text-left text-white">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight"
            >
              Elevate Your Business with AI-Powered Chat
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl opacity-90 mb-8 max-w-xl mx-auto md:mx-0"
            >
              Dvojkavit provides intelligent chatbot solutions to automate customer support, generate leads, and enhance user engagement.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mb-10"
            >
              {/* Updated button styles to match the example */}
              <Link href="/register" className="btn btn-white btn-lg">
                Get Started Free
              </Link>
              <Link href="#features" className="btn btn-outline btn-lg border-white text-white hover:bg-white hover:text-primary-600">
                Explore Features
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex justify-center md:justify-start space-x-8"
            >
              <div className="text-center">
                <div className="text-3xl font-bold">10k+</div>
                <div className="text-sm opacity-80">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">98%</div>
                <div className="text-sm opacity-80">Customer Satisfaction</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">24/7</div>
                <div className="text-sm opacity-80">Support Automation</div>
              </div>
            </motion.div>
          </div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex justify-center"
          >
            {/* Placeholder Image - Replace with relevant screenshot or graphic */}
            <Image
              src="/api/placeholder/700/600" // Placeholder API
              alt="Dvojkavit Dashboard Preview"
              width={700}
              height={600}
              className="rounded-lg shadow-2xl object-cover"
              priority // Load hero image faster
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
