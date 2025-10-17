import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { toolBuilderService } from '../tool-builder-service';
import { storage } from '../storage';
import express from 'express';
import request from 'supertest';
import { registerRoutes } from '../routes';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Mock user ID for testing (must be valid UUID format)
const TEST_USER_ID = '00000000-0000-0000-0000-000000000123';

describe('Tool Builder Integration', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Create test user in database
    try {
      await db.insert(users).values({
        name: 'test-user',
        email: 'test@example.com',
        passwordHash: 'hashed-password-for-testing'
      }).onConflictDoNothing();
    } catch (error) {
      // User might already exist, that's okay
      console.log('Test user setup:', error);
    }
    
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req: any, res, next) => {
      req.user = { id: TEST_USER_ID };
      req.isAuthenticated = () => true as any;
      next();
    });
    
    registerRoutes(app as any);
  });
  
  afterAll(async () => {
    // Clean up test user and their data
    try {
      // Note: In a real test, you'd also clean up associated data
      // For now, we'll leave it as the tests create minimal data
    } catch (error) {
      console.log('Test cleanup:', error);
    }
  });

  it('should create and execute a working doubling calculator', async () => {
    // Step 1: Create a draft with doubling logic
    const draft = await toolBuilderService.createDraft(
      TEST_USER_ID,
      'Integration Test Calculator',
      'calculator'
    );
    
    // Step 2: Update the draft with the tool configuration
    const updatedDraft = await toolBuilderService.updateDraft(draft.id, TEST_USER_ID, {
      description: 'Doubles your input number',
      inputConfig: [{
        id: 'inputNumber',
        type: 'number',
        label: 'Number to Double',
        required: true
      }],
      logicConfig: [{
        id: 'double-calculation',
        type: 'calculation',
        config: {
          calculation: {
            formula: 'inputNumber * 2',
            variables: [{ name: 'inputNumber', fieldId: 'inputNumber' }]
          }
        }
      }],
      outputConfig: { 
        type: 'single_value', 
        config: { sourceStepId: 'double-calculation' } 
      } as any
    });
    
    const draftId = updatedDraft.id;

    expect(draftId).toBeDefined();

    // Step 2: Test the draft logic
    const testResult = await toolBuilderService.testDraft(draftId, TEST_USER_ID, { inputNumber: 10 });
    expect(testResult).toBeDefined();
    console.log('Test result:', testResult);

    // Step 3: Publish the draft
    const publishedToolId = await toolBuilderService.publishDraft(draftId, TEST_USER_ID);
    expect(publishedToolId).toBeDefined();
    console.log('Published tool ID:', publishedToolId);

    // Step 4: Verify the published tool can be fetched
    const publishedTool = await storage.getFxn(publishedToolId as any);
    expect(publishedTool).toBeDefined();
    expect(publishedTool.codeKind).toBe('config');
    expect(publishedTool.inputSchema).toBeDefined();
    console.log('Published tool codeRef:', publishedTool.codeRef.substring(0, 200) + '...');
    console.log('Published tool inputSchema:', publishedTool.inputSchema);

    // Step 5: Execute the published tool via API
    const response = await request(app)
      .post(`/api/tools/${publishedToolId}/run`)
      .send({ inputNumber: 15 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.outputs).toBeDefined();
    console.log('API execution result:', response.body.outputs);
    
    // Verify the calculation actually worked (15 * 2 = 30)
    expect(response.body.outputs.result).toBe(30);
  }, 30000);

  it('should handle different field types correctly', async () => {
    // Create a multi-field tool to test field type conversion
    const draft = await toolBuilderService.createDraft(
      TEST_USER_ID,
      'Field Type Test Tool',
      'utility'
    );
    
    const updatedDraft = await toolBuilderService.updateDraft(draft.id, TEST_USER_ID, {
      description: 'Tests various field types',
      inputConfig: [
        { id: 'textField', type: 'text', label: 'Text Input', required: true },
        { id: 'numberField', type: 'number', label: 'Number Input', required: true },
        { id: 'checkboxField', type: 'checkbox', label: 'Checkbox Input', required: false }
      ],
      logicConfig: [{
        id: 'combine-fields',
        type: 'calculation',
        config: {
          calculation: {
            formula: 'numberField + (checkboxField ? 1 : 0)',
            variables: [
              { name: 'numberField', fieldId: 'numberField' },
              { name: 'checkboxField', fieldId: 'checkboxField' }
            ]
          }
        }
      }],
      outputConfig: { 
        type: 'single_value', 
        config: { sourceStepId: 'combine-fields' } 
      } as any
    });
    
    const draftId = updatedDraft.id;

    const publishedToolId = await toolBuilderService.publishDraft(draftId, TEST_USER_ID);
    
    // Test with different input types
    const response = await request(app)
      .post(`/api/tools/${publishedToolId}/run`)
      .send({ 
        textField: 'hello', 
        numberField: 5, 
        checkboxField: true 
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    // 5 + 1 (checkbox true) = 6
    expect(response.body.outputs.result).toBe(6);
  }, 30000);
});