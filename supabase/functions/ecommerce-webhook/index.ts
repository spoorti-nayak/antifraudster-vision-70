import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    console.log('Received webhook from AntiFraudster:', payload);

    // Verify signature if webhook secret is configured
    const signature = req.headers.get('x-signature');
    const { data: settings } = await supabaseClient
      .from('ecommerce_settings')
      .select('webhook_secret')
      .single();

    if (settings?.webhook_secret && signature) {
      // Verify HMAC signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(settings.webhook_secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      );

      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(JSON.stringify(payload))
      );

      const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Process the webhook based on event type
    if (payload.event === 'fraud_detected' || payload.event === 'transaction_blocked') {
      console.log('Processing fraud alert:', payload);

      // Update order status if transaction_id maps to an order
      if (payload.transaction?.customer_email) {
        const { data: orders } = await supabaseClient
          .from('orders')
          .select('*')
          .eq('customer_email', payload.transaction.customer_email)
          .eq('total_amount', payload.transaction.amount)
          .order('created_at', { ascending: false })
          .limit(1);

        if (orders && orders.length > 0) {
          const order = orders[0];
          
          await supabaseClient
            .from('orders')
            .update({
              status: payload.event === 'transaction_blocked' ? 'fraud_blocked' : 'processing',
              fraud_check_result: payload,
              fraud_score: payload.fraudAssessment?.fraud_score,
              risk_level: payload.fraudAssessment?.risk_level,
              is_fraud_blocked: payload.event === 'transaction_blocked'
            })
            .eq('id', order.id);

          console.log('Updated order:', order.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
