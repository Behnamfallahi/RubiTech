import React, { useState, useEffect } from 'react';
import { getAmbassadorProfile, updateAmbassadorProfile, changeAmbassadorPassword } from '../../services/api';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

const AmbassadorProfile = () => {
  const [profileData, setProfileData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');

      if (!token) {
        toast.error('Missing authentication token');
        return;
      }

    const data = await getAmbassadorProfile(token);
    console.log('Profile data fetched:', data);
    if (data) {
      setProfileData(data);
      reset(data);
    }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('خطا در دریافت اطلاعات پروفایل');
      
      // Mock data for demo
      const mockData = {
        fullName: localStorage.getItem('userName') || 'سفیر روبیتک',
        email: localStorage.getItem('userEmail') || 'ambassador@example.com',
        phoneNumber: '09123456789',
        nationalId: '0012345678',
        fatherName: 'علی',
        birthDate: '1370/01/01',
        city: 'تهران',
        region: 'تهران',
        address: 'تهران، خیابان ولیعصر',
        status: 'verified'
      };
      setProfileData(mockData);
      reset(mockData);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      
      const updated = await updateAmbassadorProfile(token, data);
      if (updated) {
        setProfileData(updated);
        setIsEditing(false);
        toast.success('پروفایل با موفقیت به‌روزرسانی شد');
        
        // Update localStorage
        if (data.fullName) {
          localStorage.setItem('userName', data.fullName);
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'خطا در به‌روزرسانی پروفایل');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      const { oldPassword, newPassword, confirmPassword } = passwordForm;
      if (!oldPassword || !newPassword || !confirmPassword) {
        return toast.error('همه فیلدها الزامی است');
      }
      if (newPassword.length < 6) {
        return toast.error('رمز جدید باید حداقل ۶ کاراکتر باشد');
      }
      if (newPassword !== confirmPassword) {
        return toast.error('تکرار رمز جدید مطابقت ندارد');
      }
      setIsChangingPassword(true);
      const token = localStorage.getItem('authToken');
      await changeAmbassadorPassword(token, { oldPassword, newPassword });
      toast.success('رمز عبور با موفقیت تغییر کرد. لطفاً دوباره وارد شوید');
      // Logout: clear token and redirect
      localStorage.removeItem('authToken');
      setTimeout(() => {
        window.location.href = '/login';
      }, 800);
    } catch (error) {
      toast.error(error?.error || error?.message || 'خطا در تغییر رمز عبور');
    } finally {
      setIsChangingPassword(false);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    reset(profileData);
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
    <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl">
            👤
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-vazir mb-1">{profileData.fullName}</h1>
            <p className="text-blue-100 font-vazir text-sm">{profileData.email}</p>
            <div className="mt-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-vazir ${
                profileData.status === 'verified'
                  ? 'bg-green-500 text-white'
                  : 'bg-yellow-500 text-white'
              }`}>
                {profileData.status === 'verified' ? '✓ تأیید شده' : '⏳ در انتظار تأیید'}
              </span>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-vazir transition-colors flex items-center gap-2"
            >
              <span>✏️</span>
              ویرایش
            </button>
          )}
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white rounded-xl p-6 shadow-md space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 font-vazir">اطلاعات شخصی</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
                نام و نام خانوادگی *
              </label>
              {isEditing ? (
                <>
                  <input
                    {...register('fullName', { 
                      required: 'نام و نام خانوادگی الزامی است',
                      minLength: { value: 2, message: 'حداقل 2 کاراکتر' }
                    })}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-500 font-vazir">{errors.fullName.message}</p>
                  )}
                </>
              ) : (
                <p className="text-gray-800 font-vazir px-4 py-3 bg-gray-50 rounded-xl">
                  {profileData.fullName || '-'}
                </p>
              )}
            </div>

            {/* Father Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
                نام پدر
              </label>
              {isEditing ? (
                <input
                  {...register('fatherName')}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
                />
              ) : (
                <p className="text-gray-800 font-vazir px-4 py-3 bg-gray-50 rounded-xl">
                  {profileData.fatherName || '-'}
                </p>
              )}
            </div>

            {/* National ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
                کد ملی
              </label>
              <p className="text-gray-800 font-vazir px-4 py-3 bg-gray-100 rounded-xl cursor-not-allowed">
                {profileData.nationalId || '-'}
              </p>
              <p className="text-xs text-gray-500 font-vazir mt-1">کد ملی قابل تغییر نیست</p>
            </div>

            {/* Birth Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
                تاریخ تولد
              </label>
              {isEditing ? (
                <input
                  {...register('birthDate')}
                  type="text"
                  placeholder="1370/01/01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
                />
              ) : (
                <p className="text-gray-800 font-vazir px-4 py-3 bg-gray-50 rounded-xl">
                  {profileData.birthDate || '-'}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
                ایمیل *
              </label>
              {isEditing ? (
                <>
                  <input
                    {...register('email', {
                      required: 'ایمیل الزامی است',
                      pattern: {
                        value: /^\S+@\S+\.\S+$/,
                        message: 'فرمت ایمیل نامعتبر است'
                      }
                    })}
                    type="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500 font-vazir">{errors.email.message}</p>
                  )}
                </>
              ) : (
                <p className="text-gray-800 font-vazir px-4 py-3 bg-gray-50 rounded-xl">
                  {profileData.email || '-'}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
                شماره موبایل
              </label>
              {isEditing ? (
                <>
                  <input
                    {...register('phoneNumber', {
                      pattern: {
                        value: /^09\d{9}$/,
                        message: 'شماره موبایل نامعتبر است'
                      }
                    })}
                    type="tel"
                    inputMode="numeric"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
                  />
                  {errors.phoneNumber && (
                    <p className="mt-1 text-sm text-red-500 font-vazir">{errors.phoneNumber.message}</p>
                  )}
                </>
              ) : (
                <p className="text-gray-800 font-vazir px-4 py-3 bg-gray-50 rounded-xl">
                  {profileData.phoneNumber || '-'}
                </p>
              )}
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
                شهر
              </label>
              {isEditing ? (
                <input
                  {...register('city')}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
                />
              ) : (
                <p className="text-gray-800 font-vazir px-4 py-3 bg-gray-50 rounded-xl">
                  {profileData.city || '-'}
                </p>
              )}
            </div>

            {/* Region */}
            <div>
              <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
                استان/منطقه
              </label>
              {isEditing ? (
                <input
                  {...register('region')}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
                />
              ) : (
                <p className="text-gray-800 font-vazir px-4 py-3 bg-gray-50 rounded-xl">
                  {profileData.region || '-'}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
                آدرس
              </label>
              {isEditing ? (
                <textarea
                  {...register('address')}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
                ></textarea>
              ) : (
                <p className="text-gray-800 font-vazir px-4 py-3 bg-gray-50 rounded-xl">
                  {profileData.address || '-'}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
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
                    ذخیره تغییرات
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-vazir transition-colors disabled:opacity-50"
              >
                انصراف
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Statistics Card */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h3 className="text-lg font-bold text-gray-800 font-vazir mb-4 flex items-center gap-2">
          <span>📊</span>
          آمار فعالیت
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{profileData.totalStudents || 0}</p>
            <p className="text-sm text-gray-600 font-vazir mt-1">دانش‌آموز</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{profileData.approvedStudents || 0}</p>
            <p className="text-sm text-gray-600 font-vazir mt-1">تأیید شده</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-3xl font-bold text-purple-600">{profileData.totalDonations || 0}</p>
            <p className="text-sm text-gray-600 font-vazir mt-1">اهدا</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-3xl font-bold text-orange-600">{profileData.memberSince || '1402'}</p>
            <p className="text-sm text-gray-600 font-vazir mt-1">سال عضویت</p>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h3 className="text-lg font-bold text-gray-800 font-vazir mb-4 flex items-center gap-2">
          <span>🔒</span>
          تنظیمات امنیتی
        </h3>
        <form onSubmit={handlePasswordChange} className="space-y-4" dir="rtl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">رمز فعلی</label>
              <input
                type="password"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, oldPassword: e.target.value }))}
                placeholder="رمز فعلی"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">رمز جدید</label>
              <input
                type="password"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                placeholder="حداقل ۶ کاراکتر"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">تکرار رمز جدید</label>
              <input
                type="password"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="تکرار رمز"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isChangingPassword}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-vazir transition-colors disabled:opacity-50"
            >
              {isChangingPassword ? 'در حال تغییر...' : 'ذخیره رمز جدید'}
            </button>
            <button
              type="button"
              onClick={() => setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })}
              disabled={isChangingPassword}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-vazir transition-colors"
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AmbassadorProfile;


