import { useState } from "react";
import { TrendingUp, Download, Calendar, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FraudCharts from "@/components/dashboard/FraudCharts";
import AnalyticsCharts from "@/components/dashboard/AnalyticsCharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Analytics = () => {
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '30d'>('7d');

  const analyticsCards = [
    {
      title: "Detection Rate",
      value: "94.2%",
      change: "+2.1%",
      trend: "up",
      icon: TrendingUp,
    },
    {
      title: "False Positives",
      value: "3.1%",
      change: "-0.8%",
      trend: "down",
      icon: BarChart3,
    },
    {
      title: "Response Time",
      value: "125ms",
      change: "-15ms",
      trend: "down", 
      icon: Calendar,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <BarChart3 className="w-8 h-8 mr-3 text-primary" />
            Analytics & Reports
          </h1>
          <p className="text-muted-foreground">Fraud detection insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={dateRange} onValueChange={(v: '24h' | '7d' | '30d') => setDateRange(v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="card-3d" onClick={() => {
            const report = {
              generatedAt: new Date().toISOString(),
              dateRange,
              metrics: analyticsCards,
            };
            const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-report-${dateRange}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {analyticsCards.map((card, index) => (
          <Card key={card.title} className="card-3d">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <card.icon className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold">{card.value}</p>
                  </div>
                </div>
                <div className={`text-sm font-medium ${
                  card.trend === 'up' ? 'text-safe' : 'text-fraud'
                }`}>
                  {card.change}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 glass-effect">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="card-3d">
            <CardHeader>
              <CardTitle>Fraud Detection Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <FraudCharts dateRange={dateRange} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card className="card-3d">
            <CardHeader>
              <CardTitle>Detection & Performance Trends</CardTitle>
              <p className="text-sm text-muted-foreground">
                Real-time monitoring of detection rates, throughput, and response times
              </p>
            </CardHeader>
            <CardContent>
              <AnalyticsCharts type="trends" dateRange={dateRange} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <Card className="card-3d">
            <CardHeader>
              <CardTitle>Fraud Pattern Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Breakdown of different fraud patterns and attack vectors detected
              </p>
            </CardHeader>
            <CardContent>
              <AnalyticsCharts type="patterns" dateRange={dateRange} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card className="card-3d">
              <CardHeader>
                <CardTitle>System Performance Radar</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Comprehensive view of system resource utilization and performance metrics
                </p>
              </CardHeader>
              <CardContent>
                <AnalyticsCharts type="performance" dateRange={dateRange} />
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="card-3d">
                <CardHeader>
                  <CardTitle className="text-lg">Processing Speed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-safe">125ms</div>
                    <p className="text-sm text-muted-foreground">Avg Response Time</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-3d">
                <CardHeader>
                  <CardTitle className="text-lg">Accuracy Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">97.3%</div>
                    <p className="text-sm text-muted-foreground">Detection Accuracy</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-3d">
                <CardHeader>
                  <CardTitle className="text-lg">System Uptime</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-safe">99.9%</div>
                    <p className="text-sm text-muted-foreground">Last 30 Days</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;