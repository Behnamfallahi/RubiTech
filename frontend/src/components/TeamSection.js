import React from 'react';
import { motion } from 'framer-motion';

const TeamSection = ({ onCtaClick }) => {
  const teamMembers = [
    {
      name: 'سینا فروز آبادی',
      title: 'دونیتور',
      image: 'https://via.placeholder.com/200x200?text=Sina',
      alt: 'Sina'
    },
    {
      name: 'بابک نبیلی',
      title: 'معاون فروش در Cisco',
      image: 'https://i.postimg.cc/3r6zq2W2/Babak.jpg',
      alt: 'Babak'
    },
    {
      name: 'مژده شریعتمداری',
      title: 'دکتری ادیان و روانشناسی مثبت',
      image: 'https://i.postimg.cc/R0LB5hyX/photo-2021-10-06-01-38-59.jpg',
      alt: 'Mojdeh'
    },
    {
      name: 'سجاد هاشمیان',
      title: 'مهندس نرم افزار در GoodHabitz',
      image: 'https://i.postimg.cc/G2nHz4Y7/photo-2022-10-24-11-11-27.jpg',
      alt: 'Sajjad'
    }
  ];

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 font-vazir mb-4">
            همراهان  ما در ساختن آینده درخشان
          </h2>
          <div className="w-24 h-1 bg-orange mx-auto"></div>
        </motion.div>

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {teamMembers.map((member, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className="text-center group"
            >
              {/* Profile Image */}
              <div className="relative mb-6">
                <div className="w-48 h-48 mx-auto rounded-full overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  <img
                    src={member.image}
                    alt={member.alt}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                {/* Decorative Ring */}
                <div className="absolute inset-0 w-48 h-48 mx-auto rounded-full border-4 border-orange opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform scale-110"></div>
              </div>

              {/* Member Info */}
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-800 font-vazir">
                  {member.name}
                </h3>
                <p className="text-gray-600 font-vazir text-sm leading-relaxed">
                  {member.title}
                </p>
              </div>

              {/* Remove blue overlay hover; keep subtle scale via image shadow already applied */}
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCtaClick}
            className="bg-orange text-white px-16 py-6 rounded-full font-bold text-2xl font-vazir hover:bg-yellow-500 transition-colors shadow-2xl relative overflow-hidden group"
          >
            <span className="relative z-10">آینده‌ساز شو</span>
            
            {/* Button Background Animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Sparkle Effects */}
            <div className="absolute top-2 right-4 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 animate-ping"></div>
            <div className="absolute bottom-3 left-6 w-1 h-1 bg-white rounded-full opacity-0 group-hover:opacity-100 animate-ping" style={{ animationDelay: '0.2s' }}></div>
            <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full opacity-0 group-hover:opacity-100 animate-ping" style={{ animationDelay: '0.4s' }}></div>
          </motion.button>

          {/* Supporting Text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-6 text-gray-600 font-vazir text-lg"
          >
            به جمع حامیان آینده بپیوندید و در ساختن فردای بهتر نقش داشته باشید
          </motion.p>
        </motion.div>

        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 opacity-10">
          <div className="w-32 h-32 bg-blue rounded-full"></div>
        </div>
        <div className="absolute bottom-10 right-10 opacity-10">
          <div className="w-24 h-24 bg-green rounded-full"></div>
        </div>
        <div className="absolute top-1/2 left-1/4 opacity-5">
          <div className="w-40 h-40 bg-orange rounded-full"></div>
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
