'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaCogs, FaBrain, FaCommentsDollar, FaUserCheck, FaTools, FaChartPie, FaCheck, FaArrowRight } from 'react-icons/fa';

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

// Reusable Service Card Component
interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  delay?: number;
}
const ServiceCard: React.FC<ServiceCardProps> = ({ icon, title, description, features, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay }}
    className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full group relative overflow-hidden"
  >
    {/* Top border accent */}
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-primary-700 transition-all duration-300 group-hover:h-2"></div>

    <div className="flex-shrink-0 text-4xl text-primary-500 mb-5 mt-2 transition-colors duration-300 group-hover:text-primary-600">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3 text-neutral-900">{title}</h3>
    <p className="text-neutral-600 mb-5 leading-relaxed flex-grow">{description}</p>
    <ul className="space-y-2 mb-6">
      {features.map((feature, index) => (
        <li key={index} className="flex items-center text-sm text-neutral-700">
          <FaCheck className="text-green-500 mr-2 flex-shrink-0 text-xs" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
    <Link href="#contact" className="text-primary-500 font-medium mt-auto flex items-center group-hover:text-primary-700 transition-colors duration-300 self-start">
      Request Service <FaArrowRight className="ml-2 text-sm transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  </motion.div>
);

// Main Services Section Component
const ServicesSection: React.FC = () => {
  const services = [
    {
      icon: <FaBrain />,
      title: 'Custom AI Chatbot Development',
      description: 'Tailored chatbot solutions designed to meet your specific business logic, branding, and integration needs.',
      features: ['Needs Assessment & Strategy', 'Custom Flow Design', 'AI Model Training', 'Platform Integration'],
    },
    {
      icon: <FaCommentsDollar />,
      title: 'Lead Generation & Qualification Bot',
      description: 'Automate lead capturing and qualification 24/7, ensuring you never miss a potential customer.',
      features: ['Proactive Engagement Rules', 'CRM Integration', 'Lead Scoring', 'Appointment Scheduling'],
    },
    {
      icon: <FaUserCheck />,
      title: 'Customer Support Automation',
      description: 'Provide instant answers to common questions, resolve issues faster, and free up your support team.',
      features: ['Knowledge Base Integration', 'FAQ Handling', 'Ticket Creation', 'Human Agent Handoff'],
    },
    {
      icon: <FaTools />,
      title: 'Chatbot Implementation & Setup',
      description: 'Get your Dvojkavit chatbot up and running quickly with our expert setup and configuration services.',
      features: ['Widget Installation', 'Initial Flow Setup', 'Theme Customization', 'Basic Training'],
    },
    {
      icon: <FaCogs />,
      title: 'Integration Services',
      description: 'Connect Dvojkavit seamlessly with your existing tools like CRM, helpdesk, marketing automation, and more.',
      features: ['API Integration', 'Webhook Configuration', 'Custom Data Sync', 'Third-Party Tools'],
    },
    {
      icon: <FaChartPie />,
      title: 'Analytics & Optimization',
      description: 'Leverage data to continuously improve your chatbot\'s performance, user satisfaction, and conversion rates.',
      features: ['Performance Monitoring', 'Conversation Analysis', 'A/B Testing Setup', 'Optimization Reports'],
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-neutral-100" id="services">
      <div className="container mx-auto px-4">
        <SectionTitle
          title="Our Services"
          subtitle="Comprehensive AI chatbot solutions designed to elevate your customer interactions and drive business growth."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <ServiceCard
              key={index}
              icon={service.icon}
              title={service.title}
              description={service.description}
              features={service.features}
              delay={index * 0.1}
            />
          ))}
        </div>

        <div className="text-center mt-16">
          <p className="text-lg text-neutral-700 mb-6 max-w-xl mx-auto">
            Don't see exactly what you need? We offer custom solutions tailored to your unique requirements.
          </p>
          <Link href="#contact" className="btn btn-primary btn-lg">
            Discuss Your Project
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
