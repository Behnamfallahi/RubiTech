import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getStudentCourses, uploadCourseCertificate } from '../../services/api';
import CourseCard from './CourseCard';

const FILTERS = [
  { key: 'all', label: 'همه' },
  { key: 'ongoing', label: 'درحال برگزاری' },
  { key: 'completed', label: 'تمام شده' },
  { key: 'canceled', label: 'لغو' },
];

const StudentDashboard = () => {
  const { profile, refetchProfile, isProfileLoading } = useOutletContext?.() || {};
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const params = activeFilter !== 'all' ? { status: activeFilter } : {};
      const data = await getStudentCourses(token, params);
      setCourses(Array.isArray(data) ? data : data.courses || []);
    } catch (e) {
      toast.error('خطا در دریافت دوره‌ها');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  const handleUpload = async (courseId, file) => {
    if (!file) return;
    try {
      const token = localStorage.getItem('authToken');
      await uploadCourseCertificate(token, courseId, file);
      toast.success('مدرک با موفقیت آپلود شد');
      fetchCourses();
    } catch (e) {
      toast.error(e?.message || 'آپلود ناموفق بود');
    }
  };

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return courses;
    return courses.filter((c) => (c.status || '').toLowerCase() === activeFilter);
  }, [courses, activeFilter]);

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
    <div className="space-y-4" dir="rtl">
      {/* Profile summary card */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-2xl">👤</div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 font-vazir mr-auto">پروفایل</h2>
              {!profile && (
                <button onClick={refetchProfile} disabled={isProfileLoading} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 text-xs sm:text-sm font-vazir">
                  {isProfileLoading ? 'در حال تلاش...' : 'تلاش مجدد دریافت پروفایل'}
                </button>
              )}
            </div>
            {profile ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-sm">
                <div><span className="text-gray-500">نام: </span><span className="font-vazir">{profile.name || '—'}</span></div>
                <div><span className="text-gray-500">ایمیل: </span><span className="font-vazir">{profile.email || '—'}</span></div>
                <div><span className="text-gray-500">تاریخ تولد: </span><span className="font-vazir">{profile.birthDate ? new Date(profile.birthDate).toLocaleDateString('fa-IR') : '—'}</span></div>
                <div><span className="text-gray-500">شهر: </span><span className="font-vazir">{profile.city || profile.location || '—'}</span></div>
              </div>
            ) : (
              <p className="text-gray-600 font-vazir mt-1">عدم دریافت اطلاعات پروفایل</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 font-vazir mr-auto">دوره‌های من</h2>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-vazir border ${
                activeFilter === f.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filtered.map((c) => (
            <CourseCard key={c.id} course={c} onUpload={handleUpload} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-8 shadow-md text-center">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-gray-600 font-vazir">دوره‌ای یافت نشد</p>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;


