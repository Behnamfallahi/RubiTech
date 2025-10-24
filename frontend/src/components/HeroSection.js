import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const HeroSection = () => {
  const navigate = useNavigate();
  const [isEventsOpen, setIsEventsOpen] = useState(false);

  useEffect(() => {
    if (!isEventsOpen) return;
    const timer = setTimeout(() => setIsEventsOpen(false), 3000);
    return () => clearTimeout(timer);
  }, [isEventsOpen]);

  const handleEventsClick = () => {
    setIsEventsOpen(true);
  };

  const handleStudentRegister = () => {
    navigate('/login?redirect=student');
  };

  return (
    <section className="relative bg-white py-16 px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Main Hero Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Right Side - Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="order-1 lg:order-2"
          >
            <div className="relative">
              <img
                src="https://i.postimg.cc/6Qjv0Wcg/photo-2025-10-01-18-54-203.jpg"
                alt="گروه دانشجویان روبیتیک"
                className="w-full h-[300px] md:h-[400px] object-cover rounded-2xl shadow-lg"
              />
            </div>
          </motion.div>

          {/* Left Side - Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="order-2 lg:order-1 text-center lg:text-right"
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-orange mb-6 font-vazir leading-tight">
              کارگاه‌های حضوری روبیتیک
            </h1>
            <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-8 font-vazir">
              برنامه آموزشی
            </h2>
            <p className="text-lg md:text-xl text-black mb-8 font-vazir leading-relaxed">
              از کوچیک ترین کلیک ها تا بزرگ ترین کمپانی ها !
            </p>

            {/* Events Button */}
            <div className="mb-8">
              <div className="bg-orange rounded-full p-6 inline-block">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleEventsClick}
                  className="bg-green text-white px-8 py-3 rounded-full font-bold text-lg font-vazir hover:bg-green-600 transition-colors shadow-lg"
                >
                  مشاهده رویدادها
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Orange section with laptops (no hover overlays) */}
        <div className="relative">
          {/* Orange Half-Circle Background */}
          <div className="relative bg-orange rounded-t-full h-64 md:h-80 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="relative z-10"
              >
                <img
                  src="https://i.postimg.cc/k5FjXbnw/Screenshot-2025-10-01-175515.png"
                  alt="لپ تاپ های آموزشی"
                  className="w-64 md:w-80 h-auto object-contain"
                />
              </motion.div>
            </div>
          </div>

          {/* Student Registration Button */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-center mt-8"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStudentRegister}
              className="bg-orange text-white px-12 py-4 rounded-full font-bold text-xl font-vazir hover:bg-yellow-500 transition-colors shadow-xl"
            >
              شروع مسیر دانشجویی
            </motion.button>
          </motion.div>
        </div>

      {/* Events Modal */}
      {isEventsOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gradient-to-br from-blue/60 to-orange/60 backdrop-blur-sm"
            onClick={() => setIsEventsOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center"
              dir="rtl"
            >
              <motion.div
                initial={{ y: -4 }}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-4xl mb-3"
                aria-hidden
              >
                📅
              </motion.div>
              <h3 className="font-vazir font-bold text-xl md:text-2xl text-gray-800 mb-3">رویدادی در جریان نیست</h3>
              <p className="font-vazir text-gray-600 mb-6">به زودی خبرهای خوبی می‌رسه!</p>
              <button
                onClick={() => setIsEventsOpen(false)}
                className="bg-orange text-white px-6 py-2 rounded-full font-vazir font-bold hover:bg-yellow-500 transition-colors"
              >
                بستن
              </button>
            </motion.div>
          </div>
        </>
      )}

        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 opacity-20">
          <div className="w-20 h-20 bg-blue rounded-full"></div>
        </div>
        <div className="absolute bottom-20 right-10 opacity-20">
          <div className="w-16 h-16 bg-green rounded-full"></div>
        </div>
        <div className="absolute top-1/2 left-1/4 opacity-10">
          <div className="w-12 h-12 bg-orange rounded-full"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
