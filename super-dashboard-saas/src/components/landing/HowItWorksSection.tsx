'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, Code, Settings, Rocket } from 'lucide-react';

const steps = [
  {
    icon: Rocket,
    title: 'Sign Up & Configure',
    description: 'Create your account in minutes and customize the widget\'s appearance, features, and automated flows in our intuitive dashboard.',
  },
  {
    icon: Code,
    title: 'Embed the Code',
    description: 'Copy the simple code snippet we provide and paste it into your website\'s HTML before the closing </body> tag.',
  },
  {
    icon: ClipboardCheck,
    title: 'Start Engaging',
    description: 'The widget instantly appears on your site, ready to interact with visitors, answer questions, capture leads, and showcase products.',
  },
];

const HowItWorksSection: React.FC = () => {
  const sectionVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
  };

  const stepContainerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.2,
      },
    },
  };

  const stepVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 80,
        damping: 15,
      },
    },
  };

  return (
    <motion.section
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      // Enhanced background class with gradient overlay
      className="py-16 md:py-24 bg-black text-white px-4 relative overflow-hidden"
    >
      {/* Enhanced Background Glow Elements with more vibrant colors and additional elements */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        {/* Primary large glow */}
        <div className="absolute top-1/5 left-1/4 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[120px] animate-pulse"></div>
        {/* Secondary glow */}
        <div className="absolute bottom-1/5 right-1/4 w-[400px] h-[400px] bg-violet-500/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '0.3s' }}></div>
        {/* Additional smaller accent glows */}
        <div className="absolute top-1/3 right-1/3 w-[200px] h-[200px] bg-fuchsia-500/10 rounded-full blur-[70px] animate-pulse" style={{ animationDelay: '0.7s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-[150px] h-[150px] bg-indigo-500/10 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: '1.1s' }}></div>
        {/* Subtle gradient overlay for the entire section */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-black/20"></div>
      </div>
      
      {/* Container with z-10 */}
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16"
        >
          {/* Enhanced gradient with wider color range */}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-300 to-violet-400">
            Get Started in 3 Simple Steps
          </span>
        </motion.h2>
        <motion.div
          variants={stepContainerVariants}
          className="flex flex-col md:flex-row justify-between items-start gap-10 md:gap-8"
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={stepVariants}
              className="flex flex-col items-center text-center md:items-start md:text-left w-full md:w-1/3"
            >
              {/* Enhanced icon background with more luminous border */}
              <div className="bg-gray-900 border-2 border-purple-700/60 text-purple-400 rounded-full p-4 mb-5 inline-flex items-center justify-center shadow-lg shadow-purple-900/20">
                <step.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
};

export default HowItWorksSection;
