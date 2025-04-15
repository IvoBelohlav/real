'use client'; // Added 'use client'

import React from 'react';
import Link from 'next/link';
import { FaRobot, FaTwitter, FaGithub, FaLinkedinIn, FaInstagram, FaArrowUp, FaDiscord } from 'react-icons/fa';
import { Globe, Mail, MessageSquare, ArrowRight } from 'lucide-react';

const Footer: React.FC = () => {
  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const footerLinks = [
    {
      title: "Platform",
      links: [
        { label: "Studio", href: "#" },
        { label: "App Library", href: "#" },
        { label: "Integrations", href: "#" },
        { label: "API", href: "#" },
        { label: "Extensions", href: "#" },
      ]
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "#" },
        { label: "Knowledge Base", href: "#" },
        { label: "Blog", href: "#" },
        { label: "Community", href: "#" },
        { label: "Changelog", href: "#" },
      ]
    },
    {
      title: "Company",
      links: [
        { label: "About Us", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Privacy Policy", href: "#" },
        { label: "Terms of Service", href: "#" },
        { label: "Contact", href: "#" },
      ]
    },
  ];

  return (
    <footer className="bg-black border-t border-purple-600/30 pt-16 pb-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Company Info */}
          <div className="md:col-span-2">
            <Link href="#" className="flex items-center mb-6">
              <div className="bg-purple-900 p-1.5 rounded-lg mr-2">
                <FaRobot className="h-5 w-5 text-purple-300" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-violet-400">
                ChatWidget
              </span>
            </Link>
            <p className="text-neutral-400 mb-6 max-w-md">
              Advanced AI-powered chat widget for businesses of every size — customize, deploy,
              and engage with customers instantly.
            </p>
            <div className="flex space-x-4 mb-8">
              <Link href="#" className="text-neutral-500 hover:text-purple-400 transition-colors duration-300">
                <FaTwitter className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-neutral-500 hover:text-purple-400 transition-colors duration-300">
                <FaGithub className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-neutral-500 hover:text-purple-400 transition-colors duration-300">
                <FaLinkedinIn className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-neutral-500 hover:text-purple-400 transition-colors duration-300">
                <FaDiscord className="h-5 w-5" />
              </Link>
            </div>
            <div className="relative">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full bg-black/30 backdrop-blur-sm border border-purple-600/30 rounded-full px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 pr-12"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-purple-600 to-violet-600 text-white p-1.5 rounded-full hover:from-purple-700 hover:to-violet-700 transition-colors">
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Links */}
          {footerLinks.map((section, i) => (
            <div key={i}>
              <h3 className="text-white font-medium mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link, j) => (
                  <li key={j}>
                    <Link
                      href={link.href}
                      className="text-neutral-400 hover:text-purple-400 transition-colors duration-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-purple-600/20 flex flex-col md:flex-row justify-between items-center">
          <p className="text-neutral-500 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} ChatWidget. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <Link href="#" className="text-neutral-500 hover:text-purple-400 text-sm transition-colors duration-300">
              Privacy Policy
            </Link>
            <Link href="#" className="text-neutral-500 hover:text-purple-400 text-sm transition-colors duration-300">
              Terms of Service
            </Link>
            <Link href="#" className="text-neutral-500 hover:text-purple-400 text-sm transition-colors duration-300">
              Cookie Policy
            </Link>
          </div>
        </div>

        {/* Back to top button */}
        <div className="flex justify-center mt-12">
          <a
            href="#"
            onClick={scrollToTop}
            className="bg-purple-900/30 hover:bg-purple-900/50 border border-purple-600/30 p-2.5 rounded-full transition-colors duration-300 group shadow-lg shadow-purple-900/20"
          >
            <FaArrowUp className="h-4 w-4 text-purple-300 group-hover:text-purple-200" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
