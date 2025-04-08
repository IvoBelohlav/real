'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FaRobot, FaComments, FaChartLine, FaCogs, FaShieldAlt, FaHeadset, FaCheck, FaArrowRight } from 'react-icons/fa';

// Reusable Section Title Component (Optional - can be created separately)
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

// Reusable Feature Card Component
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}
const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay }}
    className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full group"
  >
    <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-lg bg-primary-100 text-primary-600 mb-5 text-2xl transition-colors duration-300 group-hover:bg-primary-500 group-hover:text-white">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3 text-neutral-900">{title}</h3>
    <p className="text-neutral-600 mb-5 flex-grow">{description}</p>
    <Link href="#contact" className="text-primary-500 font-medium mt-auto flex items-center group-hover:text-primary-700 transition-colors duration-300">
      Learn More <FaArrowRight className="ml-2 text-sm transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  </motion.div>
);

// Main Features Section Component
const FeaturesSection: React.FC = () => {
  const features = [
    { icon: <FaRobot />, title: 'AI-Powered Conversations', description: 'Engage users with natural, intelligent conversations powered by advanced AI.' },
    { icon: <FaComments />, title: 'Lead Generation', description: 'Capture and qualify leads automatically through interactive chat flows.' },
    { icon: <FaCogs />, title: 'Customizable Flows', description: 'Easily build and modify conversation paths with our intuitive visual editor.' },
    { icon: <FaChartLine />, title: 'Insightful Analytics', description: 'Track performance, understand user behavior, and optimize your chatbot.' },
    { icon: <FaShieldAlt />, title: 'Secure & Reliable', description: 'Enterprise-grade security and infrastructure ensure data privacy and uptime.' },
    { icon: <FaHeadset />, title: 'Seamless Handoff', description: 'Smoothly transition complex queries from bot to human agents when needed.' },
  ];

  const highlightFeatures = [
    { title: 'Knowledge Base Integration', description: 'Connect your existing documentation for instant, accurate answers.' },
    { title: 'Multi-Channel Support', description: 'Deploy your chatbot across websites, messaging apps, and more.' },
    { title: 'Proactive Engagement', description: 'Initiate conversations based on user behavior to increase conversions.' },
  ];

  return (
    <section className="py-16 md:py-24 bg-neutral-50" id="features">
      <div className="container mx-auto px-4">
        <SectionTitle
          title="Why Choose Dvojkavit?"
          subtitle="Discover the powerful features that make our AI chatbot the perfect solution for your business needs."
        />

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={index * 0.1}
            />
          ))}
        </div>

        {/* Highlighted Feature Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <Image
              src="/api/placeholder/600/500?text=Chatbot+Interface" // Placeholder
              alt="Dvojkavit Chatbot Interface"
              width={600}
              height={500}
              className="rounded-lg shadow-xl object-cover"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block text-sm font-semibold py-1 px-3 rounded-full bg-primary-100 text-primary-600 mb-4">
              Advanced Capabilities
            </span>
            <h2 className="text-3xl font-bold mb-5 text-neutral-900">Go Beyond Basic Chatbots</h2>
            <p className="text-neutral-600 mb-6 text-lg leading-relaxed">
              Dvojkavit offers more than just simple Q&A. Leverage our platform for sophisticated automation, personalization, and integration possibilities.
            </p>
            <ul className="space-y-4">
              {highlightFeatures.map((item, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-1">
                    <FaCheck className="text-xs" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-800">{item.title}</h4>
                    <p className="text-neutral-600">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/register" className="btn btn-primary mt-8">
              Start Building Your Bot
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
