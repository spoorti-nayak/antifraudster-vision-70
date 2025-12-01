import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();

    if (!session_id) {
      throw new Error("No session ID provided");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session) {
      throw new Error("Session not found");
    }

    const paymentStatus = session.payment_status;
    const isPaid = paymentStatus === "paid";

    // Get payment details
    let paymentIntent = null;
    if (session.payment_intent) {
      paymentIntent = await stripe.paymentIntents.retrieve(
        session.payment_intent as string
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // If paid, create order record
    if (isPaid && session.metadata) {
      const orderItems = JSON.parse(session.metadata.order_items || "[]");
      const userId = session.metadata.user_id;
      const shippingAddress = session.metadata.shipping_address;

      if (orderItems.length > 0) {
        const totalAmount = orderItems.reduce(
          (sum: number, item: any) => sum + (item.price * (item.quantity || 1)),
          0
        );

        // Create order
        const { data: order, error: orderError } = await supabaseClient
          .from("orders")
          .insert({
            user_id: userId || null,
            total_amount: totalAmount,
            status: "completed",
            shipping_address: shippingAddress,
            customer_email: session.customer_email || session.customer_details?.email,
            customer_name: session.customer_details?.name,
            stripe_session_id: session_id,
            stripe_payment_intent_id: session.payment_intent,
          })
          .select()
          .single();

        if (orderError) {
          console.error("Error creating order:", orderError);
        } else {
          // Create order items
          const orderItemsToInsert = orderItems.map((item: any) => ({
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity || 1,
            price: item.price,
          }));

          await supabaseClient
            .from("order_items")
            .insert(orderItemsToInsert);

          // Call ML fraud detection
          try {
            const fraudResponse = await supabaseClient.functions.invoke(
              "analyze-transaction",
              {
                body: {
                  amount: totalAmount,
                  customer_email: session.customer_email || session.customer_details?.email,
                  order_id: order.id,
                  items: orderItems,
                },
              }
            );

            if (fraudResponse.data) {
              // Update order with fraud score
              await supabaseClient
                .from("orders")
                .update({ 
                  fraud_score: fraudResponse.data.fraud_score || 0 
                })
                .eq("id", order.id);
            }
          } catch (fraudError) {
            console.error("Fraud detection error:", fraudError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        paid: isPaid,
        payment_status: paymentStatus,
        customer_email: session.customer_email || session.customer_details?.email,
        amount_total: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Payment verification error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
