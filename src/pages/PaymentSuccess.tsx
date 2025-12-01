import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      toast.error('No payment session found');
      navigate('/shop');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { session_id: sessionId },
      });

      if (error) throw error;

      if (data.paid) {
        setPaymentDetails(data);
        toast.success('Payment successful!');
      } else {
        toast.error('Payment was not completed');
        navigate('/payment-canceled');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      toast.error('Failed to verify payment');
    } finally {
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Verifying your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {paymentDetails && (
            <div className="space-y-4 rounded-lg bg-muted p-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-semibold">
                  ${paymentDetails.amount_total?.toFixed(2)} {paymentDetails.currency?.toUpperCase()}
                </span>
              </div>
              {paymentDetails.customer_email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-semibold">{paymentDetails.customer_email}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {paymentDetails.payment_status}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Thank you for your purchase! A confirmation email has been sent to your email address.
            </p>

            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate('/shop')} className="w-full">
                Continue Shopping
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="w-full"
              >
                View Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
