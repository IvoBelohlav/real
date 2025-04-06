import React from 'react';
import Link from 'next/link'; // Import Link for navigation

// Placeholder icons (replace with actual icons if available, e.g., from react-icons)
const FeatureIcon = ({ children }: { children?: React.ReactNode }) => ( // Made children optional
  <div className="bg-blue-100 text-blue-600 rounded-full p-3 mb-4 inline-flex">
    {children || <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"></path></svg>}
  </div>
);

const LandingPage = () => {
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <section className="py-16 md:py-24 text-center bg-gradient-to-b from-white to-blue-50">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4 leading-tight">
            Turn Conversations into Conversions
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Engage your website visitors, automate support, showcase products, and drive sales with our intelligent, customizable chat widget designed for growth.
          </p>
          <Link href="/register" legacyBehavior>
            <a className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-300 ease-in-out transform hover:scale-105 inline-block">
              Get Started for Free
            </a>
          </Link>
          <p className="text-sm text-gray-500 mt-4">No credit card required</p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Why Choose Our Chat Widget?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {/* Feature 1: E-commerce Powerhouse */}
            <div className="text-center p-6 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
              <FeatureIcon>{/* E-commerce Icon */}</FeatureIcon>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">E-commerce Powerhouse</h3>
              <p className="text-gray-600">
                Showcase products directly in chat, leverage AI suggestions for listings, and guide customers through their purchase journey with automated flows.
              </p>
            </div>

            {/* Feature 2: Guided Conversations */}
            <div className="text-center p-6 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
              <FeatureIcon>{/* Automation Icon */}</FeatureIcon>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Intelligent Automation</h3>
              <p className="text-gray-600">
                Build custom guided chat flows to qualify leads, answer FAQs instantly, and provide 24/7 support without human intervention.
              </p>
            </div>

            {/* Feature 3: Seamless Human Handover */}
            <div className="text-center p-6 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
              <FeatureIcon>{/* Human Chat Icon */}</FeatureIcon>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Live Agent Chat</h3>
              <p className="text-gray-600">
                Connect visitors with your sales or support team in real-time for complex queries or personalized assistance when needed.
              </p>
            </div>

            {/* Feature 4: Product Management */}
            <div className="text-center p-6 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
              <FeatureIcon>{/* Product Icon */}</FeatureIcon>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Integrated Product Catalog</h3>
              <p className="text-gray-600">
                Manage your products within the dashboard and make them easily accessible during chat interactions to boost sales opportunities.
              </p>
            </div>

            {/* Feature 5: Customization */}
            <div className="text-center p-6 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
              <FeatureIcon>{/* Customization Icon */}</FeatureIcon>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Fully Customizable</h3>
              <p className="text-gray-600">
                Tailor the widget's appearance, colors, and behavior to perfectly match your brand identity and website design.
              </p>
            </div>

            {/* Feature 6: Lead Generation */}
            <div className="text-center p-6 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
              <FeatureIcon>{/* Lead Gen Icon */}</FeatureIcon>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Capture More Leads</h3>
              <p className="text-gray-600">
                Use integrated contact forms and guided flows to collect valuable visitor information and grow your customer base.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Placeholder/Demo Section */}
      <section className="py-16 md:py-20 bg-gray-100">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">See it in Action</h2>
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-3xl mx-auto">
            {/* Placeholder for an image or embedded video showing the widget */}
            <div className="aspect-w-16 aspect-h-9 bg-gray-300 rounded flex items-center justify-center">
              <span className="text-gray-500 text-lg">Widget Demo Visual Placeholder</span>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 md:py-24 bg-blue-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Elevate Your Customer Engagement?
          </h2>
          <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Start leveraging the power of conversational AI and live chat today.
          </p>
          <Link href="/register" legacyBehavior>
            <a className="bg-white hover:bg-gray-100 text-blue-600 font-bold py-3 px-8 rounded-lg text-lg transition duration-300 ease-in-out transform hover:scale-105 inline-block">
              Sign Up Now
            </a>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-800 text-gray-400 text-center text-sm">
        <div className="container mx-auto px-6">
          © {new Date().getFullYear()} SuperDashboard SaaS. All rights reserved.
          {/* Add other footer links if needed */}
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
