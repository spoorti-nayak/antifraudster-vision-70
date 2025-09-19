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

interface Transaction {
  id: string;
  buyer: string;
  seller: string;
  amount: number;
  status: 'safe' | 'fraud' | 'processing';
  riskScore: number;
  explanation: string;
  timestamp: Date;
}

const generateMockTransactions = (count: number): Transaction[] => {
  const buyers = [
    "john.doe@email.com", "sarah.smith@company.com", "mike.wilson@store.com",
    "anna.garcia@shop.org", "david.brown@market.net", "lisa.jones@buy.com",
    "robert.davis@purchase.io", "emily.clark@order.co", "james.white@cart.biz",
    "suspicious.user@temp.mail", "fraud.attempt@fake.org", "test.card@invalid.com"
  ];
  
  const sellers = [
    "TechStore Pro", "Fashion Hub", "Electronics World", "Book Paradise", 
    "Home Essentials", "Sports Gear", "Beauty Corner", "Auto Parts Plus",
    "Kitchen Magic", "Garden Center"
  ];

  const explanations = {
    safe: [
      "Normal purchase pattern detected",
      "Verified customer with good history",
      "Trusted device and location",
      "Regular transaction amount",
      "Account in good standing"
    ],
    fraud: [
      "Multiple payment failures detected",
      "Suspicious IP address flagged",
      "Device fingerprint mismatch",
      "Velocity check failed",
      "Geolocation inconsistency"
    ],
    processing: [
      "Additional verification required",
      "Manual review in progress",
      "Awaiting payment confirmation"
    ]
  };

  return Array.from({ length: count }, (_, index) => {
    const isFraud = Math.random() < 0.15;
    const isProcessing = !isFraud && Math.random() < 0.1;
    
    let status: 'safe' | 'fraud' | 'processing';
    let riskScore: number;
    
    if (isFraud) {
      status = 'fraud';
      riskScore = Math.random() * 30 + 70; // 70-100%
    } else if (isProcessing) {
      status = 'processing';
      riskScore = Math.random() * 20 + 40; // 40-60%
    } else {
      status = 'safe';
      riskScore = Math.random() * 30 + 5; // 5-35%
    }

    return {
      id: `TXN-${(1000000 + index).toString()}`,
      buyer: buyers[Math.floor(Math.random() * buyers.length)],
      seller: sellers[Math.floor(Math.random() * sellers.length)],
      amount: Math.floor(Math.random() * 90000 + 10000), // ₹10,000 to ₹1,00,000
      status,
      riskScore,
      explanation: explanations[status][Math.floor(Math.random() * explanations[status].length)],
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Last 7 days
    };
  });
};

const StatusBadge = ({ status, riskScore }: { status: string; riskScore: number }) => {
  switch (status) {
    case 'safe':
      return (
        <div className="flex items-center space-x-1">
          <CheckCircle className="h-3 w-3 text-safe" />
          <Badge className="status-safe text-xs">Safe</Badge>
        </div>
      );
    case 'fraud':
      return (
        <div className="flex items-center space-x-1">
          <AlertTriangle className="h-3 w-3 text-fraud" />
          <Badge className="status-fraud text-xs">Fraud</Badge>
        </div>
      );
    case 'processing':
      return (
        <div className="flex items-center space-x-1">
          <Clock className="h-3 w-3 text-suspicious" />
          <Badge className="status-suspicious text-xs">Processing</Badge>
        </div>
      );
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<'timestamp' | 'amount' | 'riskScore'>(
    'timestamp'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const mockTransactions = generateMockTransactions(50);
    setTransactions(mockTransactions);
  }, []);

  useImperativeHandle(ref, () => ({
    export: exportTransactions,
  }));

  const effectiveSearch = (searchQuery ?? searchTerm).toLowerCase();

  const filteredTransactions = transactions
    .filter((transaction) => {
      const matchesSearch =
        transaction.buyer.toLowerCase().includes(effectiveSearch) ||
        transaction.seller.toLowerCase().includes(effectiveSearch) ||
        transaction.id.toLowerCase().includes(effectiveSearch);

      const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'amount':
          aVal = a.amount;
          bVal = b.amount;
          break;
        case 'riskScore':
          aVal = a.riskScore;
          bVal = b.riskScore;
          break;
        case 'timestamp':
        default:
          aVal = a.timestamp.getTime();
          bVal = b.timestamp.getTime();
          break;
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

  const handleSort = (column: 'timestamp' | 'amount' | 'riskScore') => {
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
                <option value="safe">Safe</option>
                <option value="fraud">Fraud</option>
                <option value="processing">Processing</option>
              </select>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('riskScore')}
                >
                  Risk Score {sortBy === 'riskScore' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Explanation</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('timestamp')}
                >
                  Timestamp {sortBy === 'timestamp' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.slice(0, 20).map((transaction) => (
                <TableRow key={transaction.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">{transaction.id}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{transaction.buyer}</TableCell>
                  <TableCell>{transaction.seller}</TableCell>
                  <TableCell className="font-medium">₹{transaction.amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    <StatusBadge status={transaction.status} riskScore={transaction.riskScore} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm">{transaction.riskScore.toFixed(1)}%</span>
                      <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            transaction.riskScore > 70
                              ? 'bg-fraud'
                              : transaction.riskScore > 40
                              ? 'bg-suspicious'
                              : 'bg-safe'
                          }`}
                          style={{ width: `${Math.min(transaction.riskScore, 100)}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">
                    {transaction.explanation}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {transaction.timestamp.toLocaleDateString()} {" "}
                    {transaction.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            <span>Safe: {filteredTransactions.filter((t) => t.status === 'safe').length}</span>
            <span className="text-fraud">Fraud: {filteredTransactions.filter((t) => t.status === 'fraud').length}</span>
            <span className="text-suspicious">Processing: {filteredTransactions.filter((t) => t.status === 'processing').length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default TransactionsTable;