'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaCheck, FaTimes } from 'react-icons/fa';

// Reusable Section Title Component (Can be imported if created separately)
interface SectionTitleProps {
  title: string;
  subtitle: string;
}
const SectionTitle: React.FC<SectionTitleProps> = ({ title, subtitle }) => (
  <div className="text-center mb-12">
    <h2 className="text-3xl md:text-4xl font-bold mb-3 relative inline-block text-neutral-900">
      {title}
      <span className="absolute bottom-[-10px] left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-primary-500 to-primary-700 rounded-full"></span>
    </h2>
    <p className="max-w-2xl mx-auto mt-6 text-neutral-600">{subtitle}</p>
  </div>
);

interface PricingPlan {
  name: string;
  subtitle: string;
  monthlyPrice: number;
  yearlyPrice: number; // Calculated or stored
  features: { text: string; included: boolean }[];
  isPopular?: boolean;
  ctaText: string;
  ctaLink: string; // Link to registration or checkout page
  info?: string;
}

// Sample Pricing Data (Adjust based on actual plans)
const pricingPlansData: PricingPlan[] = [
  {
    name: 'Starter',
    subtitle: 'For individuals & small teams',
    monthlyPrice: 29,
    yearlyPrice: 290, // Example: 10 * monthly
    features: [
      { text: '1 Chatbot Widget', included: true },
      { text: '500 Conversations/mo', included: true },
      { text: 'Basic Customization', included: true },
      { text: 'Knowledge Base Integration', included: true },
      { text: 'Email Support', included: true },
      { text: 'Analytics Dashboard', included: false },
      { text: 'CRM Integration', included: false },
      { text: 'Remove Branding', included: false },
    ],
    ctaText: 'Get Started',
    ctaLink: '/register?plan=starter', // Example link
    info: 'Perfect for getting started.',
  },
  {
    name: 'Professional',
    subtitle: 'For growing businesses',
    monthlyPrice: 79,
    yearlyPrice: 790, // Example: 10 * monthly
    features: [
      { text: '3 Chatbot Widgets', included: true },
      { text: '2,500 Conversations/mo', included: true },
      { text: 'Advanced Customization', included: true },
      { text: 'Knowledge Base Integration', included: true },
      { text: 'Priority Email Support', included: true },
      { text: 'Analytics Dashboard', included: true },
      { text: 'Basic CRM Integration', included: true },
      { text: 'Remove Branding', included: false },
    ],
    isPopular: true,
    ctaText: 'Choose Pro',
    ctaLink: '/register?plan=pro', // Example link
    info: 'Most popular choice.',
  },
  {
    name: 'Enterprise',
    subtitle: 'For large-scale deployment',
    monthlyPrice: 199, // Or 'Custom'
    yearlyPrice: 1990, // Or 'Custom'
    features: [
      { text: 'Unlimited Widgets', included: true },
      { text: '10,000+ Conversations/mo', included: true },
      { text: 'Full Customization & Branding', included: true },
      { text: 'Knowledge Base Integration', included: true },
      { text: 'Dedicated Support Manager', included: true },
      { text: 'Advanced Analytics & Reporting', included: true },
      { text: 'Advanced CRM/API Integration', included: true },
      { text: 'Remove Branding', included: true },
    ],
    ctaText: 'Contact Sales',
    ctaLink: '#contact', // Link to contact section
    info: 'Tailored for your needs.',
  },
];

// Pricing Card Component
interface PricingCardProps {
  plan: PricingPlan;
  isYearly: boolean;
  delay?: number;
}
const PricingCard: React.FC<PricingCardProps> = ({ plan, isYearly, delay = 0 }) => {
  const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  const period = isYearly ? '/year' : '/month';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay }}
      className={`
        bg-white rounded-lg p-8 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col h-full relative overflow-hidden
        ${plan.isPopular ? 'border-2 border-primary-500 scale-105 z-10' : 'border border-neutral-200'}
      `}
    >
      {plan.isPopular && (
        <div className="absolute top-3 right-[-35px] bg-gradient-to-r from-primary-500 to-primary-700 text-white text-xs font-bold py-1.5 px-8 transform rotate-45 shadow-md">
          Popular
        </div>
      )}
      <div className="text-center mb-6 pb-6 border-b border-neutral-200">
        <h3 className="text-xl font-bold mb-2 text-neutral-900">{plan.name}</h3>
        <p className="text-sm text-neutral-600 mb-4">{plan.subtitle}</p>
        <div className="flex items-baseline justify-center">
          <span className="text-xl font-semibold text-neutral-800 mr-1">$</span>
          <span className="text-5xl font-extrabold text-primary-600 leading-none">{price}</span>
          <span className="text-sm text-neutral-600 ml-1">{period}</span>
        </div>
      </div>
      <ul className="space-y-3 mb-8 flex-grow">
        {plan.features.map((feature, index) => (
          <li key={index} className={`flex items-start ${!feature.included ? 'text-neutral-400 line-through' : 'text-neutral-700'}`}>
            {feature.included ? (
              <FaCheck className="text-green-500 mr-3 mt-1 flex-shrink-0 text-xs" />
            ) : (
              <FaTimes className="text-red-400 mr-3 mt-1 flex-shrink-0 text-xs" />
            )}
            <span>{feature.text}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto">
        <Link
          href={plan.ctaLink}
          className={`btn w-full ${plan.isPopular ? 'btn-primary' : 'btn-outline border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white'}`}
        >
          {plan.ctaText}
        </Link>
        {plan.info && <p className="text-xs text-neutral-500 text-center mt-3">{plan.info}</p>}
      </div>
    </motion.div>
  );
};


// Main Pricing Section Component
const PricingSection: React.FC = () => {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section className="py-16 md:py-24 bg-neutral-100" id="pricing">
      <div className="container mx-auto px-4">
        <SectionTitle
          title="Flexible Pricing Plans"
          subtitle="Choose the plan that best fits your business size and needs. Start free, upgrade anytime."
        />

        {/* Pricing Toggle */}
        <div className="flex items-center justify-center mb-12 space-x-3">
          <span className={`text-lg font-medium cursor-pointer ${!isYearly ? 'text-neutral-900 font-bold' : 'text-neutral-600'}`} onClick={() => setIsYearly(false)}>
            Monthly
          </span>
          <div
            onClick={() => setIsYearly(!isYearly)}
            className={`relative w-14 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 ${isYearly ? 'bg-primary-600' : 'bg-neutral-300'}`}
          >
            <motion.div
              className="w-6 h-6 bg-white rounded-full shadow-md"
              layout
              transition={{ type: "spring", stiffness: 700, damping: 30 }}
              style={{ x: isYearly ? '1.75rem' : '0rem' }} // Adjust based on padding and handle size (w-14 -> 3.5rem, w-6 -> 1.5rem, p-1 -> 0.25rem each side. (3.5 - 1.5 - 0.25 - 0.25) = 1.5rem? Let's try 28px / 1.75rem)
            />
          </div>
          <span className={`text-lg font-medium cursor-pointer ${isYearly ? 'text-neutral-900 font-bold' : 'text-neutral-600'}`} onClick={() => setIsYearly(true)}>
            Yearly
            <span className="ml-2 inline-block text-xs font-bold bg-accent-green text-white py-0.5 px-2 rounded-full align-middle">
              Save 20%
            </span>
          </span>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {pricingPlansData.map((plan, index) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              isYearly={isYearly}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
