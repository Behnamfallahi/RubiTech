import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:4000',
  timeout: 5000,
});

// Attach auth token automatically if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token && !config.headers?.Authorization) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Mock data for offline development
const mockMapLocations = [
  { lat: 35.6892, lng: 51.3890, studentName: 'علی احمدی' },
  { lat: 29.5917, lng: 52.5833, studentName: 'مریم کریمی' },
  { lat: 38.0800, lng: 46.2919, studentName: 'حسین رضایی' },
  { lat: 31.8974, lng: 54.3569, studentName: 'فاطمه محمدی' },
  { lat: 36.5659, lng: 53.0586, studentName: 'محمد صادقی' },
  { lat: 32.6539, lng: 51.6660, studentName: 'زهرا حسینی' },
  { lat: 37.4482, lng: 49.3856, studentName: 'امیر تقوی' },
  { lat: 34.6401, lng: 50.8764, studentName: 'سارا نوری' },
];

// API functions
export const getMapLocations = async () => {
  try {
    // Try to fetch from real API first
    const response = await api.get('/map-locations');
    return response.data;
  } catch (error) {
    // Fallback to mock data if API is not available
    console.log('Using mock data for map locations');
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockMapLocations), 500); // Simulate network delay
    });
  }
};

// Student locations for homepage map dots
// Expected shape from backend: [{ id, lat, lng, color: 'blue' | 'green' }]
export const getStudentLocations = async () => {
  try {
    const response = await api.get('/api/students/locations');
    const list = Array.isArray(response.data) ? response.data : [];
    return list
      .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number')
      .map((p, idx) => ({
        id: p.id ?? idx,
        lat: p.lat,
        lng: p.lng,
        color: p.color === 'green' ? 'green' : 'blue',
      }));
  } catch (error) {
    // Safe fallback: reuse getMapLocations and map to default blue dots
    try {
      const fallback = await getMapLocations();
      return (Array.isArray(fallback) ? fallback : []).map((p, idx) => ({
        id: idx,
        lat: p.lat,
        lng: p.lng,
        color: 'blue',
      }));
    } catch (_) {
      return [];
    }
  }
};

// Student registration
export const registerStudent = async (studentData) => {
  try {
    const response = await api.post('/api/student/register', studentData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Ambassador registration
export const registerAmbassador = async (ambassadorData) => {
  try {
    const response = await api.post('/api/ambassador/register', ambassadorData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const registerDonator = async (donatorData) => {
  try {
    const response = await api.post('/api/donor/register', donatorData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Social login functions
export const loginWithGoogle = async (userData) => {
  try {
    const response = await api.post('/auth/google', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const loginWithFacebook = async (userData) => {
  try {
    const response = await api.post('/auth/facebook', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Ambassador API functions
export const getAmbassadorProfile = async (token) => {
  try {
    const response = await api.get('/api/ambassadors/profile', token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const updateAmbassadorProfile = async (token, profileData) => {
  try {
    const response = await api.put('/api/ambassadors/profile', profileData, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const submitAmbassadorVerification = async (token, formData) => {
  try {
    const response = await api.post('/api/ambassadors/verify', formData, token ? { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } } : { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const downloadContract = async (token, ambassadorId) => {
  try {
    const url = `/api/contract/download/${ambassadorId}`;
    const response = await api.get(url, token ? { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' } : { responseType: 'blob' });
    return response.data; // Blob
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const uploadSignedContract = async (token, ambassadorId, file, onUploadProgress) => {
  try {
    const form = new FormData();
    form.append('pdf', file);
    const url = `/api/contract/upload/${ambassadorId}`;
    const response = await api.post(url, form, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getAmbassadorStatusById = async (token, ambassadorId) => {
  try {
    const response = await api.get(`/api/ambassador/status/${ambassadorId}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    // Normalize for both shapes: either { status: 'verified' } or { verified: boolean }
    const data = response.data || {};
    return {
      ...data,
      verified: typeof data.verified === 'boolean' ? data.verified : (data.status === 'verified')
    };
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getAmbassadorStats = async (token) => {
  try {
    const response = await api.get('/api/ambassadors/stats', token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Student API functions (for ambassadors)
// CHANGED: Scope to ambassador-owned students endpoint
export const getStudents = async (token, params = {}) => {
  try {
    const options = { params };
    if (token) options.headers = { Authorization: `Bearer ${token}` };
    const response = await api.get('/ambassador/students', options);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// CHANGED: Ambassador add student (auto-bound server-side)
export const addStudent = async (token, studentData) => {
  try {
    const response = await api.post('/ambassador/students', studentData, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// CHANGED: Ambassador update student (ownership enforced server-side)
export const updateStudent = async (token, studentId, studentData) => {
  try {
    const response = await api.put(`/ambassador/students/${studentId}`, studentData, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// CHANGED: Ambassador delete student (ownership enforced server-side)
export const deleteStudent = async (token, studentId) => {
  try {
    const response = await api.delete(`/ambassador/students/${studentId}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// ADDED: Ambassador change password
export const changeAmbassadorPassword = async (token, { oldPassword, newPassword }) => {
  try {
    const response = await api.post('/api/ambassadors/change-password', { oldPassword, newPassword }, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Ambassador status check
export const getAmbassadorStatus = async (token) => {
  try {
    const response = await api.get('/api/ambassadors/status', token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Donations API functions
export const getDonations = async (token, params = {}) => {
  try {
    const response = await api.get('/api/donations', {
      headers: { Authorization: `Bearer ${token}` },
      params
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Admin - donors management
export const getAdminDonors = async (token) => {
  try {
    const response = await api.get('/api/admin/donors', token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const updateAdminDonor = async (token, donorId, data) => {
  try {
    const response = await api.put(`/api/admin/donors/${donorId}`, data, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const deleteAdminDonor = async (token, donorId) => {
  try {
    const response = await api.delete(`/api/admin/donors/${donorId}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export default api;

// Student panel API
export const getStudentProfile = async (token, options = {}) => {
  try {
    // Merge caller-provided options (e.g. { signal }) with auth header for student panel
    const config = { ...options };
    config.headers = {
      ...(options?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const response = await api.get('/api/student/profile', config);
    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // Log full server error to help diagnose student panel issues only
      // eslint-disable-next-line no-console
      console.error('[getStudentProfile] error:', error?.response?.data || error);
    }
    throw error.response?.data || error;
  }
};

export const getStudentCourses = async (token, params = {}) => {
  try {
    const options = { params };
    if (token) options.headers = { Authorization: `Bearer ${token}` };
    const response = await api.get('/api/student/courses', options);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const uploadCourseCertificate = async (token, courseId, file) => {
  try {
    const form = new FormData();
    form.append('certificate', file);
    const response = await api.post(`/api/student/courses/${courseId}/certificate`, form, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
