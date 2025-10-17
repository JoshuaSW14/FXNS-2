import { Node } from 'reactflow';
import { NodeRunner, ExecutionContext, NodeExecutionResult } from '../types';
import { db } from '../../storage';
import { fxns } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

export class ToolRunner implements NodeRunner {
  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    try {
      const toolId = node.data?.toolId;
      
      if (!toolId) {
        return {
          success: false,
          error: 'No tool selected for this node',
          shouldContinue: false,
        };
      }

      const [tool] = await db
        .select()
        .from(fxns)
        .where(eq(fxns.id, toolId))
        .limit(1);

      if (!tool) {
        return {
          success: false,
          error: `Tool not found: ${toolId}`,
          shouldContinue: false,
        };
      }

      const inputMappings = node.data?.inputMappings || [];
      const toolInputs: Record<string, any> = {};

      for (const mapping of inputMappings) {
        const { fieldId, value } = mapping;
        
        if (typeof value === 'string') {
          toolInputs[fieldId] = this.resolveValue(value, context);
        } else if (value && typeof value === 'object' && 'fromNode' in value) {
          const fromNodeId = value.fromNode;
          const fieldName = value.fieldName;
          const stepOutput = context.stepOutputs.get(fromNodeId);
          
          if (stepOutput && fieldName) {
            toolInputs[fieldId] = this.getNestedValue(stepOutput, fieldName.split('.'));
          } else if (stepOutput) {
            toolInputs[fieldId] = stepOutput;
          }
        } else {
          toolInputs[fieldId] = value;
        }
      }

      let outputs: any;

      if (tool.codeKind === 'builtin') {
        const { resolvers } = await import('../../resolvers/index.js');
        const resolver = (resolvers as any)[tool.codeRef];
        
        if (!resolver) {
          return {
            success: false,
            error: `Resolver not found for tool: ${tool.codeRef}`,
            shouldContinue: false,
          };
        }

        try {
          const validatedInput = resolver.inputSchema.parse(toolInputs);
          outputs = resolver.resolver(validatedInput);
        } catch (validationError: any) {
          return {
            success: false,
            error: `Tool input validation failed: ${validationError.message}`,
            shouldContinue: false,
          };
        }
      } else if (tool.codeKind === 'custom') {
        try {
          const validatedInputs = this.validateAndCoerceInputs(tool.inputSchema, toolInputs);
          const func = new Function(
            'inputs',
            tool.codeRef.includes('function')
              ? tool.codeRef + '; return customTool(inputs);'
              : `return (${tool.codeRef})(inputs);`
          );
          outputs = func(validatedInputs);
        } catch (execError: any) {
          return {
            success: false,
            error: `Tool execution failed: ${execError.message}`,
            shouldContinue: false,
          };
        }
      } else if (tool.codeKind === 'config') {
        const builderConfig = tool.builderConfig as any;
        
        if (!builderConfig?.inputConfig || !builderConfig?.logicConfig || !builderConfig?.outputConfig) {
          return {
            success: false,
            error: 'Invalid tool configuration',
            shouldContinue: false,
          };
        }

        try {
          const validatedInputs = this.validateAndCoerceInputs(tool.inputSchema, toolInputs);
          
          const { toolBuilderService } = await import('../../tool-builder-service.js');
          outputs = await toolBuilderService.testToolTemplate(
            builderConfig.inputConfig,
            builderConfig.logicConfig,
            builderConfig.outputConfig,
            validatedInputs
          );
        } catch (execError: any) {
          return {
            success: false,
            error: `Tool execution failed: ${execError.message}`,
            shouldContinue: false,
          };
        }
      } else {
        return {
          success: false,
          error: `Unsupported tool type: ${tool.codeKind}`,
          shouldContinue: false,
        };
      }

      return {
        success: true,
        output: {
          toolId: tool.id,
          toolName: tool.title,
          toolOutputs: outputs,
          ...outputs,
        },
        shouldContinue: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Tool execution failed',
        shouldContinue: false,
      };
    }
  }

  private resolveValue(value: string, context: ExecutionContext): any {
    if (!value || typeof value !== 'string') return value;
    
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

  private validateAndCoerceInputs(schema: any, body: any): any {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return body;
    
    const result: Record<string, any> = {};
    
    for (const [key, spec] of Object.entries(schema as Record<string, any>)) {
      const required = !!spec.required;
      let v = body[key];
      
      switch (spec.type) {
        case 'number':
          if (v === '' || v === undefined || v === null) {
            if (required) throw new Error(`Field "${key}" is required`);
            break;
          }
          if (typeof v !== 'number') {
            const num = Number(v);
            if (Number.isNaN(num)) throw new Error(`Field "${key}" must be a number`);
            v = num;
          }
          if (spec.min !== undefined && v < spec.min) {
            throw new Error(`Field "${key}" must be >= ${spec.min}`);
          }
          if (spec.max !== undefined && v > spec.max) {
            throw new Error(`Field "${key}" must be <= ${spec.max}`);
          }
          break;
        
        case 'boolean':
          v = !!v;
          break;
        
        case 'list':
          if (Array.isArray(v)) {
            v = v.map((s: any) => String(s)).filter(Boolean);
          } else if (typeof v === 'string') {
            v = v.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);
          } else if (v == null) {
            v = [];
          } else {
            v = [String(v)];
          }
          if (required && v.length === 0) {
            throw new Error(`Field "${key}" must include at least one item`);
          }
          break;
        
        default:
          if (v == null || v === '') {
            if (required) throw new Error(`Field "${key}" is required`);
          } else {
            if (spec.type === 'multiselect' && !Array.isArray(v)) {
              v = String(v).split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);
            }
          }
      }
      
      result[key] = v;
    }
    
    return result;
  }
}
