import { useState } from "react";
import { AlertTriangle, Filter, Bell, BellOff, Eye, X, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const FraudAlerts = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const alertStats = [
    { label: "High Risk", count: 12, color: "status-fraud" },
    { label: "Medium Risk", count: 8, color: "status-suspicious" },
    { label: "Low Risk", count: 3, color: "bg-warning text-warning-foreground" },
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
      <Card className="card-3d">
        <CardHeader>
          <CardTitle>Fraud Alerts Management</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alert ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Explanation</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 20 }, (_, i) => {
                  const riskLevels = ['high', 'medium', 'low'];
                  const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
                  const getRiskColor = () => {
                    switch (riskLevel) {
                      case 'high': return 'status-fraud';
                      case 'medium': return 'status-suspicious';
                      case 'low': return 'bg-muted text-muted-foreground';
                    }
                  };
                  
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-sm">
                        ALERT-{String(i + 1).padStart(4, '0')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">user{i + 1}@example.com</span>
                          <span className="text-xs text-muted-foreground">TXN-{String(i + 1).padStart(6, '0')}</span>
                        </div>
                      </TableCell>
                      <TableCell>₹{(Math.floor(Math.random() * 90000 + 10000)).toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Badge className={`${getRiskColor()} text-xs uppercase`}>
                          {riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{Math.floor(Math.random() * 50 + 50)}%</span>
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${riskLevel === 'high' ? 'bg-fraud' : riskLevel === 'medium' ? 'bg-suspicious' : 'bg-muted-foreground'}`}
                              style={{ width: `${Math.floor(Math.random() * 50 + 50)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <span className="text-sm truncate">
                          {riskLevel === 'high' ? 'Multiple failed payment attempts' : 
                           riskLevel === 'medium' ? 'Unusual spending pattern detected' : 
                           'Minor velocity anomaly'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              const alertData = {
                                alertId: `ALERT-${String(i + 1).padStart(4, '0')}`,
                                transactionId: `TXN-${String(i + 1).padStart(6, '0')}`,
                                customer: `user${i + 1}@example.com`,
                                amount: `₹${(Math.floor(Math.random() * 90000 + 10000)).toLocaleString('en-IN')}`,
                                riskLevel: riskLevel.toUpperCase(),
                                riskScore: `${Math.floor(Math.random() * 50 + 50)}%`,
                                explanation: riskLevel === 'high' ? 'Multiple failed payment attempts' : 
                                           riskLevel === 'medium' ? 'Unusual spending pattern detected' : 
                                           'Minor velocity anomaly',
                                time: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString(),
                                recommendation: riskLevel === 'high' ? 'Block Transaction' : 
                                              riskLevel === 'medium' ? 'Manual Review Required' : 
                                              'Allow with Monitoring'
                              };
                              
                              alert(`🚨 FRAUD ALERT DETAILS\n\n` +
                                `Alert ID: ${alertData.alertId}\n` +
                                `Transaction ID: ${alertData.transactionId}\n` +
                                `Customer: ${alertData.customer}\n` +
                                `Amount: ${alertData.amount}\n` +
                                `Risk Level: ${alertData.riskLevel}\n` +
                                `Risk Score: ${alertData.riskScore}\n` +
                                `Explanation: ${alertData.explanation}\n` +
                                `Time: ${alertData.time}\n\n` +
                                `⚡ RECOMMENDED ACTION: ${alertData.recommendation}`);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default FraudAlerts;