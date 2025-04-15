'use client';

import React from 'react';
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

const HeroSection = () => {
  return (
    <section className="w-full pt-20 pb-28 md:pt-24 lg:pt-28 md:pb-32 lg:pb-40 relative overflow-hidden bg-black text-white" id="home">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        {/* Main gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/30 via-black to-black"></div>
        
        {/* Primary glow elements */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-700/15 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[130px] animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        
        {/* Accent glow elements */}
        <div className="absolute top-1/3 right-1/3 w-[300px] h-[300px] bg-fuchsia-400/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '0.8s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] bg-indigo-500/10 rounded-full blur-[90px] animate-pulse" style={{ animationDelay: '1.2s' }}></div>
        
        {/* Small accent glows */}
        <div className="absolute top-1/2 left-1/2 w-[150px] h-[150px] bg-pink-400/10 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute bottom-1/2 right-1/2 w-[100px] h-[100px] bg-blue-400/10 rounded-full blur-[50px] animate-pulse" style={{ animationDelay: '1.8s' }}></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center justify-center text-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Enhanced badge with more vibrant glow */}
            <div className="inline-block rounded-full bg-purple-900/40 px-4 py-1 text-sm text-purple-300 mb-4 backdrop-blur-sm border border-purple-800/40 shadow-sm shadow-purple-500/20">
              <span className="flex items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-purple-400 mr-2 animate-pulse shadow-sm shadow-purple-400/50"></span>
                New AI Technology
              </span>
            </div>

            {/* Enhanced gradient heading */}
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-300 to-violet-400">
                Your 24/7 AI Customer Support
              </span>
              <span className="block text-white mt-2">
                No training required.
              </span>
            </h1>

            <p className="mx-auto max-w-[700px] text-neutral-400 md:text-xl mt-6">
              Our AI chat widget answers customer questions instantly, reduces support costs by up to 75%, and converts more visitors into paying customers—all without hiring additional staff.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-5 min-[400px]:flex-row mt-12"
          >
            {/* Enhanced primary button with better shadow effects */}
            <Link href="/register">
              <Button
                size="lg"
                className="rounded-full h-12 px-8 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/30 transition-all duration-300 hover:shadow-purple-800/40 hover:translate-y-[-2px]"
              >
                Try for free - No credit card
              </Button>
            </Link>
            {/* Enhanced outline button */}
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full h-12 px-8 group border-purple-500/40 hover:border-purple-500/60 text-white hover:text-white hover:bg-purple-900/20 backdrop-blur-sm transition-all duration-300"
              >
                Watch demo
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mt-20 relative w-full max-w-[1200px]"
          >
            {/* Applied CTA box styles */}
            <div className="overflow-hidden rounded-3xl border border-purple-600/20 shadow-xl backdrop-blur-sm bg-black/40 p-6 md:p-8">
              <div className="text-center mb-8">
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Powerful AI Chat Widget</h3>
                  <p className="text-purple-300 max-w-xl mx-auto">Understand customer needs, suggest products, and resolve issues automatically - 24/7 without human intervention</p>
              </div>
              {/* Demo UI */}
              <div className="w-full max-w-3xl mx-auto border border-purple-600/40 rounded-xl overflow-hidden shadow-2xl">
                  <div className="bg-gray-900 border-b border-purple-500/30 p-2 flex items-center">
                    <div className="flex space-x-1.5 mr-auto">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="text-center text-xs text-gray-400">ChatWidget Live Demo</div>
                    <div className="ml-auto w-4"></div>
                  </div>
                  <div className="bg-gray-800 w-full h-64 flex">
                    <div className="w-2/3 h-full border-r border-gray-700 p-4">
                      <div className="text-sm text-gray-400">AI Configuration</div>
                      <div className="mt-4 space-y-3">
                        <div className="h-6 bg-gray-700 rounded w-3/4"></div>
                        <div className="h-6 bg-gray-700 rounded w-full"></div>
                        <div className="h-6 bg-gray-700 rounded w-2/3"></div>
                        <div className="h-6 bg-purple-700/70 rounded w-1/2 shadow-sm shadow-purple-500/30"></div>
                      </div>
                    </div>
                    <div className="w-1/3 h-full p-4">
                      <div className="text-sm text-gray-400">Chat Preview</div>
                      <div className="mt-4 flex flex-col items-end space-y-2">
                        <div className="h-8 bg-purple-600/80 rounded-lg p-2 text-xs text-white w-5/6 flex items-center shadow-md shadow-purple-700/20">
                          <span>Hello! How can I help you today?</span>
                        </div>
                        <div className="h-8 bg-gray-700 rounded-lg p-2 text-xs text-white w-4/6 flex items-center">
                          <span>Do you offer international shipping?</span>
                        </div>
                        <div className="h-8 bg-purple-600/80 rounded-lg p-2 text-xs text-white w-5/6 flex items-center shadow-md shadow-purple-700/20">
                          <span>Yes! We ship to over 50 countries worldwide</span>
                        </div>
                      </div>
                    </div>
                  </div>
              </div> {/* Correctly closes Demo UI div */}
            </div> {/* Correctly closes CTA styled div */}
          </motion.div> {/* Correctly closes motion.div */}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 flex flex-col items-center"
          >
            <p className="text-neutral-500 text-sm mb-6">TRUSTED BY INNOVATIVE COMPANIES</p>
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 opacity-70">
              {['Shopify', 'Webflow', 'Zendesk', 'HubSpot', 'Wix', 'Squarespace'].map((brand) => (
                <div key={brand} className="text-neutral-400 flex items-center">
                  <span className="font-medium text-base">{brand}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
