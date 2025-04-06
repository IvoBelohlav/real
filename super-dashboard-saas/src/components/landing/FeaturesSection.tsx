'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bot, MessageSquare, Settings, ShoppingCart, Zap } from 'lucide-react';

const features = [
  {
    icon: ShoppingCart,
    title: 'E-commerce Powerhouse',
    description: 'Showcase products directly in chat, leverage AI suggestions for listings, and guide customers through their purchase journey with automated flows.',
  },
  {
    icon: Bot,
    title: 'Intelligent Automation',
    description: 'Build custom guided chat flows to qualify leads, answer FAQs instantly, and provide 24/7 support without human intervention.',
  },
  {
    icon: MessageSquare,
    title: 'Live Agent Chat',
    description: 'Connect visitors with your sales or support team in real-time for complex queries or personalized assistance when needed.',
  },
  {
    icon: BarChart,
    title: 'Integrated Product Catalog',
    description: 'Manage your products within the dashboard and make them easily accessible within the chat widget for seamless showcasing.',
  },
  {
    icon: Settings,
    title: 'Fully Customizable',
    description: "Tailor the widget's appearance, colors, and behavior to perfectly match your brand identity and website design.",
  },
  {
    icon: Zap,
    title: 'Capture More Leads',
    description: 'Use integrated contact forms and guided flows to collect visitor information and qualify potential leads effectively.',
  },
];

const FeaturesSection: React.FC = () => {
  const sectionVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
  };

  const cardContainerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12,
      },
    },
  };

  return (
    <motion.section
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      className="py-16 md:py-24 bg-white px-4"
    >
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-gray-800 text-center mb-12 md:mb-16"
        >
          Why Choose Our Chat Widget?
        </motion.h2>
        <motion.div
          variants={cardContainerVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col items-center text-center transition-shadow duration-300 hover:shadow-blue-100"
            >
              <div className="bg-blue-100 text-blue-600 rounded-full p-4 mb-5 inline-flex items-center justify-center">
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
};

export default FeaturesSection;
