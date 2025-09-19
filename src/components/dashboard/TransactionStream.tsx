import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  DollarSign, 
  User, 
  AlertTriangle, 
  CheckCircle,
  Clock
} from "lucide-react";
import { useVendor } from "@/contexts/VendorContext";

interface Transaction {
  id: string;
  buyer: string;
  amount: number;
  status: 'safe' | 'fraud' | 'processing';
  probability: number;
  timestamp: Date;
  explanation?: string;
}

const generateMockTransaction = (): Transaction => {
  const buyers = [
    "john.doe@email.com", "sarah.smith@company.com", "mike.wilson@store.com",
    "anna.garcia@shop.org", "david.brown@market.net", "lisa.jones@buy.com",
    "robert.davis@purchase.io", "emily.clark@order.co", "james.white@cart.biz"
  ];
  
  const isFraud = Math.random() < 0.12; // 12% fraud rate
  const probability = isFraud 
    ? Math.random() * 40 + 60 // 60-100% for fraud
    : Math.random() * 30 + 5; // 5-35% for safe
  
  const explanations = isFraud ? [
    "IP mismatch detected", "Unusual spending pattern", "Velocity check failed",
    "Device fingerprint anomaly", "Geolocation inconsistency", "Card testing behavior"
  ] : [
    "Normal purchase pattern", "Verified customer", "Trusted device",
    "Regular transaction amount", "Known location", "Account in good standing"
  ];

  return {
    id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    buyer: buyers[Math.floor(Math.random() * buyers.length)],
    amount: Math.floor(Math.random() * 90000 + 10000), // ₹10,000 to ₹1,00,000
    status: isFraud ? 'fraud' : 'safe',
    probability,
    timestamp: new Date(),
    explanation: explanations[Math.floor(Math.random() * explanations.length)]
  };
};

const TransactionItem = ({ transaction }: { transaction: Transaction }) => {
  const getStatusIcon = () => {
    switch (transaction.status) {
      case 'safe':
        return <CheckCircle className="h-4 w-4 text-safe" />;
      case 'fraud':
        return <AlertTriangle className="h-4 w-4 text-fraud" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-suspicious animate-spin" />;
    }
  };

  const getStatusBadge = () => {
    switch (transaction.status) {
      case 'safe':
        return <Badge className="status-safe text-xs">Safe</Badge>;
      case 'fraud':
        return <Badge className="status-fraud text-xs">Fraud</Badge>;
      case 'processing':
        return <Badge className="status-suspicious text-xs">Processing</Badge>;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors animate-fade-in">
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground truncate">
              {transaction.buyer}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span>₹{transaction.amount.toLocaleString('en-IN')}</span>
            <span>•</span>
            <span>{transaction.probability.toFixed(1)}% risk</span>
          </div>
          {transaction.explanation && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {transaction.explanation}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex flex-col items-end space-y-1">
        {getStatusBadge()}
        <span className="text-xs text-muted-foreground">
          {transaction.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>
    </div>
  );
};

const TransactionStream = () => {
  const { isConnected } = useVendor();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isConnected) {
      setTransactions([]);
      return;
    }

    // Initialize with some transactions
    const initialTransactions = Array.from({ length: 8 }, () => generateMockTransaction())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setTransactions(initialTransactions);

    // Add new transactions periodically
    const interval = setInterval(() => {
      if (isLive) {
        const newTransaction = generateMockTransaction();
        setTransactions(prev => [newTransaction, ...prev].slice(0, 20)); // Keep only last 20
      }
    }, Math.random() * 3000 + 2000); // Random interval between 2-5 seconds

    return () => clearInterval(interval);
  }, [isLive, isConnected]);

  const liveTransactions = transactions.filter(t => t.status !== 'processing').length;
  const fraudCount = transactions.filter(t => t.status === 'fraud').length;

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Real-Time Transaction Stream</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-safe rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {liveTransactions} processed
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>• {transactions.length - fraudCount} Safe</span>
          <span className="text-fraud">• {fraudCount} Flagged</span>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[480px] w-full">
          <div className="space-y-2 p-6">
              {transactions.map((transaction) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))}
              
              {transactions.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{isConnected ? "Waiting for transactions..." : "Connect your website to see transactions"}</p>
                  </div>
                </div>
              )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TransactionStream;