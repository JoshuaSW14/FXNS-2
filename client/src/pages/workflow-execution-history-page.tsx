import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import NavigationHeader from '@/components/navigation-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, CheckCircle, XCircle, PlayCircle, ExternalLink } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  triggerData: any;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
}

interface ExecutionWithSteps extends WorkflowExecution {
  steps?: Array<{
    id: string;
    stepId: string;
    status: string;
    inputData: any;
    outputData: any;
    errorMessage?: string;
    startedAt: string;
    completedAt: string;
    durationMs?: number;
  }>;
}

export default function WorkflowExecutionHistoryPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);

  const { data: executions, isLoading } = useQuery<WorkflowExecution[]>({
    queryKey: [`/api/workflows/${params.id}/executions`],
    queryFn: async () => {
      const response = await fetch(`/api/workflows/${params.id}/executions`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'fetch' },
      });
      if (!response.ok) throw new Error('Failed to fetch executions');
      return response.json();
    },
  });

  const { data: executionDetails } = useQuery<ExecutionWithSteps>({
    queryKey: [`/api/workflows/executions/${selectedExecution}`],
    queryFn: async () => {
      const response = await fetch(`/api/workflows/executions/${selectedExecution}`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'fetch' },
      });
      if (!response.ok) throw new Error('Failed to fetch execution details');
      return response.json();
    },
    enabled: !!selectedExecution,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <PlayCircle className="h-5 w-5 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: 'bg-green-500',
      failed: 'bg-red-500',
      running: 'bg-blue-500',
      cancelled: 'bg-gray-500',
    };
    return <Badge className={variants[status] || ''}>{status}</Badge>;
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* <NavigationHeader /> */}

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/workflows/${params.id}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workflow
          </Button>
          <h1 className="text-3xl font-bold">Execution History</h1>
          <p className="text-muted-foreground mt-1">
            View past workflow executions and their results
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Executions List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Recent Executions</CardTitle>
                <CardDescription>Click to view details</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-4 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : executions && executions.length > 0 ? (
                  <div className="divide-y">
                    {executions.map((execution) => (
                      <button
                        key={execution.id}
                        onClick={() => setSelectedExecution(execution.id)}
                        className={`w-full p-4 text-left hover:bg-accent transition-colors ${
                          selectedExecution === execution.id ? 'bg-accent' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(execution.status)}
                            <div>
                              <div className="font-medium">
                                {format(new Date(execution.startedAt), 'MMM d, HH:mm')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(execution.startedAt), {
                                  addSuffix: true,
                                })}
                              </div>
                            </div>
                          </div>
                          {getStatusBadge(execution.status)}
                        </div>
                        {execution.durationMs && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            Duration: {formatDuration(execution.durationMs)}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    No executions yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Execution Details */}
          <div className="lg:col-span-2">
            {executionDetails ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Execution Details</CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(executionDetails.status)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation(`/workflows/${params.id}/executions/${executionDetails.id}`)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Full Details
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Started {format(new Date(executionDetails.startedAt), 'PPpp')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Duration
                      </div>
                      <div className="text-lg font-semibold">
                        {formatDuration(executionDetails.durationMs)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Steps
                      </div>
                      <div className="text-lg font-semibold">
                        {executionDetails.steps?.length || 0}
                      </div>
                    </div>
                  </div>

                  {/* Error Message */}
                  {executionDetails.errorMessage && (
                    <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="font-medium text-red-900 dark:text-red-100 mb-1">
                        Error
                      </div>
                      <div className="text-sm text-red-700 dark:text-red-300">
                        {executionDetails.errorMessage}
                      </div>
                    </div>
                  )}

                  {/* Steps Summary */}
                  {executionDetails.steps && executionDetails.steps.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-4">Execution Steps Summary</h3>
                      <div className="space-y-3">
                        {executionDetails.steps.map((step, idx) => (
                          <Card key={step.id}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm">
                                  Step {idx + 1}
                                </CardTitle>
                                {getStatusBadge(step.status)}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="text-sm text-muted-foreground">
                                Duration: {formatDuration(step.durationMs)}
                              </div>
                              {step.errorMessage && (
                                <div className="text-sm text-red-600 dark:text-red-400">
                                  Error: {step.errorMessage}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <Button
                        className="w-full mt-4"
                        onClick={() => setLocation(`/workflows/${params.id}/executions/${executionDetails.id}`)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Full Timeline with Input/Output Data
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Select an execution to view details
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
