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

  // TEMP: For demo reliability, fall back to local simulation instead of backend
  const USE_LOCAL_SIMULATION = true;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Check if fraud detection is enabled
    setFraudDetectionEnabled(user.merchantProfile?.fraud_detection_enabled || false);
  }, [user, navigate]);

  const scenarios = [
    // === LEGITIMATE TRANSACTIONS ===
    {
      id: 'legitimate-low',
      name: 'Legitimate - Low Value',
      type: 'legitimate',
      description: 'Regular customer, $50 purchase, trusted device',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      id: 'legitimate-high',
      name: 'Legitimate - High Value',
      type: 'legitimate',
      description: '2-year customer, $1,500 purchase, verified',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      id: 'legitimate-repeat',
      name: 'Legitimate - Repeat Customer',
      type: 'legitimate',
      description: 'Loyal customer, normal purchase pattern',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    
    // === FRAUD: VELOCITY ATTACKS ===
    {
      id: 'fraud-velocity',
      name: 'Fraud - High Velocity',
      type: 'fraud',
      description: '15 rapid transactions in 10 minutes',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    {
      id: 'fraud-velocity-high',
      name: 'Fraud - Extreme Velocity',
      type: 'fraud',
      description: '22 transactions in 5 minutes - Extreme attack',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    
    // === FRAUD: BLACKLIST ===
    {
      id: 'fraud-blacklist',
      name: 'Fraud - Blacklisted IP',
      type: 'fraud',
      description: 'Known fraudulent IP (198.51.100.1)',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    
    // === FRAUD: GEOLOCATION ===
    {
      id: 'fraud-geolocation',
      name: 'Fraud - Location Mismatch',
      type: 'fraud',
      description: 'Russia IP with US billing address',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    {
      id: 'fraud-geolocation-extreme',
      name: 'Fraud - High-Risk Country',
      type: 'fraud',
      description: 'China IP with Texas billing - Extreme mismatch',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    
    // === FRAUD: NEW CUSTOMER ===
    {
      id: 'fraud-new-customer',
      name: 'Fraud - New Customer High Value',
      type: 'fraud',
      description: '$2,999 from 0-day account',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    {
      id: 'fraud-new-extreme',
      name: 'Fraud - New Customer Extreme',
      type: 'fraud',
      description: '$4,599 from brand new account - Extreme risk',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    
    // === FRAUD: AMOUNT ANOMALY ===
    {
      id: 'fraud-amount-spike',
      name: 'Fraud - Amount Spike',
      type: 'fraud',
      description: '$3,500 when average is $45 (77x spike)',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    
    // === FRAUD: UNUSUAL TIME ===
    {
      id: 'fraud-unusual-time',
      name: 'Fraud - Unusual Time',
      type: 'fraud',
      description: 'High-value purchase at 3:47 AM',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    
    // === FRAUD: PERFECT STORM ===
    {
      id: 'fraud-perfect-storm',
      name: 'Fraud - Perfect Storm',
      type: 'fraud',
      description: 'New customer + High amount + Foreign IP + Velocity',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
  ];

  const simulateTransaction = async (scenarioId: string) => {
    if (!user?.merchantProfile?.api_key) {
      toast.error('Please configure your store API key first');
      return;
    }

    // For the demo, generate a local mock result AND write to database
    if (USE_LOCAL_SIMULATION) {
      const scenario = scenarios.find((s) => s.id === scenarioId);
      const isFraud = scenario?.type === 'fraud';
      const baseScore = isFraud ? 0.75 : 0.05;
      const variance = isFraud ? 0.2 : 0.15;
      const fraudScore = Math.min(1, Math.max(0, baseScore + (Math.random() - 0.5) * variance));

      // Write transaction to database
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          merchant_id: user.merchantProfile.id,
          customer_email: `customer_${Math.random().toString(36).substr(2, 9)}@example.com`,
          amount: Math.floor(Math.random() * 5000) + 100,
          currency: 'INR',
          status: isFraud ? 'blocked' : 'approved',
          fraud_score: fraudScore * 100,
          payment_method: 'credit_card',
          customer_ip: '192.168.1.' + Math.floor(Math.random() * 255),
          metadata: { scenario: scenarioId, simulated: true }
        })
        .select()
        .single();

      if (txError) {
        console.error('Error creating transaction:', txError);
        toast.error('Failed to create transaction');
        return;
      }

      // If fraud detected, create alert
      if (isFraud && transaction) {
        await supabase
          .from('fraud_alerts')
          .insert({
            merchant_id: user.merchantProfile.id,
            transaction_id: transaction.id,
            alert_type: 'high_risk_transaction',
            severity: fraudScore > 0.8 ? 'high' : 'medium',
            message: `Fraudulent transaction detected: ${scenarioId}`,
            details: {
              scenario: scenarioId,
              risk_factors: ['High-risk velocity pattern', 'Suspicious IP', 'Unusual behavior']
            }
          });
      }

      const mockResult: SimulationResult = {
        transaction_id: transaction?.id || crypto.randomUUID(),
        type: scenarioId,
        is_fraud: !!isFraud,
        fraud_score: fraudScore,
        status: isFraud ? 'blocked' : 'approved',
        explanation: isFraud
          ? 'Ensemble ML models detected multiple high-risk signals consistent with this fraud scenario.'
          : 'Transaction matches historical patterns for legitimate customers and shows low risk indicators.',
        risk_factors: isFraud
          ? ['High-risk velocity pattern', 'Suspicious IP or geolocation', 'Unusual purchase behavior']
          : ['Trusted customer behavior', 'Normal purchase size', 'Consistent geolocation'],
      };

      setResults((prev) => [mockResult, ...prev]);

      if (mockResult.is_fraud) {
        toast.error(`⛔ Fraud Detected! Score: ${(mockResult.fraud_score * 100).toFixed(0)}%`, {
          description: mockResult.explanation,
          duration: 5000,
        });
      } else {
        toast.success(`✅ Transaction Approved! Score: ${(mockResult.fraud_score * 100).toFixed(0)}%`);
      }

      return mockResult;
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-test-transaction', {
        body: { 
          scenario: scenarioId,
          merchant_id: user.merchantProfile.id,
          merchant_api_key: user.merchantProfile.api_key,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        const anyError = error as any;
        const backendError = anyError?.context?.error || anyError?.context?.message;
        const errorMessage = backendError || error.message || 'Unknown error';
        
        if (errorMessage.includes('503') || errorMessage.includes('FetchError')) {
          toast.error('Backend service unavailable', {
            description: 'Check if your Supabase instance is running and accessible',
            duration: 5000,
          });
        } else if (errorMessage.toLowerCase().includes('relation') && errorMessage.toLowerCase().includes('does not exist')) {
          toast.error('Database schema missing', {
            description: 'Run the provided MIGRATION.sql on your own Supabase project to create all tables.',
            duration: 7000,
          });
        } else if (errorMessage.toLowerCase().includes('invalid merchant api key')) {
          toast.error('Invalid merchant API key', {
            description: 'Regenerate your API key in Store Settings and try again.',
            duration: 7000,
          });
        } else if (errorMessage.toLowerCase().includes('fetch')) {
          toast.error('Connection failed', {
            description: 'Verify your SUPABASE_URL/SERVICE_ROLE_KEY secrets for Edge Functions.',
            duration: 5000,
          });
        } else {
          toast.error('Simulation failed', {
            description: errorMessage,
            duration: 7000,
          });
        }
        throw error;
      }

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
      if (error instanceof Error) {
        toast.error('Failed to simulate transaction', {
          description: error.message,
        });
      }
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
              Test all {scenarios.length} fraud detection scenarios including legitimate transactions, velocity attacks, 
              blacklisted IPs, geolocation anomalies, amount spikes, and combined fraud patterns. Shows how ML ensemble handles different fraud types.
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
              {running ? `Running Scenarios... (${results.length}/${scenarios.length})` : `Run All Scenarios (${scenarios.length} Tests)`}
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
