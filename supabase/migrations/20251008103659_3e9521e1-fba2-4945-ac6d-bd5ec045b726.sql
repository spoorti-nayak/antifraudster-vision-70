-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum types for better data integrity
CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'blocked', 'flagged');
CREATE TYPE fraud_risk_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE transaction_type AS ENUM ('purchase', 'refund', 'chargeback');

-- Merchants/E-commerce sites table
CREATE TABLE public.merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  domain TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions table - stores all payment transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE NOT NULL,
  
  -- Transaction details
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  transaction_type transaction_type DEFAULT 'purchase',
  status payment_status DEFAULT 'pending',
  
  -- Customer information
  customer_email TEXT NOT NULL,
  customer_ip TEXT NOT NULL,
  customer_device TEXT,
  customer_location JSONB, -- {country, city, lat, lng}
  
  -- Payment details
  payment_method TEXT, -- card, paypal, crypto, etc.
  card_last4 TEXT,
  card_bin TEXT, -- First 6 digits
  
  -- Fraud analysis
  fraud_score DECIMAL(5, 2) DEFAULT 0, -- 0-100 scale
  risk_level fraud_risk_level DEFAULT 'low',
  fraud_reasons JSONB, -- Array of reasons for flagging
  
  -- Metadata
  metadata JSONB, -- Additional custom fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fraud patterns table - ML learns from this
CREATE TABLE public.fraud_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_type TEXT NOT NULL, -- velocity, location_mismatch, amount_spike, etc.
  pattern_data JSONB NOT NULL,
  weight DECIMAL(3, 2) DEFAULT 1.0, -- Impact weight on fraud score
  is_active BOOLEAN DEFAULT true,
  detected_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Customer risk profiles - tracks customer behavior
CREATE TABLE public.customer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  
  -- Behavioral stats
  total_transactions INTEGER DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  average_transaction DECIMAL(10, 2) DEFAULT 0,
  flagged_count INTEGER DEFAULT 0,
  blocked_count INTEGER DEFAULT 0,
  
  -- Risk assessment
  trust_score DECIMAL(5, 2) DEFAULT 50, -- 0-100, starts neutral
  risk_level fraud_risk_level DEFAULT 'low',
  
  -- Location history
  known_ips JSONB, -- Array of known IPs
  known_locations JSONB, -- Array of known locations
  
  -- Device fingerprinting
  known_devices JSONB, -- Array of device fingerprints
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fraud alerts for real-time monitoring
CREATE TABLE public.fraud_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE,
  
  alert_type TEXT NOT NULL,
  severity fraud_risk_level NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Blocklist for known fraudsters
CREATE TABLE public.blocklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_type TEXT NOT NULL, -- email, ip, card_bin, device
  block_value TEXT NOT NULL,
  reason TEXT NOT NULL,
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE,
  
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(block_type, block_value, merchant_id)
);

-- ML training data for model improvement
CREATE TABLE public.ml_training_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  
  features JSONB NOT NULL, -- Extracted features for ML
  label BOOLEAN NOT NULL, -- true = fraud, false = legitimate
  confidence DECIMAL(5, 2), -- Model confidence
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_transactions_merchant ON public.transactions(merchant_id);
CREATE INDEX idx_transactions_email ON public.transactions(customer_email);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX idx_customer_profiles_email ON public.customer_profiles(email);
CREATE INDEX idx_fraud_alerts_merchant ON public.fraud_alerts(merchant_id);
CREATE INDEX idx_fraud_alerts_created ON public.fraud_alerts(created_at DESC);
CREATE INDEX idx_blocklist_value ON public.blocklist(block_value);

-- Enable Row Level Security
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_training_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Public API access (will use API keys for auth)
CREATE POLICY "Public read merchants" ON public.merchants FOR SELECT USING (true);
CREATE POLICY "Public insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Public update transactions" ON public.transactions FOR UPDATE USING (true);
CREATE POLICY "Public read fraud_patterns" ON public.fraud_patterns FOR SELECT USING (true);
CREATE POLICY "Public all customer_profiles" ON public.customer_profiles FOR ALL USING (true);
CREATE POLICY "Public read fraud_alerts" ON public.fraud_alerts FOR SELECT USING (true);
CREATE POLICY "Public insert fraud_alerts" ON public.fraud_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read blocklist" ON public.blocklist FOR SELECT USING (true);
CREATE POLICY "Public insert ml_training" ON public.ml_training_data FOR INSERT WITH CHECK (true);

-- Trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER merchants_updated_at BEFORE UPDATE ON public.merchants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER customer_profiles_updated_at BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert default fraud patterns
INSERT INTO public.fraud_patterns (pattern_type, pattern_data, weight) VALUES
  ('velocity_check', '{"max_transactions_per_hour": 5, "max_amount_per_hour": 1000}', 1.5),
  ('amount_anomaly', '{"threshold_multiplier": 3}', 1.3),
  ('location_mismatch', '{"max_distance_km": 500}', 1.2),
  ('new_customer_high_value', '{"threshold_amount": 500}', 1.1),
  ('unusual_time', '{"suspicious_hours": [0, 1, 2, 3, 4, 5]}', 0.8),
  ('card_bin_check', '{"known_fraud_bins": []}', 2.0);

-- Enable realtime for fraud alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.fraud_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;