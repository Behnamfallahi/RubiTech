import React, { useState, useEffect } from 'react';
import { getStudents as apiGetStudents, addStudent as apiAddStudent, updateStudent as apiUpdateStudent, deleteStudent as apiDeleteStudent, getAmbassadorStatus } from '../../services/api';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

const AmbassadorStudents = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  // Helper: quick JWT expiry check to avoid sending expired tokens
  const isTokenExpired = (token) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const payload = JSON.parse(atob(parts[1]));
      if (!payload?.exp) return false;
      return Date.now() >= payload.exp * 1000;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    fetchStudents();
    // CHANGED: lightweight polling fallback for live updates
    const interval = setInterval(() => {
      fetchStudents();
    }, 50000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterStudents();
  }, [searchQuery, students]);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');

      if (!token) {
        toast.error('Missing authentication token');
        return;
      }

      // Debug logs to observe fetch flow
      console.log('[UI] Fetching students...');
      const data = await apiGetStudents(token);
      console.log('[UI] Students fetched =', data);

      if (data) {
        // Normalize to ensure fullName and city exist for UI usage
        const studentList = Array.isArray(data) ? data : (data.students || []);
        const normalized = studentList.map((s) => ({
          ...s,
          fullName: s.fullName || s.name,
          city: s.city || s.location,
        }));
        setStudents(normalized);
        setFilteredStudents(normalized);
      }
    } catch (error) {
      console.error('[UI] Error fetching students:', error);
      toast.error(error?.message || 'خطا در دریافت لیست دانش‌آموزان');
    } finally {
      setIsLoading(false);
    }
  };

  const filterStudents = () => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = students.filter(student =>
      student.fullName?.toLowerCase().includes(query) ||
      student.nationalId?.includes(query) ||
      student.city?.toLowerCase().includes(query) ||
      student.fatherName?.toLowerCase().includes(query)
    );
    setFilteredStudents(filtered);
  };

  const handleAddStudent = async () => {
    // Check verification status before allowing to add student
    try {
      const token = localStorage.getItem('authToken');
      const statusResp = await getAmbassadorStatus(token);
      console.log('Ambassador status check:', statusResp);
      const status = statusResp.status || localStorage.getItem('ambassadorStatus');

      if (status === 'pending' || status === 'unverified') {
        toast.error('لطفاً ابتدا احراز هویت خود را تکمیل کنید');
        // Redirect to verify page
        window.location.href = '/ambassador/verify';
        return;
      }

      if (status === 'verified') {
        // Already verified, allow adding student
        reset({});
        setShowAddModal(true);
      } else {
        toast.error('وضعیت احراز هویت نامشخص است');
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      // If API fails, check localStorage as fallback
      const localStatus = localStorage.getItem('ambassadorStatus');

      if (localStatus === 'pending' || localStatus === 'unverified' || !localStatus) {
        toast.error('لطفاً ابتدا احراز هویت خود را تکمیل کنید');
        window.location.href = '/ambassador/verify';
      } else if (localStatus === 'verified') {
        reset({});
        setShowAddModal(true);
      } else {
        toast.error('خطا در بررسی وضعیت احراز هویت');
      }
    }
  };

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    reset(student);
    setShowEditModal(true);
  };

  const handleDeleteStudent = async (student) => {
    // Confirmation dialog before delete
    if (!window.confirm(`آیا از حذف دانش‌آموز "${student.fullName}" اطمینان دارید؟`)) {
      return;
    }

    try {
      // Ensure we have a valid numeric ID before proceeding
      const id = Number(student?.id);
      console.log('[UI] Candidate student id for deletion =', id);
      if (!id || Number.isNaN(id)) {
        console.warn('[UI] Invalid student id');
        toast.error('Invalid student id');
        return;
      }

      // Read JWT token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('[UI] Missing auth token.');
        toast.error('Missing authentication token');
        return;
      }

      // Optional: client-side expiry check to avoid 401 round-trips
      if (isTokenExpired(token)) {
        console.warn('[UI] Auth token expired');
        toast.error('Session expired. Please log in again.');
        // Optionally redirect to login
        // window.location.href = '/login';
        return;
      }

      // Use shared API service which includes proper baseURL and headers
      await apiDeleteStudent(token, id);
      // Optimistic update: remove the deleted student locally without refetch
      setStudents(prev => prev.filter(s => s.id !== id));
      setFilteredStudents(prev => prev.filter(s => s.id !== id));
      toast.success('دانش‌آموز با موفقیت حذف شد');
    } catch (error) {
      // Extract useful error details for debugging and UX
      const status = error?.response?.status;
      const data = error?.response?.data;
      const errMsg = error?.message || data?.error || data?.message || 'خطا در حذف دانش‌آموز';
      console.error('[UI] DELETE error', { status, data, message: errMsg });
      toast.error(errMsg);
    }
  };

  const onSubmitAdd = async (data) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('authToken');

      // Map UI fields to backend schema
      const payload = {
        name: data.fullName || data.name,
        fatherName: data.fatherName,
        nationalId: data.nationalId,
        birthDate: data.birthDate,
        city: data.city,
        phoneNumber: data.phoneNumber,
        address: data.address,
      };

      const created = await apiAddStudent(token, { ...payload, location: data.city });
      if (created) {
        const createdStudent = created.student || created;
        const normalized = {
          ...createdStudent,
          fullName: createdStudent.fullName || createdStudent.name,
          city: createdStudent.city || createdStudent.location,
        };
        setStudents(prev => [...prev, normalized]);
        setShowAddModal(false);
        reset({});
        toast.success('دانش‌آموز با موفقیت اضافه شد');
      }
    } catch (error) {
      console.error('Error adding student:', error);
      const msg = error?.message || error?.error || error?.response?.data?.message || error?.response?.data?.error || 'خطا در افزودن دانش‌آموز';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmitEdit = async (data) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('authToken');

      const payload = {
        name: data.fullName || data.name,
        fatherName: data.fatherName,
        nationalId: data.nationalId,
        birthDate: data.birthDate,
        city: data.city,
        phoneNumber: data.phoneNumber,
        address: data.address,
      };

      const updated = await apiUpdateStudent(token, selectedStudent.id, { ...payload, location: data.city });
      if (updated) {
        const updatedStudent = updated.student || updated;
        const normalized = {
          ...updatedStudent,
          fullName: updatedStudent.fullName || updatedStudent.name,
          city: updatedStudent.city || updatedStudent.location,
        };
        setStudents(prev => prev.map(s => s.id === selectedStudent.id ? normalized : s));
        setShowEditModal(false);
        setSelectedStudent(null);
        reset({});
        toast.success('دانش‌آموز با موفقیت ویرایش شد');
      }
    } catch (error) {
      console.error('Error updating student:', error);
      const msg = error?.message || error?.error || error?.response?.data?.message || error?.response?.data?.error || 'خطا در ویرایش دانش‌آموز';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const StudentForm = ({ onSubmit, submitLabel }) => (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
            نام و نام خانوادگی *
          </label>
          <input
            {...register('fullName', {
              required: 'نام و نام خانوادگی الزامی است',
              minLength: { value: 2, message: 'حداقل 2 کاراکتر' }
            })}
            type="text"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
            placeholder="نام و نام خانوادگی"
          />
          {errors.fullName && (
            <p className="mt-1 text-sm text-red-500 font-vazir">{errors.fullName.message}</p>
          )}
        </div>

        {/* Father Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
            نام پدر *
          </label>
          <input
            {...register('fatherName', { required: 'نام پدر الزامی است' })}
            type="text"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
            placeholder="نام پدر"
          />
          {errors.fatherName && (
            <p className="mt-1 text-sm text-red-500 font-vazir">{errors.fatherName.message}</p>
          )}
        </div>

        {/* National ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
            کد ملی *
          </label>
          <input
            {...register('nationalId', {
              required: 'کد ملی الزامی است',
              pattern: {
                value: /^\d{10}$/,
                message: 'کد ملی باید 10 رقم باشد'
              }
            })}
            type="text"
            inputMode="numeric"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
            placeholder="0012345678"
          />
          {errors.nationalId && (
            <p className="mt-1 text-sm text-red-500 font-vazir">{errors.nationalId.message}</p>
          )}
        </div>

        {/* Birth Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
            تاریخ تولد *
          </label>
          <input
            {...register('birthDate', { required: 'تاریخ تولد الزامی است' })}
            type="text"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
            placeholder="1395/05/15"
          />
          {errors.birthDate && (
            <p className="mt-1 text-sm text-red-500 font-vazir">{errors.birthDate.message}</p>
          )}
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
            شهر محل سکونت *
          </label>
          <input
            {...register('city', { required: 'شهر الزامی است' })}
            type="text"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
            placeholder="تهران"
          />
          {errors.city && (
            <p className="mt-1 text-sm text-red-500 font-vazir">{errors.city.message}</p>
          )}
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
            شماره تماس *
          </label>
          <input
            {...register('phoneNumber', {
              required: 'شماره تماس الزامی است',
              pattern: {
                value: /^09\d{9}$/,
                message: 'شماره موبایل نامعتبر است'
              }
            })}
            type="tel"
            inputMode="numeric"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
            placeholder="09123456789"
          />
          {errors.phoneNumber && (
            <p className="mt-1 text-sm text-red-500 font-vazir">{errors.phoneNumber.message}</p>
          )}
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 font-vazir mb-2">
            آدرس
          </label>
          <textarea
            {...register('address')}
            rows="3"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
            placeholder="آدرس کامل محل سکونت"
          ></textarea>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-vazir font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              در حال ذخیره...
            </>
          ) : (
            <>
              <span>✓</span>
              {submitLabel}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowAddModal(false);
            setShowEditModal(false);
            reset({});
          }}
          disabled={isSaving}
          className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-vazir transition-colors"
        >
          انصراف
        </button>
      </div>
    </form>
  );

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
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 font-vazir">
              مدیریت دانش‌آموزان
            </h1>
            <p className="text-sm text-gray-600 font-vazir mt-1">
              {filteredStudents.length} دانش‌آموز
            </p>
          </div>
          <button
            onClick={handleAddStudent}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-vazir font-bold transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <span>➕</span>
            افزودن دانش‌آموز
          </button>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس نام، کد ملی، شهر یا نام پدر..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-vazir text-right"
            />
            <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {filteredStudents.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">نام و نام خانوادگی</th>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">کد ملی</th>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">نام پدر</th>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">شهر</th>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">تلفن</th>
                    <th className="text-right py-3 px-4 font-vazir text-gray-800 text-sm">وضعیت</th>
                    <th className="text-center py-3 px-4 font-vazir text-gray-800 text-sm">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-vazir text-gray-800 text-sm">
                        {student.fullName}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm font-vazir">
                        {student.nationalId}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm font-vazir">
                        {student.fatherName}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm font-vazir">
                        {student.city}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm font-vazir">
                        {student.phoneNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-vazir ${
                          student.status === 'approved' || student.status === 'verified'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {student.status === 'approved' || student.status === 'verified' ? 'تأیید شده' : 'در انتظار'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditStudent(student)}
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                            title="ویرایش"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            title="حذف"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y">
              {filteredStudents.map((student) => (
                <div key={student.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 font-vazir mb-1">
                        {student.fullName}
                      </h3>
                      <p className="text-sm text-gray-600 font-vazir">
                        کد ملی: {student.nationalId}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-vazir ${
                      student.status === 'approved' || student.status === 'verified'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {student.status === 'approved' || student.status === 'verified' ? 'تأیید' : 'انتظار'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 font-vazir space-y-1 mb-3">
                    <p>👤 نام پدر: {student.fatherName}</p>
                    <p>📍 شهر: {student.city}</p>
                    <p>📞 تلفن: {student.phoneNumber}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditStudent(student)}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-lg font-vazir text-sm transition-colors"
                    >
                      ✏️ ویرایش
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(student)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-lg font-vazir text-sm transition-colors"
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600 font-vazir mb-2">
              {searchQuery ? 'نتیجه‌ای یافت نشد' : 'هنوز دانش‌آموزی ثبت نشده است'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleAddStudent}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-vazir transition-colors"
              >
                افزودن اولین دانش‌آموز
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 font-vazir mb-6 flex items-center gap-2">
              <span>➕</span>
              افزودن دانش‌آموز جدید
            </h2>
            <StudentForm onSubmit={onSubmitAdd} submitLabel="افزودن دانش‌آموز" />
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 font-vazir mb-6 flex items-center gap-2">
              <span>✏️</span>
              ویرایش دانش‌آموز
            </h2>
            <StudentForm onSubmit={onSubmitEdit} submitLabel="ذخیره تغییرات" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AmbassadorStudents;


