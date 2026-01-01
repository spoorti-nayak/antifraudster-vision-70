-- =====================================================
-- E-COMMERCE CUSTOMERS & TRANSACTIONS SCHEMA + SEED DATA
-- Run this in your local Supabase SQL editor
-- =====================================================

-- E-commerce Customers table (separate from merchant users)
CREATE TABLE IF NOT EXISTS public.ecommerce_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  country TEXT DEFAULT 'India',
  trust_score INTEGER DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  total_transactions INTEGER DEFAULT 0,
  average_transaction_amount DECIMAL(10,2) DEFAULT 0,
  average_purchase_hour INTEGER DEFAULT 12,
  is_blocked BOOLEAN DEFAULT false,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- E-commerce Customer Transactions table
CREATE TABLE IF NOT EXISTS public.ecommerce_customer_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.ecommerce_customers(id) ON DELETE CASCADE,
  order_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  fraud_score INTEGER DEFAULT 0 CHECK (fraud_score >= 0 AND fraud_score <= 100),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'flagged', 'blocked')),
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  purchase_hour INTEGER,
  ip_address TEXT,
  city TEXT,
  country TEXT,
  device_fingerprint TEXT,
  user_agent TEXT,
  risk_factors JSONB DEFAULT '[]'::jsonb,
  ml_model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ecommerce_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecommerce_customer_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ecommerce_customers
DROP POLICY IF EXISTS "Public can view non-sensitive customer data" ON public.ecommerce_customers;
CREATE POLICY "Public can view non-sensitive customer data"
ON public.ecommerce_customers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Customers can update their own profile" ON public.ecommerce_customers;
CREATE POLICY "Customers can update their own profile"
ON public.ecommerce_customers FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can create customer account" ON public.ecommerce_customers;
CREATE POLICY "Anyone can create customer account"
ON public.ecommerce_customers FOR INSERT WITH CHECK (true);

-- RLS Policies for transactions
DROP POLICY IF EXISTS "Authenticated can view all transactions" ON public.ecommerce_customer_transactions;
CREATE POLICY "Authenticated can view all transactions"
ON public.ecommerce_customer_transactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert transactions" ON public.ecommerce_customer_transactions;
CREATE POLICY "System can insert transactions"
ON public.ecommerce_customer_transactions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update transactions" ON public.ecommerce_customer_transactions;
CREATE POLICY "System can update transactions"
ON public.ecommerce_customer_transactions FOR UPDATE USING (true);

-- Update trigger for customers (uses existing function)
DROP TRIGGER IF EXISTS update_ecommerce_customers_updated_at ON public.ecommerce_customers;
CREATE TRIGGER update_ecommerce_customers_updated_at
BEFORE UPDATE ON public.ecommerce_customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ecommerce_customers_email ON public.ecommerce_customers(email);
CREATE INDEX IF NOT EXISTS idx_ecommerce_transactions_customer ON public.ecommerce_customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_transactions_status ON public.ecommerce_customer_transactions(status);
CREATE INDEX IF NOT EXISTS idx_ecommerce_transactions_created ON public.ecommerce_customer_transactions(created_at DESC);

-- =====================================================
-- SEED DATA: 5 E-commerce Customers with different risk profiles
-- =====================================================

-- Clear existing seed data (if re-running)
DELETE FROM public.ecommerce_customer_transactions WHERE customer_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);
DELETE FROM public.ecommerce_customers WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);

-- 1. TRUSTED REGULAR CUSTOMER (High trust, consistent patterns, low fraud scores)
INSERT INTO public.ecommerce_customers (id, email, name, phone, city, country, trust_score, total_transactions, average_transaction_amount, average_purchase_hour, password_hash)
VALUES ('11111111-1111-1111-1111-111111111111', 'priya.sharma@gmail.com', 'Priya Sharma', '+91-9876543210', 'Mumbai', 'India', 92, 45, 2500.00, 14, '$2a$10$trusted_user_hash_1');

-- 2. NEW CUSTOMER (No history, medium risk due to lack of data)
INSERT INTO public.ecommerce_customers (id, email, name, phone, city, country, trust_score, total_transactions, average_transaction_amount, average_purchase_hour, password_hash)
VALUES ('22222222-2222-2222-2222-222222222222', 'amit.kumar@yahoo.com', 'Amit Kumar', '+91-9123456789', 'Delhi', 'India', 45, 1, 0.00, 10, '$2a$10$new_user_hash_2');

