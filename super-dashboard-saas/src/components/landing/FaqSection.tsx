'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaMinus } from 'react-icons/fa';

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

interface FaqItemData {
  question: string;
  answer: string;
}

const faqData: FaqItemData[] = [
  {
    question: "How does the AI chatbot learn about my business?",
    answer: "You can train the Dvojkavit chatbot by providing your website content, uploading documents (like product manuals or policies), or manually adding question-answer pairs via our dashboard. It uses this information to provide accurate and relevant responses.",
  },
  {
    question: "Can I customize the chatbot's appearance?",
    answer: "Yes! Dvojkavit offers extensive customization options. You can change colors, fonts, logos, positioning, avatar, welcome messages, and more to perfectly match your brand identity and website design.",
  },
  {
    question: "What platforms can I integrate Dvojkavit with?",
    answer: "Dvojkavit supports integration with various platforms, including popular CRMs (like Salesforce, HubSpot), helpdesk software (like Zendesk, Intercom), messaging apps (like Slack, Facebook Messenger - coming soon), and custom APIs via webhooks.",
  },
  {
    question: "Is it difficult to set up?",
    answer: "Not at all! Setting up Dvojkavit is designed to be straightforward. You can embed the chat widget on your website with a simple code snippet. Our dashboard provides intuitive tools for training, customization, and flow building. We also offer support and documentation.",
  },
  {
    question: "How does the pricing work?",
    answer: "We offer tiered pricing plans based on the number of chatbot widgets, monthly conversation volume, and included features. We have plans suitable for businesses of all sizes, including a starter plan. Check our Pricing section for details.",
  },
];

// Accordion Item Component
interface AccordionItemProps {
  item: FaqItemData;
  isOpen: boolean;
  onClick: () => void;
}
const AccordionItem: React.FC<AccordionItemProps> = ({ item, isOpen, onClick }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4 transition-shadow duration-300 hover:shadow-lg">
      <button
        onClick={onClick}
        className="flex justify-between items-center w-full p-5 md:p-6 text-left focus:outline-none"
        aria-expanded={isOpen}
      >
        <h3 className="text-lg font-semibold text-neutral-800 mr-4">{item.question}</h3>
        <div className="text-primary-500 text-xl flex-shrink-0">
          {isOpen ? <FaMinus /> : <FaPlus />}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: "auto" },
              collapsed: { opacity: 0, height: 0 }
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
          >
            <div className="px-5 md:px-6 pb-5 text-neutral-600 leading-relaxed">
              {item.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


// Main FAQ Section Component
const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // Start with the first item open

  const handleClick = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 md:py-24 bg-neutral-50" id="faq">
      <div className="container mx-auto px-4">
        <SectionTitle
          title="Frequently Asked Questions"
          subtitle="Find answers to common questions about Dvojkavit's features, setup, and pricing."
        />

        <div className="max-w-3xl mx-auto">
          {faqData.map((item, index) => (
            <AccordionItem
              key={index}
              item={item}
              isOpen={openIndex === index}
              onClick={() => handleClick(index)}
            />
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-lg text-neutral-700 mb-4">Still have questions?</p>
          <Link href="#contact" className="btn btn-primary">
            Contact Our Support Team
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
