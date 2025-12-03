import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

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
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMerchantProfile = async (userId: string): Promise<MerchantProfile | null> => {
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

  const updateUserFromSession = async (currentSession: Session) => {
    const merchantProfile = await loadMerchantProfile(currentSession.user.id);
    setUser({
      id: currentSession.user.id,
      email: currentSession.user.email!,
      firstName: merchantProfile?.first_name || '',
      lastName: merchantProfile?.last_name || '',
      company: merchantProfile?.company_name || '',
      merchantProfile: merchantProfile || undefined,
    });
    localStorage.setItem('simulated_user_id', currentSession.user.id);
  };

  useEffect(() => {
    // Set up auth state listener FIRST (critical for proper auth flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Only synchronous state updates here - NO async Supabase calls!
        setSession(currentSession);
        
        if (event === 'SIGNED_OUT' || !currentSession) {
          setUser(null);
          localStorage.clear();
          setIsLoading(false);
          return;
        }

        if (currentSession?.user) {
          // Defer Supabase profile fetch with setTimeout to prevent deadlock
          setTimeout(() => {
            updateUserFromSession(currentSession).finally(() => {
              setIsLoading(false);
            });
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      if (existingSession?.user) {
        updateUserFromSession(existingSession).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    // Clear cached data before login
    localStorage.clear();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      throw new Error(error.message);
    }

    if (data.session) {
      setSession(data.session);
      await updateUserFromSession(data.session);
    }
  };

  const register = async (userData: RegisterData) => {
    // Clear cached data before registration
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
      console.error('Registration error:', authError);
      throw new Error(authError.message);
    }

    if (authData.user) {
      // Create merchant profile
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
        throw new Error('Failed to create merchant profile.');
      }

      if (authData.session) {
        setSession(authData.session);
        await updateUserFromSession(authData.session);
      }
    }
  };

  const logout = async () => {
    localStorage.clear();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      throw error;
    }
    setUser(null);
    setSession(null);
    navigate('/login');
  };

  const refreshAuth = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user) {
      await updateUserFromSession(currentSession);
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
    login,
    register,
    logout,
    refreshAuth,
    resetPassword,
  };
};