-- 3. VELOCITY ABUSER (Multiple rapid transactions, suspicious patterns)
INSERT INTO public.ecommerce_customers (id, email, name, phone, city, country, trust_score, total_transactions, average_transaction_amount, average_purchase_hour, password_hash)
VALUES ('33333333-3333-3333-3333-333333333333', 'raj.patel@hotmail.com', 'Raj Patel', '+91-9988776655', 'Bangalore', 'India', 28, 12, 8500.00, 3, '$2a$10$velocity_user_hash_3');

-- 4. LOCATION HOPPER (Inconsistent locations, geo anomalies)
INSERT INTO public.ecommerce_customers (id, email, name, phone, city, country, trust_score, total_transactions, average_transaction_amount, average_purchase_hour, password_hash)
VALUES ('44444444-4444-4444-4444-444444444444', 'sneha.reddy@gmail.com', 'Sneha Reddy', '+91-9112233445', 'Chennai', 'India', 35, 8, 4200.00, 22, '$2a$10$hopper_user_hash_4');

-- 5. HIGH-VALUE BUYER (Large amounts, premium customer requiring review)
INSERT INTO public.ecommerce_customers (id, email, name, phone, city, country, trust_score, total_transactions, average_transaction_amount, average_purchase_hour, password_hash)
VALUES ('55555555-5555-5555-5555-555555555555', 'vikram.singh@outlook.com', 'Vikram Singh', '+91-9001122334', 'Hyderabad', 'India', 75, 15, 25000.00, 11, '$2a$10$premium_user_hash_5');

-- =====================================================
-- SEED DATA: 12 Transactions showing different fraud scenarios
-- =====================================================

-- CUSTOMER 1 (Trusted Regular) - 2 Normal approved transactions
INSERT INTO public.ecommerce_customer_transactions 
(customer_id, order_id, amount, fraud_score, status, risk_level, purchase_hour, ip_address, city, country, device_fingerprint, risk_factors, ml_model_used, created_at)
VALUES 
-- Transaction 1: Normal weekday purchase
('11111111-1111-1111-1111-111111111111', 'ORD-2024-001', 1999.00, 8, 'approved', 'low', 14, '103.21.125.45', 'Mumbai', 'India', 'fp_trusted_priya_001', '[]'::jsonb, 'ensemble_v2', now() - interval '7 days'),
-- Transaction 2: Slightly higher amount, still approved
('11111111-1111-1111-1111-111111111111', 'ORD-2024-002', 3499.00, 12, 'approved', 'low', 15, '103.21.125.45', 'Mumbai', 'India', 'fp_trusted_priya_001', '["Amount slightly above average"]'::jsonb, 'ensemble_v2', now() - interval '3 days');

-- CUSTOMER 2 (New Customer) - 2 First-time purchase scenarios
INSERT INTO public.ecommerce_customer_transactions 
(customer_id, order_id, amount, fraud_score, status, risk_level, purchase_hour, ip_address, city, country, device_fingerprint, risk_factors, ml_model_used, created_at)
VALUES 
-- Transaction 3: First purchase - flagged for review
('22222222-2222-2222-2222-222222222222', 'ORD-2024-003', 4999.00, 48, 'flagged', 'medium', 10, '49.36.128.77', 'Delhi', 'India', 'fp_new_amit_001', '["First-time customer", "Above average amount for new user", "No purchase history"]'::jsonb, 'ensemble_v2', now() - interval '1 day'),
-- Transaction 4: Second purchase after approval - lower score
('22222222-2222-2222-2222-222222222222', 'ORD-2024-004', 1299.00, 25, 'approved', 'low', 11, '49.36.128.77', 'Delhi', 'India', 'fp_new_amit_001', '["Building purchase history"]'::jsonb, 'ensemble_v2', now() - interval '12 hours');

