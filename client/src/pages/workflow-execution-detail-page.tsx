import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NavigationHeader from '@/components/navigation-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  PlayCircle, 
  Play, 
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface WorkflowExecutionStep {
  id: string;
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  inputData: any;
  outputData: any;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  retryCount: number;
}

interface WorkflowExecutionDetail {
  id: string;
  workflowId: string;
  userId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  triggerData: any;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
  errorStep?: string;
  steps: WorkflowExecutionStep[];
}

export default function WorkflowExecutionDetailPage() {
  const params = useParams<{ workflowId: string; executionId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const { data: execution, isLoading } = useQuery<WorkflowExecutionDetail>({
    queryKey: [`/api/workflows/executions/${params.executionId}`],
    queryFn: async () => {
      const response = await fetch(`/api/workflows/executions/${params.executionId}`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'fetch' },
      });
      if (!response.ok) throw new Error('Failed to fetch execution details');
      return response.json();
    },
  });

  const rerunWorkflow = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/workflows/${params.workflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
        credentials: 'include',
        body: JSON.stringify({ triggerData: execution?.triggerData || {} }),
      });
      if (!response.ok) throw new Error('Failed to re-run workflow');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Workflow re-run started',
        description: 'Check execution history for results',
      });
      setLocation(`/workflows/${params.workflowId}/executions`);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to re-run workflow',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <PlayCircle className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-gray-400" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: 'bg-green-500',
      failed: 'bg-red-500',
      running: 'bg-blue-500',
      cancelled: 'bg-gray-500',
      pending: 'bg-gray-400',
      skipped: 'bg-yellow-500',
    };
    return <Badge className={variants[status] || ''}>{status}</Badge>;
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const formatJSON = (data: any) => {
    if (!data) return 'null';
    return JSON.stringify(data, null, 2);
  };

  const renderJSONData = (data: any, maxLength = 1000) => {
    if (!data) {
      return <div className="text-muted-foreground italic">No data</div>;
    }

    const jsonString = formatJSON(data);
    const isTruncated = jsonString.length > maxLength;
    const [showFull, setShowFull] = useState(false);

    return (
      <div>
        <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-96">
          <code>{showFull || !isTruncated ? jsonString : jsonString.slice(0, maxLength) + '...'}</code>
        </pre>
        {isTruncated && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setShowFull(!showFull)}
          >
            {showFull ? 'Show less' : 'Show more'}
          </Button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* <NavigationHeader /> */}
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="min-h-screen bg-background">
        {/* <NavigationHeader /> */}
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/workflows/${params.workflowId}/executions`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Execution History
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Execution not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* <NavigationHeader /> */}

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/workflows/${params.workflowId}/executions`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Execution History
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Execution Details</h1>
              <p className="text-muted-foreground mt-1">
                Started {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
              </p>
            </div>
            <Button
              onClick={() => rerunWorkflow.mutate()}
              disabled={rerunWorkflow.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              {rerunWorkflow.isPending ? 'Re-running...' : 'Re-run Workflow'}
            </Button>
          </div>
        </div>

        {/* Execution Summary */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Execution Summary</CardTitle>
              {getStatusBadge(execution.status)}
            </div>
            <CardDescription>
              {format(new Date(execution.startedAt), 'PPpp')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Status</div>
                <div className="text-lg font-semibold capitalize">{execution.status}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Duration</div>
                <div className="text-lg font-semibold">{formatDuration(execution.durationMs)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Total Steps</div>
                <div className="text-lg font-semibold">{execution.steps?.length || 0}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Completed</div>
                <div className="text-lg font-semibold">
                  {execution.steps?.filter(s => s.status === 'completed').length || 0}
                </div>
              </div>
            </div>

            {execution.errorMessage && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-900 dark:text-red-100">
                      Execution Failed
                    </div>
                    <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {execution.errorMessage}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execution Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Execution Timeline</CardTitle>
            <CardDescription>
              Step-by-step execution details with input/output data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {execution.steps && execution.steps.length > 0 ? (
                <div className="space-y-4">
                  {execution.steps.map((step, idx) => (
                    <Card key={step.id} className={execution.errorStep === step.stepId ? 'border-red-500' : ''}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(step.status)}
                            <div>
                              <CardTitle className="text-base">
                                Step {idx + 1}: {step.inputData?.label || step.stepId}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {step.inputData?.nodeType && (
                                  <span className="capitalize">{step.inputData.nodeType} Node</span>
                                )}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(step.status)}
                            <span className="text-sm text-muted-foreground">
                              {formatDuration(step.durationMs)}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="single" collapsible>
                          <AccordionItem value="details">
                            <AccordionTrigger>View Details</AccordionTrigger>
                            <AccordionContent>
                              <Tabs defaultValue="input" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                  <TabsTrigger value="input">Input Data</TabsTrigger>
                                  <TabsTrigger value="output">Output Data</TabsTrigger>
                                  <TabsTrigger value="metadata">Metadata</TabsTrigger>
                                </TabsList>
                                <TabsContent value="input" className="mt-4">
                                  {renderJSONData(step.inputData)}
                                </TabsContent>
                                <TabsContent value="output" className="mt-4">
                                  {step.status === 'completed' ? (
                                    renderJSONData(step.outputData)
                                  ) : (
                                    <div className="text-muted-foreground italic">
                                      {step.status === 'failed' ? 'Step failed before producing output' : 'No output available'}
                                    </div>
                                  )}
                                </TabsContent>
                                <TabsContent value="metadata" className="mt-4 space-y-3">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <div className="font-medium text-muted-foreground">Step ID</div>
                                      <div className="font-mono text-xs mt-1">{step.stepId}</div>
                                    </div>
                                    <div>
                                      <div className="font-medium text-muted-foreground">Status</div>
                                      <div className="mt-1 capitalize">{step.status}</div>
                                    </div>
                                    <div>
                                      <div className="font-medium text-muted-foreground">Started At</div>
                                      <div className="mt-1">{format(new Date(step.startedAt), 'PPpp')}</div>
                                    </div>
                                    {step.completedAt && (
                                      <div>
                                        <div className="font-medium text-muted-foreground">Completed At</div>
                                        <div className="mt-1">{format(new Date(step.completedAt), 'PPpp')}</div>
                                      </div>
                                    )}
                                    <div>
                                      <div className="font-medium text-muted-foreground">Duration</div>
                                      <div className="mt-1">{formatDuration(step.durationMs)}</div>
                                    </div>
                                    <div>
                                      <div className="font-medium text-muted-foreground">Retry Count</div>
                                      <div className="mt-1">{step.retryCount}</div>
                                    </div>
                                  </div>
                                  {step.errorMessage && (
                                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
                                      <div className="font-medium text-red-900 dark:text-red-100 text-sm">Error Message</div>
                                      <div className="text-sm text-red-700 dark:text-red-300 mt-1 font-mono">
                                        {step.errorMessage}
                                      </div>
                                    </div>
                                  )}
                                  <Separator />
                                  <div>
                                    <Button variant="outline" size="sm" disabled className="w-full">
                                      Re-run from this step (Coming Soon)
                                    </Button>
                                  </div>
                                </TabsContent>
                              </Tabs>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No execution steps found
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
