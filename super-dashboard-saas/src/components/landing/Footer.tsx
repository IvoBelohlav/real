'use client';

import React from 'react';
import Link from 'next/link';
import { FaBolt, FaMapMarkerAlt, FaPhone, FaEnvelope, FaClock, FaFacebookF, FaTwitter, FaLinkedinIn, FaInstagram, FaArrowUp } from 'react-icons/fa';

const Footer: React.FC = () => {

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const targetId = e.currentTarget.getAttribute('href');
    const targetElement = targetId ? document.querySelector(targetId) : null;

    if (targetElement) {
      window.scrollTo({
        top: targetElement.getBoundingClientRect().top + window.scrollY - 100, // Adjust offset if needed
        behavior: 'smooth',
      });
    } else {
       window.scrollTo({ top: 0, behavior: 'smooth' }); // Fallback for #header or if target not found
    }
  };

  const footerLinks = {
    services: [
      { href: '#services', label: 'AI Chatbot Development' },
      { href: '#services', label: 'Lead Generation Bot' },
      { href: '#services', label: 'Support Automation' },
      { href: '#services', label: 'Implementation Setup' },
      { href: '#services', label: 'Integration Services' },
      { href: '#services', label: 'Analytics & Optimization' },
    ],
    company: [
      { href: '#about', label: 'About Us' },
      { href: '#portfolio', label: 'Use Cases' },
      { href: '#testimonials', label: 'Testimonials' },
      { href: '#pricing', label: 'Pricing' },
      { href: '#faq', label: 'FAQ' },
      { href: '#contact', label: 'Contact Us' },
    ],
  };

  const socialLinks = [
    { href: '#', label: 'Facebook', icon: <FaFacebookF /> },
    { href: '#', label: 'Twitter', icon: <FaTwitter /> },
    { href: '#', label: 'LinkedIn', icon: <FaLinkedinIn /> },
    { href: '#', label: 'Instagram', icon: <FaInstagram /> },
  ];

  return (
    <footer className="bg-neutral-900 text-neutral-400 pt-16 pb-8 relative">
      <div className="container mx-auto px-4">
        {/* Footer Top */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-12 border-b border-neutral-800 mb-8">
          {/* About Column */}
          <div>
            <Link href="#home" onClick={scrollToTop} className="inline-flex items-center text-2xl font-bold text-white mb-4">
              <FaBolt className="mr-2 text-primary-500" />
              dvojkavit
            </Link>
            <p className="text-sm leading-relaxed mb-6">
              Dvojkavit provides intelligent AI chatbot solutions to automate support, generate leads, and enhance user engagement for businesses worldwide.
            </p>
            <div className="flex space-x-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  aria-label={link.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-neutral-800 hover:bg-primary-500 text-neutral-300 hover:text-white flex items-center justify-center transition-all duration-300 transform hover:-translate-y-1"
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Services Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Services</h4>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} onClick={scrollToTop} className="text-sm hover:text-white transition-colors duration-300 py-1 block">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} onClick={scrollToTop} className="text-sm hover:text-white transition-colors duration-300 py-1 block">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start">
                <FaMapMarkerAlt className="text-primary-500 mr-3 mt-1 flex-shrink-0" />
                <span>123 AI Street, Future City, FC 54321</span>
              </li>
              <li className="flex items-start">
                <FaPhone className="text-primary-500 mr-3 mt-1 flex-shrink-0" />
                <a href="tel:+15551234567" className="hover:text-white transition-colors duration-300">+1 (555) 123-4567</a>
              </li>
              <li className="flex items-start">
                <FaEnvelope className="text-primary-500 mr-3 mt-1 flex-shrink-0" />
                <a href="mailto:support@dvojkavit.com" className="hover:text-white transition-colors duration-300">support@dvojkavit.com</a>
              </li>
              <li className="flex items-start">
                <FaClock className="text-primary-500 mr-3 mt-1 flex-shrink-0" />
                <span>Mon - Fri: 9:00 AM - 5:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left">
          <p className="text-sm text-neutral-500 mb-4 md:mb-0">
            © {new Date().getFullYear()} Dvojkavit. All rights reserved.
          </p>
          <div className="flex space-x-4">
            {/* Replace # with actual links if available */}
            <Link href="/privacy-policy" className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors duration-300">Privacy Policy</Link>
            <Link href="/terms-of-service" className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors duration-300">Terms of Service</Link>
          </div>
        </div>

        {/* Back to Top Button */}
        <a
          href="#header" // Points to the header ID for scrolling
          onClick={scrollToTop}
          className="absolute right-6 bottom-8 w-12 h-12 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-lg transform hover:-translate-y-1"
          aria-label="Back to top"
        >
          <FaArrowUp />
        </a>
      </div>
    </footer>
  );
};

export default Footer;