-- CUSTOMER 3 (Velocity Abuser) - 3 Rapid transactions showing velocity attack
INSERT INTO public.ecommerce_customer_transactions 
(customer_id, order_id, amount, fraud_score, status, risk_level, purchase_hour, ip_address, city, country, device_fingerprint, risk_factors, ml_model_used, created_at)
VALUES 
-- Transaction 5: First suspicious transaction at 3 AM
('33333333-3333-3333-3333-333333333333', 'ORD-2024-005', 7999.00, 72, 'flagged', 'high', 3, '185.220.101.45', 'Bangalore', 'India', 'fp_velocity_raj_001', '["Unusual hour (3 AM)", "High transaction velocity: 5 txns in 10 min", "Amount 3x above user average"]'::jsonb, 'ensemble_v2', now() - interval '2 hours'),
-- Transaction 6: Blocked due to continued velocity abuse
('33333333-3333-3333-3333-333333333333', 'ORD-2024-006', 8999.00, 85, 'blocked', 'critical', 3, '185.220.101.45', 'Bangalore', 'India', 'fp_velocity_raj_001', '["Unusual hour (3 AM)", "CRITICAL: 6 transactions in 10 minutes", "Cumulative amount ₹25,000+ in 1 hour", "Pattern matches known velocity attack"]'::jsonb, 'ensemble_v2', now() - interval '1 hour'),
-- Transaction 7: Third attempt also blocked
('33333333-3333-3333-3333-333333333333', 'ORD-2024-007', 5999.00, 78, 'blocked', 'high', 4, '185.220.101.45', 'Bangalore', 'India', 'fp_velocity_raj_001', '["Consecutive blocked transactions", "Account flagged for velocity abuse", "Manual review required before unblock"]'::jsonb, 'ensemble_v2', now() - interval '30 minutes');

-- CUSTOMER 4 (Location Hopper) - 3 Transactions showing geo anomalies
INSERT INTO public.ecommerce_customer_transactions 
(customer_id, order_id, amount, fraud_score, status, risk_level, purchase_hour, ip_address, city, country, device_fingerprint, risk_factors, ml_model_used, created_at)
VALUES 
-- Transaction 8: Normal purchase from Chennai (home location)
('44444444-4444-4444-4444-444444444444', 'ORD-2024-008', 3299.00, 35, 'approved', 'medium', 22, '156.67.89.123', 'Chennai', 'India', 'fp_hopper_sneha_001', '["Late night purchase (10 PM)"]'::jsonb, 'ensemble_v2', now() - interval '5 days'),
-- Transaction 9: Suspicious - suddenly from Russia
('44444444-4444-4444-4444-444444444444', 'ORD-2024-009', 4599.00, 68, 'flagged', 'high', 23, '91.134.56.78', 'Moscow', 'Russia', 'fp_hopper_sneha_002', '["ALERT: Location change India → Russia", "High-risk country detected", "New device fingerprint", "Impossible travel: 6000km in 2 days"]'::jsonb, 'ensemble_v2', now() - interval '2 days'),
-- Transaction 10: Critical - now from Nigeria
('44444444-4444-4444-4444-444444444444', 'ORD-2024-010', 6799.00, 88, 'blocked', 'critical', 1, '103.45.67.89', 'Lagos', 'Nigeria', 'fp_hopper_sneha_003', '["CRITICAL: Location change Russia → Nigeria", "High-risk country (Nigeria)", "Impossible travel time: 5000km in 1 day", "Third different device in 5 days", "Account likely compromised"]'::jsonb, 'ensemble_v2', now() - interval '1 day');

-- CUSTOMER 5 (High-Value Buyer) - 2 Large legitimate purchases
INSERT INTO public.ecommerce_customer_transactions 
(customer_id, order_id, amount, fraud_score, status, risk_level, purchase_hour, ip_address, city, country, device_fingerprint, risk_factors, ml_model_used, created_at)
VALUES 
-- Transaction 11: High value but consistent with history - approved
('55555555-5555-5555-5555-555555555555', 'ORD-2024-011', 45999.00, 38, 'approved', 'medium', 11, '122.166.78.90', 'Hyderabad', 'India', 'fp_premium_vikram_001', '["High amount but consistent with purchase history", "Verified premium customer", "Same device and location as usual"]'::jsonb, 'ensemble_v2', now() - interval '10 days'),
-- Transaction 12: Very high value - flagged for manual review
('55555555-5555-5555-5555-555555555555', 'ORD-2024-012', 89999.00, 52, 'flagged', 'medium', 12, '122.166.78.90', 'Hyderabad', 'India', 'fp_premium_vikram_001', '["Unusually high amount: ₹89,999", "2x above customer average", "Manual verification recommended", "Premium customer - expedite review"]'::jsonb, 'ensemble_v2', now() - interval '1 day');

-- =====================================================
-- VERIFICATION QUERIES (run these to confirm data)
-- =====================================================
-- SELECT * FROM public.ecommerce_customers ORDER BY trust_score DESC;
-- SELECT c.name, t.order_id, t.amount, t.fraud_score, t.status, t.risk_level, t.risk_factors 
-- FROM public.ecommerce_customer_transactions t 
-- JOIN public.ecommerce_customers c ON t.customer_id = c.id 
-- ORDER BY t.fraud_score DESC;
