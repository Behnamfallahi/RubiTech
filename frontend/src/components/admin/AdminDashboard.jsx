import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalAmbassadors: 0,
    totalStudents: 0,
    totalDonors: 0,
    totalLaptops: 0,
    pendingApprovals: 0,
    approvedAmbassadors: 0,
    pendingContracts: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get('http://localhost:4000/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        setStats(response.data.stats || response.data);
        setRecentActivities(response.data.recentActivities || []);
      }
    } catch (error) {
      toast.error('خطا در دریافت اطلاعات داشبورد');
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = useMemo(() => [
    {
      title: 'کل سفیرها',
      value: stats.totalAmbassadors,
      icon: '👥',
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      title: 'کل دانش‌آموزان',
      value: stats.totalStudents,
      icon: '🎓',
      color: 'bg-green-500',
      change: '+8%',
    },
    {
      title: 'کل اهداکنندگان',
      value: stats.totalDonors,
      icon: '💝',
      color: 'bg-purple-500',
      change: '+5%',
    },
    {
      title: 'کل لپ‌تاپ‌ها',
      value: stats.totalLaptops,
      icon: '💻',
      color: 'bg-orange-500',
      change: '+15%',
    },
    {
      title: 'در انتظار تأیید',
      value: stats.pendingApprovals,
      icon: '⏳',
      color: 'bg-yellow-500',
      change: '-3%',
    },
    {
      title: 'سفیرهای تأیید شده',
      value: stats.approvedAmbassadors,
      icon: '✅',
      color: 'bg-teal-500',
      change: '+10%',
    },
  ], [stats]);

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
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl p-4 sm:p-6 shadow-lg">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-vazir mb-2" style={{ color: '#333333' }}>
          خوش آمدید به پنل مدیریت! 👋
        </h1>
        <p className="text-sm sm:text-base text-blue-100 font-vazir" style={{ color: '#333333' }}>
          مدیریت کامل سیستم روبیتک اسپارک
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-4 sm:p-6 shadow-md hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className={`${card.color} w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center text-2xl sm:text-3xl shadow-md`}>
                {card.icon}
              </div>
              <span className="text-green-600 text-xs sm:text-sm font-bold">
                {card.change}
              </span>
            </div>
            <h3 className="text-gray-600 text-xs sm:text-sm font-vazir mb-1">
              {card.title}
            </h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-800">
              {card.value.toLocaleString('fa-IR')}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 font-vazir mb-3 sm:mb-4">
          عملیات سریع
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <button className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors touch-manipulation active:scale-95">
            <span className="text-2xl sm:text-3xl">➕</span>
            <span className="text-xs sm:text-sm font-vazir text-center text-gray-800">افزودن سفیر</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors touch-manipulation active:scale-95">
            <span className="text-2xl sm:text-3xl">📝</span>
            <span className="text-xs sm:text-sm font-vazir text-center text-gray-800">ثبت دانش‌آموز</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors touch-manipulation active:scale-95">
            <span className="text-2xl sm:text-3xl">💻</span>
            <span className="text-xs sm:text-sm font-vazir text-center text-gray-800">مدیریت لپ‌تاپ</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors touch-manipulation active:scale-95">
            <span className="text-2xl sm:text-3xl">📊</span>
            <span className="text-xs sm:text-sm font-vazir text-center text-gray-800">مشاهده گزارش</span>
          </button>
        </div>
      </div>

      {/* Recent Activities Table */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 font-vazir">
            فعالیت‌های اخیر
          </h2>
          <button className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-vazir">
            مشاهده همه
          </button>
        </div>
        
        {recentActivities.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-vazir text-gray-800 text-xs sm:text-sm whitespace-nowrap">نوع</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-vazir text-gray-800 text-xs sm:text-sm">توضیحات</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-vazir text-gray-800 text-xs sm:text-sm whitespace-nowrap hidden sm:table-cell">تاریخ</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-vazir text-gray-800 text-xs sm:text-sm whitespace-nowrap">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivities.map((activity, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 sm:py-3 px-2 sm:px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-vazir bg-blue-100 text-blue-800 whitespace-nowrap">
                          {activity.type}
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 font-vazir text-gray-800 text-xs sm:text-sm">
                        {activity.description}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-700 text-xs sm:text-sm font-vazir hidden sm:table-cell whitespace-nowrap">
                        {activity.date}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-vazir whitespace-nowrap ${
                          activity.status === 'موفق' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {activity.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">📭</div>
            <p className="text-gray-600 font-vazir text-sm sm:text-base">فعالیت اخیری وجود ندارد</p>
          </div>
        )}
      </div>

      {/* Chart Placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 font-vazir mb-3 sm:mb-4">
            توزیع اهدا بر اساس شهر
          </h3>
          <div className="h-48 sm:h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500 font-vazir text-xs sm:text-sm">نمودار در حال توسعه</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 font-vazir mb-3 sm:mb-4">
            روند رشد در طول زمان
          </h3>
          <div className="h-48 sm:h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500 font-vazir text-xs sm:text-sm">نمودار در حال توسعه</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

