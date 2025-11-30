import { useState, useEffect } from "react";
import OverviewCards from "@/components/dashboard/OverviewCards";
import TransactionStream from "@/components/dashboard/TransactionStream";
import FraudAlertsPanel from "@/components/dashboard/FraudAlertsPanel";
import { useVendor } from "@/contexts/VendorContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Settings } from "lucide-react";

const Dashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { isConnected } = useVendor();

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

      {/* Connection Status Notice */}
      {!isConnected && (
        <Card className="animate-slide-up mb-4">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Settings className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Connect Your Website for Live Production Data
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md text-sm">
              You&apos;re currently viewing the simulation dashboard. Connect your website to stream real
              transactions from your store in real time.
            </p>
            <Button asChild size="sm" className="gradient-primary">
              <Link to="/vendors">
                Set Up Integration
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Real-time Monitoring Grid (uses live data when connected, simulation otherwise) */}
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