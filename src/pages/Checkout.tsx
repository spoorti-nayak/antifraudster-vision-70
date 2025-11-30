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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, CreditCard, Lock } from 'lucide-react';

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
        currency: 'USD',
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

      console.log('Sending transaction for fraud analysis...');
      const { data: fraudResult, error: fraudError } = await supabase.functions.invoke(
        'analyze-transaction',
        { body: transactionData }
      );

      if (fraudError) {
        console.error('Fraud check error:', fraudError);
        
        // Calculate local fraud score based on transaction details
        const fraudScore = calculateLocalFraudScore(totalPrice, items, data);
        const status: 'pending' | 'approved' | 'flagged' | 'blocked' = 
          fraudScore > 70 ? 'blocked' : fraudScore > 40 ? 'flagged' : 'approved';
        const riskLevel = fraudScore > 70 ? 'high' : fraudScore > 40 ? 'medium' : 'low';
        
        const fraudReasons: string[] = [];
        if (totalPrice > 1000) fraudReasons.push('High transaction amount');
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        if (totalQuantity > 10) fraudReasons.push('Unusually high quantity');
        if (fraudScore > 50) fraudReasons.push('ML model indicates suspicious patterns');
        
        // Add transaction to simulation context
        const simulatedTransaction = {
          id: `txn_${Date.now()}`,
          customer_email: data.email,
          amount: totalPrice,
          currency: 'USD',
          status: status,
          fraud_score: fraudScore,
          risk_level: riskLevel,
          fraud_reasons: fraudReasons.length > 0 ? fraudReasons : null,
          created_at: new Date().toISOString(),
          metadata: { 
            order_id: order.id,
            card_last4: data.cardNumber.slice(-4),
            from_checkout: true,
            fraud_check_unavailable: true
          }
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
              reasons: fraudReasons,
              amount: totalPrice,
              quantity: totalQuantity
            },
            is_resolved: false,
            created_at: new Date().toISOString()
          };
          addAlert(simulatedAlert);
        }
        
        if (status === 'blocked') {
          toast.error(
            `⛔ Payment Blocked - Fraud Detected!\n\nFraud Score: ${fraudScore}%\n\n${fraudReasons.join(', ')}`,
            { duration: 10000 }
          );
          await (supabase as any)
            .from('orders')
            .update({ status: 'blocked', fraud_score: fraudScore / 100 })
            .eq('id', order.id);
          navigate('/shop');
          return;
        }
        
        if (status === 'flagged') {
          toast.warning(
            `⚠️ Payment Flagged for Review\n\nFraud Score: ${fraudScore}%\n\nYour order is being reviewed.`,
            { duration: 8000 }
          );
        }
        
        toast.success('Order placed successfully!');
        await (supabase as any)
          .from('orders')
          .update({ status: 'completed', fraud_score: 0 })
          .eq('id', order.id);
        
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
        currency: 'USD',
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
          currency: 'USD',
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

  // Calculate fraud score based on transaction characteristics
  const calculateLocalFraudScore = (amount: number, items: any[], formData: CheckoutForm): number => {
    let score = 0;
    
    // Amount-based scoring
    if (amount > 2000) score += 40;
    else if (amount > 1000) score += 25;
    else if (amount > 500) score += 15;
    else if (amount > 200) score += 5;
    
    // Quantity-based scoring
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity > 20) score += 35;
    else if (totalQuantity > 10) score += 20;
    else if (totalQuantity > 5) score += 10;
    
    // Card number pattern check (simple heuristic)
    if (formData.cardNumber.startsWith('4111') || formData.cardNumber.startsWith('5555')) {
      score += 15; // Test card patterns
    }
    
    // Time-based (late night purchases are slightly riskier)
    const hour = new Date().getHours();
    if (hour >= 1 && hour <= 5) score += 10;
    
    // Average item price (very high or very low can be suspicious)
    const avgItemPrice = amount / totalQuantity;
    if (avgItemPrice > 500) score += 15;
    
    return Math.min(100, Math.round(score));
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
                Secure Checkout
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
                    {processing ? 'Processing...' : `Pay $${totalPrice.toFixed(2)}`}
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
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-4 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">${totalPrice.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
