import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Key, 
  Settings, 
  Copy, 
  CheckCircle, 
  Shield,
  Globe,
  CreditCard,
  Package
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useVendor } from "@/contexts/VendorContext";

const VendorIntegration = () => {
  const { 
    isConnected, 
    setIsConnected, 
    websiteUrl, 
    setWebsiteUrl, 
    apiKey, 
    setApiKey 
  } = useVendor();
  const { toast } = useToast();

  const generateApiKey = () => {
    const newKey = `af_${Math.random().toString(36).substr(2, 32)}`;
    setApiKey(newKey);
    toast({
      title: "API Key Generated",
      description: "Your new API key has been generated successfully.",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Code snippet copied to clipboard.",
    });
  };

  const connectWebsite = () => {
    if (!websiteUrl || !apiKey) {
      toast({
        title: "Missing Information",
        description: "Please provide both website URL and API key.",
        variant: "destructive"
      });
      return;
    }
    
    setIsConnected(true);
    toast({
      title: "Website Connected",
      description: "Your website is now protected by Antifraudster.",
    });
  };


  const jsIntegrationCode = `// Install the Antifraudster SDK
npm install @antifraudster/sdk

// Initialize the SDK
import { Antifraudster } from '@antifraudster/sdk';

const fraudDetector = new Antifraudster({
  apiKey: '${apiKey || 'YOUR_API_KEY'}',
  endpoint: 'https://api.antifraudster.com/v1'
});

// Check transaction before processing payment
const checkTransaction = async (transactionData) => {
  try {
    const result = await fraudDetector.analyze({
      buyerEmail: transactionData.email,
      amount: transactionData.amount,
      paymentMethod: transactionData.paymentMethod,
      ipAddress: transactionData.ipAddress,
      deviceFingerprint: transactionData.deviceId,
      billingAddress: transactionData.billingAddress,
      shippingAddress: transactionData.shippingAddress
    });
    
    if (result.status === 'fraud') {
      // Block transaction
      throw new Error(result.explanation);
    }
    
    // Allow transaction to proceed
    return result;
  } catch (error) {
    console.error('Fraud detection error:', error);
    // Handle error appropriately
  }
};`;

  const phpIntegrationCode = `<?php
// Install via Composer
composer require antifraudster/php-sdk

use Antifraudster\\Client;

$fraudDetector = new Client([
    'api_key' => '${apiKey || 'YOUR_API_KEY'}',
    'endpoint' => 'https://api.antifraudster.com/v1'
]);

function checkTransaction($transactionData) {
    global $fraudDetector;
    
    try {
        $result = $fraudDetector->analyze([
            'buyer_email' => $transactionData['email'],
            'amount' => $transactionData['amount'],
            'payment_method' => $transactionData['payment_method'],
            'ip_address' => $_SERVER['REMOTE_ADDR'],
            'device_fingerprint' => $transactionData['device_id'],
            'billing_address' => $transactionData['billing_address'],
            'shipping_address' => $transactionData['shipping_address']
        ]);
        
        if ($result['status'] === 'fraud') {
            throw new Exception($result['explanation']);
        }
        
        return $result;
    } catch (Exception $e) {
        error_log('Fraud detection error: ' . $e->getMessage());
        throw $e;
    }
}
?>`;

  const restApiCode = `# REST API Integration
curl -X POST https://api.antifraudster.com/v1/analyze \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "buyer_email": "customer@email.com",
    "amount": 99.99,
    "payment_method": "credit_card",
    "ip_address": "192.168.1.1",
    "device_fingerprint": "abc123",
    "billing_address": {
      "street": "123 Main St",
      "city": "City",
      "country": "US"
    },
    "shipping_address": {
      "street": "123 Main St", 
      "city": "City",
      "country": "US"
    }
  }'

# Response
{
  "status": "safe",
  "risk_score": 15.2,
  "explanation": "Normal purchase pattern detected",
  "transaction_id": "txn_abc123",
  "recommendations": ["allow"]
}`;

  return (
    <div className="space-y-6">
      {/* Integration Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Vendor Integration Setup</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Connect your e-commerce website to Antifraudster's fraud detection system
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* API Key Generation */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="apiKey" className="text-base font-medium">API Key</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateApiKey}
                className="ml-4"
              >
                <Key className="h-4 w-4 mr-2" />
                Generate Key
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Input
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="af_your_api_key_here"
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

          {/* Website URL */}
          <div className="space-y-2">
            <Label htmlFor="websiteUrl" className="text-base font-medium">Website URL</Label>
            <div className="flex space-x-2">
              <Input
                id="websiteUrl"
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
            <div className="flex items-center space-x-2 p-3 bg-safe-muted border border-safe rounded-lg">
              <CheckCircle className="h-4 w-4 text-safe" />
              <span className="text-sm text-safe font-medium">
                Website successfully connected to Antifraudster
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration Code Examples - removed per request */}

      {/* Integration Status & Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Integration Features</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Your fraud detection system capabilities
          </p>
        </CardHeader>
        
        <CardContent>
          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h5 className="font-medium text-sm">Real-time Protection</h5>
              <p className="text-xs text-muted-foreground mt-1">
                Block fraud before payment
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h5 className="font-medium text-sm">Payment Security</h5>
              <p className="text-xs text-muted-foreground mt-1">
                Secure all payment methods
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <Package className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h5 className="font-medium text-sm">Easy Integration</h5>
              <p className="text-xs text-muted-foreground mt-1">
                5-minute setup process
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorIntegration;