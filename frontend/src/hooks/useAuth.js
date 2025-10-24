import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useAuth = (requiredRole = null) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      const role = localStorage.getItem('userType');
      const userName = localStorage.getItem('userName');
      const userEmail = localStorage.getItem('userEmail');
      const userId = localStorage.getItem('userId');

      if (!token) {
        setIsLoading(false);
        navigate('/login', { replace: true });
        return;
      }

      if (requiredRole && role !== requiredRole) {
        setIsLoading(false);
        navigate('/login', { replace: true });
        return;
      }

      setUser({
        id: userId,
        name: userName,
        email: userEmail,
        role: role
      });
      setIsLoading(false);
    };

    checkAuth();
  }, [requiredRole, navigate]);

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userType');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    setUser(null);
    navigate('/login', { replace: true });
  };

  return { user, isLoading, logout };
};
