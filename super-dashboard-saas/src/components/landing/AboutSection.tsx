'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FaLightbulb, FaHandshake, FaCheckSquare, FaChartBar } from 'react-icons/fa'; // Example icons

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


// Reusable Value Item Component
interface ValueItemProps {
  icon: React.ReactNode;
  title: string;
  text: string;
  delay?: number;
}
const ValueItem: React.FC<ValueItemProps> = ({ icon, title, text, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.5, delay }}
    className="flex items-start bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
  >
    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center mr-4 text-xl">
      {icon}
    </div>
    <div>
      <h3 className="text-xl font-bold mb-2 text-neutral-900">{title}</h3>
      <p className="text-neutral-600 leading-relaxed">{text}</p>
    </div>
  </motion.div>
);

// Main About Section Component
const AboutSection: React.FC = () => {
  const stats = [
    { number: '5+', text: 'Years Innovating' },
    { number: '10k+', text: 'Businesses Served' },
    { number: '1M+', text: 'Conversations Handled' },
    { number: '4.9/5', text: 'Avg. Rating' },
  ];

  const values = [
    { icon: <FaLightbulb />, title: 'Innovation', text: 'Continuously improving our AI models and platform features to deliver state-of-the-art chatbot solutions.' },
    { icon: <FaHandshake />, title: 'Partnership', text: 'Working closely with our clients to understand their unique needs and ensure their success.' },
    { icon: <FaCheckSquare />, title: 'Reliability', text: 'Providing a robust and dependable platform that businesses can trust for critical customer interactions.' },
    { icon: <FaChartBar />, title: 'Results-Driven', text: 'Focusing on delivering measurable outcomes, from increased lead generation to improved customer satisfaction.' },
  ];

  return (
    <section className="py-16 md:py-24 bg-white" id="about">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="relative order-last lg:order-first"
          >
            <Image
              src="/api/placeholder/600/500?text=Team+Collaboration" // Placeholder
              alt="Dvojkavit Team"
              width={600}
              height={500}
              className="rounded-lg shadow-xl object-cover"
            />
            <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/70 to-transparent rounded-b-lg">
              <h3 className="text-white text-xl font-semibold">Pioneering AI Chat Solutions</h3>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block text-sm font-semibold py-1 px-3 rounded-full bg-primary-100 text-primary-600 mb-4">
              About Dvojkavit
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-5 text-neutral-900 relative">
              We Build Intelligent Conversation Experiences
              <span className="absolute bottom-[-10px] left-0 w-16 h-1 bg-gradient-to-r from-primary-500 to-primary-700 rounded-full"></span>
            </h2>
            <p className="text-neutral-600 mb-6 text-lg leading-relaxed">
              Dvojkavit was founded with the mission to revolutionize how businesses interact with their customers online. We leverage the power of artificial intelligence to create chatbots that are not just functional, but truly engaging and helpful.
            </p>
            <p className="text-neutral-600 mb-8 leading-relaxed">
              Our team combines expertise in AI, natural language processing, and user experience design to build solutions that drive growth, improve efficiency, and delight users.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center p-3 bg-neutral-50 rounded-md">
                  <div className="text-3xl font-bold text-primary-600 mb-1">{stat.number}</div>
                  <div className="text-sm text-neutral-600">{stat.text}</div>
                </div>
              ))}
            </div>
            <Link href="#contact" className="btn btn-primary">
              Learn More About Us
            </Link>
          </motion.div>
        </div>

        {/* Values Section */}
        <div className="mt-20">
           <SectionTitle
             title="Our Core Values"
             subtitle="The principles that guide our work and define our commitment to clients."
           />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            {values.map((value, index) => (
              <ValueItem
                key={index}
                icon={value.icon}
                title={value.title}
                text={value.text}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
