import { useState, useEffect } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer 
} from "recharts";

const COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4'
};

// Different data generators for each chart type
const generateTrendsData = (range: '24h' | '7d' | '30d') => {
  const data: any[] = [];
  const now = new Date();
  const points = range === '24h' ? 24 : range === '7d' ? 7 : 30;

  for (let i = points - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * (range === '24h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000));
    data.push({
      time: range === '24h' ? time.toLocaleTimeString([], { hour: '2-digit' }) : time.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      detectionRate: Math.random() * 20 + 85,
      falsePositives: Math.random() * 5 + 1,
      responseTime: Math.random() * 50 + 100,
      throughput: Math.random() * 1000 + 5000,
    });
  }

  return data;
};

const generatePatternsData = (range: '24h' | '7d' | '30d') => {
  const data: any[] = [];
  const now = new Date();
  const points = range === '24h' ? 12 : range === '7d' ? 7 : 15;

  for (let i = points - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * (range === '24h' ? 2 * 60 * 60 * 1000 : range === '7d' ? 24 * 60 * 60 * 1000 : 2 * 24 * 60 * 60 * 1000));
    data.push({
      time: range === '24h' ? time.toLocaleTimeString([], { hour: '2-digit' }) : time.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      ipMismatch: Math.random() * 30 + 10,
      velocityAnomaly: Math.random() * 25 + 15,
      deviceFingerprint: Math.random() * 20 + 5,
      behavioralAnomaly: Math.random() * 35 + 20,
      geolocationRisk: Math.random() * 15 + 8,
    });
  }

  return data;
};

const generatePerformanceData = (range: '24h' | '7d' | '30d') => {
  const categories = ['CPU Usage', 'Memory', 'Network', 'Disk I/O', 'API Latency', 'ML Processing'];
  return categories.map(category => ({
    category,
    current: Math.random() * 40 + 30,
    optimal: Math.random() * 20 + 70,
    threshold: 85,
  }));
};

const AnalyticsCharts = ({
  type,
  dateRange = '24h'
}: {
  type: 'trends' | 'patterns' | 'performance';
  dateRange?: '24h' | '7d' | '30d';
}) => {
  const [trendsData, setTrendsData] = useState(generateTrendsData(dateRange));
  const [patternsData, setPatternsData] = useState(generatePatternsData(dateRange));
  const [performanceData, setPerformanceData] = useState(generatePerformanceData(dateRange));

  useEffect(() => {
    const interval = setInterval(() => {
      setTrendsData(generateTrendsData(dateRange));
      setPatternsData(generatePatternsData(dateRange));
      setPerformanceData(generatePerformanceData(dateRange));
    }, 30000);
    return () => clearInterval(interval);
  }, [dateRange]);

  useEffect(() => {
    setTrendsData(generateTrendsData(dateRange));
    setPatternsData(generatePatternsData(dateRange));
    setPerformanceData(generatePerformanceData(dateRange));
  }, [dateRange]);

  if (type === 'trends') {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={trendsData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="detectionRate" 
            stackId="1"
            stroke={COLORS.primary} 
            fill={COLORS.primary}
            fillOpacity={0.3}
            name="Detection Rate (%)"
          />
          <Area 
            type="monotone" 
            dataKey="throughput" 
            stackId="2"
            stroke={COLORS.success} 
            fill={COLORS.success}
            fillOpacity={0.3}
            name="Throughput (tx/min)"
          />
          <Line 
            type="monotone" 
            dataKey="responseTime" 
            stroke={COLORS.warning}
            strokeWidth={2}
            name="Response Time (ms)"
            dot={{ fill: COLORS.warning, strokeWidth: 2, r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'patterns') {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={patternsData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Bar dataKey="ipMismatch" fill={COLORS.danger} name="IP Mismatch" radius={[2, 2, 0, 0]} />
          <Bar dataKey="velocityAnomaly" fill={COLORS.warning} name="Velocity Anomaly" radius={[2, 2, 0, 0]} />
          <Bar dataKey="deviceFingerprint" fill={COLORS.info} name="Device Fingerprint" radius={[2, 2, 0, 0]} />
          <Bar dataKey="behavioralAnomaly" fill={COLORS.secondary} name="Behavioral Anomaly" radius={[2, 2, 0, 0]} />
          <Bar dataKey="geolocationRisk" fill={COLORS.primary} name="Geolocation Risk" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'performance') {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <RadarChart data={performanceData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="category" tick={{ fontSize: 12, fill: '#64748b' }} />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            tick={{ fontSize: 11, fill: '#64748b' }}
          />
          <Radar 
            name="Current Usage" 
            dataKey="current" 
            stroke={COLORS.primary} 
            fill={COLORS.primary} 
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Radar 
            name="Optimal Range" 
            dataKey="optimal" 
            stroke={COLORS.success} 
            fill={COLORS.success} 
            fillOpacity={0.1}
            strokeWidth={2}
            strokeDasharray="5 5"
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}
          />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  return null;
};

export default AnalyticsCharts;