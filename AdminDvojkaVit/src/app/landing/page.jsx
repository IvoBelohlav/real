'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// Removed useAuth import as landing page should be public and not rely on auth context
import Link from 'next/link';
import Image from 'next/image';
import styles from './landing.module.css';

export default function LandingPage() {
  const router = useRouter();
  // Explicitly ensure useAuth hook call is removed
  const [showLoginPrompt, setShowLoginPrompt] = useState(false); // Keep for potential future use, but simplify handler

  // Simplified handler: Always direct towards registration/login flow
  const handleSubscribeClick = () => {
    // Redirect to registration page, login page, or a specific signup flow page
    router.push('/auth/register');
    // Alternatively, could show a modal prompting login/register
    // setShowLoginPrompt(true); // Keep this if you prefer the prompt over direct redirect
  };

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <h1>Dvojkavit</h1>
        </div>
        <div className={styles.menu}>
          <Link href="#features" className={styles.menuItem}>Features</Link>
          <Link href="#pricing" className={styles.menuItem}>Pricing</Link>
          <Link href="/auth/login" className={styles.ctaButton}>Login</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1>Engage with your visitors in real-time</h1>
            <p>
              Dvojkavit Chat Widget helps you connect with your website visitors instantly,
              boost conversions, and provide real-time support.
            </p>
            <div className={styles.heroButtons}>
              <button
                className={styles.primaryButton}
                onClick={handleSubscribeClick}
              >
                Start Free Trial
              </button>
              <Link href="#features" className={styles.secondaryButton}>
                Learn More
              </Link>
            </div>

            {/* Login Prompt - Keep if setShowLoginPrompt(true) is used in handler */}
            {/* {showLoginPrompt && (
              <div className={styles.loginPrompt}>
                <p>
                  Please <Link href="/auth/login">log in</Link> or <Link href="/auth/register">register</Link> to start your free trial.
                </p>
                <button
                  className={styles.closeButton}
                  onClick={() => setShowLoginPrompt(false)}
                >
                  ×
                </button>
              </div>
            )} */}
          </div>
          <div className={styles.heroImage}>
            <div className={styles.imageContainer}>
              <Image
                src="/widget-preview.png"
                alt="Dvojkavit Chat Widget Preview"
                width={600}
                height={400}
                style={{
                  width: '100%',
                  height: 'auto',
                }}
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.features}>
        <h2>Powerful Features for Your Business</h2>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>💬</div>
            <h3>Real-time Chat</h3>
            <p>Connect with your visitors instantly and provide immediate support when they need it most.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚡</div>
            <h3>Quick Installation</h3>
            <p>Easy to set up with a simple code snippet. No technical knowledge required.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🎨</div>
            <h3>Customizable Design</h3>
            <p>Match your brand perfectly with customizable colors, text, and positioning.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📱</div>
            <h3>Mobile-Friendly</h3>
            <p>Responsive design works flawlessly on all devices, from desktops to smartphones.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>👥</div>
            <h3>Multi-Agent Support</h3>
            <p>Add team members and manage conversations efficiently with our team inbox.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3>Analytics & Insights</h3>
            <p>Track visitor interactions and measure performance with detailed analytics.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className={styles.howItWorks}>
        <h2>How It Works</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3>Sign Up</h3>
            <p>Create your account and start your free trial immediately.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3>Install Widget</h3>
            <p>Add our simple code snippet to your website and customize the appearance.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3>Start Chatting</h3>
            <p>Begin engaging with your visitors in real-time and boost customer satisfaction.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className={styles.pricing}>
        <h2>Simple, Transparent Pricing</h2>
        <div className={styles.singlePricingCard}>
          <div className={styles.pricingCard}>
            <div className={styles.pricingHeader}>
              <h3>Dvojkavit Pro</h3>
              <div className={styles.price}>
                $79<span>/month</span>
              </div>
              <div className={styles.pricingSubheader}>
                Everything you need to elevate your customer support
              </div>
            </div>
            <ul className={styles.pricingFeatures}>
              <li>Unlimited chats</li>
              <li>Up to 5 agents</li>
              <li>Advanced customization</li>
              <li>Priority support</li>
              <li>Chat history (90 days)</li>
              <li>Visitor analytics</li>
              <li>Chat triggers</li>
              <li>Mobile-friendly widget</li>
              <li>API access</li>
            </ul>
            <button
              className={styles.pricingButton}
              onClick={handleSubscribeClick}
            >
              Start Free Trial
            </button>
            <div className={styles.pricingFooter}>
              14-day free trial • No credit card required
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className={styles.testimonials}>
        <h2>What Our Customers Say</h2>
        <div className={styles.testimonialCards}>
          <div className={styles.testimonialCard}>
            <p>"Since installing Dvojkavit Chat Widget on our e-commerce site, our conversion rate has increased by 25%. It's been a game-changer for our business."</p>
            <div className={styles.testimonialAuthor}>— Sarah Johnson, Fashion Retail</div>
          </div>
          <div className={styles.testimonialCard}>
            <p>"The ease of installation and customization options are incredible. Our support team loves how intuitive it is to use, and our customers appreciate the quick responses."</p>
            <div className={styles.testimonialAuthor}>— Michael Chen, SaaS Company</div>
          </div>
          <div className={styles.testimonialCard}>
            <p>"We've tried several chat widgets, but Dvojkavit offers the best balance of features and simplicity. The analytics have helped us understand our customers better."</p>
            <div className={styles.testimonialAuthor}>— Emma Rodriguez, Marketing Agency</div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className={styles.cta}>
        <h2>Ready to Transform Your Customer Support?</h2>
        <p>Join thousands of businesses using Dvojkavit to connect with their customers.</p>
        <button
          className={styles.ctaButtonLarge}
          onClick={handleSubscribeClick}
        >
          Start Your Free Trial
        </button>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerColumn}>
            <h3>Dvojkavit</h3>
            <p>Helping businesses connect with their customers through real-time chat support.</p>
          </div>
          <div className={styles.footerColumn}>
            <h4>Product</h4>
            <ul>
              <li><Link href="#features">Features</Link></li>
              <li><Link href="#pricing">Pricing</Link></li>
              <li><Link href="#">Integrations</Link></li>
              <li><Link href="#">API</Link></li>
            </ul>
          </div>
          <div className={styles.footerColumn}>
            <h4>Resources</h4>
            <ul>
              <li><Link href="#">Documentation</Link></li>
              <li><Link href="#">Blog</Link></li>
              <li><Link href="#">Community</Link></li>
              <li><Link href="#">Guides</Link></li>
            </ul>
          </div>
          <div className={styles.footerColumn}>
            <h4>Company</h4>
            <ul>
              <li><Link href="#">About Us</Link></li>
              <li><Link href="#">Careers</Link></li>
              <li><Link href="#">Contact</Link></li>
              <li><Link href="#">Legal</Link></li>
            </ul>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© {new Date().getFullYear()} Dvojkavit. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
