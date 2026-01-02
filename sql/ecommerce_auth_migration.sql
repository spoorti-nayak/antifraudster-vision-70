-- =====================================================
-- E-COMMERCE CUSTOMER SYSTEM WITH PROPER AUTH
-- Linked to Supabase Auth (auth.users)
-- Run this when the database is available
-- =====================================================

-- E-commerce Customer Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.ecommerce_customer_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  home_city TEXT,
  home_country TEXT DEFAULT 'India',
  trust_score INTEGER DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  total_transactions INTEGER DEFAULT 0,
  average_transaction_amount DECIMAL(10,2) DEFAULT 0,
  average_purchase_hour INTEGER DEFAULT 12,
  avg_time_to_buy_seconds INTEGER DEFAULT 300,
  is_blocked BOOLEAN DEFAULT false,
  customer_type TEXT DEFAULT 'regular',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- E-commerce Transactions table
CREATE TABLE IF NOT EXISTS public.ecommerce_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  fraud_score INTEGER DEFAULT 0 CHECK (fraud_score >= 0 AND fraud_score <= 100),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'flagged', 'blocked')),
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  case_label TEXT,
  time_to_buy_seconds INTEGER,
  purchase_hour INTEGER,
  ip_address TEXT,
  location_city TEXT,
  location_country TEXT,
  device_fingerprint TEXT,
  risk_factors JSONB DEFAULT '[]'::jsonb,
  ml_model_used TEXT DEFAULT 'rule_based',
  velocity_1h INTEGER DEFAULT 0,
  ip_risk TEXT DEFAULT 'low',
  device_new BOOLEAN DEFAULT false,
  chargeback_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ecommerce_customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecommerce_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ecommerce_customer_profiles
-- Customers can only view their own profile
CREATE POLICY "Customers can view own profile"
ON public.ecommerce_customer_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Customers can update their own profile
CREATE POLICY "Customers can update own profile"
ON public.ecommerce_customer_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Allow profile creation for new signups
CREATE POLICY "Users can create own profile"
ON public.ecommerce_customer_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ecommerce_transactions
-- Customers can only view their own transactions
CREATE POLICY "Customers can view own transactions"
ON public.ecommerce_transactions FOR SELECT
TO authenticated
USING (auth.uid() = customer_user_id);

-- Allow transaction insertion for authenticated users
CREATE POLICY "System can insert transactions"
ON public.ecommerce_transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = customer_user_id);

-- Update trigger for profiles (uses existing function if available)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ecommerce_profiles_updated_at') THEN
    CREATE TRIGGER update_ecommerce_profiles_updated_at
    BEFORE UPDATE ON public.ecommerce_customer_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ecommerce_profiles_user ON public.ecommerce_customer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_txns_customer ON public.ecommerce_transactions(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_txns_status ON public.ecommerce_transactions(status);
CREATE INDEX IF NOT EXISTS idx_ecommerce_txns_created ON public.ecommerce_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ecommerce_txns_fraud_score ON public.ecommerce_transactions(fraud_score DESC);

-- =====================================================
-- After running this migration, create demo users via the UI
-- or use the seed script below (requires running AFTER users sign up)
-- =====================================================
