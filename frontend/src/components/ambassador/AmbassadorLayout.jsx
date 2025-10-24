import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Tabs, Tab } from '@mui/material';

const AmbassadorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userStatus, setUserStatus] = useState('not_verified');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(0);

  // Poll status if pending
  useEffect(() => {
    let interval;
    if (userStatus === 'pending') {
      interval = setInterval(checkStatusUpdate, 10000); // Poll every 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userStatus]);

  useEffect(() => {
    checkAuthAndStatus();
  }, [navigate]);

  const checkAuthAndStatus = async () => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userType');
    const name = localStorage.getItem('userName');

    if (!token || !role || role.toUpperCase() !== 'AMBASSADOR') {
      toast.error('دسترسی محدود - لطفاً وارد شوید');
      navigate('/login');
      return;
    }

    setUserName(name || 'سفیر');

    try {
      // Check ambassador status
      // Use status endpoint designed for this
      const response = await axios.get('http://localhost:4000/api/ambassadors/status', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const status = response.data.status || 'not_verified';
      setUserStatus(status);
      localStorage.setItem('ambassadorStatus', status);
      
      console.log('Ambassador status:', status);
      
      // Keep sections accessible; do not force redirect here. Verification is handled contextually.
    } catch (error) {
      console.error('Error checking status:', error);
      // If profile endpoint fails, check localStorage
      const savedStatus = localStorage.getItem('ambassadorStatus') || 'not_verified';
      setUserStatus(savedStatus);
      
      // Keep sections accessible even if status could not be fetched.
    } finally {
      setIsLoading(false);
    }
  };

  const checkStatusUpdate = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('http://localhost:4000/api/ambassadors/status', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newStatus = response.data.status || 'not_verified';
      console.log('Status poll update:', newStatus);
      
      if (newStatus !== userStatus) {
        setUserStatus(newStatus);
        localStorage.setItem('ambassadorStatus', newStatus);
        
        if (newStatus === 'verified') {
          toast.success('🎉 احراز هویت شما تأیید شد!');
        }
      }
    } catch (error) {
      console.error('Error polling status:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userType');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('ambassadorStatus');
    toast.success('خروج موفقیت‌آمیز');
    navigate('/login');
  };

  const menuItems = [
    { path: '/ambassador/dashboard', label: 'داشبورد', icon: '📊' },
    { path: '/ambassador/profile', label: 'پروفایل', icon: '👤' },
    { path: '/ambassador/students', label: 'مدیریت دانش‌آموزان', icon: '🎓' },
    ...(userStatus !== 'verified' ? [{ path: '/ambassador/verify', label: 'احراز هویت', icon: '📝' }] : []),
  ];

  // Tabs shown in the header for quick navigation, including Verification when not verified
  const topTabs = useMemo(() => {
    const tabs = [
      { path: '/ambassador/dashboard', label: 'داشبورد' },
      { path: '/ambassador/profile', label: 'پروفایل' },
      { path: '/ambassador/students', label: 'دانش‌آموزان' },
    ];
    if (userStatus !== 'verified') {
      tabs.push({ path: '/ambassador/verify', label: 'احراز هویت' });
    }
    return tabs;
  }, [userStatus]);

  // Keep active tab in sync with current route
  useEffect(() => {
    const idx = topTabs.findIndex(t => location.pathname.startsWith(t.path));
    setActiveTab(idx >= 0 ? idx : 0);
  }, [location.pathname, topTabs]);

  const handleTabChange = (_e, newIndex) => {
    const target = topTabs[newIndex];
    console.log('[UI] Tab change', { newIndex, target, userStatus });
    if (!target) return;
    navigate(target.path);
  };

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

  const isVerified = userStatus === 'verified';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row" dir="rtl">
      {/* Mobile Header */}
      <header className="md:hidden bg-white shadow-md p-4 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
        <h1 className="text-lg font-bold text-gray-800 font-vazir">
          {menuItems.find((item) => item.path === location.pathname)?.label || 'پنل سفیر'}
        </h1>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors text-sm"
        >
          خروج
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed md:relative inset-y-0 right-0 z-50 bg-white text-gray-800 transition-transform duration-300 transform ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } md:translate-x-0 w-64 md:w-20 lg:w-64 flex flex-col shadow-xl`}
      >
        {/* Logo */}
        <div className="hidden md:flex p-4 items-center justify-between border-b">
          <h1 className="hidden lg:block text-2xl font-bold font-vazir">روبیتک اسپارک</h1>
        </div>

        {/* Mobile Header in Sidebar */}
        <div className="md:hidden p-4 border-b">
          <h1 className="text-xl font-bold font-vazir text-gray-800">روبیتک اسپارک</h1>
          <p className="text-xs text-gray-500 mt-1">پنل سفیر</p>
        </div>

        {/* Verification Status Badge */}
        {userStatus === 'pending' && (
          <div className="mx-4 mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-xs font-vazir text-center font-bold text-yellow-800">⏳ در انتظار تأیید</p>
          </div>
        )}

        {userStatus === 'verified' && (
          <div className="mx-4 mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs font-vazir text-center font-bold text-green-800">✅ تأیید شده</p>
          </div>
        )}
        
        {userStatus === 'not_verified' && (
          <div className="mx-4 mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-xs font-vazir text-center font-bold text-orange-800">📝 احراز هویت نشده</p>
          </div>
        )}

        {/* Menu Items */}
        <nav className="flex-1 p-2 md:p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isGateProtected = userStatus !== 'verified' && !['/ambassador/verify', '/ambassador/dashboard'].includes(item.path);
            return (
              <NavLink
                key={item.path}
                to={isGateProtected ? '/ambassador/verify' : item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 md:px-4 py-3 rounded-lg transition-all font-vazir ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'hover:bg-gray-50'
                  } ${isGateProtected ? 'opacity-60 cursor-not-allowed' : ''}`
                }
                onClick={(e) => {
                  setSidebarOpen(false);
                  if (isGateProtected) {
                    e.preventDefault();
                    toast.error('لطفاً ابتدا احراز هویت خود را تکمیل کنید');
                  }
                }}
                aria-disabled={isGateProtected}
              >
                <span className="text-xl md:text-2xl">{item.icon}</span>
                <span className="md:hidden lg:inline">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-700">
                👤
              </div>
              <div className="flex-1 md:hidden lg:block">
                <p className="font-bold font-vazir text-sm truncate text-gray-800">{userName}</p>
                <p className="text-xs text-gray-500">سفیر روبیتک</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors font-vazir text-sm md:hidden lg:block"
            >
              خروج
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Header */}
        <header className="hidden md:block bg-white shadow-md p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl lg:text-2xl font-bold text-gray-800 font-vazir truncate">
                {menuItems.find((item) => item.path === location.pathname)?.label || 'پنل سفیر'}
              </h2>
              <p className="text-xs lg:text-sm text-gray-600 font-vazir mt-1">
                مدیریت دانش‌آموزان و پیگیری اهدا
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-gray-800">
                🔔
              </button>
              <div className="text-right hidden lg:block">
                <p className="font-bold text-gray-900 font-vazir text-sm">{userName}</p>
                <p className="text-xs text-gray-600">سفیر</p>
              </div>
            </div>
          </div>
          {/* Top Tabs: quick access including Verification */}
          <div className="mt-4">
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              textColor="primary"
              indicatorColor="primary"
              variant="scrollable"
              scrollButtons
              allowScrollButtonsMobile
              aria-label="Ambassador sections"
            >
              {topTabs.map((t) => (
                <Tab key={t.path} label={t.label} sx={{ fontFamily: 'Vazir, sans-serif' }} />
              ))}
            </Tabs>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto relative">
          {userStatus === 'not_verified' && location.pathname !== '/ambassador/verify' && (
            <div className="bg-orange-100 border-r-4 border-orange-500 p-4 mb-6 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-bold text-gray-800 font-vazir">احراز هویت نشده</p>
                  <p className="text-sm text-gray-700 font-vazir mt-1">
                    برای دسترسی کامل، لطفاً احراز هویت خود را تکمیل کنید.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/ambassador/verify')}
                  className="mr-auto bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-vazir text-sm transition-colors"
                >
                  احراز هویت
                </button>
              </div>
            </div>
          )}
          {userStatus !== 'verified' && location.pathname !== '/ambassador/verify' ? (
            <div className="bg-white rounded-xl p-6 shadow-md">
              {console.log('[UI] Rendering limited access gate', { userStatus, path: location.pathname })}
              <p className="font-vazir text-gray-800 font-bold mb-2">دسترسی محدود است</p>
              <p className="font-vazir text-gray-700 text-sm mb-4">
                برای استفاده از امکانات پنل، ابتدا مراحل احراز هویت را تکمیل کنید.
              </p>
              <button
                onClick={() => navigate('/ambassador/verify')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-vazir"
              >
                رفتن به احراز هویت
              </button>
            </div>
          ) : (
            <Outlet context={{ userStatus, setUserStatus }} />
          )}
        </main>
      </div>

      {/* Overlay removed to prevent blocking access while pending */}
    </div>
  );
};

export default AmbassadorLayout;

