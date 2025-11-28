import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  Filter, 
  Download, 
  Eye,
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
  currency: string;
  status: string;
  risk_level: string;
  fraud_score: number;
  created_at: string;
  fraud_reasons: any;
}

const StatusBadge = ({ status, riskLevel }: { status: string; riskLevel: string }) => {
  if (status === 'blocked') {
    return (
      <div className="flex items-center space-x-1">
        <AlertTriangle className="h-3 w-3 text-fraud" />
        <Badge className="status-fraud text-xs">Blocked</Badge>
      </div>
    );
  }
  
  switch (riskLevel) {
    case 'low':
      return (
        <div className="flex items-center space-x-1">
          <CheckCircle className="h-3 w-3 text-safe" />
          <Badge className="status-safe text-xs">Safe</Badge>
        </div>
      );
    case 'high':
    case 'critical':
      return (
        <div className="flex items-center space-x-1">
          <AlertTriangle className="h-3 w-3 text-fraud" />
          <Badge className="status-fraud text-xs">High Risk</Badge>
        </div>
      );
    case 'medium':
      return (
        <div className="flex items-center space-x-1">
          <Clock className="h-3 w-3 text-suspicious" />
          <Badge className="status-suspicious text-xs">Medium Risk</Badge>
        </div>
      );
    default:
      return <Badge variant="outline" className="text-xs">{riskLevel}</Badge>;
  }
};

interface TransactionsTableProps {
  searchQuery?: string;
  hideToolbar?: boolean;
}

export interface TransactionsTableRef {
  export: () => void;
}

const TransactionsTable = forwardRef<TransactionsTableRef, TransactionsTableProps>(({ searchQuery, hideToolbar }, ref) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<'created_at' | 'amount' | 'fraud_score'>(
    'created_at'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.merchantProfile?.id) {
      setIsLoading(false);
      return;
    }

    const loadTransactions = async () => {
      setIsLoading(true);
      try {
        const response = await apiService.getTransactions({ limit: 100 });
        setTransactions(response.transactions || []);
      } catch (error) {
        console.error('Error loading transactions:', error);
      }
      setIsLoading(false);
    };

    loadTransactions();

    // Poll for updates every 30 seconds (replace real-time subscription)
    const interval = setInterval(loadTransactions, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [user?.merchantProfile?.id]);

  useImperativeHandle(ref, () => ({
    export: exportTransactions,
  }));

  const effectiveSearch = (searchQuery ?? searchTerm).toLowerCase();

  const filteredTransactions = transactions
    .filter((transaction) => {
      const matchesSearch =
        transaction.customer_email.toLowerCase().includes(effectiveSearch) ||
        transaction.id.toLowerCase().includes(effectiveSearch);

      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "blocked" && transaction.status === "blocked") ||
        (statusFilter === "low" && transaction.risk_level === "low") ||
        (statusFilter === "medium" && transaction.risk_level === "medium") ||
        (statusFilter === "high" && (transaction.risk_level === "high" || transaction.risk_level === "critical"));

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'amount':
          aVal = parseFloat(a.amount as any);
          bVal = parseFloat(b.amount as any);
          break;
        case 'fraud_score':
          aVal = parseFloat(a.fraud_score as any);
          bVal = parseFloat(b.fraud_score as any);
          break;
        case 'created_at':
        default:
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

  const handleSort = (column: 'created_at' | 'amount' | 'fraud_score') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const exportTransactions = () => {
    const dataStr = JSON.stringify(filteredTransactions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = 'transactions.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transaction History</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={exportTransactions}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {!hideToolbar && (
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by buyer, seller, or transaction ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-md text-sm bg-background"
              >
                <option value="all">All Status</option>
                <option value="low">Safe (Low Risk)</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p>Loading transactions...</p>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-xs mt-1">Waiting for data from your e-commerce site</p>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Customer Email</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('amount')}
                    >
                      Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('fraud_score')}
                    >
                      Risk Score {sortBy === 'fraud_score' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Risk Reasons</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('created_at')}
                    >
                      Timestamp {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.slice(0, 20).map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">{transaction.id.slice(0, 8)}...</TableCell>
                      <TableCell className="max-w-[200px] truncate">{transaction.customer_email}</TableCell>
                      <TableCell className="font-medium">
                        {transaction.currency} {parseFloat(transaction.amount as any).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={transaction.status} riskLevel={transaction.risk_level} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm">{parseFloat(transaction.fraud_score as any).toFixed(1)}%</span>
                          <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                transaction.fraud_score > 70
                                  ? 'bg-fraud'
                                  : transaction.fraud_score > 40
                                  ? 'bg-suspicious'
                                  : 'bg-safe'
                              }`}
                              style={{ width: `${Math.min(parseFloat(transaction.fraud_score as any), 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">
                        {transaction.fraud_reasons ? 
                          Array.isArray(transaction.fraud_reasons) ? 
                            transaction.fraud_reasons.join(', ') : 
                            JSON.stringify(transaction.fraud_reasons)
                          : 'No issues detected'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()} {" "}
                        {new Date(transaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>
                Showing {Math.min(filteredTransactions.length, 20)} of {filteredTransactions.length} transactions
              </span>
              <div className="flex items-center space-x-4">
                <span>Low Risk: {filteredTransactions.filter((t) => t.risk_level === 'low').length}</span>
                <span className="text-suspicious">Medium: {filteredTransactions.filter((t) => t.risk_level === 'medium').length}</span>
                <span className="text-fraud">High: {filteredTransactions.filter((t) => t.risk_level === 'high' || t.risk_level === 'critical').length}</span>
                <span className="text-fraud">Blocked: {filteredTransactions.filter((t) => t.status === 'blocked').length}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});

export default TransactionsTable;