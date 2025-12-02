import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  const [userId, setUserId] = useState<string | null>(() => {
    return localStorage.getItem('simulated_user_id');
  });
  
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const savedUserId = localStorage.getItem('simulated_user_id');
    const saved = localStorage.getItem('simulated_transactions');
    return saved && savedUserId ? JSON.parse(saved) : [];
  });
  
  const [alerts, setAlerts] = useState<FraudAlert[]>(() => {
    const savedUserId = localStorage.getItem('simulated_user_id');
    const saved = localStorage.getItem('simulated_alerts');
    return saved && savedUserId ? JSON.parse(saved) : [];
  });

  // Monitor user ID changes and clear data if user changes
  useEffect(() => {
    const checkUserId = () => {
      const currentUserId = localStorage.getItem('simulated_user_id');
      if (currentUserId !== userId) {
        setUserId(currentUserId);
        if (!currentUserId) {
          // User logged out - clear all data
          setTransactions([]);
          setAlerts([]);
        } else if (currentUserId && currentUserId !== userId) {
          // Different user - reload their data
          const savedTransactions = localStorage.getItem('simulated_transactions');
          const savedAlerts = localStorage.getItem('simulated_alerts');
          setTransactions(savedTransactions ? JSON.parse(savedTransactions) : []);
          setAlerts(savedAlerts ? JSON.parse(savedAlerts) : []);
        }
      }
    };

    // Check on mount and set up interval
    checkUserId();
    const interval = setInterval(checkUserId, 1000);
    return () => clearInterval(interval);
  }, [userId]);

  const addTransaction = (transaction: Transaction) => {
    setTransactions(prev => {
      const updated = [transaction, ...prev];
      if (userId) {
        localStorage.setItem('simulated_transactions', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const addAlert = (alert: FraudAlert) => {
    setAlerts(prev => {
      const updated = [alert, ...prev];
      if (userId) {
        localStorage.setItem('simulated_alerts', JSON.stringify(updated));
      }
      return updated;
    });
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
