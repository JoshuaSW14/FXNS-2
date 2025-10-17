import { Node } from 'reactflow';
import { ExecutionContext, NodeExecutionResult, NodeRunner } from '../types';

export class ConditionRunner implements NodeRunner {
  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    try {
      const conditions = node.data?.conditions || [];
      const operator = node.data?.operator || 'AND';
      
      let conditionMet = operator === 'AND';
      
      for (const condition of conditions) {
        const { field, operator: condOp, value } = condition;
        const actualValue = this.resolveValue(field, context);
        const expectedValue = this.resolveValue(value, context);
        
        const result = this.evaluateCondition(actualValue, condOp, expectedValue);
        
        if (operator === 'AND') {
          conditionMet = conditionMet && result;
        } else {
          conditionMet = conditionMet || result;
        }
      }

      const nextNodeIds: string[] = [];
      if (conditionMet && node.data?.trueHandle) {
        nextNodeIds.push(node.data.trueHandle);
      } else if (!conditionMet && node.data?.falseHandle) {
        nextNodeIds.push(node.data.falseHandle);
      }

      return {
        success: true,
        output: {
          conditionMet,
          evaluatedConditions: conditions.length,
        },
        shouldContinue: true,
        nextNodeIds: nextNodeIds.length > 0 ? nextNodeIds : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        shouldContinue: false,
      };
    }
  }

  private evaluateCondition(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
      case '==':
        return actual == expected;
      
      case 'not_equals':
      case '!=':
        return actual != expected;
      
      case 'greater_than':
      case '>':
        return Number(actual) > Number(expected);
      
      case 'less_than':
      case '<':
        return Number(actual) < Number(expected);
      
      case 'contains':
        return String(actual).includes(String(expected));
      
      case 'not_contains':
        return !String(actual).includes(String(expected));
      
      case 'starts_with':
        return String(actual).startsWith(String(expected));
      
      case 'ends_with':
        return String(actual).endsWith(String(expected));
      
      case 'is_empty':
        return !actual || actual === '' || (Array.isArray(actual) && actual.length === 0);
      
      case 'is_not_empty':
        return actual && actual !== '' && !(Array.isArray(actual) && actual.length === 0);
      
      default:
        return false;
    }
  }

  private resolveValue(value: string, context: ExecutionContext): any {
    if (!value) return '';
    
    const variableRegex = /\{\{([^}]+)\}\}/;
    const match = value.match(variableRegex);
    
    if (match) {
      const varName = match[1].trim();
      
      if (varName.startsWith('step.')) {
        const stepRef = varName.substring(5);
        const [stepId, ...path] = stepRef.split('.');
        const stepOutput = context.stepOutputs.get(stepId);
        
        if (stepOutput && path.length > 0) {
          return this.getNestedValue(stepOutput, path);
        }
        return stepOutput;
      }
      
      return context.variables.get(varName);
    }
    
    return value;
  }

  private getNestedValue(obj: any, path: string[]): any {
    return path.reduce((current, key) => current?.[key], obj);
  }
}
