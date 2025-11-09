import { useState, useEffect } from "react";
import { AlertTriangle, Bell, BellOff, Eye, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVendor } from "@/contexts/VendorContext";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface FraudAlert {
  id: string;
  transaction_id: string | null;
  merchant_id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  is_resolved: boolean;
  created_at: string;
}

const FraudAlerts = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { isConnected } = useVendor();
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && user?.merchantProfile?.id) {
      fetchAlerts();
      
      // Subscribe to real-time alerts
      const channel = supabase
        .channel('fraud_alerts_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'fraud_alerts',
            filter: `merchant_id=eq.${user.merchantProfile.id}`
          },
          (payload) => {
            setAlerts(prev => [payload.new as FraudAlert, ...prev]);
            toast({
              title: "New Fraud Alert",
              description: (payload.new as FraudAlert).message,
              variant: "destructive"
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setLoading(false);
    }
  }, [isConnected, user?.merchantProfile?.id]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fraud_alerts')
        .select('*')
        .eq('merchant_id', user?.merchantProfile?.id)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch fraud alerts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('fraud_alerts')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;
      
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      toast({
        title: "Success",
        description: "Alert resolved successfully"
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: "Error",
        description: "Failed to resolve alert",
        variant: "destructive"
      });
    }
  };

  const highRiskCount = alerts.filter(a => a.severity === 'high').length;
  const mediumRiskCount = alerts.filter(a => a.severity === 'medium').length;
  const lowRiskCount = alerts.filter(a => a.severity === 'low').length;

  const alertStats = [
    { label: "High Risk", count: highRiskCount, color: "status-fraud" },
    { label: "Medium Risk", count: mediumRiskCount, color: "status-suspicious" },
    { label: "Low Risk", count: lowRiskCount, color: "bg-warning text-warning-foreground" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <AlertTriangle className="w-8 h-8 mr-3 text-fraud" />
            Fraud Alerts
          </h1>
          <p className="text-muted-foreground">Real-time fraud detection and alerts</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className="card-3d"
          >
            {notificationsEnabled ? (
              <Bell className="w-4 h-4 mr-2" />
            ) : (
              <BellOff className="w-4 h-4 mr-2" />
            )}
            {notificationsEnabled ? "Disable" : "Enable"} Notifications
          </Button>
        </div>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {alertStats.map((stat, index) => (
          <Card key={stat.label} className="card-3d">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.count}</p>
                </div>
                <Badge className={stat.color}>{stat.count}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Alerts Table */}
      {isConnected ? (
        <Card className="card-3d">
          <CardHeader>
            <CardTitle>Fraud Alerts Management</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-muted-foreground">Loading alerts...</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No Fraud Alerts
                </h3>
                <p className="text-muted-foreground max-w-md">
                  No fraud alerts have been detected yet. Alerts will appear here when suspicious activity is identified.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alert ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => {
                      const getRiskColor = () => {
                        switch (alert.severity) {
                          case 'high': return 'status-fraud';
                          case 'medium': return 'status-suspicious';
                          case 'low': return 'bg-muted text-muted-foreground';
                        }
                      };
                      
                      return (
                        <TableRow key={alert.id}>
                          <TableCell className="font-mono text-sm">
                            {alert.id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{alert.alert_type}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getRiskColor()} text-xs uppercase`}>
                              {alert.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <span className="text-sm truncate">{alert.message}</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(alert.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0"
                                onClick={() => {
                              const alertDetails = {
                                    alertId: alert.id.slice(0, 8),
                                    transactionId: alert.transaction_id || 'N/A',
                                    type: alert.alert_type,
                                    severity: alert.severity.toUpperCase(),
                                    message: alert.message,
                                    details: JSON.stringify(alert.details, null, 2),
                                    time: new Date(alert.created_at).toLocaleString()
                                  };
                                  
                                  window.alert(`🚨 FRAUD ALERT DETAILS\n\n` +
                                    `Alert ID: ${alertDetails.alertId}\n` +
                                    `Transaction ID: ${alertDetails.transactionId}\n` +
                                    `Type: ${alertDetails.type}\n` +
                                    `Severity: ${alertDetails.severity}\n` +
                                    `Message: ${alertDetails.message}\n` +
                                    `Time: ${alertDetails.time}\n\n` +
                                    `Details: ${alertDetails.details}`);
                                }}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0"
                                onClick={() => handleResolveAlert(alert.id)}
                              >
                                Resolve
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="card-3d">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Settings className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Connect Your Website to View Fraud Alerts
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              To view fraud alerts and manage security notifications, you need to connect your website through the vendor integration.
            </p>
            <Button asChild className="gradient-primary">
              <Link to="/vendors">
                Set Up Integration
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FraudAlerts;