import { Node } from 'reactflow';
import { ExecutionContext, NodeExecutionResult, NodeRunner } from '../types';

export class LoopRunner implements NodeRunner {
  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    try {
      const loopType = node.data?.loopType || 'for_each';
      const config = node.data?.config || {};

      let result: any;

      switch (loopType) {
        case 'For Each':
          result = await this.forEachLoop(config, context);
          break;
        
        case 'While':
          result = await this.whileLoop(config, context);
          break;
        
        case 'Repeat':
          result = await this.repeatLoop(config, context);
          break;
        
        default:
          result = { loopCompleted: true, iterations: 0 };
      }

      return {
        success: true,
        output: result,
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

  private async forEachLoop(config: any, context: ExecutionContext): Promise<any> {
    const { sourceData, itemVariable = 'item' } = config;
    const data = this.resolveValue(sourceData, context);

    if (!Array.isArray(data)) {
      throw new Error('Source data must be an array for forEach loop');
    }

    const results: any[] = [];
    const previousValue = context.variables.get(itemVariable);

    for (const item of data) {
      context.variables.set(itemVariable, item);
      results.push(item);
    }

    if (previousValue !== undefined) {
      context.variables.set(itemVariable, previousValue);
    } else {
      context.variables.delete(itemVariable);
    }

    return {
      loopType: 'forEach',
      iterations: data.length,
      results,
    };
  }

  private async whileLoop(config: any, context: ExecutionContext): Promise<any> {
    const { condition, maxIterations = 100 } = config;
    
    let iterations = 0;
    const results: any[] = [];
    const previousIteration = context.variables.get('loopIteration');

    while (iterations < maxIterations) {
      const conditionMet = this.evaluateCondition(condition, context);
      
      if (!conditionMet) {
        break;
      }

      iterations++;
      results.push({ iteration: iterations });
      
      context.variables.set('loopIteration', iterations);
    }

    if (previousIteration !== undefined) {
      context.variables.set('loopIteration', previousIteration);
    } else {
      context.variables.delete('loopIteration');
    }

    return {
      loopType: 'while',
      iterations,
      results,
    };
  }

  private async repeatLoop(config: any, context: ExecutionContext): Promise<any> {
    const { count = 1 } = config;
    const iterations = Math.min(Number(count), 1000);

    const results: any[] = [];
    const previousIndex = context.variables.get('loopIndex');

    for (let i = 0; i < iterations; i++) {
      context.variables.set('loopIndex', i);
      results.push({ iteration: i + 1 });
    }

    if (previousIndex !== undefined) {
      context.variables.set('loopIndex', previousIndex);
    } else {
      context.variables.delete('loopIndex');
    }

    return {
      loopType: 'repeat',
      iterations,
      results,
    };
  }

  private resolveValue(value: any, context: ExecutionContext): any {
    if (typeof value !== 'string') return value;
    
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

  private evaluateCondition(condition: any, context: ExecutionContext): boolean {
    const { field, operator, value } = condition;
    const actualValue = this.resolveValue(field, context);
    const expectedValue = this.resolveValue(value, context);
    
    switch (operator) {
      case 'equals':
        return actualValue == expectedValue;
      case 'not_equals':
        return actualValue != expectedValue;
      case 'greater_than':
        return Number(actualValue) > Number(expectedValue);
      case 'less_than':
        return Number(actualValue) < Number(expectedValue);
      default:
        return false;
    }
  }

  private getNestedValue(obj: any, path: string[]): any {
    return path.reduce((current, key) => current?.[key], obj);
  }
}
