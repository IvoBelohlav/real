import React from 'react';

// Import the new landing page sections (assuming they exist or will be created)
import HeroSection from '@/components/landing/HeroSection';
import ClientsSection from '@/components/landing/ClientsSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import AboutSection from '@/components/landing/AboutSection';
import ServicesSection from '@/components/landing/ServicesSection';
import PortfolioSection from '@/components/landing/PortfolioSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import StatsSection from '@/components/landing/StatsSection';
// import TeamSection from '@/components/landing/TeamSection'; // Optional, can add later if needed
import PricingSection from '@/components/landing/PricingSection';
import FaqSection from '@/components/landing/FaqSection';
// import BlogSection from '@/components/landing/BlogSection'; // Optional, can add later if needed
import ContactSection from '@/components/landing/ContactSection';
// import NewsletterSection from '@/components/landing/NewsletterSection'; // Optional, can add later if needed

// Note: Header and Footer are typically handled in the layout file (layout.tsx)

const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <HeroSection />
        <ClientsSection />
        <FeaturesSection />
        {/* <HowItWorksSection /> // Removed as it's not in the new structure */}
        <AboutSection />
        <ServicesSection />
        <PortfolioSection />
        <TestimonialsSection />
        <StatsSection />
        {/* <TeamSection /> */}
        <PricingSection />
        <FaqSection />
        {/* <BlogSection /> */}
        <ContactSection />
        {/* <NewsletterSection /> */}
        {/* <CallToActionSection /> // Removed as it's not in the new structure */}
      </main>
      {/* Footer is likely in layout.tsx */}
    </div>
  );
};

export default LandingPage;
