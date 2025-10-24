import React, { useState, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const DonorDonationsTable = ({ donations, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Ensure donations is always an array
  const safeDonations = Array.isArray(donations) ? donations : [];

  const filteredDonations = useMemo(() => {
    if (!safeDonations.length) return [];
    
    return safeDonations.filter((donation) => {
      const matchesSearch = 
        (donation.laptopName && donation.laptopName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (donation.studentName && donation.studentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (donation.studentLocation && donation.studentLocation.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesFilter = 
        filterType === 'ALL' || donation.type === filterType;

      return matchesSearch && matchesFilter;
    });
  }, [safeDonations, searchTerm, filterType]);

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این اهدا اطمینان دارید؟')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      
      await axios.delete(
        `http://localhost:4000/api/donors/donations/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('اهدا با موفقیت حذف شد');
      onRefresh();
    } catch (error) {
      toast.error('خطا در حذف اهدا');
    }
  };

  const handleEdit = (donation) => {
    setSelectedDonation(donation);
    setShowEditModal(true);
    setIsEditing(true);
  };

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

  const getTypeBadge = (type) => {
    const typeMap = {
      LAPTOP: { label: 'لپ‌تاپ', color: 'bg-blue-50 text-blue-700 border border-blue-200', icon: '💻' },
      TEACHING: { label: 'آموزش', color: 'bg-purple-50 text-purple-700 border border-purple-200', icon: '📚' },
      MONEY: { label: 'پول', color: 'bg-green-50 text-green-700 border border-green-200', icon: '💰' },
    };
    const typeInfo = typeMap[type] || typeMap.LAPTOP;
    return (
      <span className={`px-3 py-1 rounded-lg text-xs font-vazir ${typeInfo.color} inline-flex items-center gap-1`}>
        <span>{typeInfo.icon}</span>
        {typeInfo.label}
      </span>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="🔍 جستجو..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir text-sm"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir bg-white text-sm"
        >
          <option value="ALL">همه انواع</option>
          <option value="LAPTOP">💻 لپ‌تاپ</option>
          <option value="TEACHING">📚 آموزش</option>
          <option value="MONEY">💰 پول</option>
        </select>
      </div>

      {/* Results Count */}
      {safeDonations.length > 0 && (
        <div className="text-xs sm:text-sm text-gray-600 font-vazir">
          نمایش {filteredDonations.length} از {safeDonations.length} اهدا
        </div>
      )}

      {/* Table */}
      {filteredDonations.length > 0 ? (
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-vazir text-gray-700 text-xs sm:text-sm whitespace-nowrap">نام لپ‌تاپ</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-vazir text-gray-700 text-xs sm:text-sm whitespace-nowrap hidden sm:table-cell">دانشجو</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-vazir text-gray-700 text-xs sm:text-sm whitespace-nowrap hidden md:table-cell">محل اقامت</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-vazir text-gray-700 text-xs sm:text-sm whitespace-nowrap">نوع</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-vazir text-gray-700 text-xs sm:text-sm whitespace-nowrap hidden sm:table-cell">وضعیت</th>
                  <th className="text-center py-2 sm:py-3 px-2 sm:px-4 font-vazir text-gray-700 text-xs sm:text-sm whitespace-nowrap">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredDonations.map((donation) => (
                  <tr key={donation.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-vazir font-bold text-gray-800 text-xs sm:text-sm">
                      {donation.laptopName || '-'}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-vazir text-gray-700 text-xs sm:text-sm hidden sm:table-cell">
                      {donation.studentName || '-'}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-vazir text-gray-700 text-xs sm:text-sm hidden md:table-cell">
                      {donation.studentLocation || '-'}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4">{getTypeBadge(donation.type)}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 hidden sm:table-cell">{getStatusBadge(donation.status)}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4">
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <button
                          onClick={() => handleEdit(donation)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-2 sm:px-3 py-1 rounded font-vazir text-xs sm:text-sm transition-colors touch-manipulation"
                          style={{ backgroundColor: '#3B82F6' }}
                        >
                          ویرایش
                        </button>
                        <button
                          onClick={() => handleDelete(donation.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 sm:px-3 py-1 rounded font-vazir text-xs sm:text-sm transition-colors touch-manipulation"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 sm:py-12">
          <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">💝</div>
          <p className="text-gray-600 font-vazir text-base sm:text-lg font-bold">هیچ اهدایی یافت نشد</p>
          <p className="text-gray-500 font-vazir text-xs sm:text-sm mt-2">
            {safeDonations.length === 0 
              ? 'برای شروع، اهدای جدیدی اضافه کنید'
              : 'فیلترها را تغییر دهید یا اهدای جدیدی اضافه کنید'
            }
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedDonation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800 font-vazir">
                  ویرایش اهدا
                </h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedDonation(null);
                    setIsEditing(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-700 font-vazir mb-2 block">نام لپ‌تاپ</label>
                <input
                  type="text"
                  defaultValue={selectedDonation.laptopName || ''}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-700 font-vazir mb-2 block">دانشجو</label>
                <input
                  type="text"
                  defaultValue={selectedDonation.studentName || ''}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-700 font-vazir mb-2 block">محل اقامت</label>
                <input
                  type="text"
                  defaultValue={selectedDonation.studentLocation || ''}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir"
                />
              </div>
              
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    toast.success('تغییرات ذخیره شد');
                    setShowEditModal(false);
                    setSelectedDonation(null);
                    setIsEditing(false);
                    onRefresh();
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-vazir transition-colors"
                >
                  ذخیره
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedDonation(null);
                    setIsEditing(false);
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg font-vazir transition-colors"
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

export default DonorDonationsTable;

