import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart,
  Bar,
  ResponsiveContainer 
} from "recharts";
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Fetch real transaction data from database
const fetchRealSeriesData = async (merchantId: string, range: '24h' | '7d' | '30d') => {
  const now = new Date();
  const startTime = new Date(
    range === '24h' ? now.getTime() - 24 * 60 * 60 * 1000 :
    range === '7d' ? now.getTime() - 7 * 24 * 60 * 60 * 1000 :
    now.getTime() - 30 * 24 * 60 * 60 * 1000
  );

  const { data } = await supabase
    .from('transactions')
    .select('created_at, status, fraud_score')
    .eq('merchant_id', merchantId)
    .gte('created_at', startTime.toISOString());

  if (!data || data.length === 0) return [];

  // Group transactions by time buckets
  const buckets = new Map();
  data.forEach(tx => {
    const date = new Date(tx.created_at);
    const key = range === '24h' 
      ? date.toLocaleTimeString([], { hour: '2-digit' })
      : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    if (!buckets.has(key)) {
      buckets.set(key, { fraudDetected: 0, safeTransactions: 0 });
    }
    
    const bucket = buckets.get(key);
    if (tx.status === 'blocked' || tx.status === 'flagged') {
      bucket.fraudDetected++;
    } else {
      bucket.safeTransactions++;
    }
  });

  return Array.from(buckets.entries()).map(([time, counts]) => ({
    time,
    fraudDetected: counts.fraudDetected,
    safeTransactions: counts.safeTransactions,
    totalTransactions: counts.fraudDetected + counts.safeTransactions,
  }));
};

const fetchRealThresholdData = async (merchantId: string, range: '24h' | '7d' | '30d') => {
  const now = new Date();
  const startTime = new Date(
    range === '24h' ? now.getTime() - 24 * 60 * 60 * 1000 :
    range === '7d' ? now.getTime() - 7 * 24 * 60 * 60 * 1000 :
    now.getTime() - 30 * 24 * 60 * 60 * 1000
  );

  const { data } = await supabase
    .from('transactions')
    .select('created_at, fraud_score')
    .eq('merchant_id', merchantId)
    .gte('created_at', startTime.toISOString());

  if (!data || data.length === 0) return [];

  const buckets = new Map();
  data.forEach(tx => {
    const date = new Date(tx.created_at);
    const key = range === '24h' 
      ? date.toLocaleTimeString([], { hour: '2-digit' })
      : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    if (!buckets.has(key)) {
      buckets.set(key, { scores: [] });
    }
    buckets.get(key).scores.push(tx.fraud_score || 0);
  });

  return Array.from(buckets.entries()).map(([time, data]) => ({
    time,
    avgRiskScore: data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length,
    adaptiveThreshold: 70,
    staticThreshold: 75,
  }));
};

const COLORS = {
  safe: '#22c55e',
  fraud: '#ef4444',
  suspicious: '#f59e0b',
  primary: '#3b82f6'
};

