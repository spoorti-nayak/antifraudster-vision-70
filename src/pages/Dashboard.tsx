import { useState, useEffect } from "react";
import OverviewCards from "@/components/dashboard/OverviewCards";
import TransactionStream from "@/components/dashboard/TransactionStream";
import FraudAlertsPanel from "@/components/dashboard/FraudAlertsPanel";

const Dashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <h2 className="text-2xl font-bold text-primary">Antifraudster</h2>
            <div className="w-px h-8 bg-border"></div>
            <h1 className="text-4xl font-bold text-foreground">Dashboard Overview</h1>
          </div>
          <p className="text-lg text-muted-foreground">Welcome back to your Fraud Detection Center</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right glass-effect px-4 py-2 rounded-lg">
            <p className="text-sm font-medium text-foreground">
              {currentTime.toLocaleTimeString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {currentTime.toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="animate-slide-up">
        <OverviewCards />
      </div>

      {/* Real-time Monitoring Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Transaction Stream */}
        <div className="animate-slide-up card-3d" style={{ animationDelay: '0.1s' }}>
          <TransactionStream />
        </div>
        
        {/* Fraud Alerts */}
        <div className="animate-slide-up card-3d" style={{ animationDelay: '0.2s' }}>
          <FraudAlertsPanel />
        </div>
      </div>

    </div>
  );
};

export default Dashboard;