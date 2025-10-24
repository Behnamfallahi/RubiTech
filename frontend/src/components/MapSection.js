import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import { motion } from 'framer-motion';
import L from 'leaflet';
import { getStudentLocations } from '../services/api';
// Static mock markers aggregated per province
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// We keep Leaflet default icon fix above, but homepage uses CircleMarker dots instead

const MapSection = () => {
  // Loading and error state for fetching student locations
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState([]); // [{id, lat, lng, color}]

  // Optional dev-only polling to demonstrate dynamic updates without interactivity
  const ENABLE_POLLING = false; // set true for dev verification if needed

  useEffect(() => {
    let isMounted = true;

    const fetchLocations = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getStudentLocations();
        if (isMounted) setLocations(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to load student locations', e);
        if (isMounted) {
          setError('failed');
          setLocations([]); // fall back to empty
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLocations();

    // Optional polling (off by default)
    let intervalId = null;
    if (ENABLE_POLLING) {
      intervalId = setInterval(fetchLocations, 15000);
    }
    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <section className="sticky top-32 md:top-40 z-10 py-16 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Right Side - Map */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="order-1 lg:order-2"
          >
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {loading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue"></div>
                </div>
              ) : (
                <MapContainer
                  center={[32.4279, 53.6880]}
                  zoom={5}
                  style={{ height: '400px', width: '100%' }}
                  className="leaflet-container"
                  // Disable all interactivity to keep the map fixed
                  zoomControl={false}
                  dragging={false}
                  doubleClickZoom={false}
                  scrollWheelZoom={false}
                  touchZoom={false}
                  keyboard={false}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                    attribution="&copy; OpenMapTiles & Carto"
                  />
                  {locations.map((loc) => {
                    const color = loc.color === 'green' ? '#10b981' : '#3b82f6';
                    return (
                      <CircleMarker
                        key={loc.id}
                        center={[loc.lat, loc.lng]}
                        radius={5}
                        pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: 1 }}
                      />
                    );
                  })}
                </MapContainer>
              )}
            </div>

            {/* Removed overlay image below the map to clean up homepage */}
            {/* The previous "Video Call Section" block that rendered an image with Persian text overlay
                has been removed as requested. This is a minimal, non-breaking change. */}
          </motion.div>

          {/* Left Side - Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="order-2 lg:order-1"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8 font-vazir text-center lg:text-right">دانشجویان روبیتک</h2>
            
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <p className="text-lg text-gray-700 leading-relaxed font-vazir text-justify">
              رشد بدون مرز برای نوجوانان مستعد

در روبی‌تک، نوجوانان مستعد در مناطق کم‌بهره‌مند با لپ‌تاپ، اینترنت و محتوای آموزشی به دنیای فناوری وصل می‌شوند تا جغرافیا مانع پیشرفتشان نشود و آینده‌شان روشن‌تر شود.
              </p>
              
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-blue text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-800 font-vazir">کشف استعداد</h3>
                  <p className="text-sm text-gray-600 font-vazir mt-2">شناسایی و پرورش استعدادهای نهفته</p>
                </div>
                
                <div className="text-center">
                  <div className="bg-green text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-800 font-vazir">آموزش عملی</h3>
                  <p className="text-sm text-gray-600 font-vazir mt-2">یادگیری مهارت‌های کاربردی و واقعی</p>
                </div>
                
                <div className="text-center">
                  <div className="bg-orange text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-800 font-vazir">منتورینگ</h3>
                  <p className="text-sm text-gray-600 font-vazir mt-2">راهنمایی مستمر و حمایت در مسیر رشد</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MapSection;
