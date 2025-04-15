'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaClock, FaFacebookF, FaTwitter, FaLinkedinIn, FaInstagram } from 'react-icons/fa';
import { Toaster, toast } from 'sonner'; // Assuming sonner is used for notifications

// Reusable Section Title Component (Can be imported if created separately)
interface SectionTitleProps {
  title: string;
  subtitle: string;
}
const SectionTitle: React.FC<SectionTitleProps> = ({ title, subtitle }) => (
  <div className="text-center mb-12">
    <h2 className="text-3xl md:text-4xl font-bold mb-3 relative inline-block text-neutral-900 dark:text-neutral-100"> {/* Added dark mode text */}
      {title}
      <span className="absolute bottom-[-10px] left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-primary-500 to-primary-700 rounded-full"></span>
    </h2>
    <p className="max-w-2xl mx-auto mt-6 text-neutral-600 dark:text-neutral-400">{subtitle}</p> {/* Added dark mode text */}
  </div>
);

interface ContactInfoItemProps {
  icon: React.ReactNode;
  label: string;
  text: string | React.ReactNode;
}
const ContactInfoItem: React.FC<ContactInfoItemProps> = ({ icon, label, text }) => (
  <div className="flex items-start mb-5">
    <div className="flex-shrink-0 w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mr-4 text-lg">
      {icon}
    </div>
    <div>
      <div className="text-sm mb-1 opacity-80">{label}</div>
      <div className="text-lg font-medium">{text}</div>
    </div>
  </div>
);

const ContactSection: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    toast.info('Sending your message...'); // Use toast for feedback

    // Replace with your actual form submission logic (e.g., API call)
    try {
      // Example: await fetch('/api/contact', { method: 'POST', body: JSON.stringify(formData) });
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      toast.success('Message sent successfully! We will get back to you soon.');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' }); // Clear form
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error('Failed to send message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 md:py-24 bg-neutral-50 dark:bg-neutral-900" id="contact"> {/* Added dark mode bg */}
      <div className="container mx-auto px-4">
        <SectionTitle
          title="Get In Touch"
          subtitle="Have questions or ready to start building your AI chatbot? We'd love to hear from you."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-br from-primary-600 to-primary-800 text-white p-8 rounded-lg shadow-lg relative overflow-hidden"
          >
            {/* Optional pattern - Corrected SVG URL syntax for Tailwind */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg_width=\'60\'_height=\'60\'_viewBox=\'0_0_60_60\'_xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg_fill=\'none\'_fill-rule=\'evenodd\'%3E%3Cg_fill=\'%23FFFFFF\'_fill-opacity=\'0.04\'%3E%3Cpath_d=\'M36_34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6_34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6_4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50 z-0"></div>

            <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-6">Contact Information</h3>
              <ContactInfoItem icon={<FaMapMarkerAlt />} label="Address" text="123 AI Street, Future City, FC 54321" />
              <ContactInfoItem icon={<FaPhone />} label="Phone" text={<a href="tel:+15551234567" className="hover:underline">+1 (555) 123-4567</a>} />
              <ContactInfoItem icon={<FaEnvelope />} label="Email" text={<a href="mailto:support@dvojkavit.com" className="hover:underline">support@dvojkavit.com</a>} />
              <ContactInfoItem icon={<FaClock />} label="Working Hours" text="Mon - Fri: 9:00 AM - 5:00 PM" />

              <div className="mt-8 pt-6 border-t border-white/20">
                <h4 className="text-lg font-semibold mb-3">Follow Us</h4>
                <div className="flex space-x-3">
                  <a href="#" aria-label="Facebook" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-300"><FaFacebookF /></a>
                  <a href="#" aria-label="Twitter" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-300"><FaTwitter /></a>
                  <a href="#" aria-label="LinkedIn" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-300"><FaLinkedinIn /></a>
                  <a href="#" aria-label="Instagram" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-300"><FaInstagram /></a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-2 bg-white dark:bg-neutral-800 p-8 rounded-lg shadow-lg" // Added dark mode bg
          >
            <h3 className="text-2xl font-bold mb-6 text-neutral-900 dark:text-neutral-100">Send Us a Message</h3> {/* Added dark mode text */}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="form-group">
                  <label htmlFor="name" className="form-label block mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">Your Name *</label> {/* Added dark mode text */}
                  <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="form-control w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition duration-300" required /> {/* Added dark mode styles */}
                </div>
                <div className="form-group">
                  <label htmlFor="email" className="form-label block mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">Your Email *</label> {/* Added dark mode text */}
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className="form-control w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition duration-300" required /> {/* Added dark mode styles */}
                </div>
                <div className="form-group">
                  <label htmlFor="phone" className="form-label block mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">Phone Number</label> {/* Added dark mode text */}
                  <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} className="form-control w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition duration-300" /> {/* Added dark mode styles */}
                </div>
                <div className="form-group">
                  <label htmlFor="subject" className="form-label block mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">Subject</label> {/* Added dark mode text */}
                  <input type="text" id="subject" name="subject" value={formData.subject} onChange={handleChange} className="form-control w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition duration-300" /> {/* Added dark mode styles */}
                </div>
                <div className="form-group md:col-span-2">
                  <label htmlFor="message" className="form-label block mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">Your Message *</label> {/* Added dark mode text */}
                  <textarea id="message" name="message" value={formData.message} onChange={handleChange} className="form-control w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition duration-300" rows={5} required></textarea> {/* Added dark mode styles */}
                </div>
              </div>
              <div className="mt-6">
                 {/* Assuming Button component exists and handles dark mode */}
                <button type="submit" className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 disabled:opacity-50" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Map Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-16 md:mt-20 h-80 md:h-96 rounded-lg overflow-hidden shadow-md"
        >
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.7463396877028!2d-122.08410008446542!3d37.42200974114472!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808fbb28416493a7%3A0x778a60994d7a5e4c!2sPalo%20Alto%2C%20CA%2094301!5e0!3m2!1sen!2sus!4v1583863293756!5m2!1sen!2sus" // Replace with actual map embed URL if needed
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Office Location Map"
            className="dark:filter dark:grayscale dark:contrast-125 dark:invert" // Added dark mode map styles
          ></iframe>
        </motion.div>
      </div>
      {/* Ensure Toaster is included in the layout for notifications */}
    </section>
  );
};

export default ContactSection;
