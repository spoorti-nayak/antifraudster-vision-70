import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderRequest {
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  cardLast4: string;
  cardBin: string;
  shippingAddress: any;
  items: any[];
  apiKey: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const orderData: OrderRequest = await req.json();
    console.log('Processing order:', orderData);

    // Get the merchant's antifraudster API URL (should be the analyze-transaction endpoint)
    const analyzeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-transaction`;

    // Prepare transaction data for fraud analysis
    const transactionData = {
      amount: orderData.amount,
      currency: orderData.currency,
      customer_email: orderData.customerEmail,
      customer_ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      customer_device: req.headers.get('user-agent') || 'unknown',
      payment_method: orderData.paymentMethod,
      card_last4: orderData.cardLast4,
      card_bin: orderData.cardBin,
      customer_location: {
        country: 'US',
        city: orderData.shippingAddress.city,
        region: orderData.shippingAddress.state
      },
      transaction_type: 'purchase',
      metadata: {
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        shipping_address: orderData.shippingAddress,
        items: orderData.items
      }
    };

    console.log('Sending transaction for fraud analysis...');

    // Call AntiFraudster API for fraud detection
    const fraudResponse = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': orderData.apiKey
      },
      body: JSON.stringify(transactionData)
    });

    const fraudResult = await fraudResponse.json();
    console.log('Fraud analysis result:', fraudResult);

    // Determine order status based on fraud result
    let orderStatus = 'completed';
    let isBlocked = false;

    if (fraudResult.status === 'blocked' || fraudResult.recommendation === 'block') {
      orderStatus = 'fraud_blocked';
      isBlocked = true;
    } else if (fraudResult.status === 'flagged' || fraudResult.riskLevel === 'high') {
      orderStatus = 'processing'; // Manual review needed
    }

    // Create order in database
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        customer_email: orderData.customerEmail,
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        total_amount: orderData.amount,
        currency: orderData.currency,
        status: orderStatus,
        payment_method: orderData.paymentMethod,
        shipping_address: orderData.shippingAddress,
        fraud_check_result: fraudResult,
        fraud_score: fraudResult.fraudScore,
        risk_level: fraudResult.riskLevel,
        is_fraud_blocked: isBlocked
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      throw orderError;
    }

    // Insert order items
    if (!isBlocked && orderData.items.length > 0) {
      const { error: itemsError } = await supabaseClient
        .from('order_items')
        .insert(
          orderData.items.map(item => ({
            order_id: order.id,
            product_id: item.productId,
            product_name: item.productName,
            product_price: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity
          }))
        );

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
      }
    }

    return new Response(
      JSON.stringify({
        success: !isBlocked,
        orderId: order.id,
        status: orderStatus,
        isBlocked,
        ...fraudResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error processing order:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
