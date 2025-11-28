import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Shield, 
  CheckCircle, 
  TrendingUp, 
  AlertTriangle 
} from "lucide-react";
import { useVendor } from "@/contexts/VendorContext";
import { apiService } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  gradient: string;
}

const MetricCard = ({ title, value, change, changeType, icon, gradient }: MetricCardProps) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'status-safe';
      case 'negative': return 'status-fraud';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className={`absolute inset-0 ${gradient} opacity-5`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-2xl font-bold text-foreground mb-2">{value}</div>
        <Badge variant="secondary" className={`${getChangeColor()} text-xs`}>
          {change}
        </Badge>
      </CardContent>
    </Card>
  );
};

const OverviewCards = () => {
  const { isConnected } = useVendor();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    totalTransactions: 0,
    fraudDetected: 0,
    safeTransactions: 0,
    avgFraudProbability: 0
  });

  // Load real metrics from API
  useEffect(() => {
    const loadMetrics = async () => {
      if (!user?.merchantProfile?.id) return;

      try {
        const data = await apiService.getRealtimeMetrics();
        setMetrics(data);
      } catch (error) {
        console.error('Error loading metrics:', error);
      }
    };

    loadMetrics();

    // Poll for updates every 30 seconds (replace real-time subscription)
    const interval = setInterval(loadMetrics, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [user?.merchantProfile?.id]);

  const fraudRate = metrics.totalTransactions > 0 ? ((metrics.fraudDetected / metrics.totalTransactions) * 100).toFixed(2) : "0.00";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <MetricCard
        title="Total Transactions"
        value={metrics.totalTransactions.toLocaleString()}
        change={isConnected ? "+2.1% from yesterday" : "No data available"}
        changeType={isConnected ? "positive" : "neutral"}
        icon={<ShoppingCart className="h-5 w-5 text-primary" />}
        gradient="gradient-primary"
      />
      
      <MetricCard
        title="Fraud Detected"
        value={metrics.fraudDetected.toLocaleString()}
        change={isConnected ? `${fraudRate}% fraud rate` : "No data available"}
        changeType={isConnected ? "negative" : "neutral"}
        icon={<AlertTriangle className="h-5 w-5 text-fraud" />}
        gradient="gradient-fraud"
      />
      
      <MetricCard
        title="Safe Transactions"
        value={metrics.safeTransactions.toLocaleString()}
        change={isConnected ? "+1.8% from yesterday" : "No data available"}
        changeType={isConnected ? "positive" : "neutral"}
        icon={<CheckCircle className="h-5 w-5 text-safe" />}
        gradient="gradient-safe"
      />
      
      <MetricCard
        title="Avg Fraud Probability"
        value={`${metrics.avgFraudProbability.toFixed(1)}%`}
        change={isConnected ? "-0.3% from yesterday" : "No data available"}
        changeType={isConnected ? "positive" : "neutral"}
        icon={<TrendingUp className="h-5 w-5 text-suspicious" />}
        gradient="gradient-suspicious"
      />
    </div>
  );
};

export default OverviewCards;