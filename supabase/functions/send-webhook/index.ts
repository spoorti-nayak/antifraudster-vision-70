import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event: string;
  transaction_id: string;
  customer_email: string;
  fraud_score: number;
  risk_level: string;
  blocked: boolean;
  timestamp: string;
  merchant_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: WebhookPayload = await req.json();
    
    console.log('Sending webhook for transaction:', payload.transaction_id);

    // Get merchant's webhook URL and API key for signature
    const { data: merchant } = await supabaseClient
      .from('merchants')
      .select('domain, api_key, webhook_url')
      .eq('id', payload.merchant_id)
      .single();

    if (!merchant) {
      console.log('Merchant not found for webhook');
      return new Response(
        JSON.stringify({ success: false, error: 'Merchant not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create HMAC signature for webhook verification
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload));
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(merchant.api_key),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, data);
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    console.log('Webhook payload:', JSON.stringify(payload, null, 2));
    console.log('Webhook signature:', signatureHex);

    // Send webhook to merchant's configured URL if it exists
    if (merchant.webhook_url) {
      try {
        const webhookResponse = await fetch(merchant.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Antifraud-Signature': signatureHex,
          },
          body: JSON.stringify(payload),
        });
        
        console.log('Webhook sent successfully:', {
          url: merchant.webhook_url,
          status: webhookResponse.status,
          transaction_id: payload.transaction_id
        });

        if (!webhookResponse.ok) {
          console.error('Webhook endpoint returned error:', await webhookResponse.text());
        }
      } catch (webhookError) {
        console.error('Failed to send webhook:', webhookError);
        // Don't throw - log the error but continue processing
      }
    } else {
      console.log('No webhook URL configured for merchant:', payload.merchant_id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed',
        signature: signatureHex 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in send-webhook function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
