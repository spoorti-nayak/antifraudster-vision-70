import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransactionRequest {
  merchant_api_key: string;
  amount: number;
  currency?: string;
  customer_email: string;
  customer_ip: string;
  customer_device?: string;
  customer_location?: { country: string; city: string; lat?: number; lng?: number };
  payment_method?: string;
  card_last4?: string;
  card_bin?: string;
  metadata?: any;
}

interface FraudPattern {
  id: string;
  pattern_type: string;
  pattern_data: any;
  weight: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: TransactionRequest = await req.json();
    console.log('Analyzing transaction:', { 
      amount: requestData.amount, 
      email: requestData.customer_email 
    });

    // 1. Verify merchant API key
    const { data: merchant, error: merchantError } = await supabaseClient
      .from('merchant_profiles')
      .select('*')
      .eq('api_key', requestData.merchant_api_key)
      .single();

    if (merchantError || !merchant) {
      console.error('Invalid merchant API key:', merchantError);
      return new Response(
        JSON.stringify({ error: 'Invalid merchant API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Merchant verified:', merchant.company_name);

    // 2. Check blocklist first
    const { data: blockedItems } = await supabaseClient
      .from('blocklist')
      .select('*')
      .eq('is_active', true)
      .or(`block_value.eq.${requestData.customer_email},block_value.eq.${requestData.customer_ip}${requestData.card_bin ? `,block_value.eq.${requestData.card_bin}` : ''}`);

    if (blockedItems && blockedItems.length > 0) {
      console.log('Transaction blocked - on blocklist');
      const transaction = await createBlockedTransaction(
        supabaseClient,
        merchant.id,
        requestData,
        100,
        ['Blocked by blocklist: ' + blockedItems[0].reason]
      );

      return new Response(
        JSON.stringify({
          status: 'blocked',
          transaction_id: transaction.id,
          fraud_score: 100,
          risk_level: 'critical',
          reasons: ['Customer is on blocklist'],
          recommendation: 'BLOCK_PAYMENT'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get or create customer profile
    const customerProfile = await getOrCreateCustomerProfile(
      supabaseClient,
      requestData.customer_email,
      requestData.customer_ip,
      requestData.customer_device,
      requestData.customer_location
    );

    console.log('Customer profile:', {
      total_transactions: customerProfile.total_transactions,
      trust_score: customerProfile.trust_score
    });

    // 4. Get fraud patterns
    const { data: patterns } = await supabaseClient
      .from('fraud_patterns')
      .select('*')
      .eq('is_active', true);

    // 5. Run fraud detection algorithms
    const fraudAnalysis = await analyzeFraudPatterns(
      supabaseClient,
      requestData,
      customerProfile,
      patterns || [],
      merchant.id
    );

    console.log('Fraud analysis complete:', {
      score: fraudAnalysis.score,
      risk: fraudAnalysis.risk_level
    });

    // 6. Create transaction record
    const { data: transaction, error: txError } = await supabaseClient
      .from('transactions')
      .insert({
        merchant_id: merchant.id,
        amount: requestData.amount,
        currency: requestData.currency || 'USD',
        customer_email: requestData.customer_email,
        customer_ip: requestData.customer_ip,
        customer_device: requestData.customer_device,
        customer_location: requestData.customer_location,
        payment_method: requestData.payment_method,
        card_last4: requestData.card_last4,
        card_bin: requestData.card_bin,
        fraud_score: fraudAnalysis.score,
        risk_level: fraudAnalysis.risk_level,
        fraud_reasons: fraudAnalysis.reasons,
        status: fraudAnalysis.should_block ? 'blocked' : 
                fraudAnalysis.should_flag ? 'flagged' : 'approved',
        metadata: requestData.metadata
      })
      .select()
      .single();

    if (txError) {
      console.error('Error creating transaction:', txError);
      throw txError;
    }

    // 7. Update customer profile
    await updateCustomerProfile(
      supabaseClient,
      customerProfile,
      requestData.amount,
      fraudAnalysis.should_block,
      fraudAnalysis.should_flag
    );

    // 8. Generate AI explanation if fraud detected
    let aiExplanation = null;
    if (fraudAnalysis.should_block || fraudAnalysis.should_flag) {
      aiExplanation = await generateFraudExplanation(
        requestData,
        fraudAnalysis,
        customerProfile
      );

      await supabaseClient.from('fraud_alerts').insert({
        transaction_id: transaction.id,
        merchant_id: merchant.id,
        alert_type: fraudAnalysis.should_block ? 'blocked_transaction' : 'flagged_transaction',
        severity: fraudAnalysis.risk_level,
        message: aiExplanation?.summary || `Transaction ${fraudAnalysis.should_block ? 'blocked' : 'flagged'} - Fraud score: ${fraudAnalysis.score}`,
        details: {
          reasons: fraudAnalysis.reasons,
          customer_email: requestData.customer_email,
          amount: requestData.amount,
          ai_explanation: aiExplanation
        }
      });
    }

    // 9. Call ML models for enhanced prediction (optional layer)
    let mlPrediction = null;
    try {
      const mlFeatures = extractFeatures(requestData, customerProfile);
      const { data: mlData } = await supabaseClient.functions.invoke('ml-predict', {
        body: { features: mlFeatures }
      });
      if (mlData) {
        mlPrediction = mlData;
        console.log('ML prediction received:', mlPrediction);
        // ML prediction can be used to adjust final decision in future
        // For now, we use rule-based scoring but log ML results
      }
    } catch (mlError) {
      console.warn('ML prediction unavailable, using rule-based only:', mlError);
    }

    // 10. Save ML training data
    await supabaseClient.from('ml_training_data').insert({
      transaction_id: transaction.id,
      features: extractFeatures(requestData, customerProfile),
      label: fraudAnalysis.should_block, // Will be updated manually if needed
      confidence: fraudAnalysis.score / 100,
      model_version: mlPrediction?.model_used || 'rule_based'
    });

    console.log('Transaction processed:', transaction.id);

    return new Response(
      JSON.stringify({
        status: fraudAnalysis.should_block ? 'blocked' : 
                fraudAnalysis.should_flag ? 'flagged' : 'approved',
        transaction_id: transaction.id,
        fraud_score: fraudAnalysis.score,
        risk_level: fraudAnalysis.risk_level,
        reasons: fraudAnalysis.reasons,
        explanation: aiExplanation,
        recommendation: fraudAnalysis.should_block ? 'BLOCK_PAYMENT' : 
                       fraudAnalysis.should_flag ? 'MANUAL_REVIEW' : 'APPROVE_PAYMENT'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in analyze-transaction:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getOrCreateCustomerProfile(
  supabase: any,
  email: string,
  ip: string,
  device?: string,
  location?: any
) {
  let { data: profile } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (!profile) {
    const { data: newProfile } = await supabase
      .from('customer_profiles')
      .insert({
        email,
        known_ips: [ip],
        known_locations: location ? [location] : [],
        known_devices: device ? [device] : []
      })
      .select()
      .single();
    profile = newProfile;
  } else {
    // Update known IPs, locations, devices
    const known_ips = profile.known_ips || [];
    const known_locations = profile.known_locations || [];
    const known_devices = profile.known_devices || [];

    if (!known_ips.includes(ip)) known_ips.push(ip);
    if (location && !known_locations.some((l: any) => l.country === location.country)) {
      known_locations.push(location);
    }
    if (device && !known_devices.includes(device)) known_devices.push(device);

    await supabase
      .from('customer_profiles')
      .update({ known_ips, known_locations, known_devices })
      .eq('email', email);
  }

  return profile;
}

async function analyzeFraudPatterns(
  supabase: any,
  request: TransactionRequest,
  customerProfile: any,
  patterns: FraudPattern[],
  merchantId: string
) {
  let totalScore = 0;
  const reasons: string[] = [];
  const detectedPatterns: string[] = [];

  for (const pattern of patterns) {
    const patternScore = await evaluatePattern(
      supabase,
      pattern,
      request,
      customerProfile,
      merchantId
    );

    if (patternScore > 0) {
      totalScore += patternScore * pattern.weight;
      reasons.push(`${pattern.pattern_type}: +${Math.round(patternScore * pattern.weight)} points`);
      detectedPatterns.push(pattern.pattern_type);

      // Increment pattern detection count
      await supabase
        .from('fraud_patterns')
        .update({ detected_count: pattern.detected_count + 1 })
        .eq('id', pattern.id);
    }
  }

  // Adjust score based on customer trust score
  const trustAdjustment = (50 - customerProfile.trust_score) / 2;
  totalScore += trustAdjustment;
  if (trustAdjustment !== 0) {
    reasons.push(`Customer trust adjustment: ${trustAdjustment > 0 ? '+' : ''}${Math.round(trustAdjustment)} points`);
  }

  // Cap score at 100
  totalScore = Math.min(100, Math.max(0, totalScore));

  let risk_level: string;
  if (totalScore >= 80) risk_level = 'critical';
  else if (totalScore >= 60) risk_level = 'high';
  else if (totalScore >= 40) risk_level = 'medium';
  else risk_level = 'low';

  return {
    score: Math.round(totalScore),
    risk_level,
    reasons,
    should_block: totalScore >= 80,
    should_flag: totalScore >= 60 && totalScore < 80,
    detected_patterns: detectedPatterns
  };
}

async function evaluatePattern(
  supabase: any,
  pattern: FraudPattern,
  request: TransactionRequest,
  customerProfile: any,
  merchantId: string
): Promise<number> {
  const { pattern_type, pattern_data } = pattern;

  switch (pattern_type) {
    case 'velocity_check': {
      // Check transaction velocity
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentTxs } = await supabase
        .from('transactions')
        .select('amount')
        .eq('customer_email', request.customer_email)
        .gte('created_at', oneHourAgo);

      if (recentTxs) {
        const txCount = recentTxs.length;
        const totalAmount = recentTxs.reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0);

        if (txCount >= pattern_data.max_transactions_per_hour) {
          return 20; // High velocity penalty
        }
        if (totalAmount >= pattern_data.max_amount_per_hour) {
          return 25; // High amount velocity
        }
      }
      return 0;
    }

    case 'amount_anomaly': {
      // Check if amount is anomalous
      if (customerProfile.average_transaction > 0) {
        const ratio = request.amount / customerProfile.average_transaction;
        if (ratio > pattern_data.threshold_multiplier) {
          return Math.min(30, ratio * 5); // Scale with how anomalous
        }
      }
      return 0;
    }

    case 'location_mismatch': {
      // Check for sudden location changes
      const known_locations = customerProfile.known_locations || [];
      if (known_locations.length > 0 && request.customer_location) {
        const currentLocation = request.customer_location;
        const hasNearby = known_locations.some((loc: any) => {
          if (currentLocation.lat && currentLocation.lng && loc.lat && loc.lng) {
            const distance = calculateDistance(
              currentLocation.lat,
              currentLocation.lng,
              loc.lat,
              loc.lng
            );
            return distance < pattern_data.max_distance_km;
          }
          return currentLocation.country === loc.country;
        });

        if (!hasNearby) {
          return 15; // Location mismatch penalty
        }
      }
      return 0;
    }

    case 'new_customer_high_value': {
      // New customer with high transaction
      if (customerProfile.total_transactions === 0 && request.amount > pattern_data.threshold_amount) {
        return 20;
      }
      return 0;
    }

    case 'unusual_time': {
      // Check transaction time
      const hour = new Date().getHours();
      if (pattern_data.suspicious_hours.includes(hour)) {
        return 10;
      }
      return 0;
    }

    case 'card_bin_check': {
      // Check if card BIN is known fraudulent
      if (request.card_bin && pattern_data.known_fraud_bins.includes(request.card_bin)) {
        return 40; // Major red flag
      }
      return 0;
    }

    default:
      return 0;
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function updateCustomerProfile(
  supabase: any,
  profile: any,
  amount: number,
  wasBlocked: boolean,
  wasFlagged: boolean
) {
  const total_transactions = profile.total_transactions + 1;
  const total_spent = parseFloat(profile.total_spent) + amount;
  const average_transaction = total_spent / total_transactions;
  const flagged_count = profile.flagged_count + (wasFlagged ? 1 : 0);
  const blocked_count = profile.blocked_count + (wasBlocked ? 1 : 0);

  // Update trust score
  let trust_score = parseFloat(profile.trust_score);
  if (wasBlocked) trust_score = Math.max(0, trust_score - 10);
  else if (wasFlagged) trust_score = Math.max(0, trust_score - 5);
  else trust_score = Math.min(100, trust_score + 2); // Reward good behavior

  await supabase
    .from('customer_profiles')
    .update({
      total_transactions,
      total_spent,
      average_transaction,
      flagged_count,
      blocked_count,
      trust_score,
      risk_level: trust_score < 30 ? 'critical' : 
                  trust_score < 50 ? 'high' :
                  trust_score < 70 ? 'medium' : 'low'
    })
    .eq('email', profile.email);
}

async function createBlockedTransaction(
  supabase: any,
  merchantId: string,
  request: TransactionRequest,
  fraudScore: number,
  reasons: string[]
) {
  const { data: transaction } = await supabase
    .from('transactions')
    .insert({
      merchant_id: merchantId,
      amount: request.amount,
      currency: request.currency || 'USD',
      customer_email: request.customer_email,
      customer_ip: request.customer_ip,
      customer_device: request.customer_device,
      customer_location: request.customer_location,
      payment_method: request.payment_method,
      card_last4: request.card_last4,
      card_bin: request.card_bin,
      fraud_score: fraudScore,
      risk_level: 'critical',
      fraud_reasons: reasons,
      status: 'blocked',
      metadata: request.metadata
    })
    .select()
    .single();

  return transaction;
}

async function generateFraudExplanation(
  request: TransactionRequest,
  fraudAnalysis: any,
  customerProfile: any
) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.warn('LOVABLE_API_KEY not configured, skipping AI explanation');
    return null;
  }

  try {
    const prompt = `You are an explainable AI fraud detection system. Explain why this transaction was ${fraudAnalysis.should_block ? 'BLOCKED' : 'FLAGGED'} in clear, customer-friendly language.

Transaction Details:
- Amount: $${request.amount}
- Customer Email: ${request.customer_email}
- Location: ${request.customer_location?.city}, ${request.customer_location?.country}
- Payment Method: ${request.payment_method}

Fraud Analysis:
- Fraud Score: ${fraudAnalysis.score}/100
- Risk Level: ${fraudAnalysis.risk_level}
- Detected Patterns: ${fraudAnalysis.reasons.join(', ')}

Customer History:
- Total Transactions: ${customerProfile.total_transactions}
- Trust Score: ${customerProfile.trust_score}/100
- Previous Flags: ${customerProfile.flagged_count}
- Previous Blocks: ${customerProfile.blocked_count}

Provide:
1. A brief summary (1-2 sentences) explaining the decision
2. Key risk factors (3-5 bullet points)
3. What the customer should do next

Be professional, clear, and helpful. Don't use technical jargon.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an explainable AI fraud detection expert. Provide clear, customer-friendly explanations.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI explanation generation failed:', response.status);
      return null;
    }

    const data = await response.json();
    const explanation = data.choices[0].message.content;

    // Parse the explanation into structured format
    const lines = explanation.split('\n').filter((l: string) => l.trim());
    let summary = '';
    const keyFactors: string[] = [];
    let nextSteps = '';

    let currentSection = '';
    for (const line of lines) {
      if (line.includes('summary') || line.includes('Summary')) {
        currentSection = 'summary';
      } else if (line.includes('risk factor') || line.includes('Key Risk')) {
        currentSection = 'factors';
      } else if (line.includes('next') || line.includes('should do')) {
        currentSection = 'next';
      } else if (line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().match(/^\d\./)) {
        if (currentSection === 'factors') {
          keyFactors.push(line.trim().replace(/^[-•\d.]\s*/, ''));
        }
      } else if (line.trim()) {
        if (currentSection === 'summary' && !summary) {
          summary = line.trim();
        } else if (currentSection === 'next' && !nextSteps) {
          nextSteps = line.trim();
        }
      }
    }

    return {
      summary: summary || `This transaction was ${fraudAnalysis.should_block ? 'blocked' : 'flagged'} due to suspicious activity patterns.`,
      key_factors: keyFactors.length > 0 ? keyFactors : fraudAnalysis.reasons,
      next_steps: nextSteps || 'Please contact the merchant for assistance or try a different payment method.',
      full_explanation: explanation
    };

  } catch (error) {
    console.error('Error generating AI explanation:', error);
    return null;
  }
}

function extractFeatures(request: TransactionRequest, profile: any) {
  return {
    amount: request.amount,
    customer_total_transactions: profile.total_transactions,
    customer_average_transaction: profile.average_transaction,
    customer_trust_score: profile.trust_score,
    has_location: !!request.customer_location,
    payment_method: request.payment_method,
    hour_of_day: new Date().getHours(),
    day_of_week: new Date().getDay()
  };
}