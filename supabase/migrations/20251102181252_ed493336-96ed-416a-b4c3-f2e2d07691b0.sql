-- Add webhook_url column to merchants table for production webhook support
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.merchants.webhook_url IS 'URL endpoint where fraud alerts will be sent via webhook';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_merchants_webhook_url ON public.merchants(webhook_url) WHERE webhook_url IS NOT NULL;