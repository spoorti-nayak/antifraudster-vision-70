import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PlayCircle, AlertTriangle, CheckCircle, Zap, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SimulationResult {
  transaction_id: string;
  type: string;
  is_fraud: boolean;
  fraud_score: number;
  status: string;
  explanation?: string;
  risk_factors?: string[];
}

export default function TransactionSimulator() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [fraudDetectionEnabled, setFraudDetectionEnabled] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Check if fraud detection is enabled
    setFraudDetectionEnabled(user.merchantProfile?.fraud_detection_enabled || false);
  }, [user, navigate]);

  const scenarios = [
    {
      id: 'legitimate-low',
      name: 'Legitimate - Low Value',
      type: 'legitimate',
      description: 'Normal transaction from trusted customer',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      id: 'legitimate-high',
      name: 'Legitimate - High Value',
      type: 'legitimate',
      description: 'Large transaction from verified customer',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      id: 'fraud-velocity',
      name: 'Fraud - High Velocity',
      type: 'fraud',
      description: 'Multiple rapid transactions',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    {
      id: 'fraud-blacklist',
      name: 'Fraud - Blacklisted IP',
      type: 'fraud',
      description: 'Transaction from known fraudulent IP',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    {
      id: 'fraud-geolocation',
      name: 'Fraud - Suspicious Location',
      type: 'fraud',
      description: 'Transaction from unusual country',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    {
      id: 'fraud-new-customer',
      name: 'Fraud - New Customer High Amount',
      type: 'fraud',
      description: 'First-time buyer with large purchase',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
  ];

  const simulateTransaction = async (scenarioId: string) => {
    if (!user?.merchantProfile?.api_key) {
      toast.error('Please configure your store API key first');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-test-transaction', {
        body: { 
          scenario: scenarioId,
          merchant_id: user.merchantProfile.id,
          merchant_api_key: user.merchantProfile.api_key,
        },
      });

      if (error) throw error;

      setResults(prev => [data, ...prev]);
      
      if (data.is_fraud) {
        toast.error(`⛔ Fraud Detected! Score: ${(data.fraud_score * 100).toFixed(0)}%`, {
          description: data.explanation,
          duration: 5000,
        });
      } else {
        toast.success(`✅ Transaction Approved! Score: ${(data.fraud_score * 100).toFixed(0)}%`);
      }

      return data;
    } catch (error) {
      console.error('Simulation error:', error);
      toast.error('Failed to simulate transaction');
      throw error;
    }
  };

  const runAllScenarios = async () => {
    setRunning(true);
    setResults([]);
    
    try {
      for (const scenario of scenarios) {
        await simulateTransaction(scenario.id);
        // Small delay between transactions
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      toast.success('All scenarios completed!');
    } catch (error) {
      console.error('Error running scenarios:', error);
    } finally {
      setRunning(false);
    }
  };

  if (!user) {
    return null;
  }

  if (!user.merchantProfile?.api_key) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/shop')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shop
        </Button>
        
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Please generate an API key in Store Settings before using the simulator.
            <Link to="/store-settings" className="block mt-2">
              <Button variant="outline">Go to Store Settings</Button>
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Button variant="ghost" onClick={() => navigate('/shop')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Shop
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">E-Commerce Transaction Simulator</h1>
        <p className="text-muted-foreground">
          Test AntiFraudster fraud detection with various transaction scenarios. Transactions are analyzed in real-time using ML models.
        </p>
      </div>

      {!fraudDetectionEnabled && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Fraud detection is currently disabled. Enable it in{' '}
            <Link to="/store-settings" className="font-semibold underline">
              Store Settings
            </Link>{' '}
            to see real-time fraud analysis.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Test - Run All Scenarios</CardTitle>
            <CardDescription>
              Automatically test all fraud detection patterns including legitimate transactions, high velocity attacks, 
              blacklisted IPs, suspicious geolocations, and new customer fraud attempts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              size="lg"
              onClick={runAllScenarios}
              disabled={running}
              className="w-full"
            >
              <Zap className="mr-2 h-5 w-5" />
              {running ? 'Running All Scenarios...' : 'Run All Scenarios (6 Tests)'}
            </Button>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map(scenario => {
            const Icon = scenario.icon;
            return (
              <Card key={scenario.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-5 w-5 ${scenario.color}`} />
                    <CardTitle className="text-lg">{scenario.name}</CardTitle>
                  </div>
                  <CardDescription>{scenario.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => simulateTransaction(scenario.id)}
                    disabled={running}
                    variant={scenario.type === 'fraud' ? 'destructive' : 'default'}
                    className="w-full"
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Simulate
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Simulation Results</CardTitle>
            <CardDescription>
              {results.length} transaction{results.length !== 1 ? 's' : ''} analyzed by AntiFraudster ML models
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.is_fraud
                      ? 'border-destructive bg-destructive/5'
                      : 'border-green-600 bg-green-50 dark:bg-green-950'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.is_fraud ? (
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      <span className="font-semibold">
                        {result.type.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                    <Badge variant={result.is_fraud ? 'destructive' : 'default'}>
                      Score: {(result.fraud_score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Transaction ID: {result.transaction_id.slice(0, 8)}...
                  </div>
                  <div className="text-sm font-medium mb-2">
                    Status: <span className={`uppercase ${result.is_fraud ? 'text-destructive' : 'text-green-600'}`}>
                      {result.status}
                    </span>
                  </div>
                  {result.explanation && (
                    <div className="mt-2 p-3 bg-background rounded border">
                      <p className="text-sm font-medium mb-1">AI Explanation (XAI):</p>
                      <p className="text-sm text-muted-foreground italic">
                        {result.explanation}
                      </p>
                    </div>
                  )}
                  {result.risk_factors && result.risk_factors.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {result.risk_factors.map((factor, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
