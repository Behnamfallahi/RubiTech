import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminAmbassadors = () => {
  const [ambassadors, setAmbassadors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedAmbassador, setSelectedAmbassador] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchAmbassadors();
  }, []);

  const fetchAmbassadors = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get('http://localhost:4000/api/admin/ambassadors', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setAmbassadors(response.data || []);
    } catch (error) {
      toast.error('خطا در دریافت لیست سفیرها');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      
      await axios.put(
        `http://localhost:4000/api/admin/ambassadors/${id}/approve`,
        { status: 'APPROVED' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('سفیر با موفقیت تأیید شد');
      fetchAmbassadors();
      setShowModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در تأیید سفیر');
    }
  };

  const handleReject = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      
      await axios.put(
        `http://localhost:4000/api/admin/ambassadors/${id}/approve`,
        { status: 'REJECTED' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('سفیر رد شد');
      fetchAmbassadors();
      setShowModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در رد سفیر');
    }
  };

  const filteredAmbassadors = useMemo(() => {
    return ambassadors.filter((ambassador) => {
      const matchesSearch = 
        ambassador.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ambassador.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ambassador.nationalId?.includes(searchTerm) ||
        ambassador.city?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = 
        filterStatus === 'ALL' || ambassador.status === filterStatus;

      return matchesSearch && matchesFilter;
    });
  }, [ambassadors, searchTerm, filterStatus]);

  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: { label: 'در انتظار', color: 'bg-yellow-100 text-yellow-800' },
      APPROVED: { label: 'تأیید شده', color: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'رد شده', color: 'bg-red-100 text-red-800' },
    };
    const statusInfo = statusMap[status] || statusMap.PENDING;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-vazir ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

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
              مدیریت سفیرها
            </h1>
            <p className="text-gray-600 text-sm font-vazir mt-1">
              مجموع {ambassadors.length} سفیر
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-vazir transition-colors shadow-md">
            ➕ افزودن سفیر جدید
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="جستجو بر اساس نام، ایمیل، کدملی یا شهر..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir text-gray-800"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir text-gray-800"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="PENDING">در انتظار</option>
            <option value="APPROVED">تأیید شده</option>
            <option value="REJECTED">رد شده</option>
          </select>
        </div>
      </div>

      {/* Ambassadors Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {filteredAmbassadors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">نام</th>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">ایمیل</th>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">شماره تماس</th>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">شهر</th>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">وضعیت</th>
                  <th className="text-center py-4 px-6 font-vazir text-gray-800">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredAmbassadors.map((ambassador) => (
                  <tr key={ambassador.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {ambassador.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-vazir font-bold text-gray-800">{ambassador.name}</p>
                          <p className="text-xs text-gray-500 font-vazir">{ambassador.nationalId || 'بدون کدملی'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-vazir text-gray-800">{ambassador.email || '-'}</td>
                    <td className="py-4 px-6 font-vazir text-gray-800">{ambassador.phoneNumber || '-'}</td>
                    <td className="py-4 px-6 font-vazir text-gray-800">{ambassador.city || '-'}</td>
                    <td className="py-4 px-6">{getStatusBadge(ambassador.status)}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedAmbassador(ambassador);
                            setShowModal(true);
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-vazir text-sm transition-colors shadow-sm"
                        >
                          مشاهده
                        </button>
                        {ambassador.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(ambassador.id)}
                              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-vazir text-sm transition-colors shadow-sm"
                            >
                              تأیید
                            </button>
                            <button
                              onClick={() => handleReject(ambassador.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-vazir text-sm transition-colors shadow-sm"
                            >
                              رد
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-gray-600 font-vazir text-lg">سفیری یافت نشد</p>
            <p className="text-gray-500 font-vazir text-sm mt-2">
              فیلترها را تغییر دهید یا سفیر جدیدی اضافه کنید
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedAmbassador && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-800 font-vazir">
                  جزئیات سفیر
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 font-vazir">نام</label>
                  <p className="font-vazir font-bold text-gray-800">{selectedAmbassador.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-vazir">ایمیل</label>
                  <p className="font-vazir text-gray-800">{selectedAmbassador.email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-vazir">شماره تماس</label>
                  <p className="font-vazir text-gray-800">{selectedAmbassador.phoneNumber || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-vazir">کد ملی</label>
                  <p className="font-vazir text-gray-800">{selectedAmbassador.nationalId || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-vazir">شهر</label>
                  <p className="font-vazir text-gray-800">{selectedAmbassador.city || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-vazir">منطقه</label>
                  <p className="font-vazir text-gray-800">{selectedAmbassador.region || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-vazir">وضعیت</label>
                  <div className="mt-1">{getStatusBadge(selectedAmbassador.status)}</div>
                </div>
              </div>
              
              {selectedAmbassador.status === 'PENDING' && (
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleApprove(selectedAmbassador.id)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-vazir transition-colors"
                  >
                    ✓ تأیید سفیر
                  </button>
                  <button
                    onClick={() => handleReject(selectedAmbassador.id)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-vazir transition-colors"
                  >
                    ✕ رد سفیر
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAmbassadors;

