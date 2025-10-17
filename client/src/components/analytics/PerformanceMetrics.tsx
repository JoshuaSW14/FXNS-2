import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle, Clock, Zap } from 'lucide-react';

interface PerformanceData {
  successRate: number;
  averageRunTime: number;
  totalRuns: number;
  errorRate: number;
  p95RunTime?: number;
  uptime?: number;
}

interface PerformanceMetricsProps {
  data: PerformanceData;
  className?: string;
}

export default function PerformanceMetrics({
  data,
  className = ''
}: PerformanceMetricsProps) {
  const getStatusColor = (rate: number) => {
    if (rate >= 98) return 'text-green-600';
    if (rate >= 95) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (rate: number) => {
    if (rate >= 98) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (rate >= 95) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusLabel = (rate: number) => {
    if (rate >= 98) return 'Excellent';
    if (rate >= 95) return 'Good';
    if (rate >= 90) return 'Fair';
    return 'Poor';
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary-600" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(data.successRate)}
              <span className="text-sm font-medium">Success Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${getStatusColor(data.successRate)}`}>
                {data.successRate.toFixed(1)}%
              </span>
              <Badge variant="outline" className="text-xs">
                {getStatusLabel(data.successRate)}
              </Badge>
            </div>
          </div>
          <Progress value={data.successRate} className="h-2" />
        </div>

        {/* Performance Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Avg Response</span>
            </div>
            <p className="text-lg font-semibold text-blue-600">
              {formatTime(data.averageRunTime)}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Error Rate</span>
            </div>
            <p className="text-lg font-semibold text-red-600">
              {data.errorRate.toFixed(1)}%
            </p>
          </div>

          {data.p95RunTime && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">P95 Response</span>
              </div>
              <p className="text-lg font-semibold text-purple-600">
                {formatTime(data.p95RunTime)}
              </p>
            </div>
          )}

          {data.uptime && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Uptime</span>
              </div>
              <p className="text-lg font-semibold text-green-600">
                {data.uptime.toFixed(2)}%
              </p>
            </div>
          )}
        </div>

        {/* Total Runs */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Executions</span>
            <span className="font-semibold">{data.totalRuns.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}