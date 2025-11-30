import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, RefreshCw, Store, Shield } from "lucide-react";

const StoreSettings = () => {
  const { user, refreshAuth } = useAuth();
  const [fraudDetectionEnabled, setFraudDetectionEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.merchantProfile) {
      setFraudDetectionEnabled(user.merchantProfile.fraud_detection_enabled || false);
      setWebhookUrl(user.merchantProfile.webhook_url || "");
    }
  }, [user]);

  const generateApiKey = async () => {
    if (!user?.id) {
      toast.error("Please log in first");
      return;
    }

    // Generate 64-character secure API key
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const newKey = `af_live_${Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
    
    const { error } = await supabase
      .from('merchants')
      .update({ api_key: newKey })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error generating API key:', error);
      toast.error("Failed to generate API key");
      return;
    }

    await refreshAuth();
    toast.success("New API key generated! Copy it to AntiFraudster Vendors page.");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("Please log in first");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('merchants')
      .update({
        fraud_detection_enabled: fraudDetectionEnabled,
        webhook_url: webhookUrl || null,
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error saving settings:', error);
      toast.error("Failed to save settings");
    } else {
      await refreshAuth();
      toast.success("Settings saved successfully!");
    }

    setSaving(false);
  };

  const storeUrl = user?.merchantProfile?.domain || "http://localhost:8080";
  const apiKey = user?.merchantProfile?.api_key || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Store className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Store Settings</h1>
            <p className="text-muted-foreground">Configure your e-commerce store integration</p>
          </div>
        </div>

        {/* Store URL */}
        <Card className="card-3d">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              Store URL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Your Store URL</Label>
              <div className="flex gap-2">
                <Input 
                  value={storeUrl} 
                  readOnly 
                  className="font-mono bg-muted"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(storeUrl)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Use this URL in AntiFraudster dashboard to connect your store
              </p>
            </div>
          </CardContent>
        </Card>

        {/* API Key */}
        <Card className="card-3d">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              API Key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Your API Key</Label>
              <div className="flex gap-2">
                <Input 
                  value={apiKey ? "•".repeat(40) : "No API key generated"} 
                  readOnly 
                  className="font-mono bg-muted"
                  type="password"
                />
                {apiKey && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(apiKey)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
                <Button 
                  variant="outline"
                  onClick={generateApiKey}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Use this API key in AntiFraudster dashboard to connect your store
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Fraud Detection Settings */}
        <Card className="card-3d">
          <CardHeader>
            <CardTitle>Fraud Detection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Enable Fraud Detection</Label>
                <p className="text-sm text-muted-foreground">
                  Block fraudulent transactions in real-time
                </p>
              </div>
              <Switch
                checked={fraudDetectionEnabled}
                onCheckedChange={setFraudDetectionEnabled}
              />
            </div>

            {fraudDetectionEnabled && (
              <div className="space-y-2">
                <Label>Webhook URL (Optional)</Label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-store.com/webhook"
                />
                <p className="text-sm text-muted-foreground">
                  Receive real-time fraud alerts at this URL
                </p>
              </div>
            )}

            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="w-full"
            >
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        {/* Integration Instructions */}
        <Card className="card-3d border-primary/20">
          <CardHeader>
            <CardTitle>Integration Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Generate API Key</p>
                  <p className="text-sm text-muted-foreground">
                    Click "Generate" above to create your unique API key
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Add to AntiFraudster</p>
                  <p className="text-sm text-muted-foreground">
                    Go to AntiFraudster Vendors page, paste your API key and Store URL
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">Enable Fraud Detection</p>
                  <p className="text-sm text-muted-foreground">
                    Toggle "Enable Fraud Detection" on this page to activate real-time protection
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  4
                </div>
                <div>
                  <p className="font-medium">Test Integration</p>
                  <p className="text-sm text-muted-foreground">
                    Place a test order - it will be analyzed by AntiFraudster's ML models
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StoreSettings;
