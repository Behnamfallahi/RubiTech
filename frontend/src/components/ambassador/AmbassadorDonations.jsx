import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AmbassadorDonations = () => {
  const [donations, setDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    pending: 0,
    totalAmount: 0
  });

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get('http://localhost:4000/api/donations', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        const donationList = response.data.donations || response.data || [];
        setDonations(donationList);
        
        // Calculate stats
        const verified = donationList.filter(d => d.status === 'verified').length;
        const pending = donationList.filter(d => d.status === 'pending').length;
        const totalAmount = donationList.reduce((sum, d) => sum + (d.amount || 0), 0);
        
        setStats({
          total: donationList.length,
          verified,
          pending,
          totalAmount
        });
      }
    } catch (error) {
      console.error('Error fetching donations:', error);
      toast.error('خطا در دریافت لیست اهدا');
      
      // Mock data
      const mockDonations = [
        {
          id: 1,
          donorName: 'شرکت فناوری A',
          studentName: 'محمد رضایی',
          laptopModel: 'Lenovo ThinkPad',
          amount: 15000000,
          status: 'verified',
          date: '1403/07/15'
        },
        {
          id: 2,
          donorName: 'آقای احمدی',
          studentName: 'زهرا محمدی',
          laptopModel: 'HP ProBook',
          amount: 12000000,
          status: 'pending',
          date: '1403/07/20'
        }
      ];
      setDonations(mockDonations);
      setStats({
        total: 2,
        verified: 1,
        pending: 1,
        totalAmount: 27000000
      });
    } finally {
      setIsLoading(false);
    }
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-500 w-12 h-12 rounded-lg flex items-center justify-center text-2xl shadow-md">
              💝
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-vazir mb-1">کل اهدا</h3>
          <p className="text-3xl font-bold text-gray-800">{stats.total.toLocaleString('fa-IR')}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-green-500 w-12 h-12 rounded-lg flex items-center justify-center text-2xl shadow-md">
              ✅
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-vazir mb-1">تأیید شده</h3>
          <p className="text-3xl font-bold text-gray-800">{stats.verified.toLocaleString('fa-IR')}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-yellow-500 w-12 h-12 rounded-lg flex items-center justify-center text-2xl shadow-md">
              ⏳
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-vazir mb-1">در انتظار</h3>
          <p className="text-3xl font-bold text-gray-800">{stats.pending.toLocaleString('fa-IR')}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-purple-500 w-12 h-12 rounded-lg flex items-center justify-center text-2xl shadow-md">
              💰
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-vazir mb-1">ارزش کل</h3>
          <p className="text-2xl font-bold text-gray-800">
            {(stats.totalAmount / 1000000).toFixed(1)} <span className="text-sm">میلیون</span>
          </p>
        </div>
      </div>

      {/* Donations List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800 font-vazir">لیست اهدا</h2>
        </div>

        {donations.length > 0 ? (
          <>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">اهداکننده</th>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">دانش‌آموز</th>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">مدل لپ‌تاپ</th>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">ارزش (تومان)</th>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">تاریخ</th>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((donation) => (
                    <tr key={donation.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-vazir text-gray-800 text-sm">
                        {donation.donorName}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm font-vazir">
                        {donation.studentName}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm font-vazir">
                        {donation.laptopModel}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm font-vazir font-bold">
                        {donation.amount?.toLocaleString('fa-IR')}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm font-vazir">
                        {donation.date}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-vazir ${
                          donation.status === 'verified'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {donation.status === 'verified' ? 'تأیید شده' : 'در انتظار'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y">
              {donations.map((donation) => (
                <div key={donation.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-800 font-vazir">
                        {donation.donorName}
                      </h3>
                      <p className="text-sm text-gray-600 font-vazir">
                        به {donation.studentName}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-vazir ${
                      donation.status === 'verified'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {donation.status === 'verified' ? 'تأیید' : 'انتظار'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 font-vazir space-y-1">
                    <p>💻 {donation.laptopModel}</p>
                    <p className="font-bold">💰 {donation.amount?.toLocaleString('fa-IR')} تومان</p>
                    <p>📅 {donation.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600 font-vazir">هنوز اهدایی ثبت نشده است</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AmbassadorDonations;






