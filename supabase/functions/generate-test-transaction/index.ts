import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Predefined transaction scenarios
const scenarios = {
  // ===== LEGITIMATE TRANSACTIONS (Should be APPROVED) =====
  "legitimate-low": {
    amount: 49.99,
    customer_email: "john.doe@example.com",
    customer_name: "John Doe",
    billing_address: "123 Main St, New York, NY 10001",
    ip_address: "192.168.1.1",
    geolocation: { country: "US", city: "New York" },
    device_fingerprint: "trusted_device_12345",
    customer_age_days: 365,
    transaction_velocity: 1,
    description: "Regular customer, normal purchase amount, trusted device"
  },
  "legitimate-high": {
    amount: 1499.99,
    customer_email: "jane.smith@example.com",
    customer_name: "Jane Smith",
    billing_address: "456 Oak Ave, Los Angeles, CA 90001",
    ip_address: "192.168.1.2",
    geolocation: { country: "US", city: "Los Angeles" },
    device_fingerprint: "trusted_device_67890",
    customer_age_days: 730,
    transaction_velocity: 2,
    description: "Verified customer, 2 years history, high-value but legitimate"
  },
  "legitimate-repeat": {
    amount: 350.00,
    customer_email: "loyal.customer@example.com",
    customer_name: "Loyal Customer",
    billing_address: "789 Regular St, Seattle, WA 98101",
    ip_address: "192.168.1.5",
    geolocation: { country: "US", city: "Seattle" },
    device_fingerprint: "trusted_device_repeat",
    customer_age_days: 540,
    transaction_velocity: 1,
    description: "Repeat customer with good history, normal behavior"
  },

  // ===== FRAUD: VELOCITY ATTACKS (ML Models detect rapid patterns) =====
  "fraud-velocity": {
    amount: 299.99,
    customer_email: "suspicious@temp-mail.com",
    customer_name: "Quick Buyer",
    billing_address: "789 Rush St, Chicago, IL 60611",
    ip_address: "203.0.113.50",
    geolocation: { country: "US", city: "Chicago" },
    device_fingerprint: "unknown_device_111",
    customer_age_days: 1,
    transaction_velocity: 15,
    description: "15 rapid transactions in 10 minutes - Classic velocity attack"
  },
  "fraud-velocity-high": {
    amount: 850.00,
    customer_email: "rapid.buyer@temp.com",
    customer_name: "Rapid Buyer",
    billing_address: "555 Speed Ave, Dallas, TX 75201",
    ip_address: "203.0.113.75",
    geolocation: { country: "US", city: "Dallas" },
    device_fingerprint: "speed_device_222",
    customer_age_days: 0,
    transaction_velocity: 22,
    description: "22 transactions in 5 minutes - Extreme velocity fraud"
  },

  // ===== FRAUD: BLACKLISTED (Instant block by blocklist) =====
  "fraud-blacklist": {
    amount: 599.99,
    customer_email: "fraudster@blacklist.com",
    customer_name: "Blacklisted User",
    billing_address: "999 Fraud Lane, Miami, FL 33101",
    ip_address: "198.51.100.1",
    geolocation: { country: "NG", city: "Lagos" },
    device_fingerprint: "blacklisted_device_999",
    customer_age_days: 0,
    transaction_velocity: 8,
    description: "Known fraudulent IP (198.51.100.1) - Instant block"
  },

  // ===== FRAUD: GEOLOCATION ANOMALIES (Isolation Forest excels) =====
  "fraud-geolocation": {
    amount: 899.99,
    customer_email: "traveler@email.com",
    customer_name: "Suspicious Traveler",
    billing_address: "111 USA St, New York, NY 10001",
    ip_address: "103.21.244.8",
    geolocation: { country: "RU", city: "Moscow" },
    device_fingerprint: "overseas_device_333",
    customer_age_days: 5,
    transaction_velocity: 1,
    description: "Russia IP with US billing - Location mismatch"
  },
  "fraud-geolocation-extreme": {
    amount: 1250.00,
    customer_email: "global.shopper@mail.com",
    customer_name: "Global Shopper",
    billing_address: "222 America St, Austin, TX 78701",
    ip_address: "103.45.67.89",
    geolocation: { country: "CN", city: "Beijing" },
    device_fingerprint: "china_device_888",
    customer_age_days: 2,
    transaction_velocity: 1,
    description: "China IP with Texas billing - High-risk country mismatch"
  },

  // ===== FRAUD: NEW CUSTOMER HIGH VALUE (XGBoost detects interaction) =====
  "fraud-new-customer": {
    amount: 2999.99,
    customer_email: "newbie@justjoined.com",
    customer_name: "Brand New Customer",
    billing_address: "222 First St, Boston, MA 02101",
    ip_address: "198.51.100.10",
    geolocation: { country: "US", city: "Boston" },
    device_fingerprint: "new_device_444",
    customer_age_days: 0,
    transaction_velocity: 1,
    description: "$2,999 purchase from 0-day customer - High risk"
  },
  "fraud-new-extreme": {
    amount: 4599.99,
    customer_email: "instant.buyer@newaccount.com",
    customer_name: "Instant Big Buyer",
    billing_address: "333 New St, Phoenix, AZ 85001",
    ip_address: "198.51.100.20",
    geolocation: { country: "US", city: "Phoenix" },
    device_fingerprint: "brand_new_device_777",
    customer_age_days: 0,
    transaction_velocity: 1,
    description: "$4,599 from completely new account - Extreme risk"
  },

  // ===== FRAUD: AMOUNT ANOMALY (Random Forest catches statistical outliers) =====
  "fraud-amount-spike": {
    amount: 3500.00,
    customer_email: "small.buyer@example.com",
    customer_name: "Small Buyer Gone Big",
    billing_address: "444 Normal St, Denver, CO 80201",
    ip_address: "192.168.1.10",
    geolocation: { country: "US", city: "Denver" },
    device_fingerprint: "normal_device_123",
    customer_age_days: 200,
    transaction_velocity: 1,
    description: "$3,500 purchase when average is $45 - 77x normal amount"
  },

  // ===== FRAUD: UNUSUAL TIME (Late night fraud pattern) =====
  "fraud-unusual-time": {
    amount: 1850.00,
    customer_email: "night.shopper@mail.com",
    customer_name: "Night Shopper",
    billing_address: "555 Late St, Portland, OR 97201",
    ip_address: "203.0.113.100",
    geolocation: { country: "US", city: "Portland" },
    device_fingerprint: "night_device_555",
    customer_age_days: 3,
    transaction_velocity: 4,
    description: "High-value purchase at 3:47 AM - Unusual time pattern"
  },

  // ===== FRAUD: COMBINED FACTORS (ML Ensemble shows strength) =====
  "fraud-perfect-storm": {
    amount: 2750.00,
    customer_email: "red.flags@suspicious.com",
    customer_name: "Red Flag Buyer",
    billing_address: "666 Risk St, Miami, FL 33101",
    ip_address: "103.89.45.67",
    geolocation: { country: "VN", city: "Hanoi" },
    device_fingerprint: "suspicious_device_666",
    customer_age_days: 0,
    transaction_velocity: 8,
    description: "New customer + High amount + Foreign IP + High velocity - Perfect storm"
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
    const { scenario, merchant_id, merchant_api_key } = await req.json();

    console.log("Simulating transaction:", { scenario, merchant_id });

    if (!scenarios[scenario]) {
      throw new Error(`Unknown scenario: ${scenario}`);
    }

    if (!merchant_id || !merchant_api_key) {
      throw new Error("merchant_id and merchant_api_key are required");
    }

    const testData = scenarios[scenario];
    const transactionId = crypto.randomUUID();

    // Prepare transaction data for fraud detection - THIS IS SENT TO ANTIFRAUDSTER
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
      merchant_id: merchant_id,
      merchant_api_key: merchant_api_key,
      // Additional features for ML model
      customer_age_days: testData.customer_age_days,
      transaction_velocity: testData.transaction_velocity,
      geolocation: testData.geolocation,
    };

    console.log("Calling analyze-transaction with merchant_api_key");

    // Call the AntiFraudster fraud detection function - REAL ML ANALYSIS
    const { data: fraudResult, error: fraudError } = await supabaseClient.functions.invoke(
      "analyze-transaction",
      { 
        body: {
          merchant_api_key: merchant_api_key,
          amount: testData.amount,
          currency: "USD",
          customer_email: testData.customer_email,
          customer_ip: testData.ip_address,
          customer_device: testData.device_fingerprint,
          customer_location: testData.geolocation,
          payment_method: "credit_card",
          metadata: {
            customer_name: testData.customer_name,
            billing_address: testData.billing_address,
            customer_age_days: testData.customer_age_days,
            transaction_velocity: testData.transaction_velocity,
            simulation: true,
            scenario: scenario,
          }
        }
      }
    );

    if (fraudError) {
      console.error("Fraud detection error:", fraudError);
      throw fraudError;
    }

    console.log("Fraud detection result:", fraudResult);

    // Transaction is already saved by analyze-transaction edge function
    // No need to save again here

    const isBlocked = fraudResult.status === 'blocked';
    const fraudScore = fraudResult.fraud_score / 100; // Convert to 0-1 range
    
    return new Response(
      JSON.stringify({
        transaction_id: transactionId,
        type: scenario,
        is_fraud: isBlocked,
        fraud_score: fraudScore,
        status: fraudResult.status,
        explanation: fraudResult.explanation?.summary || fraudResult.reasons?.join(', ') || 'Transaction analyzed',
        risk_factors: fraudResult.reasons || [],
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
