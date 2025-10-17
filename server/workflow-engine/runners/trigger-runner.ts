import { Node } from 'reactflow';
import { ExecutionContext, NodeExecutionResult, NodeRunner } from '../types';

export class TriggerRunner implements NodeRunner {
  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    try {
      const triggerType = node.data?.triggerType || 'manual';
      const config = node.data?.config || {};

      context.variables.set('trigger', {
        type: triggerType,
        data: context.triggerData,
        timestamp: context.startedAt,
      });

      return {
        success: true,
        output: {
          triggerType,
          triggerData: context.triggerData,
          triggeredAt: context.startedAt,
        },
        shouldContinue: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        shouldContinue: false,
      };
    }
  }
}
