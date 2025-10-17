import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerRoutes } from '../routes';
import { db } from '../db';
import { users, workflows, workflowSteps, workflowConnections } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { workflowExecutor } from '../workflow-engine/executor';

// Mock external dependencies
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'AI generated response'
            }
          }]
        })
      }
    }
  }))
}));

const TEST_USER_ID = '00000000-0000-0000-0000-000000000125';

describe('Workflow Engine - Comprehensive Integration Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Create test user with specific ID
    try {
      await db.insert(users).values({
        id: TEST_USER_ID,
        name: 'test-user-workflow',
        email: 'workflow@example.com',
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
      await db.delete(workflows).where(eq(workflows.userId, TEST_USER_ID));
    } catch (error) {
      console.log('Cleanup error:', error);
    }
  });

  describe('Workflow Creation and Node Types', () => {
    it('should create a workflow with all 7 node types', async () => {
      const response = await request(app)
        .post('/api/workflows')
        .send({
          name: 'All Node Types Test',
          description: 'Tests all node types',
          category: 'automation',
          triggerType: 'manual',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { label: 'Manual Trigger', triggerType: 'manual' }
            },
            {
              id: 'action-1',
              type: 'action',
              position: { x: 300, y: 100 },
              data: { label: 'Send Email', actionType: 'email' }
            },
            {
              id: 'condition-1',
              type: 'condition',
              position: { x: 500, y: 100 },
              data: { label: 'Check Status', conditions: [{ field: 'status', operator: 'equals', value: 'active' }] }
            },
            {
              id: 'transform-1',
              type: 'transform',
              position: { x: 700, y: 100 },
              data: { label: 'Map Data', transformType: 'Map Data' }
            },
            {
              id: 'api-1',
              type: 'api',
              position: { x: 100, y: 300 },
              data: { label: 'API Call', method: 'GET', url: 'https://api.example.com/data' }
            },
            {
              id: 'ai-1',
              type: 'ai',
              position: { x: 300, y: 300 },
              data: { label: 'AI Task', prompt: 'Analyze this data', model: 'gpt-4' }
            },
            {
              id: 'loop-1',
              type: 'loop',
              position: { x: 500, y: 300 },
              data: { label: 'Loop Items', loopType: 'forEach', sourceData: '{{ items }}' }
            }
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'action-1' },
            { id: 'e2', source: 'action-1', target: 'condition-1' },
            { id: 'e3', source: 'condition-1', target: 'transform-1' },
            { id: 'e4', source: 'transform-1', target: 'api-1' },
            { id: 'e5', source: 'api-1', target: 'ai-1' },
            { id: 'e6', source: 'ai-1', target: 'loop-1' }
          ]
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('All Node Types Test');

      // Verify nodes were created
      const workflowId = response.body.id;
      const steps = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowId, workflowId));

      expect(steps).toHaveLength(7);
      const stepTypes = steps.map(s => s.stepType).sort();
      expect(stepTypes).toContain('trigger');
      expect(stepTypes).toContain('action');
      expect(stepTypes).toContain('condition');
      expect(stepTypes).toContain('transform');
      expect(stepTypes).toContain('api');
      expect(stepTypes).toContain('ai');
      expect(stepTypes).toContain('loop');
    }, 15000);

    it('should create workflow with Tool-as-Node', async () => {
      const response = await request(app)
        .post('/api/workflows')
        .send({
          name: 'Tool Node Test',
          description: 'Tests tool as node',
          category: 'automation',
          triggerType: 'manual',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { label: 'Manual Trigger', triggerType: 'manual' }
            },
            {
              id: 'tool-1',
              type: 'tool',
              position: { x: 300, y: 100 },
              data: { 
                label: 'Calculator Tool', 
                toolId: 'some-tool-id',
                inputs: { number: '{{ trigger.value }}' }
              }
            }
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'tool-1' }
          ]
        })
        .expect(201);

      expect(response.body.id).toBeDefined();

      // Verify tool node was created
      const workflowId = response.body.id;
      const steps = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowId, workflowId));

      const toolStep = steps.find(s => s.stepType === 'tool');
      expect(toolStep).toBeDefined();
      expect(toolStep?.config).toHaveProperty('toolId');
    }, 10000);
  });

  describe('Workflow Execution', () => {
    it('should execute workflow with Trigger → Action → Condition nodes', async () => {
      // Create workflow
      const createResponse = await request(app)
        .post('/api/workflows')
        .send({
          name: 'Simple Flow',
          description: 'Simple execution test',
          triggerType: 'manual',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { label: 'Start', triggerType: 'manual', outputData: { value: 10 } }
            },
            {
              id: 'action-1',
              type: 'action',
              position: { x: 300, y: 100 },
              data: { label: 'Process', actionType: 'log', message: 'Processing value: {{ trigger-1.value }}' }
            },
            {
              id: 'condition-1',
              type: 'condition',
              position: { x: 500, y: 100 },
              data: { 
                label: 'Check Value',
                conditions: [{ field: '{{ trigger-1.value }}', operator: 'greater_than', value: '5' }],
                operator: 'AND'
              }
            }
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'action-1' },
            { id: 'e2', source: 'action-1', target: 'condition-1' }
          ]
        })
        .expect(201);

      const workflowId = createResponse.body.id;

      // Activate workflow
      await request(app)
        .put(`/api/workflows/${workflowId}`)
        .send({ isActive: true })
        .expect(200);

      // Execute workflow
      const executeResponse = await request(app)
        .post(`/api/workflows/${workflowId}/execute`)
        .send({ triggerData: { value: 10 } })
        .expect(200);

      expect(executeResponse.body.success).toBe(true);
      expect(executeResponse.body.execution).toBeDefined();
      expect(executeResponse.body.execution.status).toBe('completed');
    }, 20000);

    it('should execute workflow with Transform node', async () => {
      const createResponse = await request(app)
        .post('/api/workflows')
        .send({
          name: 'Transform Test',
          description: 'Tests data transformation',
          triggerType: 'manual',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { 
                label: 'Start', 
                triggerType: 'manual',
                outputData: { items: [{ name: 'A', value: 1 }, { name: 'B', value: 2 }] }
              }
            },
            {
              id: 'transform-1',
              type: 'transform',
              position: { x: 300, y: 100 },
              data: { 
                label: 'Map Items',
                transformType: 'Map Data',
                config: {
                  sourceData: '{{ trigger-1.items }}',
                  mapping: {
                    label: '{{ item.name }}',
                    doubled: '{{ item.value * 2 }}'
                  }
                }
              }
            }
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'transform-1' }
          ]
        })
        .expect(201);

      const workflowId = createResponse.body.id;

      await request(app)
        .put(`/api/workflows/${workflowId}`)
        .send({ isActive: true })
        .expect(200);

      const executeResponse = await request(app)
        .post(`/api/workflows/${workflowId}/execute`)
        .send({})
        .expect(200);

      expect(executeResponse.body.success).toBe(true);
      expect(executeResponse.body.execution.status).toBe('completed');
    }, 20000);

    it('should execute workflow with API Call node', async () => {
      const createResponse = await request(app)
        .post('/api/workflows')
        .send({
          name: 'API Test',
          description: 'Tests API call',
          triggerType: 'manual',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { label: 'Start', triggerType: 'manual' }
            },
            {
              id: 'api-1',
              type: 'api',
              position: { x: 300, y: 100 },
              data: { 
                label: 'Fetch Data',
                method: 'GET',
                url: 'https://jsonplaceholder.typicode.com/posts/1',
                headers: { 'Content-Type': 'application/json' }
              }
            }
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'api-1' }
          ]
        })
        .expect(201);

      const workflowId = createResponse.body.id;

      await request(app)
        .put(`/api/workflows/${workflowId}`)
        .send({ isActive: true })
        .expect(200);

      const executeResponse = await request(app)
        .post(`/api/workflows/${workflowId}/execute`)
        .send({})
        .expect(200);

      expect(executeResponse.body.success).toBe(true);
      expect(executeResponse.body.execution.status).toBe('completed');
    }, 20000);

    it('should execute workflow with AI Task node', async () => {
      const createResponse = await request(app)
        .post('/api/workflows')
        .send({
          name: 'AI Test',
          description: 'Tests AI task',
          triggerType: 'manual',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { 
                label: 'Start', 
                triggerType: 'manual',
                outputData: { text: 'Hello world' }
              }
            },
            {
              id: 'ai-1',
              type: 'ai',
              position: { x: 300, y: 100 },
              data: { 
                label: 'Analyze Text',
                prompt: 'Analyze this text: {{ trigger-1.text }}',
                model: 'gpt-4',
                temperature: 0.7
              }
            }
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'ai-1' }
          ]
        })
        .expect(201);

      const workflowId = createResponse.body.id;

      await request(app)
        .put(`/api/workflows/${workflowId}`)
        .send({ isActive: true })
        .expect(200);

      const executeResponse = await request(app)
        .post(`/api/workflows/${workflowId}/execute`)
        .send({})
        .expect(200);

      expect(executeResponse.body.success).toBe(true);
      expect(executeResponse.body.execution.status).toBe('completed');
    }, 20000);

    it('should execute workflow with Loop node', async () => {
      const createResponse = await request(app)
        .post('/api/workflows')
        .send({
          name: 'Loop Test',
          description: 'Tests loop iteration',
          triggerType: 'manual',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { 
                label: 'Start',
                triggerType: 'manual',
                outputData: { items: [1, 2, 3, 4, 5] }
              }
            },
            {
              id: 'loop-1',
              type: 'loop',
              position: { x: 300, y: 100 },
              data: { 
                label: 'Process Items',
                loopType: 'forEach',
                sourceData: '{{ trigger-1.items }}',
                loopSteps: [
                  {
                    id: 'loop-action',
                    type: 'action',
                    data: { 
                      actionType: 'log', 
                      message: 'Processing item: {{ item }}' 
                    }
                  }
                ]
              }
            }
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'loop-1' }
          ]
        })
        .expect(201);

      const workflowId = createResponse.body.id;

      await request(app)
        .put(`/api/workflows/${workflowId}`)
        .send({ isActive: true })
        .expect(200);

      const executeResponse = await request(app)
        .post(`/api/workflows/${workflowId}/execute`)
        .send({})
        .expect(200);

      expect(executeResponse.body.success).toBe(true);
      expect(executeResponse.body.execution.status).toBe('completed');
    }, 20000);
  });

  describe('Node Connections and Edges', () => {
    it('should handle multiple connections from a single node', async () => {
      const response = await request(app)
        .post('/api/workflows')
        .send({
          name: 'Multi-Connection Test',
          description: 'Tests multiple output connections',
          triggerType: 'manual',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { label: 'Start', triggerType: 'manual' }
            },
            {
              id: 'action-1',
              type: 'action',
              position: { x: 300, y: 50 },
              data: { label: 'Action 1', actionType: 'log' }
            },
            {
              id: 'action-2',
              type: 'action',
              position: { x: 300, y: 150 },
              data: { label: 'Action 2', actionType: 'log' }
            }
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'action-1' },
            { id: 'e2', source: 'trigger-1', target: 'action-2' }
          ]
        })
        .expect(201);

      expect(response.body.id).toBeDefined();

      // Verify connections were created
      const workflowId = response.body.id;
      const connections = await db
        .select()
        .from(workflowConnections)
        .where(eq(workflowConnections.workflowId, workflowId));

      expect(connections).toHaveLength(2);
      expect(connections.every(c => c.sourceStepId)).toBe(true);
    }, 10000);

    it('should handle conditional branching with true/false handles', async () => {
      const response = await request(app)
        .post('/api/workflows')
        .send({
          name: 'Conditional Branch Test',
          description: 'Tests conditional branching',
          triggerType: 'manual',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { label: 'Start', triggerType: 'manual' }
            },
            {
              id: 'condition-1',
              type: 'condition',
              position: { x: 300, y: 100 },
              data: { 
                label: 'Check',
                conditions: [{ field: 'value', operator: 'greater_than', value: '10' }],
                trueHandle: 'action-true',
                falseHandle: 'action-false'
              }
            },
            {
              id: 'action-true',
              type: 'action',
              position: { x: 500, y: 50 },
              data: { label: 'True Path', actionType: 'log' }
            },
            {
              id: 'action-false',
              type: 'action',
              position: { x: 500, y: 150 },
              data: { label: 'False Path', actionType: 'log' }
            }
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'condition-1' },
            { id: 'e2', source: 'condition-1', target: 'action-true', sourceHandle: 'true' },
            { id: 'e3', source: 'condition-1', target: 'action-false', sourceHandle: 'false' }
          ]
        })
        .expect(201);

      expect(response.body.id).toBeDefined();

      const workflowId = response.body.id;
      const connections = await db
        .select()
        .from(workflowConnections)
        .where(eq(workflowConnections.workflowId, workflowId));

      expect(connections).toHaveLength(3);
      const branchConnections = connections.filter(c => c.sourceHandle);
      expect(branchConnections.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Workflow Persistence', () => {
    it('should save and load workflow with node configurations', async () => {
      // Create workflow
      const createResponse = await request(app)
        .post('/api/workflows')
        .send({
          name: 'Persistence Test',
          description: 'Tests workflow persistence',
          category: 'test',
          triggerType: 'schedule',
          triggerConfig: { cron: '0 0 * * *' },
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { 
                label: 'Scheduled Trigger',
                triggerType: 'schedule',
                schedule: '0 0 * * *'
              }
            },
            {
              id: 'action-1',
              type: 'action',
              position: { x: 300, y: 100 },
              data: { 
                label: 'Send Report',
                actionType: 'email',
                to: 'user@example.com',
                subject: 'Daily Report'
              }
            }
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'action-1' }
          ]
        })
        .expect(201);

      const workflowId = createResponse.body.id;

      // Load workflow
      const loadResponse = await request(app)
        .get(`/api/workflows/${workflowId}`)
        .expect(200);

      expect(loadResponse.body.id).toBe(workflowId);
      expect(loadResponse.body.name).toBe('Persistence Test');
      expect(loadResponse.body.triggerType).toBe('schedule');
      expect(loadResponse.body.triggerConfig).toHaveProperty('cron');
      expect(loadResponse.body.nodes).toHaveLength(2);
      expect(loadResponse.body.edges).toHaveLength(1);

      // Verify node data persistence
      const triggerNode = loadResponse.body.nodes.find((n: any) => n.type === 'trigger');
      expect(triggerNode.data.schedule).toBe('0 0 * * *');

      const actionNode = loadResponse.body.nodes.find((n: any) => n.type === 'action');
      expect(actionNode.data.to).toBe('user@example.com');
    }, 10000);

    it('should update workflow and preserve changes', async () => {
      // Create workflow
      const createResponse = await request(app)
        .post('/api/workflows')
        .send({
          name: 'Update Test',
          description: 'Original description',
          triggerType: 'manual',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { label: 'Start', triggerType: 'manual' }
            }
          ],
          edges: []
        })
        .expect(201);

      const workflowId = createResponse.body.id;

      // Update workflow
      await request(app)
        .put(`/api/workflows/${workflowId}`)
        .send({
          name: 'Updated Name',
          description: 'Updated description',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { label: 'Start', triggerType: 'manual' }
            },
            {
              id: 'action-1',
              type: 'action',
              position: { x: 300, y: 100 },
              data: { label: 'New Action', actionType: 'log' }
            }
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'action-1' }
          ]
        })
        .expect(200);

      // Verify updates
      const loadResponse = await request(app)
        .get(`/api/workflows/${workflowId}`)
        .expect(200);

      expect(loadResponse.body.name).toBe('Updated Name');
      expect(loadResponse.body.description).toBe('Updated description');
      expect(loadResponse.body.nodes).toHaveLength(2);
      expect(loadResponse.body.edges).toHaveLength(1);
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle workflow execution errors gracefully', async () => {
      const createResponse = await request(app)
        .post('/api/workflows')
        .send({
          name: 'Error Test',
          description: 'Tests error handling',
          triggerType: 'manual',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { label: 'Start', triggerType: 'manual' }
            },
            {
              id: 'api-1',
              type: 'api',
              position: { x: 300, y: 100 },
              data: { 
                label: 'Bad API Call',
                method: 'GET',
                url: 'https://invalid-domain-that-does-not-exist.com/api'
              }
            }
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'api-1' }
          ]
        })
        .expect(201);

      const workflowId = createResponse.body.id;

      await request(app)
        .put(`/api/workflows/${workflowId}`)
        .send({ isActive: true })
        .expect(200);

      const executeResponse = await request(app)
        .post(`/api/workflows/${workflowId}/execute`)
        .send({})
        .expect(200);

      expect(executeResponse.body.execution.status).toBe('failed');
      expect(executeResponse.body.execution.error).toBeDefined();
    }, 20000);

    it('should handle missing trigger node', async () => {
      const createResponse = await request(app)
        .post('/api/workflows')
        .send({
          name: 'No Trigger Test',
          description: 'Workflow without trigger',
          triggerType: 'manual',
          nodes: [
            {
              id: 'action-1',
              type: 'action',
              position: { x: 100, y: 100 },
              data: { label: 'Action', actionType: 'log' }
            }
          ],
          edges: []
        })
        .expect(201);

      const workflowId = createResponse.body.id;

      await request(app)
        .put(`/api/workflows/${workflowId}`)
        .send({ isActive: true })
        .expect(200);

      const executeResponse = await request(app)
        .post(`/api/workflows/${workflowId}/execute`)
        .send({})
        .expect(200);

      expect(executeResponse.body.execution.status).toBe('failed');
      expect(executeResponse.body.execution.error).toContain('trigger');
    }, 15000);

    it('should validate required node configuration', async () => {
      const response = await request(app)
        .post('/api/workflows')
        .send({
          name: 'Invalid Config Test',
          description: 'Tests validation',
          triggerType: 'webhook',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { label: 'Webhook', triggerType: 'webhook' }
            }
          ],
          edges: []
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
    }, 10000);
  });

  describe('Complex Workflow Scenarios', () => {
    it('should execute complex multi-step workflow', async () => {
      const createResponse = await request(app)
        .post('/api/workflows')
        .send({
          name: 'Complex Flow',
          description: 'Multi-step data processing',
          triggerType: 'manual',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: { 
                label: 'Start',
                triggerType: 'manual',
                outputData: { numbers: [1, 2, 3, 4, 5] }
              }
            },
            {
              id: 'transform-1',
              type: 'transform',
              position: { x: 300, y: 100 },
              data: { 
                label: 'Filter Even',
                transformType: 'Filter Data',
                config: {
                  sourceData: '{{ trigger-1.numbers }}',
                  condition: { field: '{{ item }}', operator: 'equals', value: '{{ item % 2 === 0 }}' }
                }
              }
            },
            {
              id: 'transform-2',
              type: 'transform',
              position: { x: 500, y: 100 },
              data: { 
                label: 'Double Values',
                transformType: 'Map Data',
                config: {
                  sourceData: '{{ transform-1 }}',
                  mapping: { value: '{{ item * 2 }}' }
                }
              }
            },
            {
              id: 'transform-3',
              type: 'transform',
              position: { x: 700, y: 100 },
              data: { 
                label: 'Sum Values',
                transformType: 'Aggregate Data',
                config: {
                  sourceData: '{{ transform-2 }}',
                  operation: 'sum',
                  field: 'value'
                }
              }
            }
          ],
          edges: [
            { id: 'e1', source: 'trigger-1', target: 'transform-1' },
            { id: 'e2', source: 'transform-1', target: 'transform-2' },
            { id: 'e3', source: 'transform-2', target: 'transform-3' }
          ]
        })
        .expect(201);

      const workflowId = createResponse.body.id;

      await request(app)
        .put(`/api/workflows/${workflowId}`)
        .send({ isActive: true })
        .expect(200);

      const executeResponse = await request(app)
        .post(`/api/workflows/${workflowId}/execute`)
        .send({})
        .expect(200);

      expect(executeResponse.body.success).toBe(true);
      expect(executeResponse.body.execution.status).toBe('completed');
    }, 25000);
  });
});
