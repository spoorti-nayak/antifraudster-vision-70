import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ShoppingBag, User, CreditCard, MapPin, Clock, Shield, 
  AlertTriangle, CheckCircle, XCircle, LogOut, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CustomerProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  home_city: string;
  home_country: string;
  trust_score: number;
  total_transactions: number;
  average_transaction_amount: number;
  average_purchase_hour: number;
  avg_time_to_buy_seconds: number;
  is_blocked: boolean;
  customer_type: string;
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
  case_label: string | null;
  time_to_buy_seconds: number | null;
  purchase_hour: number;
  ip_address: string;
  location_city: string;
  location_country: string;
  device_fingerprint: string;
  risk_factors: string[];
  ml_model_used: string;
  velocity_1h: number;
  created_at: string;
}

const EcommerceDashboard = () => {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndLoad();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/ecommerce/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuthAndLoad = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/ecommerce/login");
        return;
      }

      setUserEmail(session.user.email || "");
      await loadProfile(session.user.id);
      await loadTransactions(session.user.id);
    } catch (err) {
      console.error("Auth check error:", err);
      navigate("/ecommerce/login");
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("ecommerce_customer_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Profile load error:", error);
        toast({
          title: "Profile not found",
          description: "Your e-commerce profile could not be loaded.",
          variant: "destructive",
        });
        return;
      }

      setProfile(data as unknown as CustomerProfile);
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  };

  const loadTransactions = async (userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("ecommerce_transactions")
        .select("*")
        .eq("customer_user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Transactions load error:", error);
        return;
      }

      const parsedTransactions = (data || []).map((t: any) => ({
        ...t,
        risk_factors: Array.isArray(t.risk_factors) ? t.risk_factors : JSON.parse(t.risk_factors || '[]')
      }));

      setTransactions(parsedTransactions as Transaction[]);
    } catch (err) {
      console.error("Error loading transactions:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 text-center">
          <CardTitle className="mb-4">Profile Not Found</CardTitle>
          <CardDescription className="mb-4">
            Your e-commerce customer profile could not be loaded.
          </CardDescription>
          <Button onClick={() => navigate("/ecommerce/login")}>Back to Login</Button>
        </Card>
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
              <div className="font-medium">{profile.full_name}</div>
              <div className="text-xs text-muted-foreground">{userEmail}</div>
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
                  {profile.home_city}, {profile.home_country}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Transactions</div>
                <div className="font-medium">{profile.total_transactions}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Avg. Transaction</div>
                <div className="font-medium">{formatCurrency(profile.average_transaction_amount)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Avg. Time to Buy</div>
                <div className="font-medium flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {Math.round(profile.avg_time_to_buy_seconds / 60)} min
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
              <div className={`text-5xl font-bold ${getTrustScoreColor(profile.trust_score)}`}>
                {profile.trust_score}
              </div>
              <Progress value={profile.trust_score} className="mt-4" />
              <p className="text-sm text-muted-foreground mt-2">
                {profile.trust_score >= 80 ? "Excellent standing" :
                 profile.trust_score >= 50 ? "Good standing" :
                 profile.trust_score >= 30 ? "Needs attention" : "High risk account"}
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
                  No transactions found. Make your first purchase!
                </div>
              ) : (
                transactions.map((txn) => (
                  <div 
                    key={txn.id} 
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-sm">{txn.order_id}</span>
                          {getStatusBadge(txn.status)}
                          {getRiskBadge(txn.risk_level)}
                          {txn.case_label && (
                            <Badge variant="outline" className="text-xs">
                              {txn.case_label}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatDate(txn.created_at)} • {txn.location_city}, {txn.location_country} • {txn.purchase_hour}:00
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
                      {txn.velocity_1h > 0 && (
                        <span className="ml-3">• Velocity (1h): {txn.velocity_1h} txns</span>
                      )}
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
