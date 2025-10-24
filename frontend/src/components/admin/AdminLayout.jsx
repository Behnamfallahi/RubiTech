import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userType');
    const name = localStorage.getItem('userName');

    if (!token || !role || role.toUpperCase() !== 'ADMIN') {
      toast.error('دسترسی محدود - فقط برای ادمین');
      navigate('/login');
      return;
    }

    setUserName(name || 'ادمین');
  }, [navigate]);

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
    { path: '/admin/dashboard', label: 'داشبورد', icon: '📊' },
    { path: '/admin/ambassadors', label: 'مدیریت سفیرها', icon: '👥' },
    { path: '/admin/students', label: 'مدیریت دانش‌آموزان', icon: '🎓' },
    { path: '/admin/donors', label: 'مدیریت اهداکنندگان', icon: '💝' },
    { path: '/admin/laptops', label: 'نقشه لپ‌تاپ‌ها', icon: '💻' },
    { path: '/admin/contracts', label: 'قراردادها', icon: '📄' },
    { path: '/admin/reports', label: 'گزارشات', icon: '📈' },
    { path: '/admin/settings', label: 'تنظیمات', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row" dir="rtl">
      {/* Mobile Header - visible only on small screens */}
      <header className="md:hidden bg-white shadow-md p-4 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
        <h1 className="text-lg font-bold text-gray-800 font-vazir">
          {menuItems.find((item) => item.path === location.pathname)?.label || 'پنل مدیریت'}
        </h1>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors text-sm"
        >
          خروج
        </button>
      </header>

      {/* Sidebar - hidden on mobile unless toggled */}
      <aside
        className={`fixed md:relative inset-y-0 right-0 z-50 bg-white text-gray-800 transition-transform duration-300 transform ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } md:translate-x-0 w-64 md:w-20 lg:w-64 flex flex-col shadow-xl`}
      >
        {/* Logo & Toggle - hidden on mobile */}
        <div className="hidden md:flex p-4 items-center justify-between border-b">
          <h1 className="hidden lg:block text-2xl font-bold font-vazir">روبیتک اسپارک</h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:block p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ◀
          </button>
        </div>

        {/* Mobile Header in Sidebar */}
        <div className="md:hidden p-4 border-b">
          <h1 className="text-xl font-bold font-vazir">روبیتک اسپارک</h1>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-2 md:p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
                `flex items-center gap-3 px-3 md:px-4 py-3 rounded-lg transition-all font-vazir ${
                  isActive ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-gray-50'
                }`
              }
            >
              <span className="text-xl md:text-2xl">{item.icon}</span>
              <span className="md:hidden lg:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-700">
                👤
              </div>
              <div className="flex-1 md:hidden lg:block">
                <p className="font-bold font-vazir text-sm truncate">{userName}</p>
                <p className="text-xs text-gray-500">مدیر سیستم</p>
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
        {/* Desktop Header - hidden on mobile */}
        <header className="hidden md:block bg-white shadow-md p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl lg:text-2xl font-bold text-gray-800 font-vazir truncate">
                {menuItems.find((item) => item.path === location.pathname)?.label || 'پنل مدیریت'}
              </h2>
              <p className="text-xs lg:text-sm text-gray-600 font-vazir mt-1">
                مدیریت و کنترل سیستم روبیتک اسپارک
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-gray-800">
                🔔
              </button>
              <div className="text-right hidden lg:block">
                <p className="font-bold text-gray-900 font-vazir text-sm">{userName}</p>
                <p className="text-xs text-gray-600">ادمین</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

