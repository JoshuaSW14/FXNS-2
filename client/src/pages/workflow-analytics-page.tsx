import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import NavigationHeader from '@/components/navigation-header';
import Footer from '@/components/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Activity, Clock, CheckCircle, XCircle, BarChart3 } from 'lucide-react';

interface WorkflowAnalytics {
  workflowId: string;
  workflowName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  successRate: number;
  executionsByDay: { date: string; count: number; }[];
  recentExecutions: {
    id: string;
    status: string;
    executionTime: number;
    createdAt: string;
  }[];
}

const fetchAnalytics = async (workflowId: string): Promise<WorkflowAnalytics> => {
  const response = await fetch(`/api/workflows/${workflowId}/analytics`, {
    credentials: 'include',
    headers: { 'X-Requested-With': 'fetch' },
  });
  if (!response.ok) throw new Error('Failed to fetch analytics');
  return response.json();
};

export default function WorkflowAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const workflowId = params.id!;

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['workflow-analytics', workflowId],
    queryFn: () => fetchAnalytics(workflowId),
  });

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* <NavigationHeader /> */}
      
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {isLoading ? <Skeleton className="h-9 w-64" /> : analytics?.workflowName}
          </h1>
          <p className="text-muted-foreground">Workflow Performance Analytics</p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Total Executions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analytics?.totalExecutions}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Success Rate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {analytics?.successRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics?.successfulExecutions} successful
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Failed Executions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {analytics?.failedExecutions}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Avg Execution Time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatDuration(analytics?.averageExecutionTime || 0)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Executions by Day Chart */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Executions Over Time
                </CardTitle>
                <CardDescription>Daily execution counts for the past 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics?.executionsByDay.map((day) => (
                    <div key={day.date} className="flex items-center gap-3">
                      <div className="w-24 text-sm text-muted-foreground">{day.date}</div>
                      <div className="flex-1">
                        <div className="bg-primary/20 rounded-full h-8 flex items-center relative">
                          <div
                            className="bg-primary rounded-full h-8 flex items-center justify-end pr-3 text-sm font-medium text-white"
                            style={{
                              width: `${Math.max(
                                10,
                                (day.count / (Math.max(...(analytics?.executionsByDay.map(d => d.count) || [1])))) * 100
                              )}%`,
                            }}
                          >
                            {day.count}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Executions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Executions</CardTitle>
                <CardDescription>Last 10 workflow runs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.recentExecutions.map((execution) => (
                    <div
                      key={execution.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {execution.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : execution.status === 'failed' ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <Activity className="h-5 w-5 text-blue-500" />
                        )}
                        <div>
                          <Badge
                            variant={
                              execution.status === 'completed'
                                ? 'default'
                                : execution.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {execution.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDate(execution.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDuration(execution.executionTime)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
