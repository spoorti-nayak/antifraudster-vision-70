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
  const [session, setSession] = useState<any>(null);
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
          setSession(session);
          setUser({
            id: session.user.id,
            email: session.user.email!,
            firstName: merchantProfile?.first_name || '',
            lastName: merchantProfile?.last_name || '',
            company: merchantProfile?.company_name || '',
            merchantProfile: merchantProfile || undefined,
          });
          // Store user ID in localStorage for data isolation
          localStorage.setItem('simulated_user_id', session.user.id);
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
        setSession(session);
        setUser({
          id: session.user.id,
          email: session.user.email!,
          firstName: merchantProfile?.first_name || '',
          lastName: merchantProfile?.last_name || '',
          company: merchantProfile?.company_name || '',
          merchantProfile: merchantProfile || undefined,
        });
        // Store user ID in localStorage for data isolation
        localStorage.setItem('simulated_user_id', session.user.id);
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        // Clear ALL local storage on logout
        localStorage.clear();
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      // Clear ALL cached data from previous session
      localStorage.clear();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setIsLoading(false);
        throw new Error(error.message || 'Login failed. Please check your credentials.');
      }

      if (data.user) {
        const merchantProfile = await loadMerchantProfile(data.user.id, data.user.email!);
        setSession(data.session);
        setUser({
          id: data.user.id,
          email: data.user.email!,
          firstName: merchantProfile?.first_name || '',
          lastName: merchantProfile?.last_name || '',
          company: merchantProfile?.company_name || '',
          merchantProfile: merchantProfile || undefined,
        });
        setIsLoading(false);
        navigate('/dashboard');
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Login error:', error);
      const errorMessage = error?.message || error?.error_description || 'Login failed. The authentication service is temporarily unavailable. Please try again.';
      throw new Error(errorMessage);
    }
  };

  const register = async (userData: RegisterData) => {
    setIsLoading(true);
    
    try {
      // Clear ALL existing cached data
      localStorage.clear();
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
          }
        }
      });

      if (authError) {
        setIsLoading(false);
        throw new Error(authError.message || 'Registration failed. Please try again.');
      }

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
          setIsLoading(false);
          console.error('Profile creation error:', profileError);
          throw new Error('Failed to create merchant profile. Please contact support.');
        }

        const merchantProfile = await loadMerchantProfile(authData.user.id, authData.user.email!);
        setSession(authData.session);
        setUser({
          id: authData.user.id,
          email: authData.user.email!,
          firstName: merchantProfile?.first_name || '',
          lastName: merchantProfile?.last_name || '',
          company: merchantProfile?.company_name || '',
          merchantProfile: merchantProfile || undefined,
        });
        setIsLoading(false);
        navigate('/dashboard');
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Registration error:', error);
      const errorMessage = error?.message || error?.error_description || 'Registration failed. The authentication service is temporarily unavailable. Please try again in a few moments.';
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      // Clear ALL local data on logout
      localStorage.clear();
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
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
