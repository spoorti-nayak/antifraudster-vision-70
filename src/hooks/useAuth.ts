import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';

interface MerchantProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  api_key: string;
  domain: string;
  webhook_url?: string;
  fraud_detection_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  merchantProfile?: MerchantProfile;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  password: string;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthProvider = (): AuthContextType => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMerchantProfile = async () => {
    try {
      const profile = await apiService.getVendorProfile();
      return profile as MerchantProfile;
    } catch (error) {
      console.error('Error in loadMerchantProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('user');
        
        if (token && userStr) {
          const userData = JSON.parse(userStr);
          const merchantProfile = await loadMerchantProfile();
          
          setUser({
            id: userData.id,
            email: userData.email,
            firstName: merchantProfile?.first_name || userData.first_name || '',
            lastName: merchantProfile?.last_name || userData.last_name || '',
            company: merchantProfile?.company_name || userData.company || '',
            merchantProfile: merchantProfile || undefined,
          });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.login(email, password);

      const merchantProfile = await loadMerchantProfile();
      
      setUser({
        id: response.user.id,
        email: response.user.email,
        firstName: merchantProfile?.first_name || response.user.first_name || '',
        lastName: merchantProfile?.last_name || response.user.last_name || '',
        company: merchantProfile?.company_name || response.user.company || '',
        merchantProfile: merchantProfile || undefined,
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error?.message || 'Login failed. Please check your credentials.';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      const response = await apiService.register(userData);

      const merchantProfile = await loadMerchantProfile();
      
      setUser({
        id: response.user.id,
        email: response.user.email,
        firstName: merchantProfile?.first_name || userData.firstName,
        lastName: merchantProfile?.last_name || userData.lastName,
        company: merchantProfile?.company_name || userData.company,
        merchantProfile: merchantProfile || undefined,
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error?.message || 'Registration failed. Please try again.';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const refreshAuth = async () => {
    try {
      await apiService.refreshToken();
      const merchantProfile = await loadMerchantProfile();
      const userStr = localStorage.getItem('user');
      
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser({
          id: userData.id,
          email: userData.email,
          firstName: merchantProfile?.first_name || userData.first_name || '',
          lastName: merchantProfile?.last_name || userData.last_name || '',
          company: merchantProfile?.company_name || userData.company || '',
          merchantProfile: merchantProfile || undefined,
        });
      }
    } catch (error) {
      console.error('Error refreshing auth:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Implement password reset via API
      await fetch('https://api.antifraudster.com/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  return {
    user,
    isLoading,
    login,
    register,
    logout,
    refreshAuth,
    resetPassword,
  };
};
