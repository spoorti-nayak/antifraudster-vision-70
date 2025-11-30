import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface RiskFactor {
  factor: string;
  contribution: number;
  reason: string;
}

interface RiskBreakdownChartProps {
  breakdown: RiskFactor[];
  totalScore: number;
}

const COLORS = [
  'hsl(var(--fraud))',
  'hsl(var(--suspicious))',
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--muted))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
];

const RiskBreakdownChart = ({ breakdown, totalScore }: RiskBreakdownChartProps) => {
  if (!breakdown || breakdown.length === 0) {
    return (
      <Card className="card-3d">
        <CardHeader>
          <CardTitle className="text-lg">Risk Factor Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No risk factor data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = breakdown
    .filter(item => item.contribution > 0)
    .map(item => ({
      name: item.factor,
      value: item.contribution,
      reason: item.reason,
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-foreground">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">{payload[0].payload.reason}</p>
          <p className="text-sm text-primary font-medium mt-1">
            +{payload[0].value} points
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="card-3d">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Risk Factor Breakdown</span>
          <span className={`text-2xl font-bold ${
            totalScore > 70 ? 'text-fraud' : totalScore > 40 ? 'text-suspicious' : 'text-safe'
          }`}>
            {totalScore}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            All risk factors are within normal range
          </div>
        )}
        
        {/* Factor List */}
        <div className="mt-4 space-y-2">
          {breakdown.slice(0, 5).map((factor, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-foreground font-medium">{factor.factor}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground">{factor.reason}</span>
                <span className="text-primary font-semibold">+{factor.contribution}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskBreakdownChart;
