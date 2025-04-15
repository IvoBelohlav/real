import React from 'react';
// Import the section components using the correct path alias '@'
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import CallToActionSection from '@/components/landing/CallToActionSection';
import Footer from '@/components/landing/Footer';
import TestimonialsSection from "@/components/landing/TestimonialsSection"; // New TestimonialsSection
import LandingPricingSection from "@/components/landing/LandingPricingSection"; // Use the new pricing section
import CTASection from "@/components/landing/CTASection"; // New CTASection (renamed from one of the CallToActionSection versions)
// Footer is rendered by layout.tsx

// You might want to include these other sections as well, depending on the desired final page structure
import AboutSection from "@/components/landing/AboutSection";
import ClientsSection from "@/components/landing/ClientsSection";
import ContactSection from "@/components/landing/ContactSection";
import FaqSection from "@/components/landing/FaqSection";
import PortfolioSection from "@/components/landing/PortfolioSection";
import ServicesSection from "@/components/landing/ServicesSection";
import StatsSection from "@/components/landing/StatsSection";
import Header from "@/components/landing/Header"; // New Header


// This is the main page component for the root URL '/'
const RootPage: React.FC = () => {
  return (
    <div>
      <Header />
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow pt-20">
          <HeroSection />
          <FeaturesSection />
          <StatsSection />
          <ServicesSection />
          <LandingPricingSection /> {/* Use the new pricing section */}
          <CTASection />
        </main>
        <Footer />
      </div>
      </div>
      

  );
};

export default RootPage; // Exporting as RootPage or HomePage is conventional for page.tsx
