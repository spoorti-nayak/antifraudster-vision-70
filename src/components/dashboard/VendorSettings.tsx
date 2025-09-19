import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Bell, 
  Shield,
  Globe,
  Key,
  Mail,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const VendorSettings = () => {
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      webhook: false,
      realtime: true,
      threshold: "high"
    },
    security: {
      requireApiKey: true,
      ipWhitelist: "",
      rateLimit: 1000,
      encryption: true
    },
    integration: {
      webhookUrl: "",
      timeoutMs: 5000,
      retryAttempts: 3,
      logLevel: "info"
    }
  });

  const { toast } = useToast();

  const handleNotificationChange = (key: string, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  const handleSecurityChange = (key: string, value: boolean | string | number) => {
    setSettings(prev => ({
      ...prev,
      security: {
        ...prev.security,
        [key]: value
      }
    }));
  };

  const handleIntegrationChange = (key: string, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      integration: {
        ...prev.integration,
        [key]: value
      }
    }));
  };

  const saveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your vendor configuration has been updated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Notification Settings */}
      <Card className="card-3d">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-xl">
            <Bell className="h-6 w-6" />
            <span>Notification Settings</span>
          </CardTitle>
          <p className="text-base text-muted-foreground">
            Configure how you receive fraud alerts and notifications
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive fraud alerts via email</p>
            </div>
            <Switch
              checked={settings.notifications.email}
              onCheckedChange={(checked) => handleNotificationChange('email', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">Webhook Notifications</Label>
              <p className="text-sm text-muted-foreground">Send alerts to your webhook endpoint</p>
            </div>
            <Switch
              checked={settings.notifications.webhook}
              onCheckedChange={(checked) => handleNotificationChange('webhook', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">Real-time Dashboard</Label>
              <p className="text-sm text-muted-foreground">Show live alerts in dashboard</p>
            </div>
            <Switch
              checked={settings.notifications.realtime}
              onCheckedChange={(checked) => handleNotificationChange('realtime', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base">Alert Threshold</Label>
            <select 
              className="w-full p-2 border rounded-md"
              value={settings.notifications.threshold}
              onChange={(e) => handleNotificationChange('threshold', e.target.value)}
            >
              <option value="low">Low Risk (Score &gt; 30)</option>
              <option value="medium">Medium Risk (Score &gt; 60)</option>
              <option value="high">High Risk (Score &gt; 80)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="card-3d">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-xl">
            <Shield className="h-6 w-6" />
            <span>Security Settings</span>
          </CardTitle>
          <p className="text-base text-muted-foreground">
            Configure security and access controls
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">Require API Key</Label>
              <p className="text-sm text-muted-foreground">All requests must include valid API key</p>
            </div>
            <Switch
              checked={settings.security.requireApiKey}
              onCheckedChange={(checked) => handleSecurityChange('requireApiKey', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ipWhitelist" className="text-base">IP Whitelist</Label>
            <Input
              id="ipWhitelist"
              value={settings.security.ipWhitelist}
              onChange={(e) => handleSecurityChange('ipWhitelist', e.target.value)}
              placeholder="192.168.1.1, 10.0.0.0/24"
              className="text-base"
            />
            <p className="text-sm text-muted-foreground">Comma-separated IPs or CIDR blocks</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rateLimit" className="text-base">Rate Limit (per hour)</Label>
            <Input
              id="rateLimit"
              type="number"
              value={settings.security.rateLimit}
              onChange={(e) => handleSecurityChange('rateLimit', parseInt(e.target.value))}
              className="text-base"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">End-to-End Encryption</Label>
              <p className="text-sm text-muted-foreground">Encrypt all API communications</p>
            </div>
            <Switch
              checked={settings.security.encryption}
              onCheckedChange={(checked) => handleSecurityChange('encryption', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Integration Settings */}
      <Card className="card-3d">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-xl">
            <Globe className="h-6 w-6" />
            <span>Integration Settings</span>
          </CardTitle>
          <p className="text-base text-muted-foreground">
            Configure API behavior and webhooks
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="webhookUrl" className="text-base">Webhook URL</Label>
            <Input
              id="webhookUrl"
              value={settings.integration.webhookUrl}
              onChange={(e) => handleIntegrationChange('webhookUrl', e.target.value)}
              placeholder="https://your-site.com/webhook/fraud"
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeout" className="text-base">API Timeout (ms)</Label>
            <Input
              id="timeout"
              type="number"
              value={settings.integration.timeoutMs}
              onChange={(e) => handleIntegrationChange('timeoutMs', parseInt(e.target.value))}
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="retries" className="text-base">Retry Attempts</Label>
            <Input
              id="retries"
              type="number"
              value={settings.integration.retryAttempts}
              onChange={(e) => handleIntegrationChange('retryAttempts', parseInt(e.target.value))}
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base">Log Level</Label>
            <select 
              className="w-full p-2 border rounded-md text-base"
              value={settings.integration.logLevel}
              onChange={(e) => handleIntegrationChange('logLevel', e.target.value)}
            >
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* API Usage Stats */}
      <Card className="card-3d">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-xl">
            <TrendingUp className="h-6 w-6" />
            <span>Usage Statistics</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-primary">1,247</div>
              <p className="text-sm text-muted-foreground">Requests Today</p>
            </div>
            
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-safe">98.2%</div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
            
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-suspicious">15</div>
              <p className="text-sm text-muted-foreground">Fraud Blocked</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} className="gradient-primary text-base px-8 py-2">
          <Settings className="h-5 w-5 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default VendorSettings;