import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const CtaModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const handleSafirRegister = () => {
    onClose();
    navigate('/login?redirect=ambassador');
  };

  const handleDonatorRegister = () => {
    onClose();
    navigate('/login?redirect=donor');
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-white bg-opacity-80 backdrop-blur-lg"></div>

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ duration: 0.4, type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md mx-auto"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute -top-4 -left-4 z-10 bg-gray-800 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors shadow-lg"
              aria-label="بستن"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Cards */}
            <div className="space-y-6">
              {/* Safir Registration Card */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gradient-to-br from-blue to-blue-600 rounded-2xl shadow-2xl overflow-hidden transform hover:scale-105 transition-transform duration-300"
              >
                <div className="p-8 text-center text-white">
                  <div className="mb-6">
                    <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold font-vazir mb-3">ورود / ثبت نام سفیر</h3>
                    <p className="text-blue-100 font-vazir leading-relaxed">
                      لپ‌تاپ‌ها رو به دست بچه‌ها برسون
                    </p>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSafirRegister}
                    className="w-full bg-white text-blue font-bold py-4 px-6 rounded-xl font-vazir hover:bg-gray-100 transition-colors shadow-lg"
                  >
                    شروع فعالیت سفیری
                  </motion.button>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute top-4 right-4 w-8 h-8 bg-white bg-opacity-10 rounded-full"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 bg-white bg-opacity-10 rounded-full"></div>
                <div className="absolute top-1/2 left-8 w-4 h-4 bg-white bg-opacity-10 rounded-full"></div>
              </motion.div>

              {/* Donator Registration Card */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-gradient-to-br from-green to-green-600 rounded-2xl shadow-2xl overflow-hidden transform hover:scale-105 transition-transform duration-300"
              >
                <div className="p-8 text-center text-white">
                  <div className="mb-6">
                    <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold font-vazir mb-3">ورود / ثبت نام دونیتور</h3>
                    <p className="text-green-100 font-vazir leading-relaxed">
                      با کمک کردنت اینده بساز
                    </p>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDonatorRegister}
                    className="w-full bg-white text-green font-bold py-4 px-6 rounded-xl font-vazir hover:bg-gray-100 transition-colors shadow-lg"
                  >
                     شروع دونیت                 
                 </motion.button>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute top-4 left-4 w-8 h-8 bg-white bg-opacity-10 rounded-full"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 bg-white bg-opacity-10 rounded-full"></div>
                <div className="absolute top-1/2 right-8 w-4 h-4 bg-white bg-opacity-10 rounded-full"></div>
              </motion.div>
            </div>

            {/* Bottom Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-center mt-8"
            >
              <p className="text-gray-600 font-vazir">
                با انتخاب هر کدام از گزینه‌ها، در ساختن آینده‌ای بهتر نقش خواهید داشت
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CtaModal;
