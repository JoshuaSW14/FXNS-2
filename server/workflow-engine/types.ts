import { Node, Edge } from 'reactflow';

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  userId: string;
  triggerData?: any;
  variables: Map<string, any>;
  stepOutputs: Map<string, any>;
  integrationConnections: Map<string, any>;
  startedAt: Date;
  logs: ExecutionLog[];
}

export interface ExecutionLog {
  stepId: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export interface NodeExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  shouldContinue: boolean;
  nextNodeIds?: string[];
}

export interface NodeRunner {
  execute(
    node: Node,
    context: ExecutionContext
  ): Promise<NodeExecutionResult>;
}

export type WorkflowExecutionStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  userId: string;
  status: WorkflowExecutionStatus;
  triggerType: 'manual' | 'schedule' | 'webhook' | 'event';
  triggerData?: any;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  stepResults: Record<string, any>;
}
