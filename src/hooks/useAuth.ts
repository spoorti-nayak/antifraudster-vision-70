import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '@/services/api';
import webSocketService from '@/services/websocket';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  role: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    company: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthProvider = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing auth on mount
    const token = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        webSocketService.updateToken(token);
        // Connect WebSocket in a non-blocking way
        try {
          webSocketService.connect();
        } catch (wsError) {
          console.warn('WebSocket connection failed during initialization:', wsError);
        }
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.login(email, password);
      setUser(response.user);
      
      // Start WebSocket connection
      webSocketService.updateToken(response.token);
      try {
        webSocketService.connect();
      } catch (wsError) {
        console.warn('WebSocket connection failed during login:', wsError);
      }
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    company: string;
    password: string;
  }) => {
    try {
      setIsLoading(true);
      const response = await apiService.register(userData);
      setUser(response.user);
      
      // Start WebSocket connection
      webSocketService.updateToken(response.token);
      try {
        webSocketService.connect();
      } catch (wsError) {
        console.warn('WebSocket connection failed during registration:', wsError);
      }
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      webSocketService.disconnect();
      navigate('/login');
    }
  };

  const refreshAuth = async () => {
    try {
      await apiService.refreshToken();
      // Token is automatically updated in apiService
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, logout user
      await logout();
    }
  };

  // Auto-refresh token
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        refreshAuth();
      }, 15 * 60 * 1000); // Refresh every 15 minutes

      return () => clearInterval(interval);
    }
  }, [user]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshAuth,
  };
};