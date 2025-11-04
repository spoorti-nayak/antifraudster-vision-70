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
    // Set up auth state listener - NEVER use async directly to avoid deadlocks
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Defer Supabase calls with setTimeout to avoid deadlock
        setTimeout(() => {
          loadMerchantProfile(session.user.id).then((profile) => {
            setUser({
              id: session.user.id,
              email: session.user.email!,
              firstName: profile?.first_name || '',
              lastName: profile?.last_name || '',
              company: profile?.company_name || '',
              merchantProfile: profile || undefined,
            });
            setIsLoading(false);
          });
        }, 0);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadMerchantProfile(session.user.id).then((profile) => {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            firstName: profile?.first_name || '',
            lastName: profile?.last_name || '',
            company: profile?.company_name || '',
            merchantProfile: profile || undefined,
          });
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const register = async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    company: string;
    password: string;
  }) => {
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

    const { error: profileError } = await supabase
      .from('merchants')
      .insert({
        name: userData.company,
        domain: '',
        user_id: authData.user.id,
        first_name: userData.firstName,
        last_name: userData.lastName,
        company_name: userData.company,
        email: userData.email,
      });

    if (profileError) throw profileError;
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