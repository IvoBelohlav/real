'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FaRocket, FaUsers, FaComments, FaChartBar } from 'react-icons/fa'; // Example icons

interface StatItemProps {
  icon: React.ReactNode;
  number: string;
  text: string;
  delay?: number;
}

const StatItem: React.FC<StatItemProps> = ({ icon, number, text, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.5, delay }}
    className="text-center text-white"
  >
    <div className="text-5xl mb-4 opacity-90">{icon}</div>
    <div className="text-4xl md:text-5xl font-bold mb-2 leading-none">{number}</div>
    <div className="text-lg opacity-90">{text}</div>
  </motion.div>
);

const StatsSection: React.FC = () => {
  const stats = [
    { icon: <FaRocket />, number: '30%', text: 'Avg. Conversion Uplift' },
    { icon: <FaUsers />, number: '10k+', text: 'Active Businesses' },
    { icon: <FaComments />, number: '1M+', text: 'Monthly Conversations' },
    { icon: <FaChartBar />, number: '40%', text: 'Support Cost Reduction' },
  ];

  return (
    <section className="py-16 md:py-20 bg-gradient-to-r from-primary-600 to-primary-800" id="stats">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-8">
          {stats.map((stat, index) => (
            <StatItem
              key={index}
              icon={stat.icon}
              number={stat.number}
              text={stat.text}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
