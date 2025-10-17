import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  CheckCircle,
  XCircle,
  PlayCircle,
  Clock,
  ExternalLink,
  Activity,
  AlertCircle,
} from 'lucide-react';
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

interface WorkflowExecutionStep {
  id: string;
  stepId: string;
  status: string;
  outputData: any;
}

interface WorkflowDebugPanelProps {
  workflowId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkflowDebugPanel({ workflowId, open, onOpenChange }: WorkflowDebugPanelProps) {
  const [, setLocation] = useLocation();

  const { data: executions, isLoading: loadingExecutions } = useQuery<WorkflowExecution[]>({
    queryKey: [`/api/workflows/${workflowId}/executions`, { limit: 5 }],
    queryFn: async () => {
      const response = await fetch(`/api/workflows/${workflowId}/executions?limit=5`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'fetch' }
      });
      if (!response.ok) throw new Error('Failed to fetch executions');
      return response.json();
    },
    enabled: open && !!workflowId,
  });

  const latestExecution = executions?.[0];

  const { data: executionDetails } = useQuery<WorkflowExecution & { steps: WorkflowExecutionStep[] }>({
    queryKey: [`/api/workflows/executions/${latestExecution?.id}`],
    queryFn: async () => {
      const response = await fetch(`/api/workflows/executions/${latestExecution?.id}`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'fetch' }
      });
      if (!response.ok) throw new Error('Failed to fetch execution details');
      return response.json();
    },
    enabled: !!latestExecution?.id && open,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <PlayCircle className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
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

  const calculateSuccessRate = (executions: WorkflowExecution[]) => {
    if (!executions || executions.length === 0) return 0;
    const completed = executions.filter(e => e.status === 'completed').length;
    return Math.round((completed / executions.length) * 100);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Debug Panel
          </SheetTitle>
          <SheetDescription>
            Monitor and debug workflow executions
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {loadingExecutions ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !executions || executions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No executions yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Run your workflow to see debug information
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Latest Execution Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Latest Execution</CardTitle>
                    {latestExecution && getStatusBadge(latestExecution.status)}
                  </div>
                  <CardDescription className="text-xs">
                    {latestExecution && formatDistanceToNow(new Date(latestExecution.startedAt), { addSuffix: true })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {latestExecution && (
                    <>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Status</div>
                          <div className="font-medium capitalize">{latestExecution.status}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Duration</div>
                          <div className="font-medium">{formatDuration(latestExecution.durationMs)}</div>
                        </div>
                      </div>
                      {latestExecution.errorMessage && (
                        <div className="p-2 bg-red-50 dark:bg-red-950 rounded text-xs text-red-700 dark:text-red-300">
                          {latestExecution.errorMessage}
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setLocation(`/workflows/${workflowId}/executions/${latestExecution.id}`);
                          onOpenChange(false);
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Full Details
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Execution Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Statistics</CardTitle>
                  <CardDescription className="text-xs">Last 5 executions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                      <div className="text-2xl font-bold">{calculateSuccessRate(executions)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Runs</div>
                      <div className="text-2xl font-bold">{executions.length}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{executions.filter(e => e.status === 'completed').length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>{executions.filter(e => e.status === 'failed').length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <PlayCircle className="h-4 w-4 text-blue-500" />
                      <span>{executions.filter(e => e.status === 'running').length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Variable Inspector */}
              {executionDetails?.steps && executionDetails.steps.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Variable Inspector</CardTitle>
                    <CardDescription className="text-xs">
                      Latest node outputs from last execution
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {executionDetails.steps
                          .filter(step => step.status === 'completed' && step.outputData)
                          .map((step, idx) => (
                            <div key={step.id} className="p-2 bg-muted rounded text-xs">
                              <div className="font-medium mb-1">
                                Step {idx + 1}: {step.stepId.slice(0, 8)}...
                              </div>
                              <pre className="overflow-auto">
                                {JSON.stringify(step.outputData, null, 2).slice(0, 100)}
                                {JSON.stringify(step.outputData).length > 100 && '...'}
                              </pre>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* Recent Executions */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Recent Executions</h3>
                <div className="space-y-2">
                  {executions.map((execution) => (
                    <button
                      key={execution.id}
                      onClick={() => {
                        setLocation(`/workflows/${workflowId}/executions/${execution.id}`);
                        onOpenChange(false);
                      }}
                      className="w-full p-3 text-left border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(execution.status)}
                          <span className="text-sm font-medium">
                            {format(new Date(execution.startedAt), 'MMM d, HH:mm')}
                          </span>
                        </div>
                        {getStatusBadge(execution.status)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Duration: {formatDuration(execution.durationMs)}
                      </div>
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setLocation(`/workflows/${workflowId}/executions`);
                    onOpenChange(false);
                  }}
                >
                  View All Executions
                </Button>
              </div>

              {/* Debug Mode (Coming Soon) */}
              <Card className="border-dashed">
                <CardContent className="py-4">
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Run in Debug Mode (Coming Soon)
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Step-by-step execution with breakpoints
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
