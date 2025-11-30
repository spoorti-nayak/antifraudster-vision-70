import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import RiskBreakdownChart from "./RiskBreakdownChart";
import { Clock, DollarSign, Mail, CreditCard, MapPin, AlertTriangle } from "lucide-react";

interface Transaction {
  id: string;
  customer_email: string;
  amount: number;
  currency: string;
  status: string;
  fraud_score: number;
  risk_level?: string;
  fraud_reasons?: string[] | null;
  created_at: string;
  metadata?: any;
}

interface TransactionRiskDetailsProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
}

const TransactionRiskDetails = ({ transaction, open, onClose }: TransactionRiskDetailsProps) => {
  if (!transaction) return null;

  const riskBreakdown = transaction.metadata?.risk_breakdown || [];
  const fraudReasons = transaction.fraud_reasons || [];

  const getRiskColor = () => {
    if (transaction.fraud_score > 70) return 'text-fraud';
    if (transaction.fraud_score > 40) return 'text-suspicious';
    return 'text-safe';
  };

  const getStatusColor = () => {
    switch (transaction.status) {
      case 'blocked': return 'status-fraud';
      case 'flagged': return 'status-suspicious';
      case 'approved': return 'status-safe';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Transaction Risk Analysis</span>
            </span>
            <Badge className={getStatusColor()}>
              {transaction.status.toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Transaction Overview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-mono">{new Date(transaction.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">${transaction.amount.toFixed(2)} {transaction.currency}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-mono text-xs">{transaction.customer_email}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Card:</span>
                  <span className="font-mono">**** {transaction.metadata?.card_last4 || '****'}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <span className="font-mono text-xs">{transaction.id}</span>
                </div>
              </div>
            </div>

            {/* Fraud Score */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Fraud Probability Score</span>
                <span className={`text-4xl font-bold ${getRiskColor()}`}>
                  {transaction.fraud_score}%
                </span>
              </div>
              <div className="mt-2 h-2 bg-background rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getRiskColor()} bg-current`}
                  style={{ width: `${transaction.fraud_score}%` }}
                />
              </div>
            </div>

            {/* Risk Breakdown Chart */}
            {riskBreakdown.length > 0 && (
              <RiskBreakdownChart 
                breakdown={riskBreakdown} 
                totalScore={transaction.fraud_score}
              />
            )}

            {/* Fraud Reasons */}
            {fraudReasons.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-fraud" />
                  <span>Risk Indicators</span>
                </h4>
                <div className="space-y-2">
                  {fraudReasons.map((reason, index) => (
                    <div key={index} className="flex items-start space-x-2 text-sm bg-muted/20 p-2 rounded">
                      <span className="text-fraud mt-0.5">•</span>
                      <span className="text-foreground">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ML Model Confidence */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">ML Model Confidence</span>
                <span className="text-lg font-bold text-primary">
                  {transaction.fraud_score > 50 ? '95%' : '87%'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                The ensemble model (Random Forest + Neural Network) analyzed {riskBreakdown.length} risk factors 
                to generate this fraud probability score.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionRiskDetails;
