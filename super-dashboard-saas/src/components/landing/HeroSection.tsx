'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const HeroSection: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 10,
      },
    },
  };

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative text-center py-24 md:py-32 px-4 overflow-hidden bg-gradient-to-b from-blue-50 via-white to-transparent"
    >
      {/* Background Gradient Shapes (Optional Enhancement) */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      <div className="absolute bottom-10 left-20 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>


      <div className="relative z-10 max-w-4xl mx-auto">
        <motion.h1
          variants={itemVariants}
          className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight"
        >
          Turn Conversations into <span className="text-blue-600">Conversions</span>
        </motion.h1>
        <motion.p
          variants={itemVariants}
          className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto"
        >
          Engage visitors, automate support, showcase products, and drive sales with our intelligent, customizable chat widget designed for growth.
        </motion.p>
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row justify-center items-center gap-4"
        >
          <Link href="/register">
            <span className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition duration-300 ease-in-out cursor-pointer text-lg transform hover:scale-105 w-full sm:w-auto">
              Get Started Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </span>
          </Link>
          <Link href="/login">
             <span className="inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-8 rounded-lg shadow-md transition duration-300 ease-in-out cursor-pointer text-lg w-full sm:w-auto">
              Login
            </span>
          </Link>
        </motion.div>
         <motion.p variants={itemVariants} className="mt-6 text-sm text-gray-500">
            Start boosting engagement today!
          </motion.p>
      </div>
    </motion.section>
  );
};

export default HeroSection;
