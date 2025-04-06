import React from 'react';
// Import the section components using the correct path alias '@'
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import CallToActionSection from '@/components/landing/CallToActionSection';
import Footer from '@/components/landing/Footer';

// This is the main page component for the root URL '/'
const RootPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50"> {/* Added a default bg color */}
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

export default RootPage; // Exporting as RootPage or HomePage is conventional for page.tsx
