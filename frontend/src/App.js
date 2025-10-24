import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import RegisterStudent from './components/RegisterStudent';
import StudentRegisterPage from './components/StudentRegisterPage';
import './App.css';
import AmbassadorRegisterPage from './components/AmbassadorRegisterPage';
import DonatorRegister from './components/DonatorRegister';
import Login from './components/Login';
import AdminLogin from './components/admin/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminAmbassadors from './components/admin/AdminAmbassadors';
import AdminStudents from './components/admin/AdminStudents';
import AdminDonors from './components/admin/AdminDonors';
import AdminLaptopsMap from './components/admin/AdminLaptopsMap';
import AdminContracts from './components/admin/AdminContracts';
import AdminReports from './components/admin/AdminReports';
import AdminSettings from './components/admin/AdminSettings';
import DonorDashboard from './components/donor/DonorDashboard';
import DonorLogin from './components/donor/DonorLogin';
import StudentLayout from './components/student/StudentLayout';
import StudentDashboard from './components/student/StudentDashboard';
import { 
  AmbassadorLayout, 
  AmbassadorDashboard, 
  AmbassadorVerify, 
  AmbassadorProfile, 
  AmbassadorStudents 
} from './components/ambassador';
import AmbassadorDonations from './components/ambassador/AmbassadorDonations';

function App() {
  return (
    <Router>
      <div className="App font-vazir" dir="rtl">
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              fontFamily: 'Vazir, sans-serif',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login/panel-8413" element={<AdminLogin />} />
          <Route path="/register-student" element={<RegisterStudent />} />
          <Route path="/student/register" element={<StudentRegisterPage />} />
          <Route path="/ambassador/register" element={<AmbassadorRegisterPage />} />
          <Route path="/register/donator" element={<DonatorRegister />} />
          
          {/* Donor Routes */}
          <Route path="/donor/login" element={<DonorLogin />} />
          <Route path="/donor-dashboard" element={<DonorDashboard />} />
          
          {/* Ambassador Routes */}
          <Route path="/ambassador" element={<AmbassadorLayout />}>
            <Route index element={<AmbassadorDashboard />} />
            <Route path="dashboard" element={<AmbassadorDashboard />} />
            <Route path="verify" element={<AmbassadorVerify />} />
            <Route path="profile" element={<AmbassadorProfile />} />
            <Route path="students" element={<AmbassadorStudents />} />
            <Route path="donations" element={<AmbassadorDonations />} />
          </Route>
          
          {/* Student Routes */}
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<StudentDashboard />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="courses" element={<StudentDashboard />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="ambassadors" element={<AdminAmbassadors />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="donors" element={<AdminDonors />} />
            <Route path="laptops" element={<AdminLaptopsMap />} />
            <Route path="contracts" element={<AdminContracts />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          
          {/* Catch all route */}
          <Route 
            path="*" 
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                  <h1 className="text-2xl font-bold text-gray-800 font-vazir mb-4">
                    صفحه یافت نشد
                  </h1>
                  <p className="text-gray-600 font-vazir mb-6">
                    صفحه‌ای که دنبال آن می‌گردید وجود ندارد
                  </p>
                  <button
                    onClick={() => window.location.href = '/'}
                    className="bg-orange text-white px-6 py-3 rounded-lg font-vazir hover:bg-yellow-500 transition-colors"
                  >
                    بازگشت به خانه
                  </button>
                </div>
              </div>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
