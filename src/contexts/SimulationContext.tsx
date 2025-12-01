import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Transaction {
  id: string;
  customer_email: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'flagged' | 'blocked';
  fraud_score: number;
  risk_level: string;
  fraud_reasons: string[] | null;
  created_at: string;
  metadata?: any;
}

interface FraudAlert {
  id: string;
  transaction_id: string;
  merchant_id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  is_resolved: boolean;
  created_at: string;
}

interface SimulationContextType {
  transactions: Transaction[];
  alerts: FraudAlert[];
  addTransaction: (transaction: Transaction) => void;
  addAlert: (alert: FraudAlert) => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider = ({ children }: { children: ReactNode }) => {
  // Don't load from localStorage by default - start fresh
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);

  const addTransaction = (transaction: Transaction) => {
    setTransactions(prev => [transaction, ...prev]);
  };

  const addAlert = (alert: FraudAlert) => {
    setAlerts(prev => [alert, ...prev]);
  };

  return (
    <SimulationContext.Provider value={{ transactions, alerts, addTransaction, addAlert }}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within SimulationProvider');
  }
  return context;
};
