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

  const loadMerchantProfile = async (userId: string, email: string) => {
    try {
      const { data: profileData, error: profileError } = await (supabase as any)
        .from('merchant_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error loading merchant profile:', profileError);
        return null;
      }

      return profileData as MerchantProfile;
    } catch (error) {
      console.error('Error in loadMerchantProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const merchantProfile = await loadMerchantProfile(session.user.id, session.user.email!);
          
          setUser({
            id: session.user.id,
            email: session.user.email!,
            firstName: merchantProfile?.first_name || '',
            lastName: merchantProfile?.last_name || '',
            company: merchantProfile?.company_name || '',
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const merchantProfile = await loadMerchantProfile(session.user.id, session.user.email!);
        
        setUser({
          id: session.user.id,
          email: session.user.email!,
          firstName: merchantProfile?.first_name || '',
          lastName: merchantProfile?.last_name || '',
          company: merchantProfile?.company_name || '',
          merchantProfile: merchantProfile || undefined,
        });
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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
        const merchantProfile = await loadMerchantProfile(data.user.id, data.user.email!);
        
        setUser({
          id: data.user.id,
          email: data.user.email!,
          firstName: merchantProfile?.first_name || '',
          lastName: merchantProfile?.last_name || '',
          company: merchantProfile?.company_name || '',
          merchantProfile: merchantProfile || undefined,
        });

        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await (supabase as any)
          .from('merchant_profiles')
          .insert({
            user_id: authData.user.id,
            first_name: userData.firstName,
            last_name: userData.lastName,
            company_name: userData.company,
            email: userData.email,
            api_key: `sk_live_${crypto.randomUUID().replace(/-/g, '')}`,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        navigate('/login');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const refreshAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const merchantProfile = await loadMerchantProfile(session.user.id, session.user.email!);
        
        setUser({
          id: session.user.id,
          email: session.user.email!,
          firstName: merchantProfile?.first_name || '',
          lastName: merchantProfile?.last_name || '',
          company: merchantProfile?.company_name || '',
          merchantProfile: merchantProfile || undefined,
        });
      }
    } catch (error) {
      console.error('Error refreshing auth:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
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
