import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  { q: 'سفیر کیه و چه نقشی داره؟', a: 'سفیرها معلم‌ها یا مدیران مدرسه هستن که در شناسایی نوجوان‌های مستعد و همراهی آن‌ها در مسیر پیشرفت کمک می‌کنند' },
  { q: 'چطور میتونم سفیر بشم ؟', a: 'با ثبت نام در روبیتک و گذروندن مراحل ارزیابی وتایید توسط مدیریت میتونید سفیر بشید'},
  { q: 'نحوه ثبت نام دانش آموز چگونه ست؟', a: 'از طریق فرم ثبت نام و گفتگوی اولیه با ما در ارتباط باشید. ' },
  { q: 'چطور دونیت کنم ؟', 
    a: (
      <>
        از طریق لینک دونیشن:&nbsp;
        <a 
          href="https://reymit.ir/rubitech.team" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: '#007bff', textDecoration: 'underline' }}
        >
         https://reymit.ir/rubitech.team
        </a>
      </>
    ) 
  }
  
];

const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="py-16 px-4 bg-white" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 text-center font-vazir mb-8">سوالات شما</h2>
        <div className="space-y-4">
          {faqs.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4 }}
              className="border border-gray-200 rounded-xl overflow-hidden bg-white"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full text-right px-5 py-4 flex items-center justify-between focus:outline-none"
                aria-expanded={openIndex === idx}
              >
                <span className="font-vazir text-gray-800 font-medium">{item.q}</span>
                <motion.svg
                  animate={{ rotate: openIndex === idx ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>
              <AnimatePresence initial={false}>
                {openIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 text-gray-700 font-vazir leading-relaxed">
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;


