import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom blue marker icon
const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const AdminLaptopsMap = () => {
  const [laptops, setLaptops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'map'
  const [selectedLaptop, setSelectedLaptop] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchLaptops();
  }, []);

  const fetchLaptops = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get('http://localhost:4000/locations', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setLaptops(response.data || []);
    } catch (error) {
      toast.error('خطا در دریافت اطلاعات لپ‌تاپ‌ها');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateLocation = async (laptopId, lat, lng) => {
    try {
      const token = localStorage.getItem('authToken');
      
      await axios.patch(
        `http://localhost:4000/api/admin/laptops/${laptopId}`,
        { locationLat: lat, locationLng: lng },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('موقعیت لپ‌تاپ به‌روزرسانی شد');
      fetchLaptops();
      setShowEditModal(false);
    } catch (error) {
      toast.error('خطا در به‌روزرسانی موقعیت');
    }
  };

  const filteredLaptops = useMemo(() => {
    return laptops.filter((laptop) => {
      const matchesSearch = 
        laptop.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        laptop.laptopName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        laptop.studentLocation?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [laptops, searchTerm]);

  const laptopsWithCoordinates = useMemo(() => {
    return filteredLaptops.filter(laptop => 
      laptop.locationLat !== null && 
      laptop.locationLng !== null
    );
  }, [filteredLaptops]);

  const iranCenter = [32.4279, 53.6880]; // مرکز ایران

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-vazir">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 font-vazir">
              نقشه لپ‌تاپ‌ها
            </h1>
            <p className="text-gray-600 text-sm font-vazir mt-1">
              مجموع {laptops.length} لپ‌تاپ ({laptopsWithCoordinates.length} با موقعیت)
            </p>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-md font-vazir transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-800 hover:bg-gray-200'
              }`}
            >
              📋 جدول
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-md font-vazir transition-colors ${
                viewMode === 'map'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-800 hover:bg-gray-200'
              }`}
            >
              🗺️ نقشه
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <input
          type="text"
          placeholder="جستجو بر اساس سریال، نام لپ‌تاپ یا محل دانش‌آموز..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir text-gray-800"
        />
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {filteredLaptops.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-right py-4 px-6 font-vazir text-gray-800">سریال</th>
                    <th className="text-right py-4 px-6 font-vazir text-gray-800">نام لپ‌تاپ</th>
                    <th className="text-right py-4 px-6 font-vazir text-gray-800">محل دانش‌آموز</th>
                    <th className="text-right py-4 px-6 font-vazir text-gray-800">موقعیت</th>
                    <th className="text-center py-4 px-6 font-vazir text-gray-800">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLaptops.map((laptop) => (
                    <tr key={laptop.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 font-vazir font-bold text-gray-800">
                        {laptop.serialNumber}
                      </td>
                      <td className="py-4 px-6 font-vazir text-gray-800">
                        {laptop.laptopName || '-'}
                      </td>
                      <td className="py-4 px-6 font-vazir text-gray-800">
                        {laptop.studentLocation || '-'}
                      </td>
                      <td className="py-4 px-6">
                        {laptop.locationLat && laptop.locationLng ? (
                          <span className="px-3 py-1 rounded-full text-xs font-vazir bg-green-100 text-green-800">
                            دارد
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-vazir bg-gray-100 text-gray-800">
                            ندارد
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedLaptop(laptop);
                              setShowEditModal(true);
                            }}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-vazir text-sm transition-colors shadow-sm"
                          >
                            ویرایش موقعیت
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">💻</div>
              <p className="text-gray-600 font-vazir text-lg">لپ‌تاپی یافت نشد</p>
            </div>
          )}
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="h-64 sm:h-96 md:h-[500px] lg:h-[600px]" style={{ direction: 'ltr' }}>
            <MapContainer
              center={iranCenter}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {laptopsWithCoordinates.map((laptop) => (
                <Marker
                  key={laptop.id}
                  position={[laptop.locationLat, laptop.locationLng]}
                  icon={blueIcon}
                >
                  <Popup>
                    <div style={{ direction: 'rtl', fontFamily: 'Vazir' }}>
                      <h3 className="font-bold text-gray-800 mb-2">
                        {laptop.laptopName || 'لپ‌تاپ'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        <strong>سریال:</strong> {laptop.serialNumber}
                      </p>
                      {laptop.studentLocation && (
                        <p className="text-sm text-gray-600">
                          <strong>محل:</strong> {laptop.studentLocation}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          
          {laptopsWithCoordinates.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-[1000]">
              <div className="text-center">
                <div className="text-6xl mb-4">📍</div>
                <p className="text-gray-600 font-vazir text-lg">
                  هیچ لپ‌تاپی با موقعیت ثبت‌شده وجود ندارد
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Location Modal */}
      {showEditModal && selectedLaptop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800 font-vazir">
                  ویرایش موقعیت لپ‌تاپ
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-600 font-vazir">سریال</label>
                <p className="font-vazir font-bold text-gray-800">{selectedLaptop.serialNumber}</p>
              </div>
              
              <div>
                <label className="text-sm text-gray-600 font-vazir mb-2 block">
                  عرض جغرافیایی (Latitude)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  defaultValue={selectedLaptop.locationLat || ''}
                  id="latitude"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-600 font-vazir mb-2 block">
                  طول جغرافیایی (Longitude)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  defaultValue={selectedLaptop.locationLng || ''}
                  id="longitude"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    const lat = parseFloat(document.getElementById('latitude').value);
                    const lng = parseFloat(document.getElementById('longitude').value);
                    
                    if (isNaN(lat) || isNaN(lng)) {
                      toast.error('لطفاً مختصات معتبر وارد کنید');
                      return;
                    }
                    
                    handleUpdateLocation(selectedLaptop.id, lat, lng);
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-vazir transition-colors shadow-sm"
                >
                  ذخیره
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 px-6 py-3 rounded-lg font-vazir transition-colors shadow-sm"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLaptopsMap;