const FraudCharts = ({
  dateRange = '24h',
  defaultChart = 'trends',
}: {
  dateRange?: '24h' | '7d' | '30d';
  defaultChart?: 'trends' | 'ratio' | 'threshold';
}) => {
  const { user } = useAuth();
  const [seriesData, setSeriesData] = useState<any[]>([]);
  const [thresholdData, setThresholdData] = useState<any[]>([]);
  const [selectedChart, setSelectedChart] = useState<'trends' | 'ratio' | 'threshold'>(defaultChart);

  // Fetch real data
  useEffect(() => {
    if (!user?.merchantProfile?.id) return;

    const loadData = async () => {
      const series = await fetchRealSeriesData(user.merchantProfile.id, dateRange);
      const threshold = await fetchRealThresholdData(user.merchantProfile.id, dateRange);
      setSeriesData(series);
      setThresholdData(threshold);
    };

    loadData();
    
    // Refresh every minute
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [dateRange, user?.merchantProfile?.id]);

  const totalSafe = seriesData.reduce((sum, item) => sum + item.safeTransactions, 0);
  const totalFraud = seriesData.reduce((sum, item) => sum + item.fraudDetected, 0);
  const pieData = [
    { name: 'Safe Transactions', value: totalSafe, color: COLORS.safe },
    { name: 'Fraud Detected', value: totalFraud, color: COLORS.fraud }
  ];

  const renderTrendsChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={seriesData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="time" stroke="#64748b" fontSize={12} tick={{ fontSize: 11 }} />
        <YAxis stroke="#64748b" fontSize={12} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
        <Legend />
        <Line type="monotone" dataKey="fraudDetected" stroke={COLORS.fraud} strokeWidth={2} name="Fraud Detected" dot={{ fill: COLORS.fraud, strokeWidth: 2, r: 3 }} />
        <Line type="monotone" dataKey="safeTransactions" stroke={COLORS.safe} strokeWidth={2} name="Safe Transactions" dot={{ fill: COLORS.safe, strokeWidth: 2, r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderRatioChart = () => (
    <div className="flex items-center justify-center h-[300px]">
      <div className="w-full max-w-md">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="flex justify-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-safe rounded-full" />
            <span className="text-sm text-muted-foreground">
              Safe ({totalSafe.toLocaleString()})
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-fraud rounded-full" />
            <span className="text-sm text-muted-foreground">
              Fraud ({totalFraud.toLocaleString()})
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderThresholdChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={thresholdData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis 
          dataKey="time" 
          stroke="#64748b"
          fontSize={12}
          tick={{ fontSize: 11 }}
        />
        <YAxis 
          stroke="#64748b"
          fontSize={12}
          tick={{ fontSize: 11 }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '12px'
          }}
        />
        <Legend />
        <Bar 
          dataKey="avgRiskScore" 
          fill={COLORS.primary}
          name="Avg Risk Score"
          radius={[2, 2, 0, 0]}
        />
        <Line 
          type="monotone" 
          dataKey="adaptiveThreshold" 
          stroke={COLORS.suspicious}
          strokeWidth={2}
          name="Adaptive Threshold"
          strokeDasharray="5 5"
        />
        <Line 
          type="monotone" 
          dataKey="staticThreshold" 
          stroke={COLORS.fraud}
          strokeWidth={2}
          name="Static Threshold (75%)"
          strokeDasharray="2 2"
        />
      </BarChart>
    </ResponsiveContainer>
  );

  const getCurrentChart = () => {
    switch (selectedChart) {
      case 'trends': return renderTrendsChart();
      case 'ratio': return renderRatioChart();
      case 'threshold': return renderThresholdChart();
    }
  };

  const getChartTitle = () => {
    switch (selectedChart) {
      case 'trends': return `Fraud Detection Trends (${dateRange})`;
      case 'ratio': return 'Transaction Safety Ratio';
      case 'threshold': return 'Adaptive Thresholds vs Risk Scores';
    }
  };

  const getChartDescription = () => {
    switch (selectedChart) {
      case 'trends': return 'Real-time fraud detection patterns over the last 24 hours';
      case 'ratio': return 'Overall distribution of safe vs fraudulent transactions';
      case 'threshold': return 'Adaptive fraud thresholds compared to average risk scores';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>{getChartTitle()}</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {getChartDescription()}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={selectedChart === 'trends' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChart('trends')}
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Trends
              </Button>
              <Button
                variant={selectedChart === 'ratio' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChart('ratio')}
              >
                <PieChartIcon className="h-3 w-3 mr-1" />
                Ratio
              </Button>
              <Button
                variant={selectedChart === 'threshold' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChart('threshold')}
              >
                <BarChart3 className="h-3 w-3 mr-1" />
                Thresholds
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {getCurrentChart()}
          
          {/* Chart Statistics */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-safe rounded-full" />
                <span className="text-muted-foreground">
                  {totalSafe.toLocaleString()} Safe
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-fraud rounded-full" />
                <span className="text-muted-foreground">
                  {totalFraud.toLocaleString()} Fraud
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground">
                  Detection Rate: {((totalFraud / (totalFraud + totalSafe)) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
            
            <Badge variant="outline" className="text-xs">
              Updated {new Date().toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FraudCharts;