import { Node, Edge } from 'reactflow';
import { db } from '../db.js';
import { 
  workflows, 
  workflowSteps, 
  workflowConnections,
  workflowExecutions,
  workflowExecutionSteps,
  integrationConnections
} from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { 
  ExecutionContext, 
  NodeExecutionResult, 
  WorkflowExecution,
  WorkflowExecutionStatus,
  ExecutionLog
} from './types.js';
import { TriggerRunner } from './runners/trigger-runner.js';
import { ActionRunner } from './runners/action-runner.js';
import { ConditionRunner } from './runners/condition-runner.js';
import { TransformRunner } from './runners/transform-runner.js';
import { ApiRunner } from './runners/api-runner.js';
import { AiRunner } from './runners/ai-runner.js';
import { LoopRunner } from './runners/loop-runner.js';
import { ToolRunner } from './runners/tool-runner.js';

export class WorkflowExecutor {
  private runners = new Map<string, any>();

  constructor() {
    this.runners.set('trigger', new TriggerRunner());
    this.runners.set('action', new ActionRunner());
    this.runners.set('condition', new ConditionRunner());
    this.runners.set('transform', new TransformRunner());
    this.runners.set('api', new ApiRunner());
    this.runners.set('ai', new AiRunner());
    this.runners.set('loop', new LoopRunner());
    this.runners.set('tool', new ToolRunner());
  }

  async executeWorkflow(
    workflowId: string,
    userId: string,
    triggerType: 'manual' | 'schedule' | 'webhook' | 'event',
    triggerData?: any
  ): Promise<WorkflowExecution> {
    const executionId = crypto.randomUUID();
    const startedAt = new Date();
    let execution: any;

    try {
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(and(
          eq(workflows.id, workflowId),
          eq(workflows.userId, userId)
        ));

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      if (!workflow.isActive) {
        throw new Error('Workflow is not active');
      }

      const steps = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowId, workflowId));

      const connections = await db
        .select()
        .from(workflowConnections)
        .where(eq(workflowConnections.workflowId, workflowId));

      const userIntegrations = await db
        .select()
        .from(integrationConnections)
        .where(eq(integrationConnections.userId, userId));

      const nodes: Node[] = steps.map(step => ({
        id: step.id,
        type: step.stepType,
        position: step.position as any,
        data: step.config as any,
      }));

      const edges: Edge[] = connections.map(conn => ({
        id: conn.id,
        source: conn.sourceStepId,
        target: conn.targetStepId,
        sourceHandle: conn.sourceHandle || undefined,
        targetHandle: conn.targetHandle || undefined,
      }));

      [execution] = await db
        .insert(workflowExecutions)
        .values({
          workflowId,
          userId,
          status: 'running',
          triggerData,
        })
        .returning();

      const context: ExecutionContext = {
        workflowId,
        executionId: execution.id,
        userId,
        triggerData,
        variables: new Map(),
        stepOutputs: new Map(),
        integrationConnections: new Map(
          userIntegrations.map(ic => [ic.id, {
            provider: ic.provider,
            accessToken: ic.accessToken,
            refreshToken: ic.refreshToken,
            metadata: ic.metadata,
            scopes: ic.scopes,
          }])
        ),
        startedAt: execution.startedAt,
        logs: [],
      };

      await this.executeGraph(nodes, edges, context);

      const completedAt = new Date();
      const duration = completedAt.getTime() - execution.startedAt.getTime();
      
      await db
        .update(workflowExecutions)
        .set({
          status: 'completed',
          completedAt,
          durationMs: duration,
        })
        .where(eq(workflowExecutions.id, execution.id));

