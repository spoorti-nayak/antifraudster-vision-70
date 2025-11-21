import { useState, useEffect } from "react";
import { ArrowLeft, Shield, AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const ShopSettings = () => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    storeName: "",
    storeUrl: "",
    antifraudsterApiKey: "",
    antifraudsterEnabled: false,
    webhookSecret: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const raw = localStorage.getItem("shop_settings");
      if (raw) {
        const data = JSON.parse(raw);
        setSettings(data);
        setFormData({
          storeName: data.store_name || "",
          storeUrl: data.store_url || "",
          antifraudsterApiKey: data.antifraudster_api_key || "",
          antifraudsterEnabled: data.antifraudster_enabled || false,
          webhookSecret: data.webhook_secret || "",
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };
  const handleSave = () => {
    setSaving(true);
    try {
      const payload = {
        store_name: formData.storeName,
        store_url: formData.storeUrl,
        antifraudster_api_key: formData.antifraudsterApiKey,
        antifraudster_enabled: formData.antifraudsterEnabled,
        webhook_secret: formData.webhookSecret,
      };

      localStorage.setItem("shop_settings", JSON.stringify(payload));
      setSettings(payload);
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ecommerce-webhook`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/shop')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Store
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Store Settings</h1>
            <p className="text-muted-foreground">Configure AntiFraudster integration</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Integration Status */}
          <Alert>
            {formData.antifraudsterEnabled && formData.antifraudsterApiKey ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-safe" />
                <AlertDescription>
                  <strong className="text-safe">AntiFraudster Protection Active</strong>
                  <p className="mt-1 text-sm">All transactions are being analyzed for fraud in real-time</p>
                </AlertDescription>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertDescription>
                  <strong className="text-warning">No Fraud Protection</strong>
                  <p className="mt-1 text-sm">Enable AntiFraudster to protect your store from fraudulent transactions</p>
                </AlertDescription>
              </>
            )}
          </Alert>

          {/* Store Information */}
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
              <CardDescription>Basic information about your store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="storeName">Store Name</Label>
                <Input
                  id="storeName"
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  placeholder="My Awesome Store"
                />
              </div>
              <div>
                <Label htmlFor="storeUrl">Store URL</Label>
                <Input
                  id="storeUrl"
                  value={formData.storeUrl}
                  onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value })}
                  placeholder="https://mystore.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will be registered with AntiFraudster
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AntiFraudster Integration */}
          <Card>
            <CardHeader>
              <CardTitle>AntiFraudster Integration</CardTitle>
              <CardDescription>
                Connect to AntiFraudster for real-time fraud detection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Fraud Detection</Label>
                  <p className="text-sm text-muted-foreground">
                    Analyze all transactions for fraud
                  </p>
                </div>
                <Switch
                  checked={formData.antifraudsterEnabled}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, antifraudsterEnabled: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">AntiFraudster API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="apiKey"
                    type="password"
                    value={formData.antifraudsterApiKey}
                    onChange={(e) => setFormData({ ...formData, antifraudsterApiKey: e.target.value })}
                    placeholder="Enter your AntiFraudster API key"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Get this from your AntiFraudster dashboard → API Integration tab
                </p>
              </div>

              <div className="space-y-2">
                <Label>Webhook URL (for receiving fraud alerts)</Label>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add this URL to your AntiFraudster settings to receive real-time alerts
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>How it works:</strong>
                  <ol className="mt-2 space-y-1 list-decimal list-inside">
                    <li>Customer completes checkout</li>
                    <li>Transaction is sent to AntiFraudster API</li>
                    <li>AI analyzes transaction in real-time</li>
                    <li>High-risk transactions are blocked automatically</li>
                    <li>Fraud alerts are sent via webhook</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShopSettings;
