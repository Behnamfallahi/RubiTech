import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [laptops, setLaptops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLaptopId, setSelectedLaptopId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      const [studentsRes, laptopsRes] = await Promise.all([
        axios.get('http://localhost:4000/api/admin/students', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:4000/api/admin/laptops', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setStudents(studentsRes.data || []);
      setLaptops(laptopsRes.data || []);
    } catch (error) {
      toast.error('خطا در دریافت اطلاعات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignLaptop = async () => {
    if (!selectedStudent || !selectedLaptopId) {
      toast.error('لطفاً لپ‌تاپ را انتخاب کنید');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      
      await axios.patch(
        `http://localhost:4000/api/admin/students/${selectedStudent.id}`,
        { laptopId: parseInt(selectedLaptopId) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('لپ‌تاپ با موفقیت اختصاص داده شد');
      setShowAssignModal(false);
      setSelectedLaptopId('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در اختصاص لپ‌تاپ');
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch = 
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phoneNumber?.includes(searchTerm);

      return matchesSearch;
    });
  }, [students, searchTerm]);

  const availableLaptops = useMemo(() => {
    return laptops.filter(laptop => !laptop.studentId);
  }, [laptops]);

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
              مدیریت دانش‌آموزان
            </h1>
            <p className="text-gray-600 text-sm font-vazir mt-1">
              مجموع {students.length} دانش‌آموز
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-vazir transition-colors shadow-md">
            ➕ افزودن دانش‌آموز جدید
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <input
          type="text"
          placeholder="جستجو بر اساس نام، محل اقامت یا شماره تماس..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir text-gray-800"
        />
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">نام</th>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">محل اقامت</th>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">شماره تماس</th>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">لپ‌تاپ</th>
                  <th className="text-center py-4 px-6 font-vazir text-gray-800">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">
                          {student.name?.charAt(0)}
                        </div>
                        <p className="font-vazir font-bold text-gray-800">{student.name}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-vazir text-gray-800">{student.location || '-'}</td>
                    <td className="py-4 px-6 font-vazir text-gray-800">{student.phoneNumber || '-'}</td>
                    <td className="py-4 px-6">
                      {student.laptopId ? (
                        <span className="px-3 py-1 rounded-full text-xs font-vazir bg-green-100 text-green-800">
                          دارد
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-vazir bg-gray-100 text-gray-800">
                          ندارد
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowEditModal(true);
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-vazir text-sm transition-colors shadow-sm"
                        >
                          ویرایش
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowAssignModal(true);
                          }}
                          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-vazir text-sm transition-colors shadow-sm"
                        >
                          اختصاص لپ‌تاپ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎓</div>
            <p className="text-gray-600 font-vazir text-lg">دانش‌آموزی یافت نشد</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-800 font-vazir">
                  جزئیات دانش‌آموز
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 font-vazir">نام</label>
                  <p className="font-vazir font-bold text-gray-800">{selectedStudent.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-vazir">محل اقامت</label>
                  <p className="font-vazir text-gray-800">{selectedStudent.location || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-vazir">شماره تماس</label>
                  <p className="font-vazir text-gray-800">{selectedStudent.phoneNumber || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Laptop Modal */}
      {showAssignModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800 font-vazir">
                  اختصاص لپ‌تاپ
                </h3>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedLaptopId('');
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-600 font-vazir mb-2 block">
                  دانش‌آموز: {selectedStudent.name}
                </label>
              </div>
              
              <div>
                <label className="text-sm text-gray-600 font-vazir mb-2 block">
                  انتخاب لپ‌تاپ
                </label>
                <select
                  value={selectedLaptopId}
                  onChange={(e) => setSelectedLaptopId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir text-gray-800"
                >
                  <option value="">انتخاب کنید...</option>
                  {availableLaptops.map((laptop) => (
                    <option key={laptop.id} value={laptop.id}>
                      {laptop.laptopName || `لپ‌تاپ ${laptop.id}`} - {laptop.serialNumber}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 font-vazir mt-2">
                  {availableLaptops.length} لپ‌تاپ در دسترس
                </p>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleAssignLaptop}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-vazir transition-colors shadow-sm"
                >
                  اختصاص
                </button>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedLaptopId('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 px-6 py-3 rounded-lg font-vazir transition-colors shadow-sm"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudents;