      return {
        id: execution.id,
        workflowId,
        userId,
        status: 'completed',
        triggerType,
        triggerData,
        startedAt: execution.startedAt,
        completedAt,
        stepResults: Object.fromEntries(context.stepOutputs),
      };

    } catch (error: any) {
      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();
      
      const executionIdToUpdate = execution?.id || executionId;
      
      await db
        .update(workflowExecutions)
        .set({
          status: 'failed',
          completedAt,
          durationMs: duration,
          errorMessage: error.message,
        })
        .where(eq(workflowExecutions.id, executionIdToUpdate));

      return {
        id: executionIdToUpdate,
        workflowId,
        userId,
        status: 'failed',
        triggerType,
        triggerData,
        startedAt,
        completedAt,
        error: error.message,
        stepResults: {},
      };
    }
  }

  private async executeGraph(
    nodes: Node[],
    edges: Edge[],
    context: ExecutionContext
  ): Promise<void> {
    const triggerNode = nodes.find(n => n.type === 'trigger');
    if (!triggerNode) {
      throw new Error('No trigger node found');
    }

    console.log('Executing workflow graph starting from trigger node:', triggerNode.id);
    const edgeMap = new Map<string, Edge[]>();
    edges.forEach(edge => {
      const existing = edgeMap.get(edge.source) || [];
      edgeMap.set(edge.source, [...existing, edge]);
    });

    const visited = new Set<string>();
    const queue: Node[] = [triggerNode];

    while (queue.length > 0) {
      const currentNode = queue.shift()!;
      
      if (visited.has(currentNode.id)) {
        continue;
      }
      
      visited.add(currentNode.id);

      const runner = this.runners.get(currentNode.type!);
      if (!runner) {
        this.log(context, currentNode.id, 'error', `No runner for node type: ${currentNode.type}`);
        throw new Error(`No runner for node type: ${currentNode.type}`);
      }

      this.log(context, currentNode.id, 'info', `Executing node: ${currentNode.data?.label || currentNode.id}`);

      const stepStartedAt = new Date();
      
      const nodeInputData = {
        ...currentNode.data,
        nodeType: currentNode.type,
        nodeId: currentNode.id,
        label: currentNode.data?.label,
        availableVariables: Array.from(context.variables.keys()),
        previousStepOutputs: Object.fromEntries(
          Array.from(context.stepOutputs.entries()).map(([key, value]) => [
            key,
            typeof value === 'object' && value !== null ? '...' : value
          ])
        )
      };

      let nodeOutputData = null;
      let stepExecutionId: string | null = null;
      let result: NodeExecutionResult;

      try {
        const [stepRecord] = await db.insert(workflowExecutionSteps).values({
          executionId: context.executionId,
          stepId: currentNode.id,
          status: 'running',
          inputData: nodeInputData,
          startedAt: stepStartedAt,
        }).returning();

        stepExecutionId = stepRecord.id;

        result = await runner.execute(currentNode, context);
        const stepCompletedAt = new Date();
        const stepDuration = stepCompletedAt.getTime() - stepStartedAt.getTime();

        nodeOutputData = result.output;

        await db.update(workflowExecutionSteps)
          .set({
            inputData: nodeInputData,
            outputData: nodeOutputData,
            status: result.success ? 'completed' : 'failed',
            errorMessage: result.error,
            completedAt: stepCompletedAt,
            durationMs: stepDuration,
          })
          .where(eq(workflowExecutionSteps.id, stepExecutionId));

        context.stepOutputs.set(currentNode.id, result.output);

        if (!result.success) {
          this.log(context, currentNode.id, 'error', `Node execution failed: ${result.error}`);
          
          const failedAt = new Date();
          const failedDuration = failedAt.getTime() - context.startedAt.getTime();
          await db
            .update(workflowExecutions)
            .set({
              status: 'failed',
              completedAt: failedAt,
              durationMs: failedDuration,
              errorMessage: result.error,
              errorStep: currentNode.id,
            })
            .where(eq(workflowExecutions.id, context.executionId));
          
          throw new Error(`Node execution failed: ${result.error}`);
        }
        
        this.log(context, currentNode.id, 'info', 'Node executed successfully', nodeOutputData);
      } catch (error: any) {
        if (stepExecutionId) {
          const stepCompletedAt = new Date();
          const stepDuration = stepCompletedAt.getTime() - stepStartedAt.getTime();
          
          await db.update(workflowExecutionSteps)
            .set({
              inputData: nodeInputData,
              outputData: nodeOutputData,
              status: 'failed',
              errorMessage: error.message,
              completedAt: stepCompletedAt,
              durationMs: stepDuration,
            })
            .where(eq(workflowExecutionSteps.id, stepExecutionId));
        }
        
        throw error;
      }

      if (!result.shouldContinue) {
        break;
      }

      const nextNodeIds = result.nextNodeIds || 
        (edgeMap.get(currentNode.id) || []).map(e => e.target);

      const nextNodes = nodes.filter(n => nextNodeIds.includes(n.id));
      queue.push(...nextNodes);
    }
  }

  private log(
    context: ExecutionContext,
    stepId: string,
    level: 'info' | 'warn' | 'error',
    message: string,
    data?: any
  ): void {
    const log: ExecutionLog = {
      stepId,
      timestamp: new Date(),
      level,
      message,
      data,
    };
    context.logs.push(log);
  }
}

export const workflowExecutor = new WorkflowExecutor();
