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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

const AlertItem = ({ 
  alert, 
  onResolve, 
  onView 
}: { 
  alert: FraudAlert; 
  onResolve: (id: string) => void;
  onView: (alert: FraudAlert) => void;
}) => {
  const getRiskColor = () => {
    switch (alert.severity) {
      case 'critical':
      case 'high': return 'status-fraud';
      case 'medium': return 'status-suspicious';
      case 'low': return 'bg-muted text-muted-foreground';
    }
  };

  const getRiskIcon = () => {
    switch (alert.severity) {
      case 'critical':
      case 'high': return <AlertTriangle className="h-4 w-4 text-fraud" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-suspicious" />;
      case 'low': return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className={`p-4 border rounded-lg space-y-3 animate-fade-in ${
      alert.is_resolved ? 'opacity-50' : ''
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          {getRiskIcon()}
          <Badge className={`${getRiskColor()} text-xs uppercase`}>
            {alert.severity} Risk
          </Badge>
          <Badge variant="outline" className="text-xs">
            {alert.alert_type}
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
            onClick={() => onResolve(alert.id)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-foreground">{alert.message}</p>
        
        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{new Date(alert.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</span>
          </div>
          <span>ID: {alert.transaction_id.slice(0, 8)}</span>
        </div>

        {alert.details && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(alert.details).slice(0, 2).map(([key, value], index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {key}: {String(value)}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const FraudAlertsPanel = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [viewingAlert, setViewingAlert] = useState<FraudAlert | null>(null);

  useEffect(() => {
    if (!user?.merchantProfile?.id) return;

    // Load alerts
    const loadAlerts = async () => {
      const { data, error } = await supabase
        .from('fraud_alerts')
        .select('*')
        .eq('merchant_id', user.merchantProfile.id)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.warn('Backend unavailable, using demo alerts:', error);
        // Fallback to mock alerts for demo
        const mockAlerts: FraudAlert[] = [
          {
            id: '1',
            transaction_id: 'tx_001',
            merchant_id: user.merchantProfile.id,
            alert_type: 'high_risk_transaction',
            severity: 'high',
            message: 'Stolen card pattern detected',
            details: { risk_score: 94, factors: ['Card-not-present', 'Velocity spike'] },
            is_resolved: false,
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            transaction_id: 'tx_002',
            merchant_id: user.merchantProfile.id,
            alert_type: 'suspicious_activity',
            severity: 'medium',
            message: 'Unusual transaction pattern',
            details: { risk_score: 72, factors: ['New location', 'High amount'] },
            is_resolved: false,
            created_at: new Date(Date.now() - 300000).toISOString()
          },
          {
            id: '3',
            transaction_id: 'tx_003',
            merchant_id: user.merchantProfile.id,
            alert_type: 'velocity_abuse',
            severity: 'high',
            message: 'Multiple transactions detected',
            details: { risk_score: 88, factors: ['14 transactions in 8 minutes'] },
            is_resolved: false,
            created_at: new Date(Date.now() - 600000).toISOString()
          }
        ];
        setAlerts(mockAlerts);
        return;
      }

      setAlerts(data || []);
    };

    loadAlerts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('fraud-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fraud_alerts',
          filter: `merchant_id=eq.${user.merchantProfile.id}`
        },
        (payload) => {
          setAlerts(prev => [payload.new as FraudAlert, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.merchantProfile?.id]);

  const handleResolve = async (alertId: string) => {
    const { error } = await supabase
      .from('fraud_alerts')
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', alertId);

    if (error) {
      console.error('Error resolving alert:', error);
      return;
    }

    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const handleView = (alert: FraudAlert) => {
    setViewingAlert(alert);
  };

  const activeAlerts = alerts.filter(a => !a.is_resolved);
  const highRiskCount = activeAlerts.filter(a => a.severity === 'high' || a.severity === 'critical').length;

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
                  onResolve={handleResolve}
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