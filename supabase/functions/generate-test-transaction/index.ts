import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Predefined transaction scenarios
const scenarios = {
  "legitimate-low": {
    amount: 49.99,
    customer_email: "john.doe@example.com",
    customer_name: "John Doe",
    billing_address: "123 Main St, New York",
    ip_address: "192.168.1.1",
    geolocation: { country: "US", city: "New York" },
    device_fingerprint: "trusted_device_12345",
    customer_age_days: 365,
    transaction_velocity: 1,
  },
  "legitimate-high": {
    amount: 1499.99,
    customer_email: "jane.smith@example.com",
    customer_name: "Jane Smith",
    billing_address: "456 Oak Ave, Los Angeles",
    ip_address: "192.168.1.2",
    geolocation: { country: "US", city: "Los Angeles" },
    device_fingerprint: "trusted_device_67890",
    customer_age_days: 730,
    transaction_velocity: 2,
  },
  "fraud-velocity": {
    amount: 299.99,
    customer_email: "suspicious@temp-mail.com",
    customer_name: "Quick Buyer",
    billing_address: "789 Rush St, Chicago",
    ip_address: "203.0.113.50",
    geolocation: { country: "US", city: "Chicago" },
    device_fingerprint: "unknown_device_111",
    customer_age_days: 1,
    transaction_velocity: 15, // 15 transactions in short time
  },
  "fraud-blacklist": {
    amount: 599.99,
    customer_email: "fraudster@blacklist.com",
    customer_name: "Blacklisted User",
    billing_address: "999 Fraud Lane, Miami",
    ip_address: "198.51.100.1", // Known fraudulent IP
    geolocation: { country: "NG", city: "Lagos" }, // High-risk location
    device_fingerprint: "blacklisted_device_999",
    customer_age_days: 0,
    transaction_velocity: 8,
  },
  "fraud-geolocation": {
    amount: 899.99,
    customer_email: "traveler@email.com",
    customer_name: "Suspicious Traveler",
    billing_address: "111 USA St, New York",
    ip_address: "103.21.244.8",
    geolocation: { country: "RU", city: "Moscow" }, // Location mismatch
    device_fingerprint: "overseas_device_333",
    customer_age_days: 5,
    transaction_velocity: 1,
  },
  "fraud-new-customer": {
    amount: 2999.99,
    customer_email: "newbie@justjoined.com",
    customer_name: "Brand New Customer",
    billing_address: "222 First St, Boston",
    ip_address: "198.51.100.10",
    geolocation: { country: "US", city: "Boston" },
    device_fingerprint: "new_device_444",
    customer_age_days: 0, // Brand new customer
    transaction_velocity: 1,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { scenario } = await req.json();

    if (!scenarios[scenario]) {
      throw new Error(`Unknown scenario: ${scenario}`);
    }

    const testData = scenarios[scenario];
    const transactionId = crypto.randomUUID();

    // Prepare transaction data for fraud detection
    const transactionData = {
      transaction_id: transactionId,
      amount: testData.amount,
      currency: "USD",
      customer_email: testData.customer_email,
      customer_name: testData.customer_name,
      payment_method: "credit_card",
      billing_address: testData.billing_address,
      ip_address: testData.ip_address,
      device_fingerprint: testData.device_fingerprint,
      merchant_id: "simulator_merchant",
      // Additional features for ML model
      customer_age_days: testData.customer_age_days,
      transaction_velocity: testData.transaction_velocity,
      geolocation: testData.geolocation,
    };

    // Call the fraud detection function
    const { data: fraudResult, error: fraudError } = await supabaseClient.functions.invoke(
      "analyze-transaction",
      { body: transactionData }
    );

    if (fraudError) {
      console.error("Fraud detection error:", fraudError);
      throw fraudError;
    }

    // Save to transactions table for tracking
    await supabaseClient.from("transactions").insert({
      transaction_id: transactionId,
      merchant_id: "simulator_merchant",
      amount: testData.amount,
      currency: "USD",
      status: fraudResult.is_fraud ? "blocked" : "approved",
      fraud_score: fraudResult.fraud_score,
      customer_email: testData.customer_email,
      ip_address: testData.ip_address,
      metadata: {
        scenario,
        simulation: true,
        ...testData,
      },
    });

    return new Response(
      JSON.stringify({
        transaction_id: transactionId,
        type: scenario,
        is_fraud: fraudResult.is_fraud,
        fraud_score: fraudResult.fraud_score,
        status: fraudResult.is_fraud ? "blocked" : "approved",
        explanation: fraudResult.explanation,
        risk_factors: fraudResult.risk_factors,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Simulation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
