'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Check, Sparkles } from 'lucide-react';
import Link from 'next/link'; // Import Link for navigation

// Define plan structure matching SubscriptionPlans but adapted for landing page
interface LandingPlan {
  id: string;
  tierId: 'basic' | 'premium' | 'enterprise';
  name: string;
  description: string; // Add description for landing page context
  priceMonthly: number | 'Custom';
  priceAnnual: number | 'Custom';
  features: string[];
  cta: string;
  badge?: string;
  highlighted: boolean; // Keep for potential future use, but styling is now uniform
  isEnterprise?: boolean;
}

// Define the plans using data from SubscriptionPlans and structure from PricingSection
const plansData: LandingPlan[] = [
  {
    id: 'basic',
    tierId: 'basic',
    name: 'Basic Plan',
    description: 'Essential features for individuals and small teams.',
    priceMonthly: 999,
    priceAnnual: 833,
    features: [
      '5 Domains',
      '500 Conversations / month',
      'Unlimited Widget FAQs',
      '15 Guided Chat Flows',
      '50 Products in Catalog',
      'Standard Email Support',
    ],
    cta: 'Get Started',
    highlighted: false, // Kept for data consistency
  },
  {
    id: 'premium',
    tierId: 'premium',
    name: 'Premium Plan',
    description: 'Advanced features for growing businesses.',
    priceMonthly: 2500,
    priceAnnual: 2083,
    features: [
      '15 Domains',
      '1,500 Conversations / month',
      'Unlimited Widget FAQs',
      '25 Guided Chat Flows',
      '100 Products in Catalog',
      'Analytics Dashboard Access',
      'Priority Email Support',
    ],
    cta: 'Get Started',
    badge: 'Most popular',
    highlighted: true, // Kept for data consistency
  },
  {
    id: 'enterprise',
    tierId: 'enterprise',
    name: 'Enterprise Plan',
    description: 'Tailored solutions for large organizations.',
    priceMonthly: 'Custom',
    priceAnnual: 'Custom',
    features: [
      '50 Domains',
      'Unlimited Conversations',
      'Unlimited Widget FAQs',
      '100 Guided Chat Flows',
      '500 Products in Catalog',
      'Analytics Dashboard Access',
      'Dedicated Support',
      'Custom Integrations',
    ],
    cta: 'Contact Sales',
    highlighted: false, // Kept for data consistency
    isEnterprise: true,
  },
];

// Helper to format price
const formatPrice = (price: number | 'Custom') => {
  if (price === 'Custom') return 'Custom';
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(price);
};

const LandingPricingSection = () => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");

  const handleBillingToggle = () => {
    setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly");
  };

  return (
    <section className="w-full py-24 md:py-32 relative bg-black text-white overflow-hidden" id="pricing">
      {/* Background Glow Elements */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/5 left-1/5 w-[500px] h-[500px] bg-purple-600/40 rounded-full blur-[96px] animate-pulse"></div>
        <div className="absolute bottom-1/5 right-1/5 w-[450px] h-[450px] bg-violet-500/40 rounded-full blur-[96px] animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>

      {/* Container */}
      <div className="container px-4 md:px-6 mx-auto max-w-6xl relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-16"
        >
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-300 to-violet-400">
              Simple, transparent pricing
            </span>
          </h2>
          <p className="mx-auto max-w-[700px] text-gray-400 md:text-xl">
            Choose the plan that fits your needs. Start growing your business today.
          </p>
        </motion.div>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center mb-16">
          {/* Adjusted toggle background and border to match card style */}
          <div className="flex items-center bg-black/50 border border-purple-600/30 p-1 rounded-full backdrop-blur-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${billingCycle === "monthly" ? "bg-purple-600 text-white shadow-md" : "text-gray-400 hover:text-gray-200"}`}
            >
              Monthly
            </button>
            <Switch
              checked={billingCycle === "annual"}
              onCheckedChange={handleBillingToggle}
              className="mx-2 data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-gray-800"
              aria-label="Toggle billing cycle"
            />
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center ${billingCycle === "annual" ? "bg-purple-600 text-white shadow-md" : "text-gray-400 hover:text-gray-200"}`}
            >
              Annual
              <span className="ml-1.5 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">Save ~17%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plansData.map((plan, index) => {
            const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceAnnual;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
                // Updated card styles: Refined Premium gradient for subtlety, kept enhanced border.
                className={`relative flex flex-col h-full overflow-hidden group transition-all duration-300 rounded-3xl shadow-xl border ${
                  plan.id === 'premium'
                    ? 'bg-gradient-to-b from-purple-800/30 to-black border-purple-500 border-2 shadow-purple-500/20' // Refined Gradient + Enhanced border for Premium
                    : 'bg-black border-purple-800/60' // Standard background and border for others
                }`}
              >
                {/* Badge - Kept purple */}
                {plan.badge && (
                  <div className="absolute top-4 right-4 bg-purple-600 text-white text-xs font-medium px-3 py-1 rounded-full z-10 shadow-lg">
                    {plan.badge}
                  </div>
                )}

                {/* Card Content */}
                <div className={`p-8 border-b ${plan.id === 'premium' ? 'border-purple-600/40' : 'border-purple-900/30'}`}> {/* Adjusted padding and border */}
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-gray-400 mb-6 text-sm min-h-[40px]">{plan.description}</p>

                  {/* Price */}
                  <div className="mb-6 min-h-[60px]">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-white">{formatPrice(price)}</span>
                      {typeof price === 'number' && (
                        <span className="text-gray-400 ml-2">/mo</span>
                      )}
                    </div>
                    {billingCycle === 'annual' && typeof price === 'number' && (
                      <p className="text-sm text-gray-400 mt-1">Billed annually</p>
                    )}
                     {billingCycle === 'monthly' && typeof price === 'number' && (
                      <p className="text-sm text-gray-400 mt-1">Billed monthly</p>
                    )}
                  </div>

                  {/* CTA Button */}
                  <Link href={plan.isEnterprise ? '/contact' : `/register?plan=${plan.tierId}`} passHref legacyBehavior>
                    <a>
                      {/* Button styles adjusted - Premium button remains distinct */}
                      <Button
                        className={`w-full py-3 rounded-lg text-base font-semibold transition-all duration-300 ${ // Changed to rounded-lg
                          plan.id === 'premium' // Use plan.id for consistency
                            ? "bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg"
                            : "bg-gray-800/80 border border-purple-800/50 text-gray-200 hover:border-purple-600/70 hover:bg-gray-700/80" // Slightly adjusted non-premium button
                        }`}
                      >
                        {plan.isEnterprise ? <Sparkles size={16} className="mr-1.5" /> : null}
                        {plan.cta}
                      </Button>
                    </a>
                  </Link>
                </div>

                {/* Features List */}
                <div className="p-8 flex-grow"> {/* Adjusted padding */}
                  <p className="font-medium text-white mb-4">What's included:</p>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                        className="flex items-start"
                      >
                        <Check className="h-5 w-5 text-purple-500 mr-3 shrink-0 mt-0.5" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Removed Card Glow Effect as background is now static */}
              </motion.div>
            );
          })}
        </div>

        {/* Custom Solution Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          // Apply consistent styles to this section
          className="mt-16 p-8 text-center bg-black rounded-3xl border border-purple-800/60 shadow-xl" // Matched card style
        >
          <h3 className="text-xl font-medium mb-2 text-white">Need more?</h3>
          <p className="text-gray-400 mb-6 max-w-[600px] mx-auto">
             Contact our sales team for a tailored Enterprise plan that meets your specific requirements.
           </p>
           <Link href="/contact" passHref legacyBehavior>
             <a>
               {/* Consistent Outline Button Style - Adjusted colors slightly */}
               <Button variant="outline" className="border-purple-600 text-purple-400 hover:bg-purple-600/10 hover:text-purple-300 px-8 py-3 rounded-lg font-semibold"> {/* Changed to rounded-lg */}
                 <Sparkles size={16} className="mr-1.5" /> Contact Sales
               </Button>
             </a>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingPricingSection;
