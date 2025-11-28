import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Globe, Bell } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { apiService } from "@/services/api";

const VendorSettings = () => {
  const { user } = useAuth();
  const [autoBlock, setAutoBlock] = useState(true);
  const [riskThreshold, setRiskThreshold] = useState("75");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.merchantProfile) {
      setNotificationEmail(user.merchantProfile.email || "");
    }
  }, [user]);

  const handleSaveSettings = async () => {
    if (!user?.merchantProfile?.id) {
      toast.error("Please log in first");
      return;
    }

    setLoading(true);
    try {
      // Validate webhook URL if provided
      if (webhookUrl) {
        try {
          new URL(webhookUrl);
        } catch {
          toast.error("Invalid webhook URL format - must start with https://");
          setLoading(false);
          return;
        }
      }

      // Save webhook URL and notification email via API
      await apiService.updateIntegration({
        website_url: user.merchantProfile.domain || '',
        webhook_url: webhookUrl || undefined,
      });

      await apiService.updateVendorProfile({
        email: notificationEmail,
      });

      // Save local preferences
      localStorage.setItem('af_auto_block', autoBlock.toString());

      if (webhookUrl) {
        toast.success("Settings saved! Webhook alerts will be sent to your configured endpoint with HMAC signature verification.");
      } else {
        toast.success("Settings saved successfully!");
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load settings from merchant profile and localStorage
    if (user?.merchantProfile) {
      setWebhookUrl(user.merchantProfile.webhook_url || '');
    }
    
    const savedAutoBlock = localStorage.getItem('af_auto_block');
    if (savedAutoBlock) setAutoBlock(savedAutoBlock === 'true');
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Webhook Configuration */}
      <Card className="card-3d">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <span>Webhook Configuration</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Receive real-time fraud alerts at your webhook endpoint
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <Input
              id="webhookUrl"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-site.com/webhook/fraud-alerts"
            />
            <p className="text-xs text-muted-foreground">
              We'll send POST requests with fraud alerts to this URL. Make sure to verify the X-Antifraud-Signature header.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="card-3d">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <span>Notification Settings</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Auto-block High Risk Transactions</Label>
              <p className="text-sm text-muted-foreground">Automatically block transactions flagged as high risk by AI</p>
            </div>
            <Switch
              checked={autoBlock}
              onCheckedChange={setAutoBlock}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Notification Email</Label>
            <Input
              id="email"
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="alerts@your-company.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveSettings} 
          disabled={loading}
          className="gradient-primary"
        >
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};

export default VendorSettings;
