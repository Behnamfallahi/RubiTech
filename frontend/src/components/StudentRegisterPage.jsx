import React, { useState } from 'react';
// Removed calendar picker to unify with ambassador numeric DOB inputs
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { registerStudent, loginWithGoogle, loginWithFacebook } from '../services/api';
import toast from 'react-hot-toast';

const StudentRegisterPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [birthDateDay, setBirthDateDay] = useState('');
  const [birthDateMonth, setBirthDateMonth] = useState('');
  const [birthDateYear, setBirthDateYear] = useState('');
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    // watch, // Removed unused variable
    formState: { errors }
  } = useForm();

  // const password = watch('password'); // Removed unused variable

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      // Convert day/month/year to ISO date string YYYY-MM-DD for backend
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

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // Create popup window for OAuth simulation
      const popup = window.open('', 'googleAuth', 'width=500,height=600,scrollbars=yes,resizable=yes');
      
      if (!popup) {
        toast.error('پاپ‌آپ مسدود شده است. لطفاً مسدودکننده پاپ‌آپ را غیرفعال کنید.');
        setIsLoading(false);
        return;
      }

      // Simulate OAuth popup content
      popup.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <title>ورود با گوگل</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
            }
            .container { 
              max-width: 400px; 
              margin: 50px auto; 
              background: white; 
              color: #333; 
              padding: 40px; 
              border-radius: 15px; 
              box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            .logo { 
              width: 60px; 
              height: 60px; 
              margin: 0 auto 20px; 
              background: #4285F4; 
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 24px; 
              color: white;
            }
            .spinner { 
              width: 40px; 
              height: 40px; 
              border: 4px solid #f3f3f3; 
              border-top: 4px solid #4285F4; 
              border-radius: 50%; 
              animation: spin 1s linear infinite; 
              margin: 20px auto;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .success { color: #34A853; font-size: 18px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">G</div>
            <h2>در حال اتصال به گوگل...</h2>
            <div class="spinner"></div>
            <p>لطفاً صبر کنید...</p>
          </div>
        </body>
        </html>
      `);

      // Simulate authentication process
      setTimeout(() => {
        popup.document.body.innerHTML = `
          <div class="container">
            <div class="logo">✓</div>
            <h2 class="success">ورود موفق!</h2>
            <p>در حال انتقال...</p>
          </div>
        `;
      }, 1500);

      // Close popup and complete login
      setTimeout(() => {
        popup.close();
        localStorage.setItem('authToken', 'google_fake_token');
        localStorage.setItem('userType', 'STUDENT');
        toast.success('ورود با گوگل موفق!');
        navigate('/student/dashboard');
        setIsLoading(false);
      }, 2500);
    } catch (error) {
      toast.error('خطا در ورود با گوگل');
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    try {
      // Create popup window for OAuth simulation
      const popup = window.open('', 'facebookAuth', 'width=500,height=600,scrollbars=yes,resizable=yes');
      
      if (!popup) {
        toast.error('پاپ‌آپ مسدود شده است. لطفاً مسدودکننده پاپ‌آپ را غیرفعال کنید.');
        setIsLoading(false);
        return;
      }

      // Simulate OAuth popup content
      popup.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <title>ورود با فیسبوک</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: linear-gradient(135deg, #1877F2 0%, #42A5F5 100%);
              color: white;
              text-align: center;
            }
            .container { 
              max-width: 400px; 
              margin: 50px auto; 
              background: white; 
              color: #333; 
              padding: 40px; 
              border-radius: 15px; 
              box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            .logo { 
              width: 60px; 
              height: 60px; 
              margin: 0 auto 20px; 
              background: #1877F2; 
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 24px; 
              color: white;
            }
            .spinner { 
              width: 40px; 
              height: 40px; 
              border: 4px solid #f3f3f3; 
              border-top: 4px solid #1877F2; 
              border-radius: 50%; 
              animation: spin 1s linear infinite; 
              margin: 20px auto;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .success { color: #1877F2; font-size: 18px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">f</div>
            <h2>در حال اتصال به فیسبوک...</h2>
            <div class="spinner"></div>
            <p>لطفاً صبر کنید...</p>
          </div>
        </body>
        </html>
      `);

      // Simulate authentication process
      setTimeout(() => {
        popup.document.body.innerHTML = `
          <div class="container">
            <div class="logo">✓</div>
            <h2 class="success">ورود موفق!</h2>
            <p>در حال انتقال...</p>
          </div>
        `;
      }, 1500);

      // Close popup and complete login
      setTimeout(() => {
        popup.close();
        localStorage.setItem('authToken', 'facebook_fake_token');
        localStorage.setItem('userType', 'STUDENT');
        toast.success('ورود با فیسبوک موفق!');
        navigate('/student/dashboard');
        setIsLoading(false);
      }, 2500);
    } catch (error) {
      toast.error('خطا در ورود با فیسبوک');
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="md:col-span-2">
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 font-vazir mb-2 text-right">
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
                <p className="mt-1 text-sm text-red-500 font-vazir text-right">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 font-vazir mb-2 text-right">
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
                <p className="mt-1 text-sm text-red-500 font-vazir text-right">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 font-vazir mb-2 text-right">
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
                <p className="mt-1 text-sm text-red-500 font-vazir text-right">{errors.phone.message}</p>
              )}
            </div>

            {/* Father Name */}
            <div>
              <label htmlFor="fatherName" className="block text-sm font-medium text-gray-700 font-vazir mb-2 text-right">
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
              <label htmlFor="nationalId" className="block text-sm font-medium text-gray-700 font-vazir mb-2 text-right">
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
                <p className="mt-1 text-sm text-red-500 font-vazir text-right">{errors.nationalId.message}</p>
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
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 font-vazir mb-2 text-right">
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
              <label htmlFor="region" className="block text-sm font-medium text-gray-700 font-vazir mb-2 text-right">
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
            <div className="md:col-span-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 font-vazir mb-2 text-right">
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
                <p className="mt-1 text-sm text-red-500 font-vazir text-right">{errors.password.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 font-vazir text-right">حداقل 8 کاراکتر</p>
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

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500 font-vazir">یا</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Google Login */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-vazir font-medium transition-all duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                ورود با گوگل
              </button>

              {/* Facebook Login */}
              <button
                type="button"
                onClick={handleFacebookLogin}
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-vazir font-medium transition-all duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 ml-2" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                ورود با فیسبوک
              </button>
            </div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600 font-vazir">
              حساب دارید؟{' '}
              <button
                type="button"
                onClick={() => navigate('/login', { state: { from: 'student' } })}
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

export default StudentRegisterPage;