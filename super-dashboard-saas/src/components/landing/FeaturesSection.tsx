'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  TrendingDown,
  Lightbulb,
  Image as ImageIcon,
  Globe,
  Bitcoin,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the type for a feature item
interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

const FeaturesSection = () => {
  // Features array with Czech text and icons
  const features: FeatureItem[] = [
    {
      icon: <Clock className="h-6 w-6 text-purple-400" />,
      title: "ÚSPORA ČASU",
      subtitle: "Meta, Google, TikTok, Linked-in"
    },
    {
      icon: <TrendingDown className="h-6 w-6 text-purple-400" />,
      title: "MENŠÍ ZTRÁTA OBJEDNÁVEK",
      subtitle: "Webflow, WP, Custom"
    },
    {
      icon: <Lightbulb className="h-6 w-6 text-purple-400" />,
      title: "VÍCE OBJEDNÁVEK",
      subtitle: "Logo, Webdesign, Billboardy"
    },
    {
      icon: <ImageIcon className="h-6 w-6 text-purple-400" />,
      title: "MÉNĚ STÍŽNOSTÍ",
      subtitle: "Foto, Video, Edit"
    },
    {
      icon: <Globe className="h-6 w-6 text-purple-400" />,
      title: "ONLINE 24/7",
      subtitle: "Produkt Prototyp"
    },
    {
      icon: <Bitcoin className="h-6 w-6 text-purple-400" />,
      title: "Blockchain a NFT",
      subtitle: "Tokeny, Dapps, NFT, SC"
    }
  ];

  return (
    // Added overflow-hidden to contain glow
    <section className="w-full py-24 md:py-32 relative bg-black text-white overflow-hidden" id="features">
       {/* Background Glow Elements */}
       <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[110px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-violet-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '0.4s' }}></div>
      </div>
      {/* Container with z-10 */}
      <div className="container px-4 md:px-6 mx-auto max-w-7xl relative z-10">
        {/* Main content container */}
        <div className="flex flex-col-reverse md:flex-row gap-12 lg:gap-16 items-center">

          {/* Left Column: Feature Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full md:w-2/3"
          >
            <div className="flex flex-col space-y-6">
              {/* First row - single card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="w-full"
              >
                {/* Apply new styles */}
                <div className="bg-black/40 backdrop-blur-sm rounded-3xl border border-purple-600/20 p-5 shadow-xl flex items-center space-x-5 transition-all">
                  <div className="bg-black rounded-full p-3 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-wide">{features[0].title}</h3>
                    <p className="text-gray-400 text-sm">{features[0].subtitle}</p>
                  </div>
                </div>
              </motion.div>

              {/* Second row - single card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-full"
              >
                 {/* Apply new styles */}
                <div className="bg-black/40 backdrop-blur-sm rounded-3xl border border-purple-600/20 p-5 shadow-xl flex items-center space-x-5 transition-all">
                  <div className="bg-black rounded-full p-3 flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-wide">{features[1].title}</h3>
                    <p className="text-gray-400 text-sm">{features[1].subtitle}</p>
                  </div>
                </div>
              </motion.div>

              {/* Third row - single card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="w-full"
              >
                 {/* Apply new styles */}
                <div className="bg-black/40 backdrop-blur-sm rounded-3xl border border-purple-600/20 p-5 shadow-xl flex items-center space-x-5 transition-all">
                  <div className="bg-black rounded-full p-3 flex items-center justify-center">
                    <Lightbulb className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-wide">{features[2].title}</h3>
                    <p className="text-gray-400 text-sm">{features[2].subtitle}</p>
                  </div>
                </div>
              </motion.div>

              {/* Fourth row - 3 cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {features.slice(3).map((feature, index) => (
                  <motion.div
                    key={index + 3}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  >
                     {/* Apply new styles */}
                    <div className="bg-black/40 backdrop-blur-sm rounded-3xl border border-purple-600/20 p-5 shadow-xl flex flex-col items-center text-center transition-all h-full">
                      <div className="bg-black rounded-full p-3 flex items-center justify-center mb-4">
                        {feature.icon}
                      </div>
                      <h3 className="text-base font-bold tracking-wide mb-1">{feature.title}</h3>
                      <p className="text-gray-400 text-xs">{feature.subtitle}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Text Block */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full md:w-1/3 space-y-5 text-left md:pl-8"
          >
            {/* Apply gradient to h2 */}
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-300 to-violet-400">
                JAKÉ JSOU REÁLNÉ VÝHODY NAŠEHO WIDGETU?
              </span>
            </h2>
            {/* Adjusted Purple Subtitle styling */}
            <div className="inline-block bg-purple-600 rounded-lg px-4 py-2 text-white"> {/* Changed bg and text color */}
              <p className="text-2xl sm:text-3xl font-bold">
                Váš Úspěch
              </p>
            </div>
            <p className="text-gray-400 text-lg">
              Protože marketing není jen o nastavení reklamy. Jinak řečeno – neděláme jen správu kampaní. Vytvoříme vám samostatný a efektivní marketingový kanál.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
