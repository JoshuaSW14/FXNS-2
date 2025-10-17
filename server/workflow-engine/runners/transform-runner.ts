import { Node } from 'reactflow';
import { ExecutionContext, NodeExecutionResult, NodeRunner } from '../types';

export class TransformRunner implements NodeRunner {
  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    try {
      const transformType = node.data?.transformType || 'map';
      const config = node.data?.config || {};

      let result: any;

      switch (transformType) {
        case 'Map Data':
          result = this.mapData(config, context);
          break;
        
        case 'Filter Data':
          result = this.filterData(config, context);
          break;
        
        case 'Sort Data':
          result = this.sortData(config, context);
          break;
        
        case 'Aggregate Data':
          result = this.aggregateData(config, context);
          break;
        
        case 'Format Data':
          result = this.formatData(config, context);
          break;
        
        default:
          result = { transformed: true };
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

  private mapData(config: any, context: ExecutionContext): any {
    const { sourceData, mapping } = config;
    const data = this.resolveValue(sourceData, context);
    
    if (!Array.isArray(data)) {
      return { error: 'Source data must be an array' };
    }
    
    return data.map(item => {
      const mapped: any = {};
      for (const [key, template] of Object.entries(mapping || {})) {
        const newVariables = new Map(Array.from(context.variables.entries()));
        newVariables.set('item', item);
        mapped[key] = this.resolveValue(String(template), { ...context, variables: newVariables });
      }
      return mapped;
    });
  }

  private filterData(config: any, context: ExecutionContext): any {
    const { sourceData, condition } = config;
    const data = this.resolveValue(sourceData, context);
    
    if (!Array.isArray(data)) {
      return { error: 'Source data must be an array' };
    }
    
    return data.filter(item => {
      const newVariables = new Map(Array.from(context.variables.entries()));
      newVariables.set('item', item);
      const itemContext = { ...context, variables: newVariables };
      return this.evaluateCondition(condition, itemContext);
    });
  }

  private sortData(config: any, context: ExecutionContext): any {
    const { sourceData, sortField, sortOrder } = config;
    const data = this.resolveValue(sourceData, context);
    
    if (!Array.isArray(data)) {
      return { error: 'Source data must be an array' };
    }
    
    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (sortOrder === 'desc') {
        return aVal < bVal ? 1 : -1;
      }
      return aVal > bVal ? 1 : -1;
    });
    
    return sorted;
  }

  private aggregateData(config: any, context: ExecutionContext): any {
    const { sourceData, operation, field } = config;
    const data = this.resolveValue(sourceData, context);
    
    if (!Array.isArray(data)) {
      return { error: 'Source data must be an array' };
    }
    
    switch (operation) {
      case 'count':
        return { count: data.length };
      
      case 'sum':
        return { sum: data.reduce((acc, item) => acc + Number(item[field] || 0), 0) };
      
      case 'average':
        const sum = data.reduce((acc, item) => acc + Number(item[field] || 0), 0);
        return { average: sum / data.length };
      
      case 'min':
        return { min: Math.min(...data.map(item => Number(item[field] || 0))) };
      
      case 'max':
        return { max: Math.max(...data.map(item => Number(item[field] || 0))) };
      
      default:
        return { error: 'Unknown operation' };
    }
  }

  private formatData(config: any, context: ExecutionContext): any {
    const { sourceData, format } = config;
    const data = this.resolveValue(sourceData, context);
    
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'csv':
        if (Array.isArray(data) && data.length > 0) {
          const headers = Object.keys(data[0]);
          const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => row[h]).join(','))
          ].join('\n');
          return { csv };
        }
        return { error: 'Invalid data for CSV format' };
      
      case 'uppercase':
        return String(data).toUpperCase();
      
      case 'lowercase':
        return String(data).toLowerCase();
      
      default:
        return data;
    }
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
