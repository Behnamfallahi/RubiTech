import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';

const AddDonationModal = ({ onClose, onSuccess }) => {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm();

  const donationType = watch('type');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('http://localhost:4000/api/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data || []);
    } catch (error) {
      console.error('خطا در دریافت لیست دانشجویان');
    }
  };

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      const payload = {
        type: data.type,
        laptopName: data.laptopName || null,
        studentId: data.studentId || null,
        amount: data.amount ? parseFloat(data.amount) : null,
        experienceField: data.experienceField || null,
        details: data.details || null
      };

      await axios.post(
        'http://localhost:4000/api/donors/donations',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('اهدا با موفقیت ثبت شد');
      reset();
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error || 'خطا در ثبت اهدا');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-5 md:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 font-vazir">
              اضافه کردن اهدا
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl p-1 touch-manipulation"
            >
              ✕
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-6">
          {/* Donation Type */}
          <div>
            <label className="text-xs sm:text-sm text-gray-700 font-vazir mb-2 sm:mb-3 block">نوع اهدا *</label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
              {[
                { value: 'LAPTOP', label: 'اهدای لپ‌تاپ', icon: '💻' },
                { value: 'TEACHING', label: 'کمک آموزشی', icon: '📚' },
                { value: 'MONEY', label: 'کمک مالی', icon: '💰' }
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex flex-col items-center p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-colors touch-manipulation ${
                    donationType === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <input
                    {...register('type', { required: 'نوع اهدا الزامی است' })}
                    type="radio"
                    value={option.value}
                    className="sr-only"
                  />
                  <span className="text-xl sm:text-2xl mb-1 sm:mb-2">{option.icon}</span>
                  <span className="font-vazir text-xs sm:text-sm text-center">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.type && (
              <p className="text-red-500 text-xs mt-2 font-vazir">{errors.type.message}</p>
            )}
          </div>

          {/* Laptop Name - Show only for LAPTOP type */}
          {donationType === 'LAPTOP' && (
            <div>
              <label className="text-sm text-gray-700 font-vazir mb-2 block">نام/مدل لپ‌تاپ *</label>
              <input
                {...register('laptopName', {
                  required: donationType === 'LAPTOP' ? 'نام لپ‌تاپ الزامی است' : false
                })}
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir"
                placeholder="مثال: Dell Latitude 5520"
              />
              {errors.laptopName && (
                <p className="text-red-500 text-xs mt-2 font-vazir">{errors.laptopName.message}</p>
              )}
            </div>
          )}

          {/* Student Selection */}
          <div>
            <label className="text-sm text-gray-700 font-vazir mb-2 block">دانشجو (اختیاری)</label>
            <select
              {...register('studentId')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir"
            >
              <option value="">انتخاب دانشجو...</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} - {student.location}
                </option>
              ))}
            </select>
          </div>

          {/* Amount - Show only for MONEY type */}
          {donationType === 'MONEY' && (
            <div>
              <label className="text-sm text-gray-700 font-vazir mb-2 block">مبلغ (تومان) *</label>
              <input
                {...register('amount', {
                  required: donationType === 'MONEY' ? 'مبلغ الزامی است' : false,
                  min: { value: 1000, message: 'حداقل مبلغ 1000 تومان است' }
                })}
                type="number"
                min="1000"
                step="1000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir"
                placeholder="مثال: 1000000"
              />
              {errors.amount && (
                <p className="text-red-500 text-xs mt-2 font-vazir">{errors.amount.message}</p>
              )}
            </div>
          )}

          {/* Experience Field - Show only for TEACHING type */}
          {donationType === 'TEACHING' && (
            <div>
              <label className="text-sm text-gray-700 font-vazir mb-2 block">حوزه تخصص *</label>
              <input
                {...register('experienceField', {
                  required: donationType === 'TEACHING' ? 'حوزه تخصص الزامی است' : false
                })}
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir"
                placeholder="مثال: ریاضی، فیزیک، برنامه‌نویسی"
              />
              {errors.experienceField && (
                <p className="text-red-500 text-xs mt-2 font-vazir">{errors.experienceField.message}</p>
              )}
            </div>
          )}

          {/* Details */}
          <div>
            <label className="text-sm text-gray-700 font-vazir mb-2 block">توضیحات اضافی</label>
            <textarea
              {...register('details')}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-vazir"
              placeholder="هر توضیح اضافی که می‌خواهید..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200 sticky bottom-0 bg-white pb-safe">
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 py-3 sm:py-3.5 rounded-lg font-vazir font-bold transition-colors text-sm sm:text-base touch-manipulation active:scale-95 ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
              style={{ backgroundColor: isLoading ? undefined : '#10B981' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                  در حال ثبت...
                </span>
              ) : (
                'ثبت اهدا'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 sm:py-3.5 rounded-lg font-vazir font-bold transition-colors text-sm sm:text-base touch-manipulation active:scale-95"
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDonationModal;

