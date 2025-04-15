'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRobot } from 'react-icons/fa'; // Updated icon for chat widget
import { Menu, X, ArrowRight } from 'lucide-react'; // Icons for hamburger menu
import { Button } from '@/components/ui/button'; // Adjusted path

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
    { href: '#features', label: 'Features' },
    { href: '#testimonials', label: 'Testimonials' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#contact', label: 'Contact' },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-[99999] bg-black/95 backdrop-blur-md border-b border-purple-600 shadow-lg shadow-purple-600/20"> {/* Reverted background color */}
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center text-2xl font-bold text-white transition-colors duration-300">
            <div className="mr-2 text-purple-400 bg-purple-900 p-1.5 rounded-lg">
              <FaRobot className="text-purple-300 h-6 w-6" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-violet-400">
              ChatWidget
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setActiveLink(link.href)}
                className={`
                  relative text-sm font-medium transition-colors duration-300
                  ${activeLink === link.href
                    ? 'text-white'
                    : 'text-neutral-400 hover:text-white'}
                  group
                `}
              >
                {link.label}
                <span className={`
                  absolute left-0 bottom-0 w-full h-0.5 bg-gradient-to-r from-purple-500 to-violet-500 transform origin-left transition-transform duration-300
                  ${activeLink === link.href ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}
                `} />
              </Link>
            ))}
            <div className="flex items-center space-x-3 ml-4">
              <Link href="/login">
                <Button
                  variant="outline"
                  className="rounded-full h-10 px-6 border-purple-500 hover:border-purple-400 text-white hover:text-white hover:bg-purple-900/60"
                >
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  className="rounded-full h-10 px-6 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-900/20 group"
                >
                  <span>Sign up free</span>
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </nav>

          {/* Hamburger Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              aria-label="Toggle menu"
              className="focus:outline-none text-white p-1 rounded-md bg-purple-800 hover:bg-purple-700"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-black shadow-lg py-6 border-b-2 border-purple-600">
            <nav className="flex flex-col items-center space-y-5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    setActiveLink(link.href);
                    closeMenu();
                  }}
                  className={`
                    text-base font-medium transition-colors duration-300
                    ${activeLink === link.href ? 'text-purple-400' : 'text-white hover:text-purple-300'}
                  `}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col space-y-3 w-full px-8 pt-4">
                <Link href="/login" className="w-full">
                  <Button
                    onClick={closeMenu}
                    variant="outline"
                    className="w-full rounded-full h-12 border-purple-500 hover:border-purple-400 text-white hover:text-white hover:bg-purple-900/60"
                  >
                    Log in
                  </Button>
                </Link>
                <Link href="/register" className="w-full">
                  <Button
                    onClick={closeMenu}
                    className="w-full rounded-full h-12 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-900/20 flex items-center justify-center"
                  >
                    <span>Sign up free</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
