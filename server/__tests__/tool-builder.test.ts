import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { toolBuilderService } from '../tool-builder-service';
import express from 'express';
import request from 'supertest';
import { registerRoutes } from '../routes';
import { db } from '../db';
import { users, toolDrafts } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

// Mock OpenAI to avoid actual API calls
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'AI analysis result'
            }
          }]
        })
      }
    }
  }))
}));

const TEST_USER_ID = '00000000-0000-0000-0000-000000000124';

describe('Tool Builder - Comprehensive Integration Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Create test user with specific ID
    try {
      await db.insert(users).values({
        id: TEST_USER_ID,
        name: 'test-user-builder',
        email: 'builder@example.com',
        passwordHash: 'hashed-password'
      }).onConflictDoNothing();
    } catch (error) {
      console.log('Test user setup (may already exist):', error);
    }
    
    app = express();
    app.use(express.json());
    
    // Mock authentication
    app.use((req: any, res, next) => {
      req.user = { id: TEST_USER_ID };
      req.isAuthenticated = () => true;
      next();
    });
    
    registerRoutes(app as any);
  });
  
  afterAll(async () => {
    // Clean up test data
    try {
      await db.delete(toolDrafts).where(eq(toolDrafts.userId, TEST_USER_ID));
    } catch (error) {
      console.log('Cleanup error:', error);
    }
  });

  describe('Logic Step Types', () => {
    it('should execute calculation logic step', async () => {
      const draft = await toolBuilderService.createDraft(
        TEST_USER_ID,
        'Calculation Test',
        'calculator'
      );
      
      await toolBuilderService.updateDraft(draft.id, TEST_USER_ID, {
        description: 'Tests calculation logic',
        inputConfig: [
          { id: 'num1', type: 'number', label: 'Number 1', required: true },
          { id: 'num2', type: 'number', label: 'Number 2', required: true }
        ],
        logicConfig: [{
          id: 'calc-step',
          type: 'calculation',
          config: {
            calculation: {
              formula: 'num1 + num2',
              variables: [
                { name: 'num1', fieldId: 'num1' },
                { name: 'num2', fieldId: 'num2' }
              ]
            }
          }
        }],
        outputConfig: { 
          format: 'text',
          sections: [{
            id: 'result',
            type: 'result',
            title: 'Result',
            content: '{{ calc-step }}',
            sourceStepId: 'calc-step',
            visible: true
          }]
        }
      });

      const testResult = await toolBuilderService.testDraft(
        draft.id, 
        TEST_USER_ID, 
        { num1: 15, num2: 25 }
      );
      
      expect(testResult.result).toBe(40);
    }, 10000);

    it('should execute condition logic step with if/else', async () => {
      const draft = await toolBuilderService.createDraft(
        TEST_USER_ID,
        'Condition Test',
        'utility'
      );
      
      await toolBuilderService.updateDraft(draft.id, TEST_USER_ID, {
        description: 'Tests conditional logic',
        inputConfig: [
          { id: 'age', type: 'number', label: 'Age', required: true }
        ],
        logicConfig: [{
          id: 'condition-step',
          type: 'condition',
          config: {
            condition: {
              if: {
                fieldId: 'age',
                operator: 'greater_than',
                value: '18'
              },
              then: [{
                id: 'adult-result',
                type: 'calculation',
                config: {
                  calculation: {
                    formula: '"Adult"',
                    variables: []
                  }
                }
              }],
              else: [{
                id: 'minor-result',
                type: 'calculation',
                config: {
                  calculation: {
                    formula: '"Minor"',
                    variables: []
                  }
                }
              }]
            }
          }
        }],
        outputConfig: { 
          format: 'text',
          sections: [{
            type: 'result',
            title: 'Result',
            content: '{{ condition-step }}',
            sourceStepId: 'condition-step',
            visible: true
          }]
        }
      });

      const testAdult = await toolBuilderService.testDraft(
        draft.id, 
        TEST_USER_ID, 
        { age: 25 }
      );
      expect(testAdult.result).toContain('Adult');

      const testMinor = await toolBuilderService.testDraft(
        draft.id, 
        TEST_USER_ID, 
        { age: 15 }
      );
      expect(testMinor.result).toContain('Minor');
    }, 10000);

    it('should execute transform logic step', async () => {
      const draft = await toolBuilderService.createDraft(
        TEST_USER_ID,
        'Transform Test',
        'utility'
      );
      
      await toolBuilderService.updateDraft(draft.id, TEST_USER_ID, {
        description: 'Tests transform logic',
        inputConfig: [
          { id: 'text', type: 'text', label: 'Text', required: true }
        ],
        logicConfig: [{
          id: 'transform-step',
          type: 'transform',
          config: {
            transform: {
              inputFieldId: 'text',
              transformType: 'uppercase'
            }
          }
        }],
        outputConfig: { 
          format: 'text',
          sections: [{
            type: 'result',
            title: 'Result',
            content: '{{ transform-step }}',
            sourceStepId: 'transform-step',
            visible: true
          }]
        }
      });

      const testResult = await toolBuilderService.testDraft(
        draft.id, 
        TEST_USER_ID, 
        { text: 'hello world' }
      );
      
      expect(testResult.result).toBe('HELLO WORLD');
    }, 10000);

    it('should execute switch/case logic step', async () => {
      const draft = await toolBuilderService.createDraft(
        TEST_USER_ID,
        'Switch Test',
        'utility'
      );
      
      await toolBuilderService.updateDraft(draft.id, TEST_USER_ID, {
        description: 'Tests switch logic',
        inputConfig: [
          { id: 'grade', type: 'select', label: 'Grade', required: true, options: [
            { label: 'A', value: 'A' },
            { label: 'B', value: 'B' },
            { label: 'C', value: 'C' }
          ]}
        ],
        logicConfig: [{
          id: 'switch-step',
          type: 'switch',
          config: {
            switch: {
              fieldId: 'grade',
              cases: [
                {
                  value: 'A',
                  then: [{
                    id: 'result-a',
                    type: 'calculation',
                    config: {
                      calculation: { formula: '"Excellent"', variables: [] }
                    }
                  }]
                },
                {
                  value: 'B',
                  then: [{
                    id: 'result-b',
                    type: 'calculation',
                    config: {
                      calculation: { formula: '"Good"', variables: [] }
                    }
                  }]
                }
              ],
              default: [{
                id: 'result-default',
                type: 'calculation',
                config: {
                  calculation: { formula: '"Pass"', variables: [] }
                }
              }]
            }
          }
        }],
        outputConfig: { 
          format: 'text',
          sections: [{
            type: 'result',
            title: 'Result',
            content: '{{ switch-step }}',
            sourceStepId: 'switch-step',
            visible: true
          }]
        }
      });

      const testA = await toolBuilderService.testDraft(draft.id, TEST_USER_ID, { grade: 'A' });
      expect(testA.result).toContain('Excellent');

      const testB = await toolBuilderService.testDraft(draft.id, TEST_USER_ID, { grade: 'B' });
      expect(testB.result).toContain('Good');

      const testC = await toolBuilderService.testDraft(draft.id, TEST_USER_ID, { grade: 'C' });
      expect(testC.result).toContain('Pass');
    }, 10000);

    it('should execute API call logic step', async () => {
      const draft = await toolBuilderService.createDraft(
        TEST_USER_ID,
        'API Call Test',
        'developer'
      );
      
      await toolBuilderService.updateDraft(draft.id, TEST_USER_ID, {
        description: 'Tests API call logic',
        inputConfig: [
          { id: 'userId', type: 'number', label: 'User ID', required: true }
        ],
        logicConfig: [{
          id: 'api-step',
          type: 'api_call',
          config: {
            apiCall: {
              method: 'GET',
              url: 'https://jsonplaceholder.typicode.com/users/{{ userId }}',
              headers: { 'Content-Type': 'application/json' }
            }
          }
        }],
        outputConfig: { 
          format: 'json',
          sections: [{
            type: 'result',
            title: 'API Response',
            content: '{{ api-step }}',
            sourceStepId: 'api-step',
            visible: true
          }]
        }
      });

      const testResult = await toolBuilderService.testDraft(
        draft.id, 
        TEST_USER_ID, 
        { userId: 1 }
      );
      
      expect(testResult.result).toBeDefined();
      expect(testResult.result).toContain('id');
    }, 15000);

    it('should execute AI analysis logic step', async () => {
      const draft = await toolBuilderService.createDraft(
        TEST_USER_ID,
        'AI Analysis Test',
        'productivity'
      );
      
      await toolBuilderService.updateDraft(draft.id, TEST_USER_ID, {
        description: 'Tests AI analysis',
        inputConfig: [
          { id: 'text', type: 'textarea', label: 'Text', required: true }
        ],
        logicConfig: [{
          id: 'ai-step',
          type: 'ai_analysis',
          config: {
            aiAnalysis: {
              prompt: 'Analyze the sentiment of this text: {{ text }}',
              inputFields: ['text'],
              outputFormat: 'text'
            }
          }
        }],
        outputConfig: { 
          format: 'text',
          sections: [{
            type: 'result',
            title: 'AI Analysis',
            content: '{{ ai-step }}',
            sourceStepId: 'ai-step',
            visible: true
          }]
        }
      });

      const testResult = await toolBuilderService.testDraft(
        draft.id, 
        TEST_USER_ID, 
        { text: 'This is a great product!' }
      );
      
      expect(testResult.result).toBeDefined();
      expect(testResult.result).toContain('AI analysis result');
    }, 15000);
  });

  describe('Output View Designer', () => {
    it('should format output as text', async () => {
      const draft = await toolBuilderService.createDraft(
        TEST_USER_ID,
        'Text Output Test',
        'utility'
      );
      
      await toolBuilderService.updateDraft(draft.id, TEST_USER_ID, {
        description: 'Tests text output',
        inputConfig: [{ id: 'value', type: 'number', label: 'Value', required: true }],
        logicConfig: [{
          id: 'calc',
          type: 'calculation',
          config: {
            calculation: { formula: 'value * 2', variables: [{ name: 'value', fieldId: 'value' }] }
          }
        }],
        outputConfig: { 
          format: 'text',
          sections: [{
            type: 'result',
            title: 'Result',
            content: 'The doubled value is: {{ calc }}',
            sourceStepId: 'calc',
            visible: true
          }]
        }
      });

      const result = await toolBuilderService.testDraft(draft.id, TEST_USER_ID, { value: 10 });
      expect(result.result).toContain('20');
    }, 10000);

    it('should format output as JSON', async () => {
      const draft = await toolBuilderService.createDraft(
        TEST_USER_ID,
        'JSON Output Test',
        'developer'
      );
      
      await toolBuilderService.updateDraft(draft.id, TEST_USER_ID, {
        description: 'Tests JSON output',
        inputConfig: [
          { id: 'name', type: 'text', label: 'Name', required: true },
          { id: 'age', type: 'number', label: 'Age', required: true }
        ],
        logicConfig: [{
          id: 'json-build',
          type: 'calculation',
          config: {
            calculation: { 
              formula: 'JSON.stringify({ name: name, age: age, timestamp: new Date().toISOString() })', 
              variables: [
                { name: 'name', fieldId: 'name' },
                { name: 'age', fieldId: 'age' }
              ]
            }
          }
        }],
        outputConfig: { 
          format: 'json',
          sections: [{
            type: 'result',
            title: 'JSON Result',
            content: '{{ json-build }}',
            sourceStepId: 'json-build',
            visible: true
          }]
        }
      });

      const result = await toolBuilderService.testDraft(
        draft.id, 
        TEST_USER_ID, 
        { name: 'John', age: 30 }
      );
      
      expect(result.result).toBeDefined();
      const parsed = JSON.parse(result.result);
      expect(parsed.name).toBe('John');
      expect(parsed.age).toBe(30);
    }, 10000);

    it('should format output as table', async () => {
      const draft = await toolBuilderService.createDraft(
        TEST_USER_ID,
        'Table Output Test',
        'productivity'
      );
      
      await toolBuilderService.updateDraft(draft.id, TEST_USER_ID, {
        description: 'Tests table output',
        inputConfig: [
          { id: 'rows', type: 'number', label: 'Rows', required: true }
        ],
        logicConfig: [{
          id: 'table-data',
          type: 'calculation',
          config: {
            calculation: { 
              formula: 'Array(rows).fill(0).map((_, i) => ({ id: i + 1, value: (i + 1) * 10 }))',
              variables: [{ name: 'rows', fieldId: 'rows' }]
            }
          }
        }],
        outputConfig: { 
          format: 'table',
          fieldMappings: [
            { fieldId: 'id', label: 'ID', format: 'number', order: 1 },
            { fieldId: 'value', label: 'Value', format: 'number', order: 2 }
          ],
          sections: [{
            type: 'result',
            title: 'Table Data',
            content: '{{ table-data }}',
            sourceStepId: 'table-data',
            visible: true
          }]
        }
      });

      const result = await toolBuilderService.testDraft(draft.id, TEST_USER_ID, { rows: 3 });
      expect(result.result).toBeDefined();
      expect(Array.isArray(result.result)).toBe(true);
      expect(result.result.length).toBe(3);
    }, 10000);

    it('should format output as markdown', async () => {
      const draft = await toolBuilderService.createDraft(
        TEST_USER_ID,
        'Markdown Output Test',
        'productivity'
      );
      
      await toolBuilderService.updateDraft(draft.id, TEST_USER_ID, {
        description: 'Tests markdown output',
        inputConfig: [
          { id: 'title', type: 'text', label: 'Title', required: true },
          { id: 'content', type: 'textarea', label: 'Content', required: true }
        ],
        logicConfig: [{
          id: 'md-build',
          type: 'calculation',
          config: {
            calculation: { 
              formula: '`# ${title}\\n\\n${content}`',
              variables: [
                { name: 'title', fieldId: 'title' },
                { name: 'content', fieldId: 'content' }
              ]
            }
          }
        }],
        outputConfig: { 
          format: 'markdown',
          sections: [{
            type: 'result',
            title: 'Markdown',
            content: '{{ md-build }}',
            sourceStepId: 'md-build',
            visible: true
          }]
        }
      });

      const result = await toolBuilderService.testDraft(
        draft.id, 
        TEST_USER_ID, 
        { title: 'Test Document', content: 'This is the content.' }
      );
      
      expect(result.result).toContain('# Test Document');
      expect(result.result).toContain('This is the content.');
    }, 10000);

    it('should format output as card', async () => {
      const draft = await toolBuilderService.createDraft(
        TEST_USER_ID,
        'Card Output Test',
        'utility'
      );
      
      await toolBuilderService.updateDraft(draft.id, TEST_USER_ID, {
        description: 'Tests card output',
        inputConfig: [
          { id: 'value', type: 'number', label: 'Value', required: true }
        ],
        logicConfig: [{
          id: 'calc',
          type: 'calculation',
          config: {
            calculation: { formula: 'value * 3', variables: [{ name: 'value', fieldId: 'value' }] }
          }
        }],
        outputConfig: { 
          format: 'card',
          sections: [
            {
              type: 'result',
              title: 'Main Result',
              content: '{{ calc }}',
              sourceStepId: 'calc',
              visible: true
            },
            {
              type: 'text',
              title: 'Description',
              content: 'This is the tripled value',
              visible: true
            }
          ]
        }
      });

      const result = await toolBuilderService.testDraft(draft.id, TEST_USER_ID, { value: 7 });
      expect(result.result).toBe(21);
    }, 10000);
  });

  describe('Form Field Types and Validation', () => {
    it('should validate all basic form field types', async () => {
      const draft = await toolBuilderService.createDraft(
        TEST_USER_ID,
        'Field Types Test',
        'utility'
      );
      
      await toolBuilderService.updateDraft(draft.id, TEST_USER_ID, {
        description: 'Tests all field types',
        inputConfig: [
          { id: 'text', type: 'text', label: 'Text', required: true },
          { id: 'number', type: 'number', label: 'Number', required: true, min: 0, max: 100 },
          { id: 'email', type: 'email', label: 'Email', required: true },
          { id: 'boolean', type: 'boolean', label: 'Boolean', required: false },
          { id: 'select', type: 'select', label: 'Select', required: true, options: [
            { label: 'Option 1', value: 'opt1' },
            { label: 'Option 2', value: 'opt2' }
          ]},
          { id: 'textarea', type: 'textarea', label: 'Textarea', required: true }
        ],
        logicConfig: [{
          id: 'combine',
          type: 'calculation',
          config: {
            calculation: { 
              formula: '`${text} - ${number} - ${email} - ${boolean} - ${select} - ${textarea}`',
              variables: [
                { name: 'text', fieldId: 'text' },
                { name: 'number', fieldId: 'number' },
                { name: 'email', fieldId: 'email' },
                { name: 'boolean', fieldId: 'boolean' },
                { name: 'select', fieldId: 'select' },
                { name: 'textarea', fieldId: 'textarea' }
              ]
            }
          }
        }],
        outputConfig: { 
          format: 'text',
          sections: [{
            type: 'result',
            title: 'Combined',
            content: '{{ combine }}',
            sourceStepId: 'combine',
            visible: true
          }]
        }
      });

      const result = await toolBuilderService.testDraft(draft.id, TEST_USER_ID, { 
        text: 'hello',
        number: 50,
        email: 'test@example.com',
        boolean: true,
        select: 'opt1',
        textarea: 'multiline\ntext'
      });
      
      expect(result.result).toContain('hello');
      expect(result.result).toContain('50');
      expect(result.result).toContain('test@example.com');
      expect(result.result).toContain('true');
      expect(result.result).toContain('opt1');
    }, 10000);
  });

  describe('Draft Lifecycle', () => {
    it('should create, update, test, and publish a draft', async () => {
      // Create draft
      const draft = await toolBuilderService.createDraft(
        TEST_USER_ID,
        'Lifecycle Test',
        'calculator'
      );
      expect(draft.id).toBeDefined();
      expect(draft.status).toBe('draft');

      // Update draft
      const updated = await toolBuilderService.updateDraft(draft.id, TEST_USER_ID, {
        description: 'Updated description',
        inputConfig: [
          { id: 'x', type: 'number', label: 'X', required: true }
        ],
        logicConfig: [{
          id: 'square',
          type: 'calculation',
          config: {
            calculation: { formula: 'x * x', variables: [{ name: 'x', fieldId: 'x' }] }
          }
        }],
        outputConfig: { 
          format: 'text',
          sections: [{
            type: 'result',
            title: 'Result',
            content: 'Square: {{ square }}',
            sourceStepId: 'square',
            visible: true
          }]
        }
      });
      expect(updated.description).toBe('Updated description');

      // Test draft
      const testResult = await toolBuilderService.testDraft(draft.id, TEST_USER_ID, { x: 5 });
      expect(testResult.result).toBe(25);

      // Publish draft
      const publishedId = await toolBuilderService.publishDraft(draft.id, TEST_USER_ID);
      expect(publishedId).toBeDefined();

      // Verify published tool works
      const response = await request(app)
        .post(`/api/tools/${publishedId}/run`)
        .send({ x: 7 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.outputs.result).toBe(49);
    }, 20000);

    it('should load draft and preserve state', async () => {
      const draft = await toolBuilderService.createDraft(
        TEST_USER_ID,
        'State Test',
        'utility'
      );
      
      await toolBuilderService.updateDraft(draft.id, TEST_USER_ID, {
        description: 'State preservation test',
        inputConfig: [
          { id: 'input', type: 'text', label: 'Input', required: true }
        ],
        logicConfig: [{
          id: 'step1',
          type: 'transform',
          config: {
            transform: { inputFieldId: 'input', transformType: 'uppercase' }
          }
        }],
        outputConfig: { 
          format: 'text',
          sections: [{
            type: 'result',
            title: 'Result',
            content: '{{ step1 }}',
            sourceStepId: 'step1',
            visible: true
          }]
        }
      });

      // Load draft
      const loaded = await toolBuilderService.getDraft(draft.id, TEST_USER_ID);
      expect(loaded.description).toBe('State preservation test');
      expect(loaded.inputConfig).toHaveLength(1);
      expect(loaded.logicConfig).toHaveLength(1);
      expect(loaded.outputConfig.format).toBe('text');
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle invalid formula in calculation', async () => {
      const draft = await toolBuilderService.createDraft(
        TEST_USER_ID,
        'Error Test',
        'calculator'
      );
      
      await toolBuilderService.updateDraft(draft.id, TEST_USER_ID, {
        description: 'Invalid formula test',
        inputConfig: [{ id: 'x', type: 'number', label: 'X', required: true }],
        logicConfig: [{
          id: 'bad-calc',
          type: 'calculation',
          config: {
            calculation: { formula: 'undefined_var * 2', variables: [] }
          }
        }],
        outputConfig: { 
          format: 'text',
          sections: [{
            type: 'result',
            title: 'Result',
            content: '{{ bad-calc }}',
            sourceStepId: 'bad-calc',
            visible: true
          }]
        }
      });

      await expect(
        toolBuilderService.testDraft(draft.id, TEST_USER_ID, { x: 5 })
      ).rejects.toThrow();
    }, 10000);

    it('should handle missing required fields', async () => {
      const draft = await toolBuilderService.createDraft(
        TEST_USER_ID,
        'Required Field Test',
        'utility'
      );
      
      await toolBuilderService.updateDraft(draft.id, TEST_USER_ID, {
        description: 'Required field validation',
        inputConfig: [
          { id: 'required_field', type: 'text', label: 'Required', required: true }
        ],
        logicConfig: [{
          id: 'step',
          type: 'calculation',
          config: {
            calculation: { formula: 'required_field', variables: [{ name: 'required_field', fieldId: 'required_field' }] }
          }
        }],
        outputConfig: { 
          format: 'text',
          sections: [{
            type: 'result',
            title: 'Result',
            content: '{{ step }}',
            sourceStepId: 'step',
            visible: true
          }]
        }
      });

      await expect(
        toolBuilderService.testDraft(draft.id, TEST_USER_ID, {})
      ).rejects.toThrow();
    }, 10000);
  });
});
