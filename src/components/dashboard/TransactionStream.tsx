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
import { apiService } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";

interface Transaction {
  id: string;
  customer_email: string;
  amount: number;
  status: 'pending' | 'approved' | 'flagged' | 'blocked';
  fraud_score: number;
  created_at: string;
  fraud_reasons?: any;
}

const TransactionItem = ({ transaction }: { transaction: Transaction }) => {
  const getStatusIcon = () => {
    switch (transaction.status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-safe" />;
      case 'flagged':
      case 'blocked':
        return <AlertTriangle className="h-4 w-4 text-fraud" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-suspicious animate-spin" />;
    }
  };

  const getStatusBadge = () => {
    switch (transaction.status) {
      case 'approved':
        return <Badge className="status-safe text-xs">Safe</Badge>;
      case 'flagged':
        return <Badge className="status-fraud text-xs">Flagged</Badge>;
      case 'blocked':
        return <Badge className="status-fraud text-xs">Blocked</Badge>;
      case 'pending':
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
              {transaction.customer_email}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span>₹{transaction.amount.toLocaleString('en-IN')}</span>
            <span>•</span>
            <span>{transaction.fraud_score.toFixed(1)}% risk</span>
          </div>
          {transaction.fraud_reasons && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {Array.isArray(transaction.fraud_reasons) ? transaction.fraud_reasons.join(', ') : ''}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex flex-col items-end space-y-1">
        {getStatusBadge()}
        <span className="text-xs text-muted-foreground">
          {new Date(transaction.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>
    </div>
  );
};

const TransactionStream = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!user?.merchantProfile?.id) return;

    // Load initial transactions
    const loadTransactions = async () => {
      try {
        const data = await apiService.getTransactionStream(20);
        setTransactions(data || []);
      } catch (error) {
        console.error('Error loading transactions:', error);
      }
    };

    loadTransactions();

    // Poll for updates every 10 seconds
    const interval = setInterval(loadTransactions, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [user?.merchantProfile?.id]);

  const liveTransactions = transactions.filter(t => t.status !== 'pending').length;
  const fraudCount = transactions.filter(t => t.status === 'flagged' || t.status === 'blocked').length;

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
                    <p>{user?.merchantProfile ? "Waiting for transactions..." : "Connect your merchant account"}</p>
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