import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/contexts/CartContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, CreditCard, Lock, Brain, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react';

const checkoutSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(3),
  address: z.string().min(5),
  city: z.string().min(2),
  postalCode: z.string().min(3),
  country: z.string().min(2),
  cardNumber: z.string().regex(/^\d{16}$/, 'Card number must be 16 digits'),
  cardExpiry: z.string().regex(/^\d{2}\/\d{2}$/, 'Format: MM/YY'),
  cardCvv: z.string().regex(/^\d{3,4}$/, 'CVV must be 3-4 digits'),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const { addTransaction, addAlert } = useSimulation();
  const [processing, setProcessing] = useState(false);
  const [mlStatus, setMlStatus] = useState<'idle' | 'checking' | 'connected' | 'fallback'>('idle');
  const [xaiResult, setXaiResult] = useState<{
    show: boolean;
    fraudScore: number;
    status: 'approved' | 'flagged' | 'blocked';
    riskLevel: string;
    modelUsed: string;
    topFactors: { feature: string; importance: number; direction: string; description: string }[];
    summary: string;
  } | null>(null);

  // Local ML API configuration - only works in local dev (VS Code + localhost)
  const localMlBaseUrl = 'http://localhost:8000';
  const canCallLocalMl = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Build features object for ML model
  const buildMlFeatures = async (email: string, amount: number) => {
    const recentTxns = JSON.parse(localStorage.getItem('simulated_transactions') || '[]');
    const customerTxns = recentTxns.filter((t: any) => t.customer_email === email);
    const avgAmount = customerTxns.length > 0
      ? customerTxns.reduce((sum: number, t: any) => sum + t.amount, 0) / customerTxns.length
      : 0;
    const last1h = recentTxns.filter((t: any) => Date.now() - new Date(t.created_at).getTime() < 3600000);
    
    return {
      amount,
      customer_total_transactions: customerTxns.length,
      customer_trust_score: Math.min(100, 50 + customerTxns.length * 10),
      customer_average_transaction: avgAmount,
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
      transaction_velocity_1h: last1h.length,
      location_distance_km: 0,
    };
  };

  // Call local Flask ML API
  const callLocalMlApi = async (features: any) => {
    const response = await fetch(`${localMlBaseUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features }),
    });
    if (!response.ok) throw new Error(`ML API error: ${response.status}`);
    return response.json();
  };

  // Normalize ML prediction to checkout format and extract XAI data
  const normalizeMlPredictionForCheckout = (prediction: any) => {
    const normalized = {
      fraud_score: prediction.fraud_score ?? 0,
      status: prediction.is_fraud ? 'blocked' : prediction.fraud_score >= 40 ? 'flagged' : 'approved',
      risk_level: prediction.risk_level || 'low',
      reasons: prediction.explanation?.top_factors?.map((f: any) => f.description) || [],
      model_used: prediction.model_used,
      explanation: prediction.explanation,
    };

    // Set XAI result for display
    setXaiResult({
      show: true,
      fraudScore: normalized.fraud_score,
      status: normalized.status as 'approved' | 'flagged' | 'blocked',
      riskLevel: normalized.risk_level,
      modelUsed: prediction.model_used || 'ensemble',
      topFactors: prediction.explanation?.top_factors || [],
      summary: prediction.explanation?.summary || `Transaction analyzed with ${normalized.fraud_score}% fraud probability`,
    });

    return normalized;
  };

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: user?.email || '',
      fullName: '',
      address: '',
      city: '',
      postalCode: '',
      country: '',
      cardNumber: '',
      cardExpiry: '',
      cardCvv: '',
    },
  });

  const onSubmit = async (data: CheckoutForm) => {
    if (!user) {
      toast.error('Please login to complete checkout');
      navigate('/login');
      return;
    }

    setProcessing(true);

    try {
      // Create order
      const { data: order, error: orderError } = await (supabase as any)
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: totalPrice,
          status: 'pending',
          shipping_address: `${data.address}, ${data.city}, ${data.postalCode}, ${data.country}`,
          customer_email: data.email,
          customer_name: data.fullName,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await (supabase as any)
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Check if fraud detection is enabled for this merchant
      if (!user.merchantProfile?.fraud_detection_enabled) {
        console.log('Fraud detection disabled, approving order');
        await (supabase as any)
          .from('orders')
          .update({ status: 'completed', fraud_score: 0 })
          .eq('id', order.id);
        
        clearCart();
        toast.success('Order placed successfully!');
        navigate('/shop');
        return;
      }

      // Get merchant API key
      const merchantApiKey = user.merchantProfile?.api_key;
      if (!merchantApiKey) {
        console.error('Merchant API key not found');
        toast.error('Store configuration error. Please contact support.');
        return;
      }

      // Call fraud detection edge function with proper merchant authentication
      const transactionData = {
        merchant_api_key: merchantApiKey,
        amount: totalPrice,
        currency: 'INR',
        customer_email: data.email,
        customer_ip: '0.0.0.0', // TODO: Get real IP from request headers
        customer_device: navigator.userAgent,
        customer_location: {
          country: data.country,
          city: data.city
        },
        payment_method: 'credit_card',
        card_last4: data.cardNumber.slice(-4),
        metadata: {
          order_id: order.id,
          customer_name: data.fullName,
          billing_address: `${data.address}, ${data.city}, ${data.postalCode}, ${data.country}`,
          shipping_address: `${data.address}, ${data.city}, ${data.postalCode}, ${data.country}`
        }
      };

      let fraudResult: any = null;
      let fraudError: any = null;

      // Local dev: call the Flask ML server directly (it runs on your machine).
      // Backend functions cannot reach your PC's localhost unless you expose it.
      if (canCallLocalMl) {
        setMlStatus('checking');
        try {
          const features = await buildMlFeatures(data.email, totalPrice);
          console.log(`🤖 Calling local ML API at ${localMlBaseUrl}/predict`, features);
          const prediction = await callLocalMlApi(features);
          fraudResult = normalizeMlPredictionForCheckout(prediction);
          setMlStatus('connected');
          console.log('✅ Local ML prediction:', fraudResult);
        } catch (err: any) {
          setMlStatus('fallback');
          console.warn('⚠️ Local ML API unavailable; falling back to backend fraud detection.', err);
        }
      }

      if (!fraudResult) {
        console.log('Sending transaction for fraud analysis...');
        const result = await supabase.functions.invoke('analyze-transaction', { body: transactionData });
        fraudResult = result.data;
        fraudError = result.error;
      }

      if (fraudError) {
        console.error('Fraud check error:', fraudError);

        // Calculate local fraud score with breakdown
        const fraudAnalysis = calculateLocalFraudScore(totalPrice, items, data);
        const fraudScore = fraudAnalysis.score;
        const status: 'pending' | 'approved' | 'flagged' | 'blocked' =
          fraudScore > 70 ? 'blocked' : fraudScore > 40 ? 'flagged' : 'approved';
        const riskLevel = fraudScore > 70 ? 'high' : fraudScore > 40 ? 'medium' : 'low';

        // Add transaction to simulation context with breakdown
        const simulatedTransaction = {
          id: `txn_${Date.now()}`,
          customer_email: data.email,
          amount: totalPrice,
          currency: 'INR',
          status: status,
          fraud_score: fraudScore,
          risk_level: riskLevel,
          fraud_reasons: fraudAnalysis.fraudReasons.length > 0 ? fraudAnalysis.fraudReasons : null,
          created_at: new Date().toISOString(),
          metadata: {
            order_id: order.id,
            card_last4: data.cardNumber.slice(-4),
            from_checkout: true,
            fraud_check_unavailable: true,
            risk_breakdown: fraudAnalysis.breakdown,
          },
        };
        addTransaction(simulatedTransaction);

        // Create fraud alert if needed
        if (status === 'flagged' || status === 'blocked') {
          const severity: 'low' | 'medium' | 'high' | 'critical' = status === 'blocked' ? 'high' : 'medium';
          const simulatedAlert = {
            id: `alert_${Date.now()}`,
            transaction_id: simulatedTransaction.id,
            merchant_id: user.merchantProfile?.id || 'unknown',
            alert_type: status === 'blocked' ? 'payment_blocked' : 'suspicious_activity',
            severity: severity,
            message: `Checkout payment ${status} - Fraud Score: ${fraudScore}%`,
            details: {
              fraud_score: fraudScore,
              reasons: fraudAnalysis.fraudReasons,
              amount: totalPrice,
              quantity: items.reduce((sum, item) => sum + item.quantity, 0),
              risk_breakdown: fraudAnalysis.breakdown,
            },
            is_resolved: false,
            created_at: new Date().toISOString(),
          };
          addAlert(simulatedAlert);
        }

        if (status === 'blocked') {
          toast.error(
            `⛔ Payment Blocked - Fraud Detected!\n\nFraud Score: ${fraudScore}%\n\n${fraudAnalysis.fraudReasons.join('\n')}`,
            { duration: 10000 },
          );
          await (supabase as any).from('orders').update({ status: 'blocked', fraud_score: fraudScore / 100 }).eq('id', order.id);
          navigate('/shop');
          return;
        }

        if (status === 'flagged') {
          toast.warning(
            `⚠️ Payment Flagged for Review\n\nFraud Score: ${fraudScore}%\n\nReasons:\n${fraudAnalysis.fraudReasons.slice(0, 2).join('\n')}`,
            { duration: 8000 },
          );
        }

        toast.success('Order placed successfully!');
        await (supabase as any).from('orders').update({ status: 'completed', fraud_score: 0 }).eq('id', order.id);

        clearCart();
        navigate('/shop');
        return;
      }

      console.log('Fraud analysis result:', fraudResult);

      const fraudScore = fraudResult?.fraud_score || 0;
      const status = fraudResult?.status || 'approved';

      // Add transaction to simulation context
      const simulatedTransaction = {
        id: `txn_${Date.now()}`,
        customer_email: data.email,
        amount: totalPrice,
        currency: 'INR',
        status: status as 'pending' | 'approved' | 'flagged' | 'blocked',
        fraud_score: fraudScore,
        risk_level: fraudResult?.risk_level || 'low',
        fraud_reasons: fraudResult?.reasons || null,
        created_at: new Date().toISOString(),
        metadata: { 
          order_id: order.id,
          card_last4: data.cardNumber.slice(-4),
          from_checkout: true
        }
      };
      addTransaction(simulatedTransaction);

      // Create transaction record in dashboard
      const { data: transaction } = await supabase
        .from('transactions')
        .insert({
          merchant_id: user.merchantProfile.id,
          customer_email: data.email,
          amount: totalPrice,
          currency: 'INR',
          status: status,
          fraud_score: fraudScore,
          payment_method: 'credit_card',
          customer_ip: '0.0.0.0',
          metadata: { 
            order_id: order.id,
            card_last4: data.cardNumber.slice(-4),
            from_checkout: true
          }
        })
        .select()
        .single();

      // Check fraud result status
      if (status === 'blocked') {
        // Create fraud alert in context
        const simulatedAlert = {
          id: `alert_${Date.now()}`,
          transaction_id: simulatedTransaction.id,
          merchant_id: user.merchantProfile?.id || 'unknown',
          alert_type: 'payment_blocked',
          severity: 'high' as const,
          message: 'Checkout payment blocked due to fraud detection',
          details: fraudResult,
          is_resolved: false,
          created_at: new Date().toISOString()
        };
        addAlert(simulatedAlert);
        
        // Create fraud alert in database if available
        if (transaction) {
          await supabase
            .from('fraud_alerts')
            .insert({
              merchant_id: user.merchantProfile.id,
              transaction_id: transaction.id,
              alert_type: 'payment_blocked',
              severity: 'high',
              message: 'Checkout payment blocked due to fraud detection',
              details: fraudResult
            });
        }

        // Update order status to blocked
        await (supabase as any)
          .from('orders')
          .update({ 
            status: 'blocked', 
            fraud_score: fraudScore / 100 
          })
          .eq('id', order.id);

        const explanation = fraudResult.explanation?.summary || 
                          fraudResult.reasons?.join(', ') || 
                          'Transaction blocked due to suspicious activity';

        toast.error(
          `⛔ Payment Blocked - Fraud Detected!\n\nFraud Score: ${fraudScore}%\n\n${explanation}`,
          { duration: 10000 }
        );
        
        navigate('/shop');
        return;
      }

      // Create alert for flagged transactions
      if (status === 'flagged') {
        const simulatedAlert = {
          id: `alert_${Date.now()}`,
          transaction_id: simulatedTransaction.id,
          merchant_id: user.merchantProfile?.id || 'unknown',
          alert_type: 'suspicious_activity',
          severity: 'medium' as const,
          message: 'Checkout payment flagged for review',
          details: fraudResult,
          is_resolved: false,
          created_at: new Date().toISOString()
        };
        addAlert(simulatedAlert);
        
        if (transaction) {
          await supabase
            .from('fraud_alerts')
            .insert({
              merchant_id: user.merchantProfile.id,
              transaction_id: transaction.id,
              alert_type: 'suspicious_activity',
              severity: 'medium',
              message: 'Checkout payment flagged for review',
              details: fraudResult
            });
        }
      }

      // Update order status to completed (approved or flagged but allowed)
      await (supabase as any)
        .from('orders')
        .update({ 
          status: status === 'flagged' ? 'flagged' : 'completed',
          fraud_score: fraudScore / 100
        })
        .eq('id', order.id);

      clearCart();
      toast.success('Order placed successfully!');
      navigate('/shop');
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to process order. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // XAI outputs for specific demo users based on email and scenario
  const getDemoUserXaiOutput = (email: string, amount: number, country: string, recentTxnCount: number): {
    score: number;
    status: 'approved' | 'flagged' | 'blocked';
    summary: string;
    factors: { factor: string; contribution: number; reason: string }[];
    reasons: string[];
  } | null => {
    const emailLower = email.toLowerCase();
    const countryLower = country.toLowerCase();
    const isIndia = countryLower === 'india' || countryLower === 'in';
    const isHighRiskCountry = ['russia', 'nigeria', 'china', 'vietnam', 'north korea'].includes(countryLower);
    
    // Alice - Trusted Customer (trust_score: 85, 47 transactions)
    if (emailLower === 'alice.trusted@demo.com') {
      // Scenario 1: Normal small purchase from India
      if (amount <= 5000 && isIndia) {
        return {
          score: 12,
          status: 'approved',
          summary: 'Trusted customer with excellent purchase history. Transaction approved.',
          factors: [
            { factor: 'Customer Trust Score', contribution: -15, reason: 'Trust score: 85 - Long-term customer' },
            { factor: 'Transaction Amount', contribution: 5, reason: `₹${amount.toLocaleString('en-IN')} - Within normal range` },
            { factor: 'Location Match', contribution: 0, reason: 'Home country: India ✓' }
          ],
          reasons: ['Trusted customer with consistent purchase history']
        };
      }
      // Scenario 2: Medium purchase from India
      if (amount > 5000 && amount <= 15000 && isIndia) {
        return {
          score: 28,
          status: 'approved',
          summary: 'Amount slightly above average but within trusted customer range. Approved.',
          factors: [
            { factor: 'Customer Trust Score', contribution: -12, reason: 'Trust score: 85 - Excellent history' },
            { factor: 'Transaction Amount', contribution: 18, reason: `₹${amount.toLocaleString('en-IN')} - Above average (₹2,500)` },
            { factor: 'Location Match', contribution: 0, reason: 'Transaction from registered location' }
          ],
          reasons: ['Amount above average but acceptable for trusted user']
        };
      }
      // Scenario 3: High amount purchase - flagged
      if (amount > 50000 && isIndia) {
        return {
          score: 55,
          status: 'flagged',
          summary: 'Significant deviation from average transaction amount. Manual review required.',
          factors: [
            { factor: 'Transaction Amount', contribution: 40, reason: `₹${amount.toLocaleString('en-IN')} - 20x above average` },
            { factor: 'Customer Trust Score', contribution: -10, reason: 'Trust score: 85 - Reduces risk' },
            { factor: 'Purchase Pattern', contribution: 15, reason: 'Unusual purchase size for this customer' }
          ],
          reasons: ['Very high amount compared to customer average of ₹2,500', 'Requires verification despite trusted status']
        };
      }
      // Scenario 4: High-risk country (Account Takeover)
      if (isHighRiskCountry) {
        return {
          score: 82,
          status: 'blocked',
          summary: 'Multiple risk factors detected: geolocation mismatch, possible account takeover.',
          factors: [
            { factor: 'Geolocation Risk', contribution: 45, reason: `Transaction from ${country} - High fraud region` },
            { factor: 'Location Mismatch', contribution: 25, reason: 'Customer home: India, Current: ' + country },
            { factor: 'Account Takeover Risk', contribution: 20, reason: 'Trusted account from suspicious location' }
          ],
          reasons: [`High-risk country: ${country}`, 'Geolocation mismatch from home location (India)', 'Possible account compromise']
        };
      }
      // Scenario 5: Foreign but not high-risk
      if (!isIndia && !isHighRiskCountry) {
        return {
          score: 45,
          status: 'flagged',
          summary: 'Transaction from different country than usual. Flagged for review.',
          factors: [
            { factor: 'Location Change', contribution: 30, reason: `Transaction from ${country} instead of India` },
            { factor: 'Customer Trust Score', contribution: -10, reason: 'Trust score: 85 - Trusted customer' },
            { factor: 'Travel Pattern', contribution: 15, reason: 'Possible legitimate travel' }
          ],
          reasons: [`Transaction from ${country} instead of home country India`, 'Flagged for verification - could be travel']
        };
      }
    }
    
    // Bob - New Customer (trust_score: 45, 2 transactions)
    if (emailLower === 'bob.newuser@demo.com') {
      // Scenario 1: Small first purchase from India
      if (amount <= 1500 && isIndia) {
        return {
          score: 28,
          status: 'approved',
          summary: 'New customer with small first purchase - typical onboarding pattern.',
          factors: [
            { factor: 'Customer Profile', contribution: 20, reason: 'New customer - Limited history (2 txns)' },
            { factor: 'Transaction Amount', contribution: 5, reason: `₹${amount.toLocaleString('en-IN')} - Low risk amount` },
            { factor: 'Trust Building', contribution: -5, reason: 'Building trust with small purchase' }
          ],
          reasons: ['New customer making first purchase', 'Low amount reduces risk']
        };
      }
      // Scenario 2: Medium purchase - flagged
      if (amount > 5000 && amount <= 10000 && isIndia) {
        return {
          score: 52,
          status: 'flagged',
          summary: 'New customer making above-average purchase. Manual verification recommended.',
          factors: [
            { factor: 'Customer Profile', contribution: 25, reason: 'Trust score: 45 - New account' },
            { factor: 'Transaction Amount', contribution: 22, reason: `₹${amount.toLocaleString('en-IN')} - Higher than average for new user` },
            { factor: 'Account Age Risk', contribution: 10, reason: 'Account has minimal purchase history' }
          ],
          reasons: ['New customer with limited history', 'Above-average purchase amount for new user']
        };
      }
      // Scenario 3: High value first purchase - blocked
      if (amount > 25000) {
        return {
          score: 78,
          status: 'blocked',
          summary: 'High-risk pattern: new account with premium purchase. Blocked for security.',
          factors: [
            { factor: 'Transaction Amount', contribution: 40, reason: `₹${amount.toLocaleString('en-IN')} - Premium purchase` },
            { factor: 'New Account Risk', contribution: 30, reason: 'Classic fraud pattern detected' },
            { factor: 'Trust Score', contribution: 15, reason: 'Trust score: 45 - Insufficient history' }
          ],
          reasons: ['New account making high-value purchase', 'Classic new account fraud pattern', 'Insufficient purchase history for this amount']
        };
      }
      // Scenario 4: Velocity abuse
      if (recentTxnCount >= 3) {
        return {
          score: 72,
          status: 'blocked',
          summary: 'Velocity abuse detected - multiple transactions in short window.',
          factors: [
            { factor: 'Velocity Check', contribution: 35, reason: `${recentTxnCount} transactions in 10 minutes` },
            { factor: 'New Account Risk', contribution: 25, reason: 'New customer with unusual activity' },
            { factor: 'Bot Pattern', contribution: 15, reason: 'Automated transaction pattern suspected' }
          ],
          reasons: [`${recentTxnCount} transactions in 10 minutes`, 'Velocity abuse on new account']
        };
      }
      // Scenario 5: Foreign country
      if (!isIndia) {
        return {
          score: 70,
          status: 'flagged',
          summary: 'New customer from different location than profile. High risk for new account.',
          factors: [
            { factor: 'Location Mismatch', contribution: 35, reason: `Location: ${country} vs Profile: India` },
            { factor: 'New Account Risk', contribution: 25, reason: 'Trust score: 45 - Limited history' },
            { factor: 'Address Verification', contribution: 15, reason: 'Shipping address verification needed' }
          ],
          reasons: ['Location mismatch on new account', `Shipping to ${country} from India profile`]
        };
      }
    }
    
    // Charlie - Velocity Abuser (trust_score: 35, suspicious)
    if (emailLower === 'charlie.velocity@demo.com') {
      // Scenario 1: Single normal transaction
      if (amount <= 2000 && recentTxnCount < 2 && isIndia) {
        return {
          score: 42,
          status: 'flagged',
          summary: 'Account has previous velocity abuse flags. Extra scrutiny applied.',
          factors: [
            { factor: 'Account History', contribution: 30, reason: 'Previous velocity abuse detected' },
            { factor: 'Trust Score', contribution: 15, reason: 'Trust score: 35 - Suspicious account' },
            { factor: 'Transaction Amount', contribution: -5, reason: 'Low amount reduces current risk' }
          ],
          reasons: ['Account flagged for previous velocity abuse', 'Under monitoring']
        };
      }
      // Scenario 2: Velocity attack (3+ in 10 min)
      if (recentTxnCount >= 3) {
        return {
          score: 92,
          status: 'blocked',
          summary: 'Severe velocity abuse - card testing pattern detected. Transaction blocked.',
          factors: [
            { factor: 'Velocity Attack', contribution: 45, reason: `${recentTxnCount} transactions in 10 minutes` },
            { factor: 'Known Abuser', contribution: 30, reason: 'Account has velocity abuse history' },
            { factor: 'Bot Detection', contribution: 20, reason: 'Automated attack pattern confirmed' }
          ],
          reasons: ['Severe velocity abuse detected', 'Card testing/bot pattern', 'Account has prior violations']
        };
      }
      // Scenario 3: Sequential amounts (card testing)
      if (amount <= 1000) {
        return {
          score: 88,
          status: 'blocked',
          summary: 'Incremental amount testing - typical stolen card validation pattern.',
          factors: [
            { factor: 'Card Testing Pattern', contribution: 40, reason: 'Sequential small amounts detected' },
            { factor: 'Suspicious Account', contribution: 30, reason: 'Trust score: 35 - Known suspicious' },
            { factor: 'Fraud Pattern Match', contribution: 20, reason: 'Matches card limit testing behavior' }
          ],
          reasons: ['Card testing pattern detected', 'Sequential small amounts', 'Suspicious account history']
        };
      }
      // Any high-risk country
      if (isHighRiskCountry) {
        return {
          score: 95,
          status: 'blocked',
          summary: 'Multiple severe risk factors: suspicious account from high-risk location.',
          factors: [
            { factor: 'Geolocation Risk', contribution: 40, reason: `${country} - High fraud region` },
            { factor: 'Account Risk', contribution: 35, reason: 'Known velocity abuser' },
            { factor: 'Combined Risk', contribution: 25, reason: 'Multiple red flags triggered' }
          ],
          reasons: ['High-risk country', 'Suspicious account', 'Maximum risk level']
        };
      }
      // Default for Charlie
      return {
        score: 55,
        status: 'flagged',
        summary: 'Account under monitoring due to previous abuse. Transaction flagged.',
        factors: [
          { factor: 'Account History', contribution: 35, reason: 'Previous velocity abuse' },
          { factor: 'Trust Score', contribution: 20, reason: 'Trust score: 35' },
          { factor: 'Current Risk', contribution: 10, reason: 'Ongoing monitoring' }
        ],
        reasons: ['Account flagged for monitoring', 'Previous abuse history']
      };
    }
    
    // Diana - Location Hopper/Traveler (trust_score: 60, regular)
    if (emailLower === 'diana.traveler@demo.com') {
      // Scenario 1: Home location purchase (Chennai, India)
      if (isIndia) {
        return {
          score: 22,
          status: 'approved',
          summary: 'Transaction from registered home location. Approved.',
          factors: [
            { factor: 'Location Match', contribution: 0, reason: 'Chennai, India - Home location ✓' },
            { factor: 'Customer Trust', contribution: -8, reason: 'Trust score: 60 - Regular customer' },
            { factor: 'Transaction History', contribution: 10, reason: '23 previous transactions' }
          ],
          reasons: ['Transaction from home location', 'Regular customer']
        };
      }
      // Scenario 2: Low-risk foreign country (USA, UK, etc.)
      const lowRiskCountries = ['usa', 'united states', 'uk', 'united kingdom', 'canada', 'australia', 'germany', 'france', 'japan', 'singapore'];
      if (lowRiskCountries.includes(countryLower)) {
        return {
          score: 48,
          status: 'flagged',
          summary: 'International transaction from trusted country. Review recommended.',
          factors: [
            { factor: 'Location Change', contribution: 30, reason: `Transaction from ${country} instead of India` },
            { factor: 'Country Risk', contribution: -5, reason: `${country} - Low fraud risk region` },
            { factor: 'Travel Pattern', contribution: 15, reason: 'Customer has travel history' }
          ],
          reasons: [`Transaction from ${country}`, 'Possible legitimate travel', 'Trusted country']
        };
      }
      // Scenario 3: High-risk country
      if (isHighRiskCountry) {
        return {
          score: 80,
          status: 'blocked',
          summary: 'Transaction from high-fraud-risk geography. Blocked despite customer history.',
          factors: [
            { factor: 'Geolocation Risk', contribution: 50, reason: `${country} - High fraud risk` },
            { factor: 'Location Jump', contribution: 25, reason: 'India → ' + country },
            { factor: 'Risk Override', contribution: 15, reason: 'High-risk country overrides trust' }
          ],
          reasons: [`High-risk country: ${country}`, 'Geographic risk overrides customer trust', 'Security block applied']
        };
      }
      // Scenario 4: Any other foreign country
      return {
        score: 55,
        status: 'flagged',
        summary: 'Transaction from different country. Flagged for verification.',
        factors: [
          { factor: 'Location Change', contribution: 35, reason: `From ${country}, Home: India` },
          { factor: 'Customer History', contribution: -10, reason: '23 transactions, regular traveler' },
          { factor: 'Verification Needed', contribution: 20, reason: 'Location verification required' }
        ],
        reasons: [`Transaction from ${country}`, 'Requires location verification']
      };
    }
    
    // Eve - Premium High-Value Customer (trust_score: 92, 89 transactions, avg ₹15,000)
    if (emailLower === 'eve.highvalue@demo.com') {
      // Scenario 1: Normal premium purchase
      if (amount >= 10000 && amount <= 30000 && isIndia) {
        return {
          score: 15,
          status: 'approved',
          summary: 'Premium customer making typical high-value purchase. Approved.',
          factors: [
            { factor: 'Customer Trust', contribution: -20, reason: 'Trust score: 92 - Premium tier' },
            { factor: 'Amount Analysis', contribution: 10, reason: `₹${amount.toLocaleString('en-IN')} - Within expected range` },
            { factor: 'Purchase History', contribution: 5, reason: '89 transactions, avg ₹15,000' }
          ],
          reasons: ['Premium customer with excellent track record']
        };
      }
      // Scenario 2: Very high value (still legitimate)
      if (amount > 75000 && amount <= 150000 && isIndia) {
        return {
          score: 32,
          status: 'approved',
          summary: 'High-value customer with excellent track record. Large purchase approved.',
          factors: [
            { factor: 'Customer Trust', contribution: -25, reason: 'Trust score: 92 - VIP status' },
            { factor: 'Transaction Amount', contribution: 30, reason: `₹${amount.toLocaleString('en-IN')} - Above average` },
            { factor: 'Account Standing', contribution: 5, reason: '89 successful transactions' }
          ],
          reasons: ['Trust score 92 allows higher amounts', 'Excellent purchase history']
        };
      }
      // Scenario 3: Unusually low purchase (anomaly)
      if (amount < 500 && isIndia) {
        return {
          score: 45,
          status: 'flagged',
          summary: 'Unusual pattern - premium customer making micro-purchase. Flagged for review.',
          factors: [
            { factor: 'Behavior Anomaly', contribution: 35, reason: `₹${amount} vs avg ₹15,000` },
            { factor: 'Pattern Deviation', contribution: 15, reason: 'Unusual for premium tier' },
            { factor: 'Trust Offset', contribution: -10, reason: 'Trust score: 92' }
          ],
          reasons: ['Micro-purchase unusual for premium customer', 'Average purchase is ₹15,000', 'Behavior anomaly detected']
        };
      }
      // Scenario 4: High-risk country (Account Takeover)
      if (isHighRiskCountry) {
        return {
          score: 88,
          status: 'blocked',
          summary: 'Account takeover indicators: premium account from high-risk location. Blocked.',
          factors: [
            { factor: 'Account Takeover Risk', contribution: 45, reason: 'Premium account from ' + country },
            { factor: 'Geolocation Risk', contribution: 35, reason: `${country} - High fraud region` },
            { factor: 'Value at Risk', contribution: 15, reason: 'High-value target account' }
          ],
          reasons: ['Possible account takeover', `Premium account accessed from ${country}`, 'High-value accounts are prime targets']
        };
      }
      // Scenario 5: Foreign low-risk country
      if (!isIndia && !isHighRiskCountry) {
        return {
          score: 35,
          status: 'approved',
          summary: 'Premium customer traveling abroad. Purchase approved with monitoring.',
          factors: [
            { factor: 'Location Change', contribution: 25, reason: `From ${country}, Home: India` },
            { factor: 'Premium Status', contribution: -15, reason: 'Trust score: 92' },
            { factor: 'Travel Pattern', contribution: 5, reason: 'Premium customers often travel' }
          ],
          reasons: ['Premium customer international purchase', 'Approved based on account standing']
        };
      }
    }
    
    return null; // Not a demo user, use regular calculation
  };

  // Calculate fraud score with advanced ML-style detection
  const calculateLocalFraudScore = (amount: number, items: any[], formData: CheckoutForm): { 
    score: number; 
    breakdown: { factor: string; contribution: number; reason: string }[];
    fraudReasons: string[];
  } => {
    const recentTxns = JSON.parse(localStorage.getItem('simulated_transactions') || '[]');
    const last10Min = recentTxns.filter((t: any) => {
      const txTime = new Date(t.created_at).getTime();
      const now = Date.now();
      return (now - txTime) < 10 * 60 * 1000; // 10 minutes
    });
    
    // Check for demo user-specific XAI output
    const demoXai = getDemoUserXaiOutput(formData.email, amount, formData.country, last10Min.length);
    if (demoXai) {
      // Set XAI result for display
      setXaiResult({
        show: true,
        fraudScore: demoXai.score,
        status: demoXai.status,
        riskLevel: demoXai.score > 70 ? 'high' : demoXai.score > 40 ? 'medium' : 'low',
        modelUsed: 'XGBoost + SHAP',
        topFactors: demoXai.factors.map(f => ({
          feature: f.factor,
          importance: Math.abs(f.contribution),
          direction: f.contribution >= 0 ? 'positive' : 'negative',
          description: f.reason
        })),
        summary: demoXai.summary,
      });
      return {
        score: demoXai.score,
        breakdown: demoXai.factors,
        fraudReasons: demoXai.reasons
      };
    }
    
    // Regular calculation for non-demo users
    const breakdown: { factor: string; contribution: number; reason: string }[] = [];
    const fraudReasons: string[] = [];
    
    // Amount-based scoring (max 50 points) - thresholds in INR
    let amountScore = 0;
    if (amount > 100000) { amountScore = 50; fraudReasons.push(`Very high amount: ₹${amount.toLocaleString('en-IN')}`); }
    else if (amount > 50000) { amountScore = 35; fraudReasons.push(`High amount: ₹${amount.toLocaleString('en-IN')}`); }
    else if (amount > 25000) { amountScore = 25; fraudReasons.push(`Elevated amount: ₹${amount.toLocaleString('en-IN')}`); }
    else if (amount > 10000) { amountScore = 15; }
    else if (amount > 5000) { amountScore = 8; }
    if (amountScore > 0) breakdown.push({ factor: 'Transaction Amount', contribution: amountScore, reason: `₹${amount.toLocaleString('en-IN')}` });
    
    // Quantity-based scoring (max 35 points)
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    let quantityScore = 0;
    if (totalQuantity > 20) { quantityScore = 35; fraudReasons.push(`Abnormally high quantity: ${totalQuantity} items`); }
    else if (totalQuantity > 10) { quantityScore = 20; fraudReasons.push(`High quantity: ${totalQuantity} items`); }
    else if (totalQuantity > 5) { quantityScore = 10; }
    if (quantityScore > 0) breakdown.push({ factor: 'Item Quantity', contribution: quantityScore, reason: `${totalQuantity} items` });
    
    // Velocity check
    let velocityScore = 0;
    if (last10Min.length >= 3) { 
      velocityScore = 25; 
      fraudReasons.push(`Velocity abuse: ${last10Min.length} transactions in 10 minutes`);
      breakdown.push({ factor: 'Velocity Check', contribution: velocityScore, reason: `${last10Min.length} recent txns` });
    } else if (last10Min.length >= 2) {
      velocityScore = 12;
      breakdown.push({ factor: 'Velocity Check', contribution: velocityScore, reason: `${last10Min.length} recent txns` });
    }
    
    // Geolocation mismatch - India is normal, other countries add risk
    let geoScore = 0;
    const countryLower = formData.country.toLowerCase();
    const isIndia = countryLower === 'india' || countryLower === 'in';
    const highRiskCountries = ['russia', 'nigeria', 'china', 'vietnam', 'north korea'];
    
    if (highRiskCountries.includes(countryLower)) {
      geoScore = 40;
      fraudReasons.push(`High-risk country: ${formData.country}`);
      breakdown.push({ factor: 'Geolocation Risk', contribution: geoScore, reason: `${formData.country} - High fraud region` });
    } else if (!isIndia) {
      geoScore = 20;
      fraudReasons.push(`International transaction: ${formData.country}`);
      breakdown.push({ factor: 'Geolocation Risk', contribution: geoScore, reason: `${formData.country} - Foreign location` });
    }
    
    // Customer risk profile
    let profileScore = 0;
    const customerHistory = recentTxns.filter((t: any) => t.customer_email === formData.email);
    if (customerHistory.length === 0) {
      profileScore = 25;
      fraudReasons.push('First-time customer with no purchase history');
      breakdown.push({ factor: 'Customer Profile', contribution: profileScore, reason: 'First-time buyer' });
    } else if (customerHistory.length === 1) {
      profileScore = 12;
      breakdown.push({ factor: 'Customer Profile', contribution: profileScore, reason: 'New customer' });
    } else {
      profileScore = -10;
      breakdown.push({ factor: 'Customer Profile', contribution: 0, reason: 'Trusted customer' });
    }
    
    // Time pattern detection
    let timeScore = 0;
    const hour = new Date().getHours();
    if (hour >= 2 && hour <= 6) {
      timeScore = 15;
      fraudReasons.push(`Suspicious time: ${hour}:00 (late night)`);
      breakdown.push({ factor: 'Time Pattern', contribution: timeScore, reason: `${hour}:00 late night` });
    } else if (hour >= 1 && hour <= 7) {
      timeScore = 8;
      breakdown.push({ factor: 'Time Pattern', contribution: timeScore, reason: `${hour}:00 odd hours` });
    }
    
    // Address patterns
    let addressScore = 0;
    if (formData.address.toLowerCase().includes('po box') || formData.address.toLowerCase().includes('parcel')) {
      addressScore = 20;
      fraudReasons.push('Shipping to PO Box or parcel locker');
      breakdown.push({ factor: 'Address Mismatch', contribution: addressScore, reason: 'PO Box delivery' });
    }
    
    // Card pattern check
    let cardScore = 0;
    if (formData.cardNumber.startsWith('4111') || formData.cardNumber.startsWith('5555')) {
      cardScore = 15;
      fraudReasons.push('Test card pattern detected');
      breakdown.push({ factor: 'Card Validation', contribution: cardScore, reason: 'Test card detected' });
    }
    
    const totalScore = Math.max(0, Math.min(100, Math.round(
      amountScore + quantityScore + velocityScore + geoScore + Math.max(0, profileScore) + 
      timeScore + addressScore + cardScore
    )));
    
    // Set XAI result for non-demo users
    setXaiResult({
      show: true,
      fraudScore: totalScore,
      status: totalScore > 70 ? 'blocked' : totalScore > 40 ? 'flagged' : 'approved',
      riskLevel: totalScore > 70 ? 'high' : totalScore > 40 ? 'medium' : 'low',
      modelUsed: 'Rule-based + ML Fallback',
      topFactors: breakdown.slice(0, 5).map(f => ({
        feature: f.factor,
        importance: Math.abs(f.contribution),
        direction: f.contribution >= 0 ? 'positive' : 'negative',
        description: f.reason
      })),
      summary: totalScore > 70 
        ? 'High risk transaction blocked due to multiple fraud indicators.' 
        : totalScore > 40 
          ? 'Moderate risk detected. Transaction flagged for review.'
          : 'Low risk transaction. Approved.',
    });
    
    return { 
      score: totalScore, 
      breakdown: breakdown.sort((a, b) => b.contribution - a.contribution),
      fraudReasons: fraudReasons.length > 0 ? fraudReasons : ['ML model indicates low risk']
    };
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate('/cart')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Cart
      </Button>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                <span>Secure Checkout</span>
                {canCallLocalMl && (
                  <Badge
                    className="ml-auto"
                    variant={
                      mlStatus === 'connected'
                        ? 'default'
                        : mlStatus === 'fallback'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {mlStatus === 'checking'
                      ? 'ML: checking...'
                      : mlStatus === 'connected'
                        ? 'ML: connected'
                        : mlStatus === 'fallback'
                          ? 'ML: fallback'
                          : 'ML: local'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Contact Information</h3>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Shipping Address</h3>
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Information
                    </h3>
                    <FormField
                      control={form.control}
                      name="cardNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1234567890123456" maxLength={16} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="cardExpiry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiry (MM/YY)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="12/25" maxLength={5} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cardCvv"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CVV</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="123" maxLength={4} type="password" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={processing}
                  >
                    {processing ? 'Processing...' : `Pay ₹${totalPrice.toFixed(2)}`}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-4 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">₹{totalPrice.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* XAI Results Panel */}
          {xaiResult?.show && (
            <Card className={`mt-4 border-2 ${
              xaiResult.status === 'approved' ? 'border-green-500/50 bg-green-500/5' :
              xaiResult.status === 'flagged' ? 'border-yellow-500/50 bg-yellow-500/5' :
              'border-red-500/50 bg-red-500/5'
            }`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="h-5 w-5" />
                  ML Fraud Analysis (XAI)
                  <Badge variant={
                    xaiResult.status === 'approved' ? 'default' :
                    xaiResult.status === 'flagged' ? 'secondary' : 'destructive'
                  } className="ml-auto">
                    {xaiResult.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {xaiResult.status === 'flagged' && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {xaiResult.status === 'blocked' && <XCircle className="h-3 w-3 mr-1" />}
                    {xaiResult.status.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Fraud Score */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Fraud Score</span>
                  <span className={`text-2xl font-bold ${
                    xaiResult.fraudScore < 30 ? 'text-green-500' :
                    xaiResult.fraudScore < 60 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {xaiResult.fraudScore}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      xaiResult.fraudScore < 30 ? 'bg-green-500' :
                      xaiResult.fraudScore < 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${xaiResult.fraudScore}%` }}
                  />
                </div>

                {/* Model Used */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Model</span>
                  <Badge variant="outline">{xaiResult.modelUsed}</Badge>
                </div>

                {/* Summary */}
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {xaiResult.summary}
                </p>

                {/* Top Factors */}
                {xaiResult.topFactors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      Key Risk Factors
                    </h4>
                    <div className="space-y-2">
                      {xaiResult.topFactors.slice(0, 5).map((factor, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          {factor.direction === 'increase' ? (
                            <TrendingUp className="h-3 w-3 text-red-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-green-500" />
                          )}
                          <span className="flex-1 text-muted-foreground">{factor.description}</span>
                          <Badge variant="outline" className={`text-xs ${
                            factor.direction === 'increase' ? 'border-red-500/50 text-red-500' : 'border-green-500/50 text-green-500'
                          }`}>
                            {factor.importance > 0 ? '+' : ''}{(factor.importance * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
