import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import MapSection from '../components/MapSection';
import TeamSection from '../components/TeamSection';
import CtaModal from '../components/CtaModal';
import Footer from '../components/Footer';
import FaqSection from '../components/FaqSection';

const Home = () => {
  const [isCtaModalOpen, setIsCtaModalOpen] = useState(false);
  const [isVisible, setIsVisible] = useState({});

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({
              ...prev,
              [entry.target.id]: true
            }));
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    // Observe all sections
    const sections = document.querySelectorAll('[data-animate]');
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const handleCtaClick = () => {
    setIsCtaModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCtaModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-white font-vazir" dir="rtl">
      {/* Header - Fixed at top */}
      <Header />
      
      {/* Main Content - Add top margin to account for fixed header */}
      <main className="pt-32 md:pt-40">
        {/* Hero Section */}
        <motion.section
          id="hero"
          data-animate
          initial={{ opacity: 0, y: 50 }}
          animate={isVisible.hero ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
        >
          <HeroSection />
        </motion.section>

        {/* Map Section */}
        <motion.section
          id="map"
          data-animate
          initial={{ opacity: 0, y: 50 }}
          animate={isVisible.map ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <MapSection />
        </motion.section>

        {/* Team Section */}
        <motion.section
          id="team"
          data-animate
          initial={{ opacity: 0, y: 50 }}
          animate={isVisible.team ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <TeamSection onCtaClick={handleCtaClick} />
        </motion.section>
      </main>

      {/* FAQ Section - placed before footer */}
      <motion.section
        id="faq"
        data-animate
        initial={{ opacity: 0, y: 50 }}
        animate={isVisible.faq ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <FaqSection />
      </motion.section>

      {/* Footer */}
      <motion.footer
        id="footer"
        data-animate
        initial={{ opacity: 0, y: 50 }}
        animate={isVisible.footer ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <Footer />
      </motion.footer>

      {/* CTA Modal */}
      <CtaModal isOpen={isCtaModalOpen} onClose={handleCloseModal} />

      {/* Scroll to Top Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 left-8 bg-orange text-white w-14 h-14 rounded-full shadow-lg hover:bg-yellow-500 transition-colors z-40 flex items-center justify-center group"
        aria-label="بازگشت به بالا"
      >
        <svg 
          className="w-6 h-6 transform group-hover:-translate-y-1 transition-transform" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </motion.button>

      {/* Loading Overlay (if needed) */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="fixed inset-0 bg-white z-50 flex items-center justify-center pointer-events-none"
      >
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-vazir text-lg">در حال بارگذاری...</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Home;
