import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

const AdminSettings = () => {
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get('http://localhost:4000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data;
      if (Array.isArray(data)) {
        setUsers(data);
        setTotalUsers(data.length);
      } else {
        setUsers(data?.users || []);
        setTotalUsers(typeof data?.total === 'number' ? data.total : (data?.users?.length || 0));
      }
    } catch (error) {
      toast.error('خطا در دریافت لیست کاربران');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (data) => {
    try {
      const token = localStorage.getItem('authToken');
      
      await axios.post(
        'http://localhost:4000/api/admin/users',
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('کاربر با موفقیت اضافه شد');
      setShowAddUserModal(false);
      reset();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در افزودن کاربر');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('authToken');
      
      await axios.delete(
        `http://localhost:4000/api/admin/users/${selectedUser.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('کاربر با موفقیت حذف شد');
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'خطا در حذف کاربر');
    }
  };

  const getRoleBadge = (role) => {
    const roleMap = {
      ADMIN: { label: 'ادمین', color: 'bg-red-100 text-red-800' },
      AMBASSADOR: { label: 'سفیر', color: 'bg-blue-100 text-blue-800' },
      DONOR: { label: 'اهداکننده', color: 'bg-purple-100 text-purple-800' },
      STUDENT: { label: 'دانش‌آموز', color: 'bg-green-100 text-green-800' },
    };
    const roleInfo = roleMap[role] || roleMap.STUDENT;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-vazir ${roleInfo.color}`}>
        {roleInfo.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: { label: 'در انتظار', color: 'bg-yellow-100 text-yellow-800' },
      APPROVED: { label: 'تأیید شده', color: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'رد شده', color: 'bg-red-100 text-red-800' },
    };
    const statusInfo = statusMap[status] || statusMap.PENDING;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-vazir ${statusInfo.color}`}>
        {statusInfo.label}
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
              تنظیمات سیستم
            </h1>
            <p className="text-gray-600 text-sm font-vazir mt-1">
              مدیریت کاربران و تنظیمات کلی
            </p>
          </div>
          <button
            onClick={() => setShowAddUserModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-vazir transition-colors shadow-md"
          >
            ➕ افزودن کاربر
          </button>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-red-100 flex items-center justify-center text-3xl">
              👑
            </div>
            <div>
              <p className="text-gray-600 text-sm font-vazir">ادمین‌ها</p>
              <p className="text-2xl font-bold text-gray-800">
                {users.filter(u => u.role === 'ADMIN').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-blue-100 flex items-center justify-center text-3xl">
              👥
            </div>
            <div>
              <p className="text-gray-600 text-sm font-vazir">سفیرها</p>
              <p className="text-2xl font-bold text-gray-800">
                {users.filter(u => u.role === 'AMBASSADOR').length}
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
                {users.filter(u => u.role === 'DONOR').length}
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
                {users.filter(u => u.role === 'STUDENT').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 font-vazir">
              لیست کاربران
            </h2>
            <span className="text-gray-600 font-vazir">
              کل: {totalUsers.toLocaleString('fa-IR')}
            </span>
          </div>
        </div>
        
        {users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">شناسه</th>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">نام</th>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">ایمیل</th>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">نقش</th>
                  <th className="text-right py-4 px-6 font-vazir text-gray-800">وضعیت</th>
                  <th className="text-center py-4 px-6 font-vazir text-gray-800">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 font-vazir text-gray-800">#{user.id}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                          {user.name?.charAt(0) || '?'}
                        </div>
                        <p className="font-vazir font-bold text-gray-800">{user.name || '-'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-vazir text-gray-800">{user.email || '-'}</td>
                    <td className="py-4 px-6">{getRoleBadge(user.role)}</td>
                    <td className="py-4 px-6">{getStatusBadge(user.status)}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-vazir text-sm transition-colors shadow-sm"
                        >
                          حذف
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
            <div className="text-6xl mb-4">👤</div>
            <p className="text-gray-600 font-vazir text-lg">کاربری یافت نشد</p>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800 font-vazir">
                  افزودن کاربر جدید
                </h3>
                <button
                  onClick={() => {
                    setShowAddUserModal(false);
                    reset();
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit(handleAddUser)} className="p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-700 font-vazir mb-2 block">نام *</label>
                <input
                  {...register('name', { required: 'نام الزامی است' })}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir text-gray-800"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1 font-vazir">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-700 font-vazir mb-2 block">ایمیل *</label>
                <input
                  {...register('email', { 
                    required: 'ایمیل الزامی است',
                    pattern: {
                      value: /^\S+@\S+\.\S+$/,
                      message: 'فرمت ایمیل نامعتبر است'
                    }
                  })}
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1 font-vazir">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-700 font-vazir mb-2 block">رمز عبور *</label>
                <input
                  {...register('password', { 
                    required: 'رمز عبور الزامی است',
                    minLength: {
                      value: 6,
                      message: 'رمز عبور باید حداقل 6 کاراکتر باشد'
                    }
                  })}
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1 font-vazir">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-700 font-vazir mb-2 block">نقش *</label>
                <select
                  {...register('role', { required: 'نقش الزامی است' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir text-gray-800"
                >
                  <option value="">انتخاب کنید...</option>
                  <option value="ADMIN">ادمین</option>
                  <option value="AMBASSADOR">سفیر</option>
                  <option value="DONOR">اهداکننده</option>
                  <option value="STUDENT">دانش‌آموز</option>
                </select>
                {errors.role && (
                  <p className="text-red-500 text-xs mt-1 font-vazir">{errors.role.message}</p>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-vazir transition-colors shadow-sm"
                >
                  افزودن
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUserModal(false);
                    reset();
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 px-6 py-3 rounded-lg font-vazir transition-colors shadow-sm"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-gray-800 font-vazir mb-2">
                  حذف کاربر
                </h3>
                <p className="text-gray-600 font-vazir">
                  آیا از حذف کاربر <strong>{selectedUser.name}</strong> اطمینان دارید؟
                </p>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={handleDeleteUser}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-vazir transition-colors shadow-sm"
                >
                  حذف
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedUser(null);
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

export default AdminSettings;

