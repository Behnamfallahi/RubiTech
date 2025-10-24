import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';

const AdminLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      const response = await axios.post('http://localhost:4000/api/auth/admin-login', {
        email: data.email,
        password: data.password
      });
      
      if (!response.data || !response.data.token || !response.data.user) {
        toast.error('خطا در دریافت اطلاعات - لطفاً دوباره تلاش کنید');
        setIsLoading(false);
        return;
      }

      const { token, user } = response.data;
      
      // Check if role is admin (case-insensitive)
      if (user.role.toUpperCase() !== 'ADMIN') {
        toast.error('دسترسی غیر مجاز یا خطا');
        setIsLoading(false);
        return;
      }
      
      localStorage.setItem('authToken', token);
      localStorage.setItem('userType', user.role);
      localStorage.setItem('userName', user.name || 'ادمین');
      localStorage.setItem('userEmail', user.email || data.email);
      localStorage.setItem('userId', String(user.id));
      
      toast.success('ورود موفق!');
      
      setTimeout(() => {
        navigate('/admin/dashboard', { replace: true });
        setIsLoading(false);
      }, 500);
      
    } catch (error) {
      setIsLoading(false);
      if (error.response?.status === 403) {
        toast.error('دسترسی غیر مجاز یا خطا');
      } else if (error.response?.status === 401) {
        toast.error('ایمیل یا رمز عبور نادرست است');
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.request) {
        toast.error('خطا در اتصال به سرور');
      } else {
        toast.error('دسترسی غیر مجاز یا خطا');
      }
    }
  };

  return (
    <div className="min-h-screen bg-light-blue flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        <div className="text-center">
          <h2 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-bold text-gray-900 font-vazir">
            ورود به پنل ادمین
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 font-vazir">
            ایمیل و رمز ورود خود را وارد کنید
          </p>
        </div>
        
        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6 bg-white p-5 sm:p-8 rounded-xl shadow-lg" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 font-vazir mb-2 text-right">
              ایمیل *
            </label>
            <input
              {...register('email', { 
                required: 'ایمیل الزامی است',
                pattern: {
                  value: /^\S+@\S+\.\S+$/,
                  message: 'لطفاً ایمیل معتبر وارد کنید'
                }
              })}
              type="email"
              className="w-full px-4 py-3 sm:py-3.5 border border-light-blue rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue focus:border-blue font-vazir text-right text-sm sm:text-base"
              placeholder="admin@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs sm:text-sm text-red-500 font-vazir text-right">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 font-vazir mb-2 text-right">
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
                className="w-full px-4 py-3 sm:py-3.5 pr-12 border border-light-blue rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue focus:border-blue font-vazir text-right text-sm sm:text-base"
                placeholder="رمز ورود خود را وارد کنید"
              />
              <button
                type="button"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 touch-manipulation"
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
              <p className="mt-1 text-xs sm:text-sm text-red-500 font-vazir text-right">{errors.password.message}</p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-3.5 sm:py-4 px-4 border border-transparent text-sm sm:text-base font-medium rounded-xl text-white font-vazir transition-all duration-200 touch-manipulation active:scale-98 ${
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
                  در حال ورود...
                </div>
              ) : (
                'ورود به داشبورد'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;

