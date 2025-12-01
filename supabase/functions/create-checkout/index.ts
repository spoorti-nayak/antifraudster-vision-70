import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutItem {
  product_id: string;
  price_id: string;
  quantity: number;
  name: string;
  price: number;
}

interface CheckoutRequest {
  items: CheckoutItem[];
  customer_email?: string;
  shipping_address?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, customer_email, shipping_address }: CheckoutRequest = await req.json();

    if (!items || items.length === 0) {
      throw new Error("No items provided");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    let customerId: string | undefined;
    let userId: string | null = null;

    // Try to get authenticated user (optional for guest checkout)
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data } = await supabaseClient.auth.getUser(token);
        userId = data.user?.id || null;
        
        if (data.user?.email) {
          // Check if Stripe customer exists
          const customers = await stripe.customers.list({ 
            email: data.user.email, 
            limit: 1 
          });
          
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
          }
        }
      } catch (error) {
        console.log("No authenticated user, proceeding with guest checkout");
      }
    }

    // Build line items for Stripe
    // NOTE: This uses hardcoded price IDs. In production, store price_id in your database
    const lineItems = items.map(item => ({
      price: item.price_id || `price_${item.product_id}`, // Fallback for demo
      quantity: item.quantity || 1,
    }));

    // Create metadata for order tracking
    const metadata: Record<string, string> = {
      order_items: JSON.stringify(items.map(item => ({
        product_id: item.product_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
      }))),
    };

    if (userId) {
      metadata.user_id = userId;
    }

    if (shipping_address) {
      metadata.shipping_address = shipping_address;
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : customer_email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/payment-canceled`,
      metadata,
      payment_intent_data: {
        metadata,
      },
    });

    return new Response(
      JSON.stringify({ 
        url: session.url,
        session_id: session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
