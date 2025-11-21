import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PlayCircle, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

interface SimulationResult {
  transaction_id: string;
  type: string;
  is_fraud: boolean;
  fraud_score: number;
  status: string;
  explanation?: string;
}

export default function TransactionSimulator() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<SimulationResult[]>([]);

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
    try {
      const { data, error } = await supabase.functions.invoke('generate-test-transaction', {
        body: { scenario: scenarioId },
      });

      if (error) throw error;

      setResults(prev => [data, ...prev]);
      
      if (data.is_fraud) {
        toast.error(`Fraud Detected! Score: ${(data.fraud_score * 100).toFixed(0)}%`);
      } else {
        toast.success('Transaction Approved!');
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
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      toast.success('All scenarios completed!');
    } catch (error) {
      console.error('Error running scenarios:', error);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Transaction Simulator</h1>
        <p className="text-muted-foreground">
          Test fraud detection with various transaction scenarios
        </p>
      </div>

      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Test</CardTitle>
            <CardDescription>
              Run all scenarios automatically to demonstrate fraud detection capabilities
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
              {running ? 'Running All Scenarios...' : 'Run All Scenarios'}
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
              {results.length} transaction{results.length !== 1 ? 's' : ''} tested
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
                  <div className="text-sm font-medium">
                    Status: <span className="uppercase">{result.status}</span>
                  </div>
                  {result.explanation && (
                    <div className="mt-2 text-sm text-muted-foreground italic">
                      {result.explanation}
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
