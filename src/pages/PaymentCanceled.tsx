import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, ArrowLeft, ShoppingCart } from 'lucide-react';

export default function PaymentCanceled() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">Payment Canceled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            Your payment was canceled. No charges have been made to your account.
          </p>

          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/cart')} className="w-full">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Return to Cart
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/shop')}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Shop
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
