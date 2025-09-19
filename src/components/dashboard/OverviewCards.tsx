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
  const [metrics, setMetrics] = useState({
    totalTransactions: 24567,
    fraudDetected: 89,
    safeTransactions: 24478,
    avgFraudProbability: 3.6
  });

  const [realTimeUpdates, setRealTimeUpdates] = useState(0);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        totalTransactions: prev.totalTransactions + Math.floor(Math.random() * 3),
        fraudDetected: prev.fraudDetected + (Math.random() < 0.1 ? 1 : 0),
        safeTransactions: prev.safeTransactions + Math.floor(Math.random() * 3),
        avgFraudProbability: Math.max(1, Math.min(10, prev.avgFraudProbability + (Math.random() - 0.5) * 0.2))
      }));
      setRealTimeUpdates(prev => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fraudRate = ((metrics.fraudDetected / metrics.totalTransactions) * 100).toFixed(2);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <MetricCard
        title="Total Transactions"
        value={metrics.totalTransactions.toLocaleString()}
        change="+2.1% from yesterday"
        changeType="positive"
        icon={<ShoppingCart className="h-5 w-5 text-primary" />}
        gradient="gradient-primary"
      />
      
      <MetricCard
        title="Fraud Detected"
        value={metrics.fraudDetected.toLocaleString()}
        change={`${fraudRate}% fraud rate`}
        changeType="negative"
        icon={<AlertTriangle className="h-5 w-5 text-fraud" />}
        gradient="gradient-fraud"
      />
      
      <MetricCard
        title="Safe Transactions"
        value={metrics.safeTransactions.toLocaleString()}
        change="+1.8% from yesterday"
        changeType="positive"
        icon={<CheckCircle className="h-5 w-5 text-safe" />}
        gradient="gradient-safe"
      />
      
      <MetricCard
        title="Avg Fraud Probability"
        value={`${metrics.avgFraudProbability.toFixed(1)}%`}
        change="-0.3% from yesterday"
        changeType="positive"
        icon={<TrendingUp className="h-5 w-5 text-suspicious" />}
        gradient="gradient-suspicious"
      />
    </div>
  );
};

export default OverviewCards;