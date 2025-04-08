'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

const ClientsSection: React.FC = () => {
  // Replace with actual client logos or use placeholders
  const clientLogos = [
    { src: '/api/placeholder/150/50?text=Client+A', alt: 'Client A' },
    { src: '/api/placeholder/150/50?text=Client+B', alt: 'Client B' },
    { src: '/api/placeholder/150/50?text=Client+C', alt: 'Client C' },
    { src: '/api/placeholder/150/50?text=Client+D', alt: 'Client D' },
    { src: '/api/placeholder/150/50?text=Client+E', alt: 'Client E' },
  ];

  return (
    <section className="py-12 bg-white border-b border-neutral-200">
      <div className="container mx-auto px-4">
        <h3 className="text-center text-base font-semibold text-purple-600 uppercase tracking-wider mb-8">
          Powering Conversations For
        </h3>
        <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-6 md:gap-x-16 lg:gap-x-20">
          {clientLogos.map((logo, index) => (
            <motion.div 
              key={index} 
              className="flex justify-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {/* Using Next.js Image component */}
              <Image
                src={logo.src}
                alt={logo.alt}
                width={150}
                height={50}
                className="object-contain opacity-60 hover:opacity-100 transition-opacity duration-300 filter grayscale hover:grayscale-0"
                unoptimized // Necessary if using external placeholder service without configuring domains
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ClientsSection;