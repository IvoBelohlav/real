'use client'; // Added 'use client'

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button'; // Adjusted path
import { Switch } from '@/components/ui/switch'; // Adjusted path
import { Check } from 'lucide-react';
import React from 'react'; // Added React import

const PricingSection = () => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");

  const handleBillingToggle = () => {
    setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly");
  };

  const plans = [
    {
      name: 'Starter',
      description: 'Essential features for individuals and small teams just getting started.',
      price: billingCycle === 'monthly' ? 29 : 24,
      features: [
        'Up to 25,000 words per month',
        'Basic customization options',
        'Standard AI responses',
        'Email support',
        'Single user'
      ],
      cta: 'Start Free Trial',
      highlighted: false,
    },
    {
      name: 'Professional',
      description: 'Advanced features and priority support for growing businesses.',
      price: billingCycle === 'monthly' ? 79 : 65,
      features: [
        'Unlimited words',
        'Advanced customization',
        'Priority support',
        'Team collaboration',
        'Analytics dashboard',
        'API access'
      ],
      cta: 'Start Free Trial',
      badge: 'Most popular',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      description: 'Tailored solutions and dedicated support for large organizations.',
      price: 'Custom',
      features: [
        'Custom implementation',
        'Dedicated account manager',
        'Premium SLAs',
        'Advanced security features',
        'Custom integrations',
        'Training and onboarding'
      ],
      cta: 'Contact Sales',
      highlighted: false,
      isEnterprise: true
    },
  ];

  return (
    <section className="w-full py-24 md:py-32 relative" id="pricing">
      <div className="container px-4 md:px-6 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-16"
        >
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Simple, transparent <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-violet-500">pricing</span>
          </h2>
          <p className="mx-auto max-w-[700px] text-gray-400 md:text-xl">
            Choose the plan that works best for your needs. All plans come with a 14-day free trial.
          </p>
        </motion.div>

        <div className="flex items-center justify-center mb-16">
          <div className="flex items-center bg-black border border-purple-900/20 p-1 rounded-full">
            <span className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${billingCycle === "monthly" ? "bg-purple-600 text-white" : "text-gray-400"}`}>
              Monthly
            </span>
            <Switch
              checked={billingCycle === "annual"}
              onCheckedChange={handleBillingToggle}
              className="mx-2 data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-gray-800"
            />
            <span className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center ${billingCycle === "annual" ? "bg-purple-600 text-white" : "text-gray-400"}`}>
              Annual
              <span className="ml-1 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">20% off</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              className={`relative flex flex-col h-full bg-black border rounded-xl overflow-hidden group transition-all duration-300 ${
                plan.highlighted
                  ? "border-purple-500/50 shadow-lg shadow-purple-900/20"
                  : "border-purple-900/20 hover:border-purple-500/30"
              }`}
            >
              {plan.badge && (
                <div className="absolute top-4 right-4 bg-purple-600 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}

              <div className="p-8 border-b border-purple-900/20">
                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-gray-400 mb-6 text-sm h-12">{plan.description}</p>

                <div className="mb-6">
                  {typeof plan.price === 'number' ? (
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-white">${plan.price}</span>
                      <span className="text-gray-400 ml-2">/mo</span>
                    </div>
                  ) : (
                    <div className="text-4xl font-bold text-white">{plan.price}</div>
                  )}
                  {billingCycle === 'annual' && typeof plan.price === 'number' && (
                    <p className="text-sm text-gray-400 mt-1">Billed annually</p>
                  )}
                </div>

                <Button
                  className={`w-full py-6 rounded-md ${
                    plan.highlighted
                      ? "bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white"
                      : plan.isEnterprise
                        ? "bg-black border border-purple-500 text-purple-400 hover:bg-purple-900/20"
                        : "bg-black border border-purple-900/30 text-white hover:border-purple-500/50"
                  }`}
                >
                  {plan.cta}
                </Button>
              </div>

              <div className="p-8 flex-grow">
                <p className="font-medium text-white mb-4">What's included:</p>
                <ul className="space-y-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <Check className="h-5 w-5 text-purple-500 mr-3 shrink-0 mt-0.5" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Card glow effect on hover */}
              <div className="absolute -z-10 inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/0 to-purple-600/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 group-hover:via-purple-600/10"></div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 p-8 border border-purple-900/20 rounded-xl text-center bg-black"
        >
          <h3 className="text-xl font-medium mb-2 text-white">Need a custom solution?</h3>
          <p className="text-gray-400 mb-6 max-w-[600px] mx-auto">
            Contact our sales team for a tailored plan that meets your specific requirements.
          </p>
          <Button className="bg-black border border-purple-500 text-purple-400 hover:bg-purple-900/20 px-8 py-6 rounded-md">
            Contact Sales
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
