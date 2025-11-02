import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

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
  resetPassword: (email: string) => Promise<void>;
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

  const loadMerchantProfile = async (userId: string): Promise<MerchantProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error loading merchant profile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Check for existing auth session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const profile = await loadMerchantProfile(session.user.id);
          
          setUser({
            id: session.user.id,
            email: session.user.email!,
            firstName: profile?.first_name || '',
            lastName: profile?.last_name || '',
            company: profile?.company_name || '',
            merchantProfile: profile || undefined,
          });
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await loadMerchantProfile(session.user.id);
        
        setUser({
          id: session.user.id,
          email: session.user.email!,
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          company: profile?.company_name || '',
          merchantProfile: profile || undefined,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      if (data.user) {
        const profile = await loadMerchantProfile(data.user.id);
        
        setUser({
          id: data.user.id,
          email: data.user.email!,
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          company: profile?.company_name || '',
          merchantProfile: profile || undefined,
        });
      }
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
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
      
      // Sign up the user with proper email redirect
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            company_name: userData.company,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // Create merchant profile
      const { data: profileData, error: profileError } = await supabase
        .from('merchants')
        .insert({
          name: userData.company,
          domain: '', // Will be set up later during vendor integration
          user_id: authData.user.id,
          first_name: userData.firstName,
          last_name: userData.lastName,
          company_name: userData.company,
          email: userData.email,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      setUser({
        id: authData.user.id,
        email: authData.user.email!,
        firstName: profileData.first_name,
        lastName: profileData.last_name,
        company: profileData.company_name,
        merchantProfile: profileData,
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      navigate('/login');
    }
  };

  const refreshAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await loadMerchantProfile(session.user.id);
        
        setUser({
          id: session.user.id,
          email: session.user.email!,
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          company: profile?.company_name || '',
          merchantProfile: profile || undefined,
        });
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
      await logout();
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) throw error;
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshAuth,
    resetPassword,
  };
};