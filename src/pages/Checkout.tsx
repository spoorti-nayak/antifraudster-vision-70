import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, CreditCard, Loader2, ShoppingBag } from 'lucide-react';
import { getStripePriceId, hasStripePrice } from '@/config/stripe-products';

const checkoutSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }).max(255),
  fullName: z.string().trim().min(3, { message: 'Name must be at least 3 characters' }).max(100),
  address: z.string().trim().min(5, { message: 'Address must be at least 5 characters' }).max(500),
  city: z.string().trim().min(2, { message: 'City must be at least 2 characters' }).max(100),
  postalCode: z.string().trim().min(3, { message: 'Postal code must be at least 3 characters' }).max(20),
  country: z.string().trim().min(2, { message: 'Country must be at least 2 characters' }).max(100),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
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
    },
  });

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6 text-center">
              Add some items to your cart before checking out
            </p>
            <Button onClick={() => navigate('/shop')}>
              Continue Shopping
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSubmit = async (data: CheckoutForm) => {
    setProcessing(true);

    try {
      // Validate all items have Stripe prices configured
      const invalidItems = items.filter(item => !hasStripePrice(item.product_id));
      if (invalidItems.length > 0) {
        toast.error('Some products are not configured for payment. Please contact support.');
        console.error('Missing Stripe price IDs for:', invalidItems);
        setProcessing(false);
        return;
      }

      // Prepare items for Stripe checkout
      const checkoutItems = items.map(item => ({
        product_id: item.product_id,
        price_id: getStripePriceId(item.product_id)!,
        quantity: item.quantity || 1,
        name: item.name,
        price: item.price,
      }));

      const shippingAddress = `${data.address}, ${data.city}, ${data.postalCode}, ${data.country}`;

      // Call Stripe checkout edge function
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        'create-checkout',
        {
          body: {
            items: checkoutItems,
            customer_email: data.email,
            shipping_address: shippingAddress,
          },
        }
      );

      if (checkoutError) {
        console.error('Checkout error:', checkoutError);
        toast.error('Failed to create checkout session. Please try again.');
        setProcessing(false);
        return;
      }

      if (!checkoutData?.url) {
        toast.error('Invalid checkout response. Please try again.');
        setProcessing(false);
        return;
      }

      // Clear cart and redirect to Stripe Checkout
      clearCart();
      toast.success('Redirecting to secure payment...');
      
      // Open Stripe Checkout in new tab
      window.open(checkoutData.url, '_blank');
      
      // Redirect current tab to shop after short delay
      setTimeout(() => {
        navigate('/shop');
      }, 1500);

    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('An unexpected error occurred. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link to="/cart">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cart
            </Button>
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Checkout Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Secure Checkout
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="your@email.com" 
                            {...field} 
                            disabled={processing}
                          />
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
                          <Input 
                            placeholder="John Doe" 
                            {...field} 
                            disabled={processing}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="123 Main St, Apt 4" 
                            {...field} 
                            disabled={processing}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="New York" 
                              {...field} 
                              disabled={processing}
                            />
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
                            <Input 
                              placeholder="10001" 
                              {...field} 
                              disabled={processing}
                            />
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
                          <Input 
                            placeholder="United States" 
                            {...field} 
                            disabled={processing}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Proceed to Payment
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Powered by Stripe. Your payment information is secure.
                  </p>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity || 1}
                      </p>
                    </div>
                    <p className="font-semibold">
                      ${(item.price * (item.quantity || 1)).toFixed(2)}
                    </p>
                  </div>
                ))}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                  <p className="font-semibold">What happens next?</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>You'll be redirected to Stripe's secure payment page</li>
                    <li>Enter your card details safely</li>
                    <li>Your order will be processed automatically</li>
                    <li>Receive a confirmation email</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
