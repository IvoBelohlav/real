'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBolt, FaBars, FaTimes } from 'react-icons/fa'; // Icons for logo and hamburger
import styles from './Header.module.css'; // CSS Module for specific styles

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeLink, setActiveLink] = useState('#home');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);

      // Active link highlighting logic
      const sections = document.querySelectorAll('section[id]');
      let currentSectionId = 'home'; // Default to home
      sections.forEach((section) => {
        // Cast section to HTMLElement to access offsetTop and offsetHeight
        const htmlSection = section as HTMLElement; 
        const sectionTop = htmlSection.offsetTop - 100; // Adjust offset as needed
        const sectionHeight = htmlSection.offsetHeight;
        const sectionId = section.getAttribute('id');

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
          if (sectionId) {
            currentSectionId = sectionId;
          }
        }
      });
      setActiveLink(`#${currentSectionId}`);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Run on mount

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const navLinks = [
    { href: '#home', label: 'Home' },
    { href: '#about', label: 'About' },
    { href: '#services', label: 'Services' },
    { href: '#portfolio', label: 'Portfolio' },
    // { href: '#blog', label: 'Blog' }, // Uncomment if Blog section is added
    { href: '#contact', label: 'Contact' },
  ];

  const headerClasses = `
    fixed top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out
    ${isScrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'}
    ${isScrolled && !isMenuOpen ? 'text-neutral-800' : 'text-white'}
    ${isMenuOpen ? 'bg-white text-neutral-800 shadow-md' : ''}
  `;

  const logoColor = isScrolled || isMenuOpen ? 'text-primary-600' : 'text-white';
  const linkColor = isScrolled || isMenuOpen ? 'text-neutral-700 hover:text-primary-600' : 'text-white hover:text-primary-300';
  const activeLinkColor = isScrolled || isMenuOpen ? 'text-primary-600 font-semibold' : 'text-white font-semibold';
  const hamburgerColor = isScrolled || isMenuOpen ? 'text-neutral-800' : 'text-white';

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={headerClasses}
      id="header"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="#home" className={`flex items-center text-2xl font-bold ${logoColor} transition-colors duration-300`}>
            <FaBolt className="mr-2" />
            dvojkavit
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setActiveLink(link.href)} // Set active link on click for immediate feedback
                className={`
                  relative text-base font-medium transition-colors duration-300 pb-1
                  ${activeLink === link.href ? activeLinkColor : linkColor}
                  ${styles.navLink}
                  ${activeLink === link.href ? styles.active : ''}
                `}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="btn btn-primary btn-sm ml-4">
              Get Started
            </Link>
          </nav>

          {/* Hamburger Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              aria-label="Toggle menu"
              className={`focus:outline-none ${hamburgerColor}`}
            >
              {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg py-4"
          >
            <nav className="flex flex-col items-center space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    setActiveLink(link.href);
                    closeMenu(); // Close menu on link click
                  }}
                  className={`
                    text-lg font-medium transition-colors duration-300
                    ${activeLink === link.href ? 'text-primary-600' : 'text-neutral-700 hover:text-primary-600'}
                  `}
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/login" onClick={closeMenu} className="btn btn-primary mt-4">
                Get Started
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;
