import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MLPredictionRequest {
  features: {
    amount: number;
    customer_total_transactions: number;
    customer_trust_score: number;
    customer_average_transaction: number;
    hour_of_day: number;
    day_of_week: number;
    transaction_velocity_1h: number;
    location_distance_km: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { features }: MLPredictionRequest = await req.json();
    
    console.log('ML Prediction request:', features);

    // Option 1: Call external Python API (ml_models/api_server.py)
    // Default to localhost:8000 or use ML_API_URL environment variable
    try {
      const pythonApiUrl = Deno.env.get('ML_API_URL') || 'http://localhost:8000';
      console.log(`🤖 Calling ML API at: ${pythonApiUrl}/predict`);
      console.log('📊 Features:', features);
      
      const mlResponse = await fetch(`${pythonApiUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features })
      });
      
      if (mlResponse.ok) {
        const mlPrediction = await mlResponse.json();
        console.log('✅ ML prediction with XAI received');
        console.log('🎯 Model used:', mlPrediction.model_used);
        console.log('📈 Fraud score:', mlPrediction.fraud_score);
        console.log('💡 XAI Explanation:', mlPrediction.explanation);
        return new Response(
          JSON.stringify(mlPrediction),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const errorText = await mlResponse.text();
        console.warn('❌ ML API returned error:', mlResponse.status, errorText);
        throw new Error(`ML API error: ${mlResponse.status}`);
      }
    } catch (mlError) {
      console.warn('⚠️ Python ML API unavailable, using rule-based fallback');
      console.warn('Error:', mlError.message);
      console.warn('💡 To use ML models: python ml_models/api_server.py');
    }

    // Option 2: Fallback to rule-based scoring (temporary until ML models are deployed)
    const fraudScore = calculateRuleBasedScore(features);
    const prediction = {
      fraud_score: fraudScore,
      is_fraud: fraudScore >= 60,
      probability: fraudScore / 100,
      risk_level: fraudScore >= 80 ? 'critical' : 
                  fraudScore >= 60 ? 'high' :
                  fraudScore >= 40 ? 'medium' : 'low',
      recommendation: fraudScore >= 80 ? 'BLOCK_PAYMENT' :
                     fraudScore >= 60 ? 'MANUAL_REVIEW' : 'APPROVE_PAYMENT',
      model_used: 'rule_based_fallback'
    };

    console.log('Prediction result:', prediction);

    return new Response(
      JSON.stringify(prediction),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ml-predict:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Rule-based scoring fallback (until ML models are integrated)
// NOTE: Amount thresholds are in INR (Indian Rupees)
function calculateRuleBasedScore(features: any): number {
  let score = 0;

  // High amount for new customer - threshold in INR (₹40,000 ~ $500)
  if (features.customer_total_transactions < 5 && features.amount > 40000) {
    score += 25;
  }

  // Low trust score
  if (features.customer_trust_score < 40) {
    score += 20;
  }

  // High velocity
  if (features.transaction_velocity_1h > 5) {
    score += 20;
  }

  // Unusual time (late night/early morning)
  if (features.hour_of_day >= 23 || features.hour_of_day <= 4) {
    score += 15;
  }

  // Large location distance
  if (features.location_distance_km > 300) {
    score += 15;
  }

  // Amount significantly higher than average
  if (features.customer_average_transaction > 0) {
    const ratio = features.amount / features.customer_average_transaction;
    if (ratio > 3) {
      score += 15;
    }
  }

  return Math.min(100, score);
}
