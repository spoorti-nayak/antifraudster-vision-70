import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const ShopSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-6">
          <div className="w-20 h-20 bg-safe/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-safe" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Order Successful!</h1>
            <p className="text-muted-foreground">
              Thank you for your purchase. Your order has been placed successfully.
            </p>
          </div>
          <div className="space-y-2">
            <Button onClick={() => navigate('/shop')} className="w-full">
              Continue Shopping
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopSuccess;
