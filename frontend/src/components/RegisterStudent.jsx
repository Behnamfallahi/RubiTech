import React, { useState } from 'react';
// Unified DOB input style with ambassador (numeric fields)
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { registerStudent } from '../services/api';
import toast from 'react-hot-toast';

const RegisterStudent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [birthDateDay, setBirthDateDay] = useState('');
  const [birthDateMonth, setBirthDateMonth] = useState('');
  const [birthDateYear, setBirthDateYear] = useState('');
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      const birthDate = (data.birthDateDay && data.birthDateMonth && data.birthDateYear)
        ? `${String(data.birthDateYear).padStart(4, '0')}-${String(data.birthDateMonth).padStart(2, '0')}-${String(data.birthDateDay).padStart(2, '0')}`
        : '';

      const response = await registerStudent({
        fullName: data.fullName,
        email: data.email,
        fatherName: data.fatherName,
        nationalId: data.nationalId,
        birthDate,
        city: data.city,
        region: data.region,
        password: data.password,
        phone: data.phone || undefined
      });

      if (response.success) {
        // Store token and role for student panel access
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }
        localStorage.setItem('userType', 'STUDENT');
        if (response.student) {
          if (response.student.name) localStorage.setItem('userName', response.student.name);
          if (response.student.email) localStorage.setItem('userEmail', response.student.email);
          if (response.student.id) localStorage.setItem('userId', String(response.student.id));
        }

        toast.success('ثبت‌نام موفق! در حال ورود...');

        setTimeout(() => {
          navigate('/student/dashboard', { replace: true });
        }, 500);
      }
    } catch (error) {
      const errorMessage = error.message || error.response?.data?.message || 'خطا در ثبت‌نام';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light-blue flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900 font-vazir">
            ثبت‌نام دانشجو
          </h2>
          <p className="mt-2 text-sm text-gray-600 font-vazir">
            اطلاعات خود را با دقت وارد کنید
          </p>
        </div>
        
        <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 font-vazir mb-2">
                نام و نام خانوادگی *
              </label>
              <input
                {...register('fullName', { 
                  required: 'نام و نام خانوادگی الزامی است',
                  minLength: {
                    value: 2,
                    message: 'نام باید حداقل 2 کاراکتر باشد'
                  }
                })}
                type="text"
                className="w-full px-4 py-3 border border-light-blue rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue focus:border-blue font-vazir text-right"
                placeholder="نام و نام خانوادگی خود را وارد کنید"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-500 font-vazir">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 font-vazir mb-2">
                ایمیل
              </label>
              <input
                {...register('email', {
                  validate: (v) => !v || /^\S+@\S+\.\S+$/.test(v) || 'فرمت ایمیل نامعتبر است'
                })}
                type="email"
                className="w-full px-4 py-3 border border-light-blue rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue focus:border-blue font-vazir text-right"
                placeholder="example@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500 font-vazir">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 font-vazir mb-2">
                شماره موبایل
              </label>
              <input
                {...register('phone', {
                  validate: (v) => !v || /^09\d{9}$/.test(v) || 'شماره موبایل نامعتبر است'
                })}
                type="tel"
                inputMode="numeric"
                className="w-full px-4 py-3 border border-light-blue rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue focus:border-blue font-vazir text-right"
                placeholder="09123456789"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-500 font-vazir">{errors.phone.message}</p>
              )}
            </div>

            {/* Father Name */}
            <div>
              <label htmlFor="fatherName" className="block text-sm font-medium text-gray-700 font-vazir mb-2">
                نام پدر
              </label>
              <input
                {...register('fatherName')}
                type="text"
                className="w-full px-4 py-3 border border-light-blue rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue focus:border-blue font-vazir text-right"
                placeholder="نام پدر خود را وارد کنید"
              />
            </div>

            {/* National ID */}
            <div>
              <label htmlFor="nationalId" className="block text-sm font-medium text-gray-700 font-vazir mb-2">
                کد ملی
              </label>
              <input
                {...register('nationalId', {
                  pattern: {
                    value: /^\d{10}$/,
                    message: 'کد ملی باید 10 رقم باشد'
                  }
                })}
                type="text"
                maxLength="10"
                className="w-full px-4 py-3 border border-light-blue rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue focus:border-blue font-vazir text-right"
                placeholder="1234567890"
              />
              {errors.nationalId && (
                <p className="mt-1 text-sm text-red-500 font-vazir">{errors.nationalId.message}</p>
              )}
            </div>

            {/* Birth Date (numeric like ambassador) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 font-vazir mb-2 text-right">تاریخ تولد (شمسی)</label>
              <div className="grid grid-cols-3 gap-3">
                <input
                  {...register('birthDateDay', {
                    validate: (v) => !v || (Number(v) >= 1 && Number(v) <= 31) || 'عدد بین ۱ تا ۳۱'
                  })}
                  type="number"
                  className="w-full px-4 py-3 border border-light-blue rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue focus:border-blue font-vazir text-right"
                  placeholder="روز"
                />
                <input
                  {...register('birthDateMonth', {
                    validate: (v) => !v || (Number(v) >= 1 && Number(v) <= 12) || 'عدد بین ۱ تا ۱۲'
                  })}
                  type="number"
                  className="w-full px-4 py-3 border border-light-blue rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue focus:border-blue font-vazir text-right"
                  placeholder="ماه"
                />
                <input
                  {...register('birthDateYear', {
                    validate: (v) => !v || (String(v).length === 4 && Number(v) >= 1300 && Number(v) <= 1500) || 'سال نامعتبر'
                  })}
                  type="number"
                  className="w-full px-4 py-3 border border-light-blue rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue focus:border-blue font-vazir text-right"
                  placeholder="سال"
                />
              </div>
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 font-vazir mb-2">
                شهر
              </label>
              <input
                {...register('city')}
                type="text"
                className="w-full px-4 py-3 border border-light-blue rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue focus:border-blue font-vazir text-right"
                placeholder="شهر خود را وارد کنید"
              />
            </div>

            {/* Region */}
            <div>
              <label htmlFor="region" className="block text-sm font-medium text-gray-700 font-vazir mb-2">
                منطقه
              </label>
              <input
                {...register('region')}
                type="text"
                className="w-full px-4 py-3 border border-light-blue rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue focus:border-blue font-vazir text-right"
                placeholder="منطقه خود را وارد کنید"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 font-vazir mb-2">
                رمز ورود *
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'رمز ورود الزامی است',
                    minLength: {
                      value: 8,
                      message: 'رمز ورود باید حداقل 8 کاراکتر باشد'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3 pr-12 border border-light-blue rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue focus:border-blue font-vazir text-right"
                  placeholder="رمز ورود خود را وارد کنید"
                />
                <button
                  type="button"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500 font-vazir">{errors.password.message}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white font-vazir transition-all duration-200 ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue shadow-lg hover:shadow-xl'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  در حال ثبت‌نام...
                </div>
              ) : (
                'ثبت‌نام'
              )}
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600 font-vazir">
              حساب دارید؟{' '}
              <button
                type="button"
                onClick={() => navigate('/login', { state: { from: 'register-student' } })}
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
              >
                وارد شوید
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterStudent;
