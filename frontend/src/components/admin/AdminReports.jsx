import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminReports = () => {
  const [reportType, setReportType] = useState('ambassadors');
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('http://localhost:4000/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('خطا در دریافت آمار');
    }
  };

  const generateCSV = (data, headers, filename) => {
    // Create CSV content
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header] || '';
        return `"${value}"`;
      }).join(',')
    );
    const csvContent = [csvHeaders, ...csvRows].join('\n');

    // Add BOM for UTF-8 (fixes Persian characters in Excel)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      const token = localStorage.getItem('authToken');
      
      let endpoint = '';
      let headers = [];
      let filename = '';

      switch (reportType) {
        case 'ambassadors':
          endpoint = 'http://localhost:4000/api/admin/ambassadors';
          headers = ['id', 'name', 'email', 'phoneNumber', 'city', 'status'];
          filename = 'ambassadors_report';
          break;
        case 'students':
          endpoint = 'http://localhost:4000/api/admin/students';
          headers = ['id', 'name', 'location', 'phoneNumber'];
          filename = 'students_report';
          break;
        case 'donors':
          endpoint = 'http://localhost:4000/api/admin/donors';
          headers = ['id', 'name', 'email', 'phoneNumber'];
          filename = 'donors_report';
          break;
        case 'donations':
          endpoint = 'http://localhost:4000/api/admin/donations';
          headers = ['id', 'type', 'userId', 'studentId', 'amount'];
          filename = 'donations_report';
          break;
        case 'laptops':
          endpoint = 'http://localhost:4000/api/admin/laptops';
          headers = ['id', 'studentId', 'locationLat', 'locationLng', 'status'];
          filename = 'laptops_report';
          break;
        default:
          return;
      }

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      generateCSV(response.data, headers, filename);
      toast.success('گزارش با موفقیت ایجاد شد');
    } catch (error) {
      toast.error('خطا در ایجاد گزارش');
    } finally {
      setIsGenerating(false);
    }
  };

  const reportTypes = [
    { value: 'ambassadors', label: 'گزارش سفیرها', icon: '👥', description: 'لیست کامل سفیرها با جزئیات' },
    { value: 'students', label: 'گزارش دانش‌آموزان', icon: '🎓', description: 'لیست کامل دانش‌آموزان' },
    { value: 'donors', label: 'گزارش اهداکنندگان', icon: '💝', description: 'لیست کامل اهداکنندگان' },
    { value: 'donations', label: 'گزارش اهداها', icon: '💰', description: 'لیست کامل اهداها با جزئیات' },
    { value: 'laptops', label: 'گزارش لپ‌تاپ‌ها', icon: '💻', description: 'لیست کامل لپ‌تاپ‌ها' },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 font-vazir">
          مدیریت گزارشات
        </h1>
        <p className="text-gray-600 text-sm font-vazir mt-1">
          تولید و دانلود گزارشات سیستم
        </p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-blue-100 flex items-center justify-center text-3xl">
                👥
              </div>
              <div>
                <p className="text-gray-600 text-sm font-vazir">سفیرها</p>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.totalAmbassadors || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-green-100 flex items-center justify-center text-3xl">
                🎓
              </div>
              <div>
                <p className="text-gray-600 text-sm font-vazir">دانش‌آموزان</p>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.totalStudents || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-purple-100 flex items-center justify-center text-3xl">
                💝
              </div>
              <div>
                <p className="text-gray-600 text-sm font-vazir">اهداکنندگان</p>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.totalDonors || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-orange-100 flex items-center justify-center text-3xl">
                💻
              </div>
              <div>
                <p className="text-gray-600 text-sm font-vazir">لپ‌تاپ‌ها</p>
                <p className="text-2xl font-bold text-gray-800">
                  {stats.totalLaptops || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Generator */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h2 className="text-xl font-bold text-gray-800 font-vazir mb-6">
          تولید گزارش
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {reportTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setReportType(type.value)}
              className={`p-6 rounded-xl border-2 transition-all text-right ${
                reportType === type.value
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{type.icon}</div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 font-vazir mb-1">
                    {type.label}
                  </h3>
                  <p className="text-sm text-gray-700 font-vazir">
                    {type.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className={`w-full py-4 rounded-lg font-vazir font-bold text-lg transition-colors ${
            isGenerating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              در حال تولید گزارش...
            </span>
          ) : (
            '📥 دانلود گزارش (CSV)'
          )}
        </button>
      </div>

      {/* Export Info */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-start gap-4">
          <div className="text-3xl">ℹ️</div>
          <div>
            <h3 className="font-bold text-gray-800 font-vazir mb-2">
              راهنمای استفاده
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 font-vazir">
              <li>• گزارش‌ها به صورت فایل CSV با پشتیبانی از زبان فارسی دانلود می‌شوند</li>
              <li>• برای باز کردن فایل در Excel، از گزینه "Data" → "From Text/CSV" استفاده کنید</li>
              <li>• گزارش‌ها شامل تمام داده‌های لحظه‌ای سیستم هستند</li>
              <li>• نام فایل شامل نوع گزارش و تاریخ تولید است</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;

