import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Copy, RefreshCw, Save, Store } from 'lucide-react';

export default function StoreSettings() {
  const { user, refreshAuth } = useAuth();
  const [fraudDetectionEnabled, setFraudDetectionEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.merchantProfile) {
      setFraudDetectionEnabled(user.merchantProfile.fraud_detection_enabled || false);
      setWebhookUrl(user.merchantProfile.webhook_url || '');
    }
  }, [user]);

  const generateApiKey = async () => {
    try {
      const newApiKey = `sk_live_${crypto.randomUUID().replace(/-/g, '')}`;
      
      const { error } = await (supabase as any)
        .from('merchant_profiles')
        .update({ api_key: newApiKey })
        .eq('user_id', user?.id);

      if (error) throw error;

      await refreshAuth();
      toast.success('API Key generated successfully');
    } catch (error) {
      console.error('Error generating API key:', error);
      toast.error('Failed to generate API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('merchant_profiles')
        .update({
          fraud_detection_enabled: fraudDetectionEnabled,
          webhook_url: webhookUrl || null,
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      await refreshAuth();
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const currentApiKey = user?.merchantProfile?.api_key || '';
  const storeUrl = window.location.origin;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Store className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Store Settings</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>AntiFraudster Integration</CardTitle>
            <CardDescription>
              Configure fraud detection for your e-commerce store
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Store URL</Label>
              <div className="flex gap-2">
                <Input value={storeUrl} readOnly />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(storeUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Use this URL in AntiFraudster dashboard
              </p>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input
                  value={currentApiKey || 'Not generated yet'}
                  readOnly
                  type="password"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(currentApiKey)}
                  disabled={!currentApiKey}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={generateApiKey}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Use this API key in AntiFraudster dashboard to connect your store
              </p>
            </div>

            <div className="border-t pt-6 space-y-4">
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
                    placeholder="https://your-store.com/webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Receive real-time fraud alerts at this endpoint
                  </p>
                </div>
              )}
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Step 1: Generate API Key</h3>
              <p className="text-sm text-muted-foreground">
                Click "Generate" above to create your unique API key
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Step 2: Add to AntiFraudster</h3>
              <p className="text-sm text-muted-foreground">
                Go to AntiFraudster Vendors page, paste your API key and Store URL
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Step 3: Enable Fraud Detection</h3>
              <p className="text-sm text-muted-foreground">
                Toggle "Enable Fraud Detection" on this page to activate real-time protection
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Step 4: Test Integration</h3>
              <p className="text-sm text-muted-foreground">
                Place a test order - it will be analyzed by AntiFraudster's ML models
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
