import React from 'react';
import Header from '@/components/landing/Header'; // Assuming Header component exists/will be created
import Footer from '@/components/landing/Footer'; // Assuming Footer component exists/will be created
// We might need to import global styles or fonts if they aren't inherited correctly,
// but let's start simple. The root layout already includes globals.css and fonts.

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
      {/* Add Modal component here if needed globally for the landing page */}
    </div>
  );
}
