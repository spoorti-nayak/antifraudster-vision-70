import { useState, useEffect } from "react";
import { ArrowLeft, CreditCard, AlertTriangle, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Product {
  id: string;
  name: string;
  price: number;
}

const ShopCheckout = () => {
  const [cartItems, setCartItems] = useState<{product: Product, quantity: number}[]>([]);
  const [loading, setLoading] = useState(false);
  const [fraudCheckResult, setFraudCheckResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    const savedCart = JSON.parse(localStorage.getItem('shop_cart') || '{}');
    const productIds = Object.keys(savedCart);

    if (productIds.length === 0) {
      navigate('/shop/cart');
      return;
    }

    const { data } = await supabase
      .from('products')
      .select('id, name, price')
      .in('id', productIds);

    const items = (data || []).map(product => ({
      product,
      quantity: savedCart[product.id]
    }));

    setCartItems(items);
  };

  const total = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFraudCheckResult(null);

    try {
      // Get e-commerce settings to check if AntiFraudster is enabled
      const { data: settings } = await supabase
        .from('ecommerce_settings')
        .select('*')
        .single();

      let fraudResult = null;

      // If AntiFraudster is enabled and API key is set, check for fraud
      if (settings?.antifraudster_enabled && settings?.antifraudster_api_key) {
        // Call the process-order edge function which will handle fraud detection
        const { data: orderResult, error: orderError } = await supabase.functions.invoke('process-order', {
          body: {
            customerEmail: formData.email,
            customerName: formData.name,
            customerPhone: formData.phone,
            amount: total,
            currency: 'USD',
            paymentMethod: 'card',
            cardLast4: formData.cardNumber.slice(-4),
            cardBin: formData.cardNumber.slice(0, 6),
            shippingAddress: {
              address: formData.address,
              city: formData.city,
              state: formData.state,
              zip: formData.zip
            },
            items: cartItems.map(item => ({
              productId: item.product.id,
              productName: item.product.name,
              price: item.product.price,
              quantity: item.quantity
            })),
            apiKey: settings.antifraudster_api_key
          }
        });

        if (orderError) throw orderError;

        fraudResult = orderResult;
        setFraudCheckResult(fraudResult);

        // If transaction is blocked, show error
        if (fraudResult?.status === 'blocked' || fraudResult?.isBlocked) {
          toast.error('Transaction blocked due to fraud detection');
          return;
        }

        // If flagged, show warning but allow to proceed
        if (fraudResult?.status === 'flagged' || fraudResult?.riskLevel === 'high') {
          toast.warning('This transaction has been flagged for review');
        }
      } else {
        // No fraud detection - process order directly
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            customer_email: formData.email,
            customer_name: formData.name,
            customer_phone: formData.phone,
            total_amount: total,
            currency: 'USD',
            status: 'completed',
            payment_method: 'card',
            shipping_address: {
              address: formData.address,
              city: formData.city,
              state: formData.state,
              zip: formData.zip
            }
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Insert order items
        await supabase
          .from('order_items')
          .insert(
            cartItems.map(item => ({
              order_id: order.id,
              product_id: item.product.id,
              product_name: item.product.name,
              product_price: item.product.price,
              quantity: item.quantity,
              subtotal: item.product.price * item.quantity
            }))
          );
      }

      // Clear cart
      localStorage.removeItem('shop_cart');
      toast.success('Order placed successfully!');
      navigate('/shop/success');

    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to process order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/shop/cart')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </Button>

        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      name="address"
                      required
                      value={formData.address}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        name="city"
                        required
                        value={formData.city}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        name="state"
                        required
                        value={formData.state}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      name="zip"
                      required
                      value={formData.zip}
                      onChange={handleInputChange}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      name="cardNumber"
                      required
                      placeholder="1234 5678 9012 3456"
                      maxLength={16}
                      value={formData.cardNumber}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cardExpiry">Expiry</Label>
                      <Input
                        id="cardExpiry"
                        name="cardExpiry"
                        required
                        placeholder="MM/YY"
                        value={formData.cardExpiry}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cardCvv">CVV</Label>
                      <Input
                        id="cardCvv"
                        name="cardCvv"
                        required
                        placeholder="123"
                        maxLength={3}
                        value={formData.cardCvv}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {fraudCheckResult && (
                <Alert variant={fraudCheckResult.status === 'blocked' ? 'destructive' : 'default'}>
                  {fraudCheckResult.status === 'blocked' ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : fraudCheckResult.status === 'flagged' ? (
                    <Shield className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <strong>Fraud Check: </strong>
                    {fraudCheckResult.aiExplanation || fraudCheckResult.message || 'Transaction verified'}
                    <div className="mt-2 text-sm">
                      Risk Level: {fraudCheckResult.riskLevel} | Score: {fraudCheckResult.fraudScore}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
              </Button>
            </form>
          </div>

          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map(({ product, quantity }) => (
                  <div key={product.id} className="flex justify-between text-sm">
                    <span>{product.name} x{quantity}</span>
                    <span>${(product.price * quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopCheckout;
