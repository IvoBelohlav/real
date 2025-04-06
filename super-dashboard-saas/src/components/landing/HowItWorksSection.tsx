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
      className="py-16 md:py-24 bg-gradient-to-b from-blue-50 via-gray-50 to-white px-4"
    >
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-gray-800 text-center mb-12 md:mb-16"
        >
          Get Started in 3 Simple Steps
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
              <div className="bg-white border-2 border-blue-200 text-blue-600 rounded-full p-4 mb-5 inline-flex items-center justify-center shadow-md">
                <step.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">{step.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
};

export default HowItWorksSection;
