import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu on escape key and window resize
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    const handleResize = () => {
      setIsMenuOpen(false);
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-light-blue shadow-lg">
      {/* Top Navigation */}
      <div className="bg-light-blue px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto flex-row-reverse">
          {/* Logo/Title */}
          <h1 className="text-2xl font-bold text-gray-800 font-vazir">روبیتیک</h1>

          {/* Hamburger Menu */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-white hover:text-gray-200 transition-colors"
            aria-label="منو"
          >
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* White Section with Title */}
      <div className="bg-white px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold text-center text-gray-800 font-vazir"
          >
            آینده با تو ساخته میشه !
          </motion.h2>
        </div>
      </div>

      {/* Sidebar Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsMenuOpen(false)}
            />
            {/* Sidebar - Slides from Right */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ 
                type: 'tween',
                duration: 0.3,
                ease: 'easeInOut'
              }}
              className="fixed top-0 right-0 h-full w-64 bg-white shadow-lg z-50 p-6"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-gray-800 font-vazir">منو</h3>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="text-gray-600 hover:text-gray-800 transition-colors p-2 -m-2"
                  aria-label="بستن منو"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="space-y-2 text-right">
                <a 
                  href="/" 
                  className="block py-4 px-4 text-gray-700 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg font-vazir transition-colors text-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  خانه
                </a>
                <a 
                  href="/programs" 
                  className="block py-4 px-4 text-gray-700 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg font-vazir transition-colors text-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  برنامه‌ها
                </a>
                <a 
                  href="/about" 
                  className="block py-4 px-4 text-gray-700 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg font-vazir transition-colors text-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  درباره ما
                </a>
                <a 
                  href="/contact" 
                  className="block py-4 px-4 text-gray-700 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg font-vazir transition-colors text-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  تماس با ما
                </a>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
