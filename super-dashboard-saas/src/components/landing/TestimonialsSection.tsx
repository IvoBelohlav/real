'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { FaStar, FaStarHalfAlt, FaRegStar, FaChevronLeft, FaChevronRight, FaQuoteLeft } from 'react-icons/fa';

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

// Star Rating Component
interface StarRatingProps {
  rating: number;
}
const StarRating: React.FC<StarRatingProps> = ({ rating }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      stars.push(<FaStar key={i} className="text-secondary-500" />);
    } else if (i === Math.ceil(rating) && !Number.isInteger(rating)) {
      stars.push(<FaStarHalfAlt key={i} className="text-secondary-500" />);
    } else {
      stars.push(<FaRegStar key={i} className="text-secondary-500" />);
    }
  }
  return <div className="flex space-x-1">{stars}</div>;
};

interface Testimonial {
  id: number;
  quote: string;
  rating: number;
  name: string;
  position: string;
  company: string;
  avatarUrl: string;
}

// Sample Testimonial Data
const testimonialsData: Testimonial[] = [
  {
    id: 1,
    quote: "Dvojkavit revolutionized our customer support. Response times are instant, and our team can focus on complex issues. Highly recommended!",
    rating: 5,
    name: "Alice Johnson",
    position: "Support Manager",
    company: "Tech Solutions Inc.",
    avatarUrl: "/api/placeholder/60/60?text=AJ",
  },
  {
    id: 2,
    quote: "The lead generation bot has been a game-changer. We're capturing more qualified leads than ever before, directly impacting our sales pipeline.",
    rating: 4.5,
    name: "Bob Williams",
    position: "Marketing Director",
    company: "Growth Co.",
    avatarUrl: "/api/placeholder/60/60?text=BW",
  },
  {
    id: 3,
    quote: "Easy to set up and customize. The visual flow builder made creating complex conversation paths surprisingly simple. Great platform!",
    rating: 5,
    name: "Charlie Brown",
    position: "Operations Lead",
    company: "Innovate Ltd.",
    avatarUrl: "/api/placeholder/60/60?text=CB",
  },
   {
    id: 4,
    quote: "The analytics dashboard provides valuable insights into customer interactions, helping us continuously improve our service.",
    rating: 4,
    name: "Diana Miller",
    position: "Product Manager",
    company: "Data Insights",
    avatarUrl: "/api/placeholder/60/60?text=DM",
  },
];

// Main Testimonials Section Component
const TestimonialsSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? testimonialsData.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === testimonialsData.length - 1 ? 0 : prevIndex + 1
    );
  };

  const currentTestimonial = testimonialsData[currentIndex];

  // Animation variants for Framer Motion
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  // Store direction for animations
  const [[page, direction], setPage] = useState([0, 0]);

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
    if (newDirection > 0) handleNext();
    else handlePrev();
  };


  return (
    <section className="py-16 md:py-24 bg-white" id="testimonials">
      <div className="container mx-auto px-4">
        <SectionTitle
          title="What Our Clients Say"
          subtitle="Real feedback from businesses thriving with Dvojkavit's AI solutions."
        />

        <div className="relative max-w-3xl mx-auto overflow-hidden">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={page} // Use page state for unique key
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="bg-neutral-50 rounded-lg p-8 shadow-lg relative" // Added relative positioning
            >
              <FaQuoteLeft className="absolute top-6 left-6 text-5xl text-primary-100 opacity-80 z-0" />
              <div className="relative z-10">
                <div className="mb-4">
                  <StarRating rating={currentTestimonial.rating} />
                </div>
                <p className="text-lg italic text-neutral-700 mb-6 leading-relaxed">
                  "{currentTestimonial.quote}"
                </p>
                <div className="flex items-center">
                  <Image
                    src={currentTestimonial.avatarUrl}
                    alt={currentTestimonial.name}
                    width={60}
                    height={60}
                    className="rounded-full mr-4 border-2 border-primary-200"
                    unoptimized
                  />
                  <div>
                    <h4 className="font-bold text-lg text-neutral-900">{currentTestimonial.name}</h4>
                    <p className="text-sm text-neutral-600">
                      {currentTestimonial.position} at <span className="font-medium text-primary-600">{currentTestimonial.company}</span>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <button
            onClick={() => paginate(-1)}
            className="absolute top-1/2 left-[-15px] md:left-[-30px] transform -translate-y-1/2 bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-md hover:bg-neutral-100 transition text-primary-500 hover:text-primary-700 z-20"
            aria-label="Previous testimonial"
          >
            <FaChevronLeft />
          </button>
          <button
            onClick={() => paginate(1)}
            className="absolute top-1/2 right-[-15px] md:right-[-30px] transform -translate-y-1/2 bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-md hover:bg-neutral-100 transition text-primary-500 hover:text-primary-700 z-20"
            aria-label="Next testimonial"
          >
            <FaChevronRight />
          </button>
        </div>

        {/* Navigation Dots */}
        <div className="flex justify-center space-x-2 mt-8">
          {testimonialsData.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)} // Direct navigation (optional)
              className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                currentIndex === index ? 'bg-primary-500 scale-110' : 'bg-neutral-300 hover:bg-neutral-400'
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
