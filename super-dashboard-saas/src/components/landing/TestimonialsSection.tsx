'use client'; // Added 'use client'

import { motion } from 'framer-motion';
import Image from 'next/image';
import { QuoteIcon } from 'lucide-react';
import React from 'react'; // Added React import

const TestimonialsSection = () => {
  const testimonials = [
    {
      metric: "40%",
      metricText: "reduction in routine inquiries",
      quote: "Since implementing this tool, our customer service team has seen a 40% reduction in routine inquiries, allowing them to focus on complex issues.",
      name: "Sarah Johnson",
      title: "Customer Success Manager",
      company: "TechFlow",
      image: "/avatars/avatar-1.png",
    },
    {
      metric: "28%",
      metricText: "increase in satisfaction ratings",
      quote: "The customization options are incredible. We made it match our brand perfectly, and our customers love the seamless experience.",
      name: "Michael Chen",
      title: "Director of E-Commerce",
      company: "StyleHub",
      image: "/avatars/avatar-2.png",
    },
    {
      metric: "10,000+",
      metricText: "hours saved annually",
      quote: "The ability to offer 24/7 support without increasing our staff has been a game-changer for our international customer base.",
      name: "Emma Rodriguez",
      title: "Head of Digital Strategy",
      company: "GlobalSell",
      image: "/avatars/avatar-3.png",
    },
  ];

  return (
    <section className="w-full py-24 md:py-32" id="testimonials">
      <div className="container px-4 md:px-6 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-16"
        >
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Real customers, <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-violet-500">real results</span>
          </h2>
          <p className="mx-auto max-w-[700px] text-gray-400 md:text-xl">
            See how businesses are transforming with our platform
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              className="bg-black border border-purple-900/20 rounded-xl overflow-hidden relative group hover:border-purple-500/30 transition-all duration-300"
            >
              {/* Metric highlight */}
              <div className="bg-purple-900/20 p-6 border-b border-purple-900/20">
                <div className="text-3xl font-bold text-purple-400">{testimonial.metric}</div>
                <div className="text-sm text-gray-400">{testimonial.metricText}</div>
              </div>

              {/* Quote content */}
              <div className="p-6">
                <QuoteIcon className="h-6 w-6 text-purple-500 mb-4 opacity-60" />
                <p className="text-gray-300 mb-6 line-clamp-4">{testimonial.quote}</p>
                <div className="flex items-center">
                  <div className="relative h-10 w-10 rounded-full overflow-hidden mr-4 border border-purple-900/40">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${testimonial.name}&background=6d28d9&color=fff`;
                      }}
                    />
                  </div>
                  <div>
                    <h4 className="font-medium text-white text-sm">{testimonial.name}</h4>
                    <p className="text-gray-400 text-xs">
                      {testimonial.title}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card glow effect on hover */}
              <div className="absolute -z-10 inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/0 to-purple-600/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 group-hover:via-purple-600/20"></div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 text-center"
        >
          <a href="#contact" className="inline-flex items-center text-purple-400 hover:text-purple-300 font-medium text-lg transition-colors">
            Read all customer stories
            <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
