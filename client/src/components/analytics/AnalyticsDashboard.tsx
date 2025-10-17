import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, BarChart3, TrendingUp, Users, Zap } from 'lucide-react';

// Component imports
import AnalyticsChart from './AnalyticsChart';
import AdvancedChart from './AdvancedChart';
import MetricCard from './MetricCard';
import TimeRangeSelector, { TimeRange } from './TimeRangeSelector';
import EngagementHeatmap from './EngagementHeatmap';
import PerformanceMetrics from './PerformanceMetrics';
import InsightCard, { InsightData } from './InsightCard';
import RealTimeAnalytics from './RealTimeAnalytics';

// API functions
const fetchAnalytics = async (endpoint: string, timeRange: TimeRange) => {
  const params = new URLSearchParams();
  if (timeRange !== 'all') {
    params.append('timeRange', timeRange);
  }
  
  const response = await fetch(`/api/analytics${endpoint}?${params}`, {
    credentials: 'include',
    headers: { 'X-Requested-With': 'fetch' }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch analytics: ${response.statusText}`);
  }
  
  return response.json();
};

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch dashboard analytics
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['/api/analytics/dashboard', timeRange, refreshKey],
    queryFn: () => fetchAnalytics('/dashboard', timeRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch engagement metrics
  const { data: engagementData, isLoading: isEngagementLoading } = useQuery({
    queryKey: ['/api/analytics/engagement', timeRange, refreshKey],
    queryFn: () => fetchAnalytics('/engagement', timeRange),
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (isDashboardLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-2 text-muted-foreground">Loading analytics...</span>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load analytics data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  // Prepare chart data
  const usageChartData = dashboardData?.recentActivity?.map((activity: any) => ({
    name: new Date(activity.lastUsed).toLocaleDateString(),
    runs: activity.runCount,
    tools: 1
  })) || [];

  const topToolsData = dashboardData?.topTools?.map((tool: any) => ({
    name: tool.toolName,
    value: tool.totalRuns
  })) || [];

  // Generate insights
  const generateInsights = (): InsightData[] => {
    const insights: InsightData[] = [];
    
    if (dashboardData?.usage?.successRate < 95) {
      insights.push({
        id: 'low-success-rate',
        type: 'warning',
        title: 'Low Success Rate Detected',
        description: `Your tools have a ${dashboardData.usage.successRate.toFixed(1)}% success rate. Consider reviewing error logs and optimizing your tools.`,
        impact: 'high',
        metrics: [
          { label: 'Success Rate', value: `${dashboardData.usage.successRate.toFixed(1)}%` },
          { label: 'Failed Runs', value: `${Math.round((1 - dashboardData.usage.successRate / 100) * dashboardData.usage.totalRuns)}` }
        ]
      });
    }

    if (dashboardData?.usage?.averageRunTime > 2000) {
      insights.push({
        id: 'slow-performance',
        type: 'recommendation',
        title: 'Performance Optimization Opportunity',
        description: 'Your tools are taking longer than average to execute. Consider optimizing logic or reducing external API calls.',
        impact: 'medium',
        metrics: [
          { label: 'Avg Runtime', value: formatTime(dashboardData.usage.averageRunTime) },
          { label: 'Target', value: '<2s' }
        ]
      });
    }

    if (dashboardData?.myTools?.total > 0 && dashboardData?.myTools?.published === 0) {
      insights.push({
        id: 'unpublished-tools',
        type: 'info',
        title: 'Share Your Tools',
        description: 'You have created tools but haven\'t published any yet. Publishing tools can help other users and build your reputation.',
        impact: 'low',
        metrics: [
          { label: 'Created', value: dashboardData.myTools.total.toString() },
          { label: 'Published', value: '0' }
        ]
      });
    }

    return insights;
  };

  const insights = generateInsights();

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector and Real-time Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        <div className="flex items-center gap-4">
          <RealTimeAnalytics
            enableAutoRefresh={true}
            refreshInterval={30000}
          />
          <TimeRangeSelector
            value={timeRange}
            onChange={setTimeRange}
            onRefresh={handleRefresh}
            isLoading={isDashboardLoading || isEngagementLoading}
          />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Runs"
              value={dashboardData?.usage?.totalRuns || 0}
              icon={Zap}
              iconColor="text-blue-600"
              formatValue={formatNumber}
              trend={12.5}
              trendLabel="vs last period"
            />
            <MetricCard
              title="My Tools"
              value={dashboardData?.myTools?.total || 0}
              icon={BarChart3}
              iconColor="text-green-600"
              badge={{
                text: `${dashboardData?.myTools?.published || 0} published`,
                variant: 'secondary'
              }}
            />
            <MetricCard
              title="Success Rate"
              value={`${(dashboardData?.usage?.successRate || 0).toFixed(1)}%`}
              icon={TrendingUp}
              iconColor="text-purple-600"
              trend={(dashboardData?.usage?.successRate || 0) > 95 ? 2.1 : -1.2}
            />
            <MetricCard
              title="Avg Runtime"
              value={formatTime(dashboardData?.usage?.averageRunTime || 0)}
              icon={Users}
              iconColor="text-orange-600"
              description="Average execution time"
            />
          </div>

          {/* Advanced Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AdvancedChart
              title="Usage Trends"
              description="Tool execution over time with multi-series support"
              data={usageChartData}
              series={[
                { key: 'runs', name: 'Tool Runs', color: '#6366f1', visible: true, type: 'line' },
                { key: 'tools', name: 'Unique Tools', color: '#8b5cf6', visible: true, type: 'area' }
              ]}
              xAxis="name"
              enableBrush={true}
              enableZoom={true}
              enableLegendToggle={true}
              formatValue={formatNumber}
            />
            
            <AnalyticsChart
              title="Top Tools"
              description="Most used tools"
              type="bar"
              data={topToolsData.slice(0, 5)}
              dataKey="value"
              xAxis="name"
              formatValue={formatNumber}
            />
          </div>

          {/* Tool Usage Heatmap */}
          {topToolsData.length > 0 && (
            <EngagementHeatmap
              title="Tool Usage Distribution"
              data={topToolsData}
            />
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <PerformanceMetrics
            data={{
              successRate: dashboardData?.usage?.successRate || 0,
              averageRunTime: dashboardData?.usage?.averageRunTime || 0,
              totalRuns: dashboardData?.usage?.totalRuns || 0,
              errorRate: 100 - (dashboardData?.usage?.successRate || 0),
              p95RunTime: (dashboardData?.usage?.averageRunTime || 0) * 1.5,
              uptime: 99.9
            }}
          />
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricCard
              title="Engagement Level"
              value={engagementData?.engagementLevel || 'Unknown'}
              description="Based on your activity patterns"
              trend={5.2}
            />
            <MetricCard
              title="Tools Per Session"
              value={(engagementData?.avgToolsPerSession || 0).toFixed(1)}
              description="Average tools used per session"
            />
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          {insights.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No insights available yet. Keep using your tools to generate personalized recommendations!</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {insights.map(insight => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}