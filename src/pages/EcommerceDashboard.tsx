import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ShoppingBag, User, CreditCard, MapPin, Clock, Shield, 
  TrendingUp, AlertTriangle, CheckCircle, XCircle, LogOut,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EcommerceCustomer {
  id: string;
  email: string;
  name: string;
  phone: string;
  city: string;
  country: string;
  trust_score: number;
  total_transactions: number;
  average_transaction_amount: number;
  average_purchase_hour: number;
  is_blocked: boolean;
  created_at: string;
}

interface Transaction {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  fraud_score: number;
  status: string;
  risk_level: string;
  purchase_hour: number;
  ip_address: string;
  city: string;
  country: string;
  device_fingerprint: string;
  risk_factors: string[];
  ml_model_used: string;
  created_at: string;
}

const EcommerceDashboard = () => {
  const [customer, setCustomer] = useState<EcommerceCustomer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const storedCustomer = localStorage.getItem("ecommerce_customer");
    if (!storedCustomer) {
      navigate("/ecommerce/login");
      return;
    }

    const customerData = JSON.parse(storedCustomer);
    setCustomer(customerData);
    fetchTransactions(customerData.id);
  }, [navigate]);

  const fetchTransactions = async (customerId: string) => {
    try {
      // Cast for new table not yet in types
      const { data, error } = await (supabase as any)
        .from("ecommerce_customer_transactions")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Parse risk_factors from JSONB
      const parsedTransactions = (data || []).map((t: any) => ({
        ...t,
        risk_factors: Array.isArray(t.risk_factors) ? t.risk_factors : JSON.parse(t.risk_factors || '[]')
      }));
      
      setTransactions(parsedTransactions as Transaction[]);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      toast({
        title: "Error",
        description: "Failed to load transaction history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("ecommerce_customer");
    navigate("/ecommerce/login");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: React.ReactNode }> = {
      approved: { color: "bg-green-500/10 text-green-500 border-green-500/20", icon: <CheckCircle className="w-3 h-3" /> },
      flagged: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: <AlertTriangle className="w-3 h-3" /> },
      blocked: { color: "bg-red-500/10 text-red-500 border-red-500/20", icon: <XCircle className="w-3 h-3" /> },
      pending: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: <Clock className="w-3 h-3" /> },
    };
    const variant = variants[status] || variants.pending;
    return (
      <Badge className={`${variant.color} border flex items-center gap-1`}>
        {variant.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRiskBadge = (level: string) => {
    const colors: Record<string, string> = {
      low: "bg-green-500/10 text-green-500",
      medium: "bg-yellow-500/10 text-yellow-500",
      high: "bg-orange-500/10 text-orange-500",
      critical: "bg-red-500/10 text-red-500",
    };
    return <Badge className={colors[level] || colors.low}>{level.toUpperCase()}</Badge>;
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    if (score >= 30) return "text-orange-500";
    return "text-red-500";
  };

  const formatCurrency = (amount: number, currency: string = "INR") => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading || !customer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = {
    totalSpent: transactions.reduce((sum, t) => sum + Number(t.amount), 0),
    approvedCount: transactions.filter(t => t.status === "approved").length,
    flaggedCount: transactions.filter(t => t.status === "flagged").length,
    blockedCount: transactions.filter(t => t.status === "blocked").length,
    avgFraudScore: transactions.length > 0 
      ? Math.round(transactions.reduce((sum, t) => sum + t.fraud_score, 0) / transactions.length)
      : 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">E-Commerce Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-medium">{customer.name}</div>
              <div className="text-xs text-muted-foreground">{customer.email}</div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Customer Profile Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 card-3d">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-muted-foreground">Location</div>
                <div className="font-medium flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {customer.city}, {customer.country}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Transactions</div>
                <div className="font-medium">{customer.total_transactions}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Avg. Transaction</div>
                <div className="font-medium">{formatCurrency(customer.average_transaction_amount)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Usual Purchase Hour</div>
                <div className="font-medium flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {customer.average_purchase_hour}:00
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trust Score Card */}
          <Card className="card-3d">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Trust Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-5xl font-bold ${getTrustScoreColor(customer.trust_score)}`}>
                {customer.trust_score}
              </div>
              <Progress value={customer.trust_score} className="mt-4" />
              <p className="text-sm text-muted-foreground mt-2">
                {customer.trust_score >= 80 ? "Excellent standing" :
                 customer.trust_score >= 50 ? "Good standing" :
                 customer.trust_score >= 30 ? "Needs attention" : "High risk account"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="card-3d">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Spent</div>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</div>
            </CardContent>
          </Card>
          <Card className="card-3d">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Approved</div>
              <div className="text-2xl font-bold text-green-500">{stats.approvedCount}</div>
            </CardContent>
          </Card>
          <Card className="card-3d">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Flagged</div>
              <div className="text-2xl font-bold text-yellow-500">{stats.flaggedCount}</div>
            </CardContent>
          </Card>
          <Card className="card-3d">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Blocked</div>
              <div className="text-2xl font-bold text-red-500">{stats.blockedCount}</div>
            </CardContent>
          </Card>
          <Card className="card-3d">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Avg. Fraud Score</div>
              <div className="text-2xl font-bold">{stats.avgFraudScore}</div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card className="card-3d">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Transaction History
            </CardTitle>
            <CardDescription>
              Your complete transaction history with fraud detection analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found
                </div>
              ) : (
                transactions.map((txn) => (
                  <div 
                    key={txn.id} 
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm">{txn.order_id}</span>
                          {getStatusBadge(txn.status)}
                          {getRiskBadge(txn.risk_level)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatDate(txn.created_at)} • {txn.city}, {txn.country} • {txn.purchase_hour}:00
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="font-bold text-lg">{formatCurrency(txn.amount, txn.currency)}</div>
                          <div className="text-xs text-muted-foreground">
                            Fraud Score: <span className={txn.fraud_score >= 70 ? "text-red-500" : txn.fraud_score >= 40 ? "text-yellow-500" : "text-green-500"}>
                              {txn.fraud_score}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Risk Factors */}
                    {txn.risk_factors && txn.risk_factors.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium text-muted-foreground mb-2">Risk Factors:</div>
                        <div className="flex flex-wrap gap-2">
                          {txn.risk_factors.map((factor, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ML Model Used */}
                    <div className="mt-2 text-xs text-muted-foreground">
                      Analyzed by: <span className="font-mono">{txn.ml_model_used || "rule_based"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EcommerceDashboard;
