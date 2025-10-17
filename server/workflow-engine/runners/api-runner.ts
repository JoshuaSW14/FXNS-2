import { Node } from 'reactflow';
import { ExecutionContext, NodeExecutionResult, NodeRunner } from '../types';

export class ApiRunner implements NodeRunner {
  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    try {
      const method = node.data?.method || 'GET';
      const url = this.resolveValue(node.data?.url || '', context);
      const headers = node.data?.headers || {};
      const body = node.data?.body;
      const integrationId = node.data?.integrationId;

      const resolvedHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(headers)) {
        resolvedHeaders[key] = this.resolveValue(String(value), context);
      }

      if (integrationId) {
        const credentials = context.integrationConnections.get(integrationId);
        if (credentials) {
          if (credentials.accessToken) {
            resolvedHeaders['Authorization'] = `Bearer ${credentials.accessToken}`;
          }
          if (credentials.apiKey) {
            resolvedHeaders['X-API-Key'] = credentials.apiKey;
          }
        }
      }

      const requestOptions: RequestInit = {
        method,
        headers: resolvedHeaders,
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        requestOptions.body = typeof body === 'string' 
          ? this.resolveValue(body, context)
          : JSON.stringify(body);
      }

      const response = await fetch(url, requestOptions);
      const data = await response.json();

      return {
        success: response.ok,
        output: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data,
        },
        shouldContinue: response.ok,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        shouldContinue: false,
      };
    }
  }

  private resolveValue(value: string, context: ExecutionContext): string {
    if (!value) return '';
    
    let resolved = value;
    const variableRegex = /\{\{([^}]+)\}\}/g;
    
    resolved = resolved.replace(variableRegex, (match, varName) => {
      const trimmed = varName.trim();
      
      if (trimmed.startsWith('step.')) {
        const stepRef = trimmed.substring(5);
        const [stepId, ...path] = stepRef.split('.');
        const stepOutput = context.stepOutputs.get(stepId);
        
        if (stepOutput && path.length > 0) {
          return this.getNestedValue(stepOutput, path);
        }
        return stepOutput || match;
      }
      
      const varValue = context.variables.get(trimmed);
      return varValue !== undefined ? String(varValue) : match;
    });
    
    return resolved;
  }

  private getNestedValue(obj: any, path: string[]): any {
    return path.reduce((current, key) => current?.[key], obj);
  }
}
