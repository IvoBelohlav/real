'use client'; // Added 'use client'

import React from 'react'; // Added React import
import { motion } from 'framer-motion';
import { Zap, MessageSquare } from 'lucide-react'; // Removed ChatBubbleIcon
import { Button } from '@/components/ui/button'; // Adjusted path
import Link from 'next/link';

const CTASection = () => {
  return (
    <section className="w-full py-24 md:py-32 relative overflow-hidden"> {/* Removed id="contact" */}
      <div className="container px-4 md:px-6 mx-auto relative z-10 max-w-6xl">
        <div className="flex flex-col items-center text-center">
          <div className="w-full max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="bg-purple-600/10 border border-purple-600/20 rounded-full px-4 py-1.5 text-sm text-purple-400 inline-flex items-center font-medium mb-2">
                <Zap className="h-4 w-4 mr-1" />
                <span>Transform your customer support today</span>
              </div>

              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-violet-500">
                Start answering customer questions <span className="text-white">instantly</span>
              </h2>

              <p className="text-neutral-400 text-lg md:text-xl max-w-2xl mx-auto">
                Join thousands of businesses that use our AI chat widget to provide 24/7 support, reduce customer service costs by up to 75%, and increase sales conversions.
              </p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 md:pt-6"
              >
                <Link href="/register">
                  <Button size="lg" className="rounded-full h-12 px-8 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-900/30">
                    Get your AI assistant now
                  </Button>
                </Link>
                <Link href="#pricing">
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full h-12 px-8 border-purple-500/40 hover:border-purple-500/60 hover:bg-purple-500/10 text-white"
                  >
                    View pricing plans
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-16 bg-black/40 backdrop-blur-sm rounded-3xl border border-purple-600/20 p-6 md:p-8 shadow-xl"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-14 h-14 bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="h-7 w-7 text-purple-400" />
                  </div>
                  <h3 className="text-white font-medium text-lg mb-2">Instant Responses</h3>
                  <p className="text-neutral-400 text-sm">Your customers get immediate answers without waiting for human agents</p>
                </div>

                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-14 h-14 bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
                    <svg className="h-7 w-7 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 4h-4V2h-6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-7 0h2v2h-2V4zM7 15l1.5-2h2L9 15h2l1.5-2h2l-1.5 2h2l1.5-2h2l-1.5 2h1v1H7v-1zm10-5H7V8h10v2z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-medium text-lg mb-2">75% Cost Reduction</h3>
                  <p className="text-neutral-400 text-sm">Dramatically lower your customer support costs with AI automation</p>
                </div>

                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-14 h-14 bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
                    <svg className="h-7 w-7 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-medium text-lg mb-2">Increase Conversions</h3>
                  <p className="text-neutral-400 text-sm">Convert more visitors into customers with instant product recommendations</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Background gradient shapes */}
      <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-purple-600/10 to-violet-600/10 blur-3xl"></div>
      </div>
    </section>
  );
};

export default CTASection;
