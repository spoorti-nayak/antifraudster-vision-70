import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Key, 
  Copy, 
  CheckCircle, 
  Shield,
  Globe,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const VendorIntegration = () => {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (user?.merchantProfile) {
      setApiKey(user.merchantProfile.api_key || "");
      setWebsiteUrl(user.merchantProfile.domain || "");
      setIsConnected(!!user.merchantProfile.api_key && !!user.merchantProfile.domain);
    }
  }, [user]);

  const generateApiKey = async () => {
    if (!user?.id) {
      toast.error("Please log in first");
      return;
    }

    const newKey = `af_${Math.random().toString(36).substr(2, 32)}`;
    
    const { error } = await supabase
      .from('merchants')
      .update({ api_key: newKey })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error generating API key:', error);
      toast.error("Failed to generate API key");
      return;
    }

    setApiKey(newKey);
    toast.success("API key generated successfully!");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const connectWebsite = async () => {
    if (!websiteUrl) {
      toast.error("Please enter your website URL");
      return;
    }

    // Validate URL format
    try {
      new URL(websiteUrl);
    } catch {
      toast.error("Please enter a valid URL (e.g., https://mystore.com)");
      return;
    }

    if (!user?.id) {
      toast.error("Please log in first");
      return;
    }

    try {
      const { error } = await supabase
        .from('merchants')
        .update({ 
          domain: websiteUrl,
          is_active: true 
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setIsConnected(true);
      toast.success("Website connected! Now add the integration code to your site.");
    } catch (error) {
      console.error('Error connecting website:', error);
      toast.error("Failed to connect website");
    }
  };

  // Real API endpoint
  const apiEndpoint = `https://xvelszpgrkmkdpgzadrs.supabase.co/functions/v1/analyze-transaction`;
  
  const javascriptCode = `
<!-- Step 1: Add this script before closing </body> tag -->
<script>
class AntiFraudDetection {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.endpoint = '${apiEndpoint}';
  }

  async checkTransaction(transactionData) {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + this.apiKey
        },
        body: JSON.stringify(transactionData)
      });

      return await response.json();
    } catch (error) {
      console.error('Fraud check failed:', error);
      return { status: 'error', message: 'Failed to verify transaction' };
    }
  }
}

// Initialize
const fraudDetector = new AntiFraudDetection('${apiKey || 'YOUR_API_KEY'}');

// Step 2: Call before payment processing
document.getElementById('checkout-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const result = await fraudDetector.checkTransaction({
    amount: parseFloat(document.getElementById('amount').value),
    currency: 'USD',
    customer_email: document.getElementById('email').value,
    customer_ip: '{{USER_IP}}', // Get from server
    customer_device: navigator.userAgent,
    payment_method: 'credit_card',
    card_last4: document.getElementById('card').value.slice(-4),
    customer_location: {
      country: 'US',
      city: 'New York'
    }
  });

  if (result.status === 'blocked') {
    alert('Payment blocked: ' + result.message);
    return;
  }

  if (result.status === 'flagged') {
    if (!confirm('This transaction requires verification. Continue?')) {
      return;
    }
  }

  // Proceed with payment
  processPayment();
});
</script>
  `.trim();

  const phpCode = `
<?php
// Step 1: Add this class to your PHP project
class AntiFraudDetection {
    private $apiKey;
    private $endpoint = '${apiEndpoint}';

    public function __construct($apiKey) {
        $this->apiKey = $apiKey;
    }

    public function checkTransaction($data) {
        $ch = curl_init($this->endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $this->apiKey
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            return ['status' => 'error', 'message' => 'Failed to verify'];
        }

        return json_decode($response, true);
    }
}

// Step 2: Use before payment processing
$fraudDetector = new AntiFraudDetection('${apiKey || 'YOUR_API_KEY'}');

$result = $fraudDetector->checkTransaction([
    'amount' => $_POST['amount'],
    'currency' => 'USD',
    'customer_email' => $_POST['email'],
    'customer_ip' => $_SERVER['REMOTE_ADDR'],
    'customer_device' => $_SERVER['HTTP_USER_AGENT'],
    'payment_method' => 'credit_card',
    'card_last4' => substr($_POST['card_number'], -4),
    'customer_location' => [
        'country' => $_POST['country'],
        'city' => $_POST['city']
    ]
]);

if ($result['status'] === 'blocked') {
    http_response_code(403);
    die(json_encode(['error' => $result['message']]));
}

if ($result['status'] === 'flagged') {
    // Log for review or require additional verification
    error_log('Flagged: ' . json_encode($result));
}

// Proceed with payment
processPayment($_POST);
?>
  `.trim();

  const webhookCode = `
# Webhook Configuration (Optional)
# Receive real-time fraud alerts at your endpoint

POST https://your-site.com/webhook/fraud-alerts
Headers:
  X-Antifraud-Signature: HMAC-SHA256 signature
  Content-Type: application/json

Payload:
{
  "event": "fraud_detected",
  "transaction_id": "uuid",
  "customer_email": "user@example.com",
  "fraud_score": 85,
  "risk_level": "high",
  "blocked": true,
  "timestamp": "2025-01-01T12:00:00Z"
}

# Verify webhook signature in your code:
const crypto = require('crypto');
const signature = req.headers['x-antifraud-signature'];
const payload = JSON.stringify(req.body);
const expected = crypto
  .createHmac('sha256', '${apiKey || 'YOUR_API_KEY'}')
  .update(payload)
  .digest('hex');

if (signature === expected) {
  // Process webhook
}
  `.trim();

  return (
    <div className="space-y-6">
      {/* Integration Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span>Connect Your E-Commerce Site</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            3-step process: Generate API key → Add website URL → Integrate code into your site
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Step 1: API Key */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Step 1: Generate API Key</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateApiKey}
              >
                <Key className="h-4 w-4 mr-2" />
                Generate New Key
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Input
                value={apiKey}
                readOnly
                placeholder="Click 'Generate New Key' to create your API key"
                className="font-mono text-sm"
              />
              {apiKey && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(apiKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Step 2: Website URL */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Step 2: Add Your Website URL</Label>
            <div className="flex gap-2">
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://your-ecommerce-site.com"
              />
              <Button 
                onClick={connectWebsite}
                disabled={!apiKey || !websiteUrl || isConnected}
                className="gradient-primary"
              >
                {isConnected ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Connected
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Connect
                  </>
                )}
              </Button>
            </div>
          </div>

          {isConnected && (
            <div className="flex items-center gap-2 p-3 bg-safe/10 border border-safe rounded-lg">
              <CheckCircle className="h-4 w-4 text-safe" />
              <span className="text-sm text-safe font-medium">
                ✓ Connected! Now add the integration code below to your website
              </span>
            </div>
          )}

          {!apiKey && (
            <div className="flex items-center gap-2 p-3 bg-suspicious/10 border border-suspicious rounded-lg">
              <AlertCircle className="h-4 w-4 text-suspicious" />
              <span className="text-sm text-suspicious">
                Generate an API key first to begin integration
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Integration Code */}
      {apiKey && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Add Integration Code</CardTitle>
            <p className="text-sm text-muted-foreground">
              Copy and paste this code into your website to start detecting fraud
            </p>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="javascript" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="php">PHP</TabsTrigger>
                <TabsTrigger value="webhook">Webhooks</TabsTrigger>
              </TabsList>

              <TabsContent value="javascript" className="space-y-4">
                <div className="relative">
                  <pre className="bg-secondary p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{javascriptCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(javascriptCode)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="php" className="space-y-4">
                <div className="relative">
                  <pre className="bg-secondary p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{phpCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(phpCode)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="webhook" className="space-y-4">
                <div className="relative">
                  <pre className="bg-secondary p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{webhookCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(webhookCode)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Configure your webhook URL in the Settings tab to receive real-time fraud alerts
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VendorIntegration;
