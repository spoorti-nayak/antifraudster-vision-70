-- Add user profile fields to merchants table
ALTER TABLE public.merchants
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON public.merchants(user_id);

-- Enable RLS on merchants table
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own merchant profile" ON public.merchants;
DROP POLICY IF EXISTS "Users can insert their own merchant profile" ON public.merchants;
DROP POLICY IF EXISTS "Users can update their own merchant profile" ON public.merchants;

-- Create RLS policies for merchants
CREATE POLICY "Users can view their own merchant profile"
ON public.merchants
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own merchant profile"
ON public.merchants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own merchant profile"
ON public.merchants
FOR UPDATE
USING (auth.uid() = user_id);