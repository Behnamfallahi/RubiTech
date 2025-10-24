import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminContracts = () => {
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedContract, setSelectedContract] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get('http://localhost:4000/api/admin/contracts', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setContracts(response.data || []);
    } catch (error) {
      toast.error('خطا در دریافت قراردادها');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveContract = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      
      await axios.put(
        `http://localhost:4000/api/admin/contracts/${id}`,
        { status: 'APPROVED' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('قرارداد تأیید شد');
      fetchContracts();
      setShowModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در تأیید قرارداد');
    }
  };

  const handleRejectContract = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      
      await axios.put(
        `http://localhost:4000/api/admin/contracts/${id}`,
        { status: 'REJECTED' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('قرارداد رد شد');
      fetchContracts();
      setShowModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در رد قرارداد');
    }
  };

  const handleDownloadContract = (contract) => {
    if (contract.pdfUrl) {
      window.open(`http://localhost:4000${contract.pdfUrl}`, '_blank');
    } else {
      toast.error('فایل PDF موجود نیست');
    }
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const matchesFilter = 
        filterStatus === 'ALL' || 
        (filterStatus === 'PENDING' && !contract.signedAt) ||
        (filterStatus === 'SIGNED' && contract.signedAt);

      return matchesFilter;
    });
  }, [contracts, filterStatus]);

  const getStatusBadge = (contract) => {
    if (contract.signedAt) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-vazir bg-green-100 text-green-800">
          امضا شده
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-vazir bg-yellow-100 text-yellow-800">
        در انتظار امضا
      </span>
    );
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
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 font-vazir">
              مدیریت قراردادها
            </h1>
            <p className="text-gray-600 text-sm font-vazir mt-1">
              مجموع {contracts.length} قرارداد
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-blue-100 flex items-center justify-center text-3xl">
              📄
            </div>
            <div>
              <p className="text-gray-600 text-sm font-vazir">کل قراردادها</p>
              <p className="text-2xl font-bold text-gray-800">{contracts.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-yellow-100 flex items-center justify-center text-3xl">
              ⏳
            </div>
            <div>
              <p className="text-gray-600 text-sm font-vazir">در انتظار امضا</p>
              <p className="text-2xl font-bold text-gray-800">
                {contracts.filter(c => !c.signedAt).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-green-100 flex items-center justify-center text-3xl">
              ✅
            </div>
            <div>
              <p className="text-gray-600 text-sm font-vazir">امضا شده</p>
              <p className="text-2xl font-bold text-gray-800">
                {contracts.filter(c => c.signedAt).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <div className="flex items-center gap-4">
          <label className="font-vazir text-gray-700">فیلتر وضعیت:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir text-gray-800"
          >
            <option value="ALL">همه</option>
            <option value="PENDING">در انتظار امضا</option>
            <option value="SIGNED">امضا شده</option>
          </select>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {filteredContracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">شناسه</th>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">کاربر</th>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">لپ‌تاپ</th>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">وضعیت</th>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">تاریخ امضا</th>
                  <th className="text-center py-4 px-6 font-vazir text-gray-800">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((contract) => (
                  <tr key={contract.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 font-vazir font-bold text-gray-800">
                      #{contract.id}
                    </td>
                    <td className="py-4 px-6 font-vazir text-gray-800">
                      کاربر #{contract.userId}
                    </td>
                    <td className="py-4 px-6 font-vazir text-gray-800">
                      {contract.laptopId ? `لپ‌تاپ #${contract.laptopId}` : '-'}
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(contract)}</td>
                    <td className="py-4 px-6 font-vazir text-gray-800">
                      {contract.signedAt 
                        ? new Date(contract.signedAt).toLocaleDateString('fa-IR')
                        : '-'
                      }
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedContract(contract);
                            setShowModal(true);
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-vazir text-sm transition-colors shadow-sm"
                        >
                          مشاهده
                        </button>
                        {contract.pdfUrl && (
                          <button
                            onClick={() => handleDownloadContract(contract)}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-vazir text-sm transition-colors shadow-sm"
                          >
                            📥 دانلود
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-gray-600 font-vazir text-lg">قراردادی یافت نشد</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-800 font-vazir">
                  جزئیات قرارداد
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 font-vazir">شناسه قرارداد</label>
                  <p className="font-vazir font-bold text-gray-800">#{selectedContract.id}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-vazir">کاربر</label>
                  <p className="font-vazir text-gray-800">کاربر #{selectedContract.userId}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-vazir">لپ‌تاپ</label>
                  <p className="font-vazir text-gray-800">
                    {selectedContract.laptopId ? `لپ‌تاپ #${selectedContract.laptopId}` : 'تخصیص نیافته'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-vazir">وضعیت</label>
                  <div className="mt-1">{getStatusBadge(selectedContract)}</div>
                </div>
                {selectedContract.signedAt && (
                  <div>
                    <label className="text-sm text-gray-600 font-vazir">تاریخ امضا</label>
                    <p className="font-vazir text-gray-800">
                      {new Date(selectedContract.signedAt).toLocaleDateString('fa-IR')}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-4 pt-4 border-t border-gray-200">
                {selectedContract.pdfUrl && (
                  <button
                    onClick={() => handleDownloadContract(selectedContract)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-vazir transition-colors"
                  >
                    📥 دانلود PDF
                  </button>
                )}
                {!selectedContract.signedAt && (
                  <>
                    <button
                      onClick={() => handleApproveContract(selectedContract.id)}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-vazir transition-colors"
                    >
                      ✓ تأیید
                    </button>
                    <button
                      onClick={() => handleRejectContract(selectedContract.id)}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-vazir transition-colors"
                    >
                      ✕ رد
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContracts;

