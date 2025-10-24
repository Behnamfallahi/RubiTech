import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { getAdminDonors, updateAdminDonor, deleteAdminDonor } from '../../services/api';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

const AdminDonors = () => {
  const [donors, setDonors] = useState([]);
  const [filteredDonors, setFilteredDonors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  useEffect(() => {
    fetchDonors();
  }, []);

  useEffect(() => {
    filterDonors();
  }, [searchTerm, donors]);

  const fetchDonors = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        toast.error('نشست منقضی شده - لطفاً وارد شوید');
        setDonors([]);
        setFilteredDonors([]);
        return;
      }

      console.log('Fetching donors from /api/admin/donors...');
      const responseData = await getAdminDonors(token);

      console.log('Donors fetched successfully:', responseData);

      const donorsList = responseData?.donors || responseData || [];
      setDonors(Array.isArray(donorsList) ? donorsList : []);
      setFilteredDonors(Array.isArray(donorsList) ? donorsList : []);
    } catch (error) {
      console.error('Error fetching donors:', error);
      const msg = error?.message || error?.error || error?.details || 'خطا در دریافت اطلاعات اهداکنندگان';
      toast.error(typeof msg === 'string' ? msg : 'خطا در دریافت اطلاعات اهداکنندگان');
      
      // Set empty array on error
      setDonors([]);
      setFilteredDonors([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterDonors = () => {
    if (!searchTerm.trim()) {
      setFilteredDonors(donors);
      return;
    }

    const query = searchTerm.toLowerCase();
    const filtered = donors.filter(donor => 
      donor.name?.toLowerCase().includes(query) ||
      donor.email?.toLowerCase().includes(query) ||
      donor.phoneNumber?.includes(query) ||
      donor.residence?.toLowerCase().includes(query) ||
      donor.laptopName?.toLowerCase().includes(query) ||
      donor.experienceField?.toLowerCase().includes(query)
    );
    setFilteredDonors(filtered);
  };

  const handleEditDonor = (donor) => {
    console.log('Editing donor:', donor);
    setSelectedDonor(donor);
    reset(donor);
    setShowEditModal(true);
  };

  const handleDeleteDonor = async (donor) => {
    if (!window.confirm(`آیا از حذف اهداکننده "${donor.name}" اطمینان دارید؟`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      
      console.log('Deleting donor:', donor.id);
      
      await deleteAdminDonor(token, donor.id);

      setDonors(prev => prev.filter(d => d.id !== donor.id));
      toast.success('اهداکننده با موفقیت حذف شد');
    } catch (error) {
      console.error('Error deleting donor:', error);
      toast.error(error.response?.data?.message || 'خطا در حذف اهداکننده');
    }
  };

  const onSubmitEdit = async (data) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      
      console.log('Updating donor:', selectedDonor.id, data);
      
      const updated = await updateAdminDonor(token, selectedDonor.id, data);
      if (updated) {
        setDonors(prev => prev.map(d => d.id === selectedDonor.id ? (updated.donor || updated) : d));
        setShowEditModal(false);
        setSelectedDonor(null);
        reset({});
        toast.success('اهداکننده با موفقیت ویرایش شد');
      }
    } catch (error) {
      console.error('Error updating donor:', error);
      toast.error(error.response?.data?.message || 'خطا در ویرایش اهداکننده');
    } finally {
      setIsSaving(false);
    }
  };

  const DonorEditForm = ({ onSubmit, submitLabel }) => (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
            نام و نام خانوادگی *
          </label>
          <input
            {...register('name', { required: 'نام الزامی است' })}
            type="text"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
            placeholder="نام اهداکننده"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500 font-vazir">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
            ایمیل
          </label>
          <input
            {...register('email')}
            type="email"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
            placeholder="example@email.com"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
            شماره تماس
          </label>
          <input
            {...register('phoneNumber')}
            type="tel"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
            placeholder="09123456789"
          />
        </div>

        {/* Residence */}
        <div>
          <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
            محل سکونت
          </label>
          <input
            {...register('residence')}
            type="text"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
            placeholder="شهر/استان"
          />
        </div>

        {/* Laptop Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
            نام لپ‌تاپ اهدایی
          </label>
          <input
            {...register('laptopName')}
            type="text"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
            placeholder="مثلاً: Dell Latitude"
          />
        </div>

        {/* Experience Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
            حوزه تخصص
          </label>
          <input
            {...register('experienceField')}
            type="text"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
            placeholder="مثلاً: برنامه‌نویسی"
          />
        </div>

        {/* Student Details */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
            جزئیات دانش‌آموز مرتبط
          </label>
          <textarea
            {...register('studentDetails')}
            rows="3"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
            placeholder="نام و مشخصات دانش‌آموز"
          ></textarea>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-vazir font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              در حال ذخیره...
            </>
          ) : (
            <>
              <span>✓</span>
              {submitLabel}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowEditModal(false);
            reset({});
          }}
          disabled={isSaving}
          className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-vazir transition-colors"
        >
          انصراف
        </button>
      </div>
    </form>
  );

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
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 font-vazir">
              مدیریت اهداکنندگان
            </h1>
            <p className="text-gray-600 text-sm font-vazir mt-1">
              {filteredDonors.length} اهداکننده
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو بر اساس نام، ایمیل، تلفن، شهر یا حوزه تخصص..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
            />
            <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>
        </div>
      </div>

      {/* Donors Table/Cards */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {filteredDonors.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">نام</th>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">محل سکونت</th>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">تلفن</th>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">ایمیل</th>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">نام لپ‌تاپ</th>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">جزئیات دانش‌آموز</th>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">حوزه تخصص</th>
                    <th className="text-center py-3 px-4 font-vazir text-gray-800 text-sm">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDonors.map((donor) => (
                    <tr key={donor.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-vazir text-gray-800 text-sm">
                        {donor.name || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm font-vazir">
                        {donor.residence || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm font-vazir">
                        {donor.phoneNumber || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm font-vazir">
                        {donor.email || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm font-vazir">
                        {donor.laptopName || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm font-vazir">
                        {donor.studentDetails || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm font-vazir">
                        {donor.experienceField || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditDonor(donor)}
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                            title="ویرایش"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteDonor(donor)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            title="حذف"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y">
              {filteredDonors.map((donor) => (
                <div key={donor.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 font-vazir mb-1">
                        {donor.name || '-'}
                      </h3>
                      <p className="text-sm text-gray-600 font-vazir">
                        📍 {donor.residence || 'نامشخص'}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 font-vazir space-y-1 mb-3">
                    <p>📞 تلفن: {donor.phoneNumber || '-'}</p>
                    <p>📧 ایمیل: {donor.email || '-'}</p>
                    <p>💻 لپ‌تاپ: {donor.laptopName || '-'}</p>
                    <p>🎓 دانش‌آموز: {donor.studentDetails || '-'}</p>
                    <p>📚 تخصص: {donor.experienceField || '-'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditDonor(donor)}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-lg font-vazir text-sm transition-colors"
                    >
                      ✏️ ویرایش
                    </button>
                    <button
                      onClick={() => handleDeleteDonor(donor)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-lg font-vazir text-sm transition-colors"
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💝</div>
            <p className="text-gray-600 font-vazir text-lg">
              {searchTerm ? 'نتیجه‌ای یافت نشد' : 'هیچ اهداکننده‌ای ثبت نشده است'}
            </p>
          </div>
        )}
      </div>

      {/* Edit Donor Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 font-vazir mb-6 flex items-center gap-2">
              <span>✏️</span>
              ویرایش اهداکننده
            </h2>
            <DonorEditForm onSubmit={onSubmitEdit} submitLabel="ذخیره تغییرات" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDonors;

