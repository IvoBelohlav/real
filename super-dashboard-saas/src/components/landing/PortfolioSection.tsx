'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { FaLink, FaEye, FaShoppingCart, FaHeadset, FaUserPlus } from 'react-icons/fa'; // Example icons

// Reusable Section Title Component (Can be imported if created separately)
interface SectionTitleProps {
  title: string;
  subtitle: string;
}
const SectionTitle: React.FC<SectionTitleProps> = ({ title, subtitle }) => (
  <div className="text-center mb-12">
    <h2 className="text-3xl md:text-4xl font-bold mb-3 relative inline-block text-neutral-900 dark:text-neutral-100"> {/* Added dark mode text */}
      {title}
      <span className="absolute bottom-[-10px] left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-primary-500 to-primary-700 rounded-full"></span>
    </h2>
    <p className="max-w-2xl mx-auto mt-6 text-neutral-600 dark:text-neutral-400">{subtitle}</p> {/* Added dark mode text */}
  </div>
);

interface PortfolioItem {
  id: number;
  category: string; // e.g., 'E-commerce', 'Support', 'Lead Gen'
  title: string;
  imageUrl: string;
  description?: string; // Optional description for modal/details view
  icon: React.ReactNode;
}

// Sample data adapted for SaaS use cases
const portfolioItemsData: PortfolioItem[] = [
  { id: 1, category: 'E-commerce', title: 'Boosting Online Sales Conversion', imageUrl: '/api/placeholder/400/300?text=E-commerce+Bot', icon: <FaShoppingCart />, description: 'Implemented proactive chat to assist shoppers, resulting in a 25% increase in cart completion rates.' },
  { id: 2, category: 'Support', title: 'Reducing Support Ticket Volume', imageUrl: '/api/placeholder/400/300?text=Support+Bot', icon: <FaHeadset />, description: 'Automated answers to common questions, decreasing support tickets by 40% and improving response time.' },
  { id: 3, category: 'Lead Gen', title: 'Capturing More Qualified Leads', imageUrl: '/api/placeholder/400/300?text=Lead+Gen+Bot', icon: <FaUserPlus />, description: 'Used targeted chat flows to engage website visitors, leading to a 60% increase in qualified lead capture.' },
  { id: 4, category: 'E-commerce', title: 'Personalized Product Recommendations', imageUrl: '/api/placeholder/400/300?text=Product+Recs', icon: <FaShoppingCart />, description: 'AI-driven recommendations via chat increased average order value by 15%.' },
  { id: 5, category: 'Support', title: '24/7 Instant Customer Assistance', imageUrl: '/api/placeholder/400/300?text=24/7+Support', icon: <FaHeadset />, description: 'Provided round-the-clock support, improving customer satisfaction scores significantly.' },
  { id: 6, category: 'Lead Gen', title: 'Automated Appointment Scheduling', imageUrl: '/api/placeholder/400/300?text=Scheduling+Bot', icon: <FaUserPlus />, description: 'Integrated chatbot with calendars to automate demo bookings, saving sales team hours weekly.' },
];

const categories = ['All', 'E-commerce', 'Support', 'Lead Gen'];

// Portfolio Item Card Component
interface PortfolioCardProps {
  item: PortfolioItem;
}
const PortfolioCard: React.FC<PortfolioCardProps> = ({ item }) => (
  <motion.div
    layout // Animate layout changes when filtering
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    transition={{ duration: 0.3 }}
    className="relative rounded-lg overflow-hidden shadow-md group bg-neutral-800" // Added dark bg for card base
  >
    <Image
      src={item.imageUrl}
      alt={item.title}
      width={400}
      height={300}
      className="w-full h-60 object-cover transition-transform duration-300 group-hover:scale-105"
      unoptimized
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
      <span className="text-sm font-medium text-primary-400 mb-1 flex items-center">
        {item.icon} <span className="ml-1.5">{item.category}</span>
      </span>
      <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
      <div className="flex space-x-2">
        <button onClick={() => alert(`Viewing details for: ${item.title}`)} className="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-primary-500 transition-colors duration-300">
          <FaEye size={16} />
        </button>
        {/* <Link href="#" className="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-primary-500 transition-colors duration-300">
          <FaLink size={16} />
        </Link> */}
      </div>
    </div>
  </motion.div>
);


// Main Portfolio Section Component
const PortfolioSection: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredItems = activeFilter === 'All'
    ? portfolioItemsData
    : portfolioItemsData.filter(item => item.category === activeFilter);

  return (
    <section className="py-16 md:py-24 bg-neutral-50 dark:bg-neutral-900" id="portfolio"> {/* Added dark mode bg */}
      <div className="container mx-auto px-4">
        <SectionTitle
          title="See Dvojkavit in Action"
          subtitle="Explore how our AI chatbot drives results across various industries and use cases."
        />

        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-10">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveFilter(category)}
              className={`
                py-2 px-5 rounded-full text-sm font-medium transition-all duration-300
                ${activeFilter === category
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600 border border-neutral-200 dark:border-neutral-600' // Added dark mode styles
                }
              `}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Portfolio Grid */}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <PortfolioCard key={item.id} item={item} />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* CTA Button */}
        <div className="text-center mt-16">
           {/* Assuming Button component exists and handles dark mode */}
          <Link href="#contact" className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 text-lg">
            Request a Demo
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PortfolioSection;
