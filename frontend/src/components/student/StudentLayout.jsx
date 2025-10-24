import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getStudentProfile } from '../../services/api';
import { jwtDecode } from 'jwt-decode';

const StudentLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const abortRef = useRef(null);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    const role = (localStorage.getItem('userType') || '').toUpperCase();
    if (!token || role !== 'STUDENT') {
      toast.error('دسترسی محدود - لطفاً وارد شوید');
      navigate('/login');
      return;
    }
    // Debug: decode JWT to ensure we are fetching for the correct subject
    try {
      const payload = jwtDecode(token);
      // eslint-disable-next-line no-console
      console.log('[StudentLayout] token payload:', payload);
      if (payload && typeof payload === 'object') {
        const localUserId = localStorage.getItem('userId');
        if (localUserId && String(payload.id) !== String(localUserId)) {
          // If mismatch detected, clear stale storage and force re-login to avoid cross-user data
          // eslint-disable-next-line no-console
          console.warn('[StudentLayout] token/userId mismatch. Forcing logout for safety');
          localStorage.removeItem('authToken');
          localStorage.removeItem('userType');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userName');
          localStorage.removeItem('userId');
          toast.error('نشست نامعتبر شد. لطفاً دوباره وارد شوید');
          navigate('/login');
          return;
        }
      }
    } catch (_) {
      // ignore decode failure; backend will still validate
    }
    setIsLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const data = await getStudentProfile(token, { signal: controller.signal });
      // Debug: ensure fetched profile belongs to token subject
      try {
        const payload = jwtDecode(token);
        // eslint-disable-next-line no-console
        console.log('[StudentLayout] fetched profile:', data);
        if (payload && data && typeof payload === 'object' && String(data.id) !== String(payload.id)) {
          // eslint-disable-next-line no-console
          console.error('[StudentLayout] profile id mismatch with token id. Triggering re-login');
          toast.error('عدم تطابق اطلاعات جلسه. لطفاً دوباره وارد شوید');
          localStorage.removeItem('authToken');
          localStorage.removeItem('userType');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userName');
          localStorage.removeItem('userId');
          navigate('/login');
          return;
        }
      } catch (_) {}
      setProfile(data || null);
    } catch (e) {
      if (e?.name === 'CanceledError' || e?.name === 'AbortError') return;
      const status = e?.response?.status;
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      console.error('[StudentLayout] profile fetch error:', {
        status,
        data: e?.response?.data,
        message: e?.message,
      });
      if (status === 401) {
        toast.error('نشست شما منقضی شده است. لطفاً دوباره وارد شوید');
        localStorage.removeItem('authToken');
        navigate('/login');
        return;
      }
      // Friendly Persian message with optional server detail
      toast.error(serverMsg ? `عدم دریافت اطلاعات پروفایل: ${serverMsg}` : 'عدم دریافت اطلاعات پروفایل');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchProfile();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchProfile]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userType');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    toast.success('خروج موفقیت‌آمیز');
    navigate('/login');
  };

  const menuItems = [
    { path: '/student/dashboard', label: 'داشبورد', icon: '📚' },
    { path: '/student/courses', label: 'دوره‌های من', icon: '🎓' },
    { path: '/student/mentor', label: 'منتور من', icon: '🧑‍🏫' },
    { path: '/student/reports', label: 'گزارشات من', icon: '📄' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-vazir">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  const renderErrorBanner = !profile ? (
    <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-3 font-vazir">
      <div className="flex items-center justify-between gap-3">
        <span>عدم دریافت اطلاعات پروفایل</span>
        <button onClick={fetchProfile} className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 text-sm">
          تلاش مجدد
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row" dir="rtl">
      {/* Header Mobile */}
      <header className="md:hidden bg-white shadow-md p-4 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          {sidebarOpen ? '✕' : '☰'}
        </button>
        <h1 className="text-lg font-bold text-gray-800 font-vazir">
          {menuItems.find((item) => item.path === location.pathname)?.label || 'پنل دانشجو'}
        </h1>
        <button onClick={handleLogout} className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors text-sm">
          خروج
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`fixed md:relative inset-y-0 right-0 z-50 bg-white text-gray-800 transition-transform duration-300 transform ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full'
      } md:translate-x-0 w-64 md:w-20 lg:w-64 flex flex-col shadow-xl`}>
        <div className="hidden md:flex p-4 items-center justify-between border-b">
          <h1 className="hidden lg:block text-2xl font-bold font-vazir">پنل دانشجو</h1>
        </div>

        {/* Profile Box */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">👤</div>
            <div className="md:hidden lg:block">
              <p className="font-bold font-vazir">{profile?.name || localStorage.getItem('userName') || 'دانشجو'}</p>
              <p className="text-xs text-gray-500">{profile?.city || 'شهر نامشخص'}</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-2 md:p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 md:px-4 py-3 rounded-lg transition-all font-vazir ${
                  isActive ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-gray-50'
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className="text-xl md:text-2xl">{item.icon}</span>
              <span className="md:hidden lg:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t">
          <button onClick={handleLogout} className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors font-vazir text-sm md:hidden lg:block">
            خروج
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="hidden md:block bg-white shadow-md p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-gray-800 font-vazir">
                {menuItems.find((item) => item.path === location.pathname)?.label || 'پنل دانشجو'}
              </h2>
              <p className="text-xs lg:text-sm text-gray-600 font-vazir mt-1">مدیریت دوره‌ها و مدارک</p>
            </div>
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto relative">
          {renderErrorBanner}
          <Outlet context={{ profile, refetchProfile: fetchProfile, isProfileLoading: isLoading }} />
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;


