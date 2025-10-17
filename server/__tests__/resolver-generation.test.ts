import { describe, it, expect } from 'vitest';
import { toolBuilderService } from '../tool-builder-service';

describe('Resolver Generation Test', () => {
  it('should generate working resolver code from visual configuration', async () => {
    // Test the core resolver generation directly
    const inputConfig = [{
      id: 'inputNumber',
      type: 'number' as const,
      label: 'Number to Double',
      required: true
    }];

    const logicConfig = [{
      id: 'double-calculation',
      type: 'calculation' as const,
      config: {
        calculation: {
          formula: 'inputNumber * 2',
          variables: [{ name: 'inputNumber', fieldId: 'inputNumber' }]
        }
      }
    }];

    const outputConfig = { 
      type: 'single_value' as const, 
      config: { sourceStepId: 'double-calculation' } 
    };

    // Access the private method via any cast for testing
    const service = toolBuilderService as any;
    const result = service.generateResolverCode(inputConfig, logicConfig, outputConfig);
    
    expect(result).toBeDefined();
    expect(result).toContain('async function resolver(input)');
    expect(result).toContain('context["inputNumber"]');
    expect(result).toContain('step_double-calculation');
    
    console.log('Generated resolver code:');
    console.log(result);

    // Test that the generated code can be executed
    // Use eval to create the function from the generated code
    const resolverFunction = eval(`(${result})`);
    const testResult = await resolverFunction({ inputNumber: 10 });
    
    expect(testResult).toBeDefined();
    expect(testResult.result).toBe(20); // 10 * 2 = 20
  });

  it('should handle multiple calculation steps', async () => {
    const inputConfig = [{
      id: 'baseNumber',
      type: 'number' as const,
      label: 'Base Number',
      required: true
    }];

    const logicConfig = [
      {
        id: 'step1',
        type: 'calculation' as const,
        config: {
          calculation: {
            formula: 'baseNumber * 3',
            variables: [{ name: 'baseNumber', fieldId: 'baseNumber' }]
          }
        }
      },
      {
        id: 'step2', 
        type: 'calculation' as const,
        config: {
          calculation: {
            formula: 'step_step1 + 5',
            variables: [{ name: 'step_step1', fieldId: 'step_step1' }]
          }
        }
      }
    ];

    const outputConfig = { 
      type: 'single_value' as const, 
      config: { sourceStepId: 'step2' } 
    };

    const service = toolBuilderService as any;
    const result = service.generateResolverCode(inputConfig, logicConfig, outputConfig);
    
    // Check that the formulas are transformed with context access
    expect(result).toContain('context["baseNumber"]');
    expect(result).toContain('* 3');
    expect(result).toContain('context["step_step1"]');
    expect(result).toContain('+ 5');
    
    // Test execution: (5 * 3) + 5 = 20
    const resolverFunction = eval(`(${result})`);
    const testResult = await resolverFunction({ baseNumber: 5 });
    
    expect(testResult.result).toBe(20);
  });

  it('should handle transform operations', async () => {
    const inputConfig = [{
      id: 'textInput',
      type: 'text' as const,
      label: 'Text Input',
      required: true
    }];

    const logicConfig = [{
      id: 'uppercase-transform',
      type: 'transform' as const,
      config: {
        transform: {
          inputFieldId: 'textInput',
          transformType: 'uppercase'
        }
      }
    }];

    const outputConfig = { 
      type: 'single_value' as const, 
      config: { sourceStepId: 'uppercase-transform' } 
    };

    const service = toolBuilderService as any;
    const result = service.generateResolverCode(inputConfig, logicConfig, outputConfig);
    
    expect(result).toContain('toUpperCase');
    
    // Test execution
    const resolverFunction = eval(`(${result})`);
    const testResult = await resolverFunction({ textInput: 'hello world' });
    
    expect(testResult.result).toBe('HELLO WORLD');
  });
});