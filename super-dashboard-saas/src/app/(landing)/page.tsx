import React from 'react';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import CallToActionSection from '@/components/landing/CallToActionSection';
import Footer from '@/components/landing/Footer';

const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <CallToActionSection />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
