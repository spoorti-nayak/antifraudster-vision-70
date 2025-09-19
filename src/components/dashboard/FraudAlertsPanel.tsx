import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  Bell, 
  Eye, 
  X,
  Clock,
  DollarSign,
  MapPin,
  CreditCard
} from "lucide-react";

interface FraudAlert {
  id: string;
  transactionId: string;
  buyer: string;
  amount: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  explanation: string;
  timestamp: Date;
  details: string[];
  dismissed: boolean;
}

const generateMockAlert = (): FraudAlert => {
  const buyers = [
    "suspicious.user@temp.mail", "fraud.attempt@fake.org", "test.card@invalid.com",
    "multiple.orders@anomaly.net", "high.velocity@risk.co", "bot.activity@detected.io"
  ];

  const riskLevels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
  const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
  
  const explanations = {
    high: [
      "Multiple failed payment attempts from different cards",
      "Suspicious IP address with known fraud history",
      "Extremely high order value compared to account history",
      "Account created minutes before large purchase",
      "Device fingerprint matches known fraudulent patterns"
    ],
    medium: [
      "Order amount significantly higher than usual",
      "Shipping address doesn't match billing address",
      "Multiple orders in short time span",
      "New payment method for established account",
      "Unusual time of purchase for customer"
    ],
    low: [
      "Slightly elevated velocity compared to normal",
      "Minor geolocation inconsistency detected",
      "Payment method not previously used",
      "Order value above average but within limits",
      "Time gap since last purchase unusual"
    ]
  };

  const detailsMap = {
    high: [
      "5 payment failures in 2 minutes",
      "IP geolocation: Unknown/Proxy detected",
      "Device risk score: 95/100",
      "Account age: 3 minutes"
    ],
    medium: [
      "Order value: 300% above average",
      "Billing/Shipping mismatch",
      "3 orders in 10 minutes",
      "New card added 5 mins ago"
    ],
    low: [
      "Velocity: 2x normal rate",
      "Location: 50 miles from usual",
      "Payment method: First time use",
      "Amount: 150% of average"
    ]
  };

  const getRiskScore = () => {
    switch (riskLevel) {
      case 'high': return Math.random() * 20 + 80;  // 80-100
      case 'medium': return Math.random() * 30 + 50; // 50-80
      case 'low': return Math.random() * 20 + 30;    // 30-50
    }
  };

  return {
    id: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    transactionId: `TXN-${Math.random().toString(36).substr(2, 9)}`,
    buyer: buyers[Math.floor(Math.random() * buyers.length)],
    amount: Math.floor(Math.random() * 90000 + 10000), // ₹10,000 to ₹1,00,000
    riskLevel,
    riskScore: getRiskScore(),
    explanation: explanations[riskLevel][Math.floor(Math.random() * explanations[riskLevel].length)],
    timestamp: new Date(),
    details: detailsMap[riskLevel],
    dismissed: false
  };
};

const AlertItem = ({ 
  alert, 
  onDismiss, 
  onView 
}: { 
  alert: FraudAlert; 
  onDismiss: (id: string) => void;
  onView: (alert: FraudAlert) => void;
}) => {
  const getRiskColor = () => {
    switch (alert.riskLevel) {
      case 'high': return 'status-fraud';
      case 'medium': return 'status-suspicious';
      case 'low': return 'bg-muted text-muted-foreground';
    }
  };

  const getRiskIcon = () => {
    switch (alert.riskLevel) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-fraud" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-suspicious" />;
      case 'low': return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className={`p-4 border rounded-lg space-y-3 animate-fade-in ${
      alert.dismissed ? 'opacity-50' : ''
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          {getRiskIcon()}
          <Badge className={`${getRiskColor()} text-xs uppercase`}>
            {alert.riskLevel} Risk
          </Badge>
          <Badge variant="outline" className="text-xs">
            {alert.riskScore.toFixed(0)}% Risk Score
          </Badge>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onView(alert)}
            className="h-6 w-6 p-0"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onDismiss(alert.id)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-sm">
          <span className="font-medium text-foreground">{alert.buyer}</span>
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">₹{alert.amount.toLocaleString('en-IN')}</span>
        </div>
        
        <p className="text-sm text-foreground">{alert.explanation}</p>
        
        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{alert.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</span>
          </div>
          <span>ID: {alert.transactionId}</span>
        </div>

        {/* Quick details preview */}
        <div className="flex flex-wrap gap-1">
          {alert.details.slice(0, 2).map((detail, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {detail}
            </Badge>
          ))}
          {alert.details.length > 2 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              +{alert.details.length - 2} more
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

const FraudAlertsPanel = () => {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [viewingAlert, setViewingAlert] = useState<FraudAlert | null>(null);

  useEffect(() => {
    // Initialize with some alerts
    const initialAlerts = Array.from({ length: 5 }, () => generateMockAlert())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setAlerts(initialAlerts);

    // Add new alerts periodically
    const interval = setInterval(() => {
      if (Math.random() < 0.3) { // 30% chance every interval
        const newAlert = generateMockAlert();
        setAlerts(prev => [newAlert, ...prev].slice(0, 10)); // Keep only last 10
      }
    }, 8000); // Every 8 seconds

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, dismissed: true }
          : alert
      )
    );
  };

  const handleView = (alert: FraudAlert) => {
    setViewingAlert(alert);
  };

  const activeAlerts = alerts.filter(a => !a.dismissed);
  const highRiskCount = activeAlerts.filter(a => a.riskLevel === 'high').length;

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Fraud Alerts</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {highRiskCount > 0 && (
              <Badge className="status-fraud text-xs animate-pulse">
                {highRiskCount} High Risk
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {activeAlerts.length} Active
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[480px] w-full">
          <div className="space-y-3 p-6">
              {activeAlerts.map((alert) => (
                <AlertItem 
                  key={alert.id} 
                  alert={alert} 
                  onDismiss={handleDismiss}
                  onView={handleView}
                />
              ))}
              
              {activeAlerts.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No active fraud alerts</p>
                    <p className="text-xs">Your transactions are secure</p>
                  </div>
                </div>
              )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default FraudAlertsPanel;