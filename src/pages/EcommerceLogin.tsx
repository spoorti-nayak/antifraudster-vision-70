import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, ShoppingBag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EcommerceCustomer {
  id: string;
  email: string;
  name: string;
  city: string;
  country: string;
  trust_score: number;
  total_transactions: number;
}

const EcommerceLogin = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Demo accounts for quick login
  const demoAccounts = [
    { email: "priya.sharma@gmail.com", name: "Priya Sharma", type: "Trusted Regular", color: "text-green-500" },
    { email: "amit.kumar@yahoo.com", name: "Amit Kumar", type: "New Customer", color: "text-yellow-500" },
    { email: "raj.patel@hotmail.com", name: "Raj Patel", type: "Velocity Abuser", color: "text-red-500" },
    { email: "sneha.reddy@gmail.com", name: "Sneha Reddy", type: "Location Hopper", color: "text-orange-500" },
    { email: "vikram.singh@outlook.com", name: "Vikram Singh", type: "High-Value Buyer", color: "text-blue-500" },
  ];

  const handleLogin = async (customerEmail: string) => {
    setIsLoading(true);
    try {
      // Fetch customer from ecommerce_customers table (cast for new table)
      const { data: customer, error } = await (supabase as any)
        .from("ecommerce_customers")
        .select("*")
        .eq("email", customerEmail)
        .single();

      if (error || !customer) {
        toast({
          title: "Customer not found",
          description: "No e-commerce customer account found with this email.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Store customer in localStorage for session
      localStorage.setItem("ecommerce_customer", JSON.stringify(customer));
      
      toast({
        title: "Welcome back!",
        description: `Logged in as ${customer.name}`,
      });

      navigate("/ecommerce/dashboard");
    } catch (err) {
      toast({
        title: "Login failed",
        description: "An error occurred during login.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <ShoppingBag className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">E-Commerce Portal</h1>
          <p className="text-muted-foreground mt-2">Customer Login (Demo)</p>
        </div>

        {/* Login Card */}
        <Card className="card-3d">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Select a demo customer account to explore different fraud scenarios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter customer email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button 
              className="w-full gradient-primary" 
              onClick={() => handleLogin(email)}
              disabled={isLoading || !email}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or select a demo account</span>
              </div>
            </div>

            {/* Demo Accounts */}
            <div className="space-y-2">
              {demoAccounts.map((account) => (
                <Button
                  key={account.email}
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                  onClick={() => handleLogin(account.email)}
                  disabled={isLoading}
                >
                  <User className="mr-3 h-4 w-4" />
                  <div className="text-left flex-1">
                    <div className="font-medium">{account.name}</div>
                    <div className="text-xs text-muted-foreground">{account.email}</div>
                  </div>
                  <span className={`text-xs font-medium ${account.color}`}>
                    {account.type}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Back to main app */}
        <div className="text-center">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to Merchant Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EcommerceLogin;
