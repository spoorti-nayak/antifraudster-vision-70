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

  // Calculate fraud score with advanced ML-style detection
  const calculateLocalFraudScore = (amount: number, items: any[], formData: CheckoutForm): { 
    score: number; 
    breakdown: { factor: string; contribution: number; reason: string }[];
    fraudReasons: string[];
  } => {
    const breakdown: { factor: string; contribution: number; reason: string }[] = [];
    const fraudReasons: string[] = [];
    
    // Amount-based scoring (max 50 points) - thresholds in INR
    // Lower thresholds for more sensitive fraud detection
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
    
    // Velocity check (max 25 points) - check localStorage for recent transactions
    let velocityScore = 0;
    const recentTxns = JSON.parse(localStorage.getItem('simulated_transactions') || '[]');
    const last10Min = recentTxns.filter((t: any) => {
      const txTime = new Date(t.created_at).getTime();
      const now = Date.now();
      return (now - txTime) < 10 * 60 * 1000; // 10 minutes
    });
    if (last10Min.length >= 3) { 
      velocityScore = 25; 
      fraudReasons.push(`Velocity abuse: ${last10Min.length} transactions in 10 minutes`);
      breakdown.push({ factor: 'Velocity Check', contribution: velocityScore, reason: `${last10Min.length} recent txns` });
    } else if (last10Min.length >= 2) {
      velocityScore = 12;
      breakdown.push({ factor: 'Velocity Check', contribution: velocityScore, reason: `${last10Min.length} recent txns` });
    }
    
    // Geolocation mismatch (max 20 points) - simulate checking if country from formData doesn't match IP
    let geoScore = 0;
    const suspiciousCountries = ['Russia', 'Nigeria', 'China', 'Vietnam'];
    if (suspiciousCountries.includes(formData.country)) {
      geoScore = 20;
      fraudReasons.push(`High-risk country: ${formData.country}`);
      breakdown.push({ factor: 'Geolocation Risk', contribution: geoScore, reason: `${formData.country}` });
    }
    
    // Customer risk profile (max 25 points) - first-time vs returning customer
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
      // Returning customer with good history reduces risk
      profileScore = -10;
      breakdown.push({ factor: 'Customer Profile', contribution: 0, reason: 'Trusted customer' });
    }
    
    // Time pattern detection (max 15 points) - suspicious late-night hours
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
    
    // Shipping vs Billing mismatch (max 20 points)
    let addressScore = 0;
    // Simple check: if city differs, flag it
    const shippingCity = formData.city.toLowerCase().trim();
    const billingCity = formData.city.toLowerCase().trim(); // In real scenario, you'd have separate billing city
    // Simulate: if address contains "PO Box" or "Parcel Locker" it's suspicious
    if (formData.address.toLowerCase().includes('po box') || formData.address.toLowerCase().includes('parcel')) {
      addressScore = 20;
      fraudReasons.push('Shipping to PO Box or parcel locker');
      breakdown.push({ factor: 'Address Mismatch', contribution: addressScore, reason: 'PO Box delivery' });
    } else if (formData.country !== 'USA' && formData.country !== 'United States') {
      addressScore = 10;
      breakdown.push({ factor: 'Address Mismatch', contribution: addressScore, reason: 'International shipping' });
    }
    
    // Card pattern check (max 15 points)
    let cardScore = 0;
    if (formData.cardNumber.startsWith('4111') || formData.cardNumber.startsWith('5555')) {
      cardScore = 15;
      fraudReasons.push('Test card pattern detected');
      breakdown.push({ factor: 'Card Validation', contribution: cardScore, reason: 'Test card detected' });
    }
    
    // Average item price anomaly (max 10 points)
    let priceScore = 0;
    const avgItemPrice = amount / totalQuantity;
    if (avgItemPrice > 500) {
      priceScore = 10;
      breakdown.push({ factor: 'Price Anomaly', contribution: priceScore, reason: `Avg ₹${avgItemPrice.toFixed(0)}/item` });
    }
    
    const totalScore = Math.max(0, Math.min(100, Math.round(
      amountScore + quantityScore + velocityScore + geoScore + Math.max(0, profileScore) + 
      timeScore + addressScore + cardScore + priceScore
    )));
    
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
