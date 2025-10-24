import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import DonorDonationsTable from './DonorDonationsTable';
import AddDonationModal from './AddDonationModal';
import TeachingAreasModal from './TeachingAreasModal';

const DonorDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, logout } = useAuth('DONOR');
  const [stats, setStats] = useState({
    totalDonations: 0,
    assignedStudents: 0,
    teachingAreas: 0,
    totalAmount: 0
  });
  const [donations, setDonations] = useState([]);
  const [teachingAreas, setTeachingAreas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTeachingModal, setShowTeachingModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        toast.error('لطفاً دوباره وارد شوید');
        logout();
        return;
      }

      const [profileRes, donationsRes] = await Promise.all([
        axios.get('http://localhost:4000/api/donors/profile', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:4000/api/donors/donations', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Update stats from profile
      if (profileRes.data) {
        setStats({
          totalDonations: profileRes.data.totalDonations || 0,
          assignedStudents: profileRes.data.assignedStudents || 0,
          teachingAreas: profileRes.data.teachingAreas?.length || 0,
          totalAmount: profileRes.data.totalAmount || 0
        });
        setTeachingAreas(profileRes.data.teachingAreas || []);
      }

      // Update donations list with proper array handling
      if (donationsRes.data) {
        const donationsData = Array.isArray(donationsRes.data) ? donationsRes.data : [];
        console.log('✅ Fetched donations:', donationsData);
        setDonations(donationsData);
      }
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('دسترسی غیر مجاز – حساب شما در انتظار تأیید است');
        setTimeout(() => {
          logout();
        }, 2000);
      } else if (error.response?.status === 401) {
        toast.error('نشست منقضی شده - لطفاً دوباره وارد شوید');
        logout();
      } else {
        toast.error('خطا در دریافت اطلاعات');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = useMemo(() => [
    {
      title: 'تعداد اهداها',
      value: stats.totalDonations,
      icon: '💝',
      color: 'bg-gray-50',
      accent: 'border-gray-200',
    },
    {
      title: 'دانشجویان مرتبط',
      value: stats.assignedStudents,
      icon: '🎓',
      color: 'bg-gray-50',
      accent: 'border-gray-200',
    },
    {
      title: 'حوزه‌های تدریس',
      value: stats.teachingAreas,
      icon: '📚',
      color: 'bg-gray-50',
      accent: 'border-gray-200',
    },
    {
      title: 'مجموع مبلغ',
      value: stats.totalAmount.toLocaleString('fa-IR') + ' تومان',
      icon: '💰',
      color: 'bg-gray-50',
      accent: 'border-gray-200',
    },
  ], [stats]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-vazir">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 font-vazir truncate">
                پنل اهداکننده
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-right hidden sm:block">
                <p className="font-bold text-gray-800 font-vazir text-sm truncate max-w-[120px]">{user?.name}</p>
                <p className="text-xs text-gray-600">اهداکننده</p>
              </div>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg font-vazir text-xs sm:text-sm transition-colors touch-manipulation active:scale-95"
              >
                خروج
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Welcome Section */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 font-vazir mb-2" style={{ color: '#333333' }}>
            خوش آمدید! 👋
          </h2>
          <p className="text-sm sm:text-base text-gray-600 font-vazir">
            مدیریت اهداها و حوزه‌های تدریس شما
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          {statCards.map((card, index) => (
            <div
              key={index}
              className={`${card.color} border-2 ${card.accent} rounded-xl p-4 sm:p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <div className="text-2xl sm:text-3xl">{card.icon}</div>
                <div className="text-left flex-1 ml-2">
                  <h3 className="text-gray-600 text-xs sm:text-sm font-vazir mb-1">
                    {card.title}
                  </h3>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 font-vazir truncate">
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {/* Donations Management */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 font-vazir">
                  مدیریت اهدا
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm font-vazir mt-1">
                  لیست و مدیریت اهداهای شما
                </p>
              </div>
              <div className="p-3 sm:p-4 md:p-6">
                <DonorDonationsTable 
                  donations={donations}
                  onRefresh={fetchData}
                />
              </div>
            </div>
          </div>

          {/* Teaching Areas */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 font-vazir">
                    حوزه تدریس
                  </h3>
                  <button
                    onClick={() => setShowTeachingModal(true)}
                    className="text-blue-600 hover:text-blue-800 font-vazir text-xs sm:text-sm touch-manipulation"
                  >
                    ویرایش
                  </button>
                </div>
                <p className="text-gray-600 text-xs sm:text-sm font-vazir mt-1">
                  حوزه‌های تخصصی شما
                </p>
              </div>
              <div className="p-4 sm:p-5 md:p-6">
                {teachingAreas.length > 0 ? (
                  <div className="space-y-2">
                    {teachingAreas.map((area, index) => (
                      <div
                        key={index}
                        className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                      >
                        <p className="font-vazir text-gray-800">{area}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📚</div>
                    <p className="text-gray-500 font-vazir text-sm">
                      هنوز حوزه تدریسی ثبت نشده است
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 sm:mt-6 md:mt-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
          <button
            onClick={() => {
              window.open('https://reymit.ir/rubitech.team', '_blank');
              toast.success('پرداخت آغاز شد!');
            }}
            className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg font-vazir font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all touch-manipulation active:scale-95"
            style={{ backgroundColor: '#10B981' }}
          >
            💳 اهدا کنید
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg font-vazir font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all touch-manipulation active:scale-95"
            style={{ backgroundColor: '#3B82F6' }}
          >
            ➕ اضافه کن اهدا
          </button>
          <button
            onClick={() => setShowTeachingModal(true)}
            className="w-full sm:w-auto bg-gray-500 hover:bg-gray-600 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg font-vazir font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all touch-manipulation active:scale-95"
            style={{ backgroundColor: '#6B7280' }}
          >
            ✏️ ویرایش حوزه‌ها
          </button>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddDonationModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchData();
            toast.success('اهدا با موفقیت ثبت شد');
          }}
        />
      )}

      {showTeachingModal && (
        <TeachingAreasModal
          teachingAreas={teachingAreas}
          onClose={() => setShowTeachingModal(false)}
          onSuccess={() => {
            setShowTeachingModal(false);
            fetchData();
            toast.success('حوزه‌های تدریس به‌روزرسانی شد');
          }}
        />
      )}
    </div>
  );
};

export default DonorDashboard;
