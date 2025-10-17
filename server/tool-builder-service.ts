// Visual Tool Builder Service - Core engine for creating tools without code
import { db } from './db';
import { toolDrafts, toolTemplates, toolUsageStats, fxns } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { ToolDraft, ToolTemplate, InsertToolDraft } from '../shared/schema';
import { z } from 'zod';
import { TOOL_TEMPLATES } from '../shared/tool-templates';
import OpenAI from 'openai';
import { scanCodeForSafety } from './security/code-safety-scanner';

// Visual Form Field Types - Building blocks for user-friendly forms
export interface FormField {
  id: string;
  type: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'file' | 'range' | 'url';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    customMessage?: string;
  };
  options?: Array<{ label: string; value: string }>; // For select/radio
  defaultValue?: any;
  helpText?: string;
  conditional?: {
    fieldId: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  };
}

// Visual Logic Building Blocks
export interface LogicStep {
  id: string;
  type: 'calculation' | 'condition' | 'transform' | 'lookup' | 'api_call' | 'ai_analysis' | 'custom' | 'switch';
  title: string;
  config: {
    calculation?: {
      formula: string; // User-friendly formula builder
      variables: Array<{ name: string; fieldId: string }>;
    };
    condition?: {
      if: { fieldId: string; operator: string; value: any };
      then: LogicStep[];
      elseIf?: Array<{
        condition: { fieldId: string; operator: string; value: any };
        then: LogicStep[];
      }>;
      else?: LogicStep[];
    };
    switch?: {
      fieldId: string;
      cases: Array<{
        value: string;
        then: LogicStep[];
      }>;
      default?: LogicStep[];
    };
    custom?: {
      code: string; // Custom JavaScript code
    };
    transform?: {
      inputFieldId: string;
      transformType: 'uppercase' | 'lowercase' | 'trim' | 'format_currency' | 'format_date' | 'extract_domain';
      options?: Record<string, any>;
    };
    apiCall?: {
      method: 'GET' | 'POST';
      url: string;
      headers?: Record<string, string>;
      body?: Record<string, any>;
    };
    aiAnalysis?: {
      prompt: string;
      inputFields: string[];
      outputFormat: 'text' | 'json' | 'markdown';
    };
  };
  position: { x: number; y: number }; // For visual flowchart
  connections: Array<{ fromStep: string; toStep: string; label?: string }>;
}

// Output Configuration
export interface OutputConfig {
  format: 'text' | 'json' | 'table' | 'chart' | 'pdf' | 'email';
  template?: string;
  styling?: {
    theme: 'default' | 'minimal' | 'professional' | 'colorful';
    colors?: { primary: string; secondary: string; accent: string };
  };
  sections: Array<{
    type: 'result' | 'summary' | 'details' | 'actions';
    title: string;
    content: string; // Template with variables
    visible: boolean;
  }>;
}

class ToolBuilderService {
  // Create draft from published tool for editing
  async createDraftFromPublished(fxnId: string, userId: string): Promise<ToolDraft> {
    try {
      // Load the published tool
      const publishedTool = await db
        .select()
        .from(fxns)
        .where(and(eq(fxns.id, fxnId), eq(fxns.createdBy, userId)))
        .limit(1);

      if (publishedTool.length === 0) {
        throw new Error('Published tool not found or access denied');
      }

      const tool = publishedTool[0];

      // Only support config-based tools created with visual builder
      if (tool.codeKind !== 'config') {
        throw new Error('This tool type is not supported for editing');
      }

      // Parse the tool configuration
      let inputConfig: any[] = [];
      let logicConfig: any[] = [];
      let outputConfig: any = {
        format: 'text',
        sections: [{
          type: 'result',
          title: 'Result',
          content: 'Your result will appear here...',
          visible: true
        }]
      };

      try {
        // Parse input schema to form fields
        if (tool.inputSchema && Object.keys(tool.inputSchema).length > 0) {
          inputConfig = this.parseInputSchemaToFormFields(tool.inputSchema);
        } else {
          // If no input schema, create a generic number field for calculation tools
          inputConfig = [{
            id: 'number',
            type: 'number',
            label: 'Number to Calculate',
            required: true,
            placeholder: 'Enter a number'
          }];
        }

        // Parse code configuration to logic steps
        if (tool.codeRef) {
          // Check if codeRef is JSON or JavaScript code
          if (tool.codeRef.trim().startsWith('{') || tool.codeRef.trim().startsWith('[')) {
            // It's JSON - parse it
            const configData = JSON.parse(tool.codeRef);
            if (configData.logicConfig) {
              logicConfig = configData.logicConfig;
            }
            if (configData.outputConfig) {
              outputConfig = configData.outputConfig;
            }
          } else {
            // It's JavaScript code - convert to proper calculation step
            if (tool.codeRef.includes('* 2')) {
              // Convert doubling operation to calculation step
              logicConfig = [{
                id: 'calculation-step',
                type: 'calculation',
                name: 'Double the Number',
                config: {
                  calculation: {
                    formula: 'number * 2',
                    variables: [{
                      name: 'number',
                      fieldId: 'number'
                    }]
                  }
                }
              }];
              
              // Set output to use the calculation result
              outputConfig = {
                format: 'text',
                sections: [{
                  id: 'result-section',
                  type: 'result',
                  title: 'Result',
                  content: '{{ calculation-step }}',
                  sourceStepId: 'calculation-step',
                  visible: true
                }]
              };
            } else {
              // Fallback to calculation step with conversion note
              logicConfig = [{
                id: 'converted-tool',
                type: 'calculation',
                name: 'Converted Tool (Needs Configuration)',
                config: {
                  calculation: {
                    formula: '0',
                    variables: []
                  }
                }
              }];
            }
          }
        }
      } catch (parseError) {
        console.warn('Error parsing tool configuration:', parseError);
        // Continue with empty configs if parsing fails
      }

      // Create a new draft based on the published tool
      const draftData: any = {
        userId,
        name: `${tool.title} (Edit)`,
        description: tool.description || '',
        category: tool.category,
        status: 'draft',
        inputConfig,
        logicConfig,
        outputConfig,
        templateId: null
      };

      const result = await db
        .insert(toolDrafts)
        .values(draftData)
        .returning();

      console.log(`✨ Created draft from published tool: ${tool.title} for user ${userId}`);
      return result[0];
    } catch (error) {
      console.error('Error creating draft from published tool:', error);
      throw error;
    }
  }

  // Helper method to convert input schema to form fields
  private parseInputSchemaToFormFields(schema: any): any[] {
    if (!schema) return [];

    const fields: any[] = [];
    
    // Handle both JSON Schema format and our flat format
    const properties = schema.properties || schema;
    
    for (const [fieldName, fieldDef] of Object.entries(properties)) {
      const def = fieldDef as any;
      const field: any = {
        id: fieldName,
        label: def.label || def.title || fieldName,
        required: def.required || schema.required?.includes(fieldName) || false,
        type: 'text' // default
      };

      // Map field types to form field types
      switch (def.type) {
        case 'string':
          field.type = 'text';
          if (def.format === 'email') field.type = 'email';
          break;
        case 'number':
        case 'integer':
          field.type = 'number';
          if (def.minimum !== undefined) field.min = def.minimum;
          if (def.maximum !== undefined) field.max = def.maximum;
          break;
        case 'boolean':
          field.type = 'checkbox';
          break;
        case 'textarea':
          field.type = 'textarea';
          break;
        case 'select':
          field.type = 'select';
          if (def.options) field.options = def.options;
          break;
      }

      if (def.description) field.placeholder = def.description;
      if (def.placeholder) field.placeholder = def.placeholder;
      if (def.default !== undefined) field.defaultValue = def.default;

      fields.push(field);
    }

    return fields;
  }

  // Create new tool draft
  async createDraft(userId: string, name: string, category: string = 'custom', templateId?: string): Promise<ToolDraft> {
    try {
      let inputConfig: FormField[] = [];
      let logicConfig: LogicStep[] = [];
      let outputConfig: OutputConfig = {
        format: 'text',
        sections: [{
          type: 'result',
          title: 'Result',
          content: 'Your result will appear here...',
          visible: true
        }]
      };
      let description = '';

      // If starting from template, copy configuration
      if (templateId) {
        // First check in TOOL_TEMPLATES constant (shared/tool-templates.ts)
        const constantTemplate = TOOL_TEMPLATES.find(t => t.id === templateId);
        
        if (constantTemplate) {
          inputConfig = constantTemplate.inputConfig as any as FormField[];
          logicConfig = constantTemplate.logicConfig as any as LogicStep[];
          outputConfig = constantTemplate.outputConfig as OutputConfig;
          description = constantTemplate.description;
        } else {
          // Fallback to database templates
          const template = await db
            .select()
            .from(toolTemplates)
            .where(eq(toolTemplates.id, templateId))
            .limit(1);
          
          if (template.length > 0) {
            inputConfig = template[0].inputConfig as FormField[];
            logicConfig = template[0].logicConfig as LogicStep[];
            outputConfig = template[0].outputConfig as OutputConfig;
            description = template[0].description || '';
          }
        }
      }

      const draft: InsertToolDraft = {
        userId,
        name,
        description,
        category,
        status: 'draft',
        inputConfig: inputConfig,
        logicConfig: logicConfig,
        outputConfig: outputConfig,
        templateId: templateId || null,
      };

      const result = await db
        .insert(toolDrafts)
        .values(draft)
        .returning();

      console.log(`✨ Created new tool draft: ${name} for user ${userId}`);
      return result[0];
    } catch (error: any) {
      console.error('Error creating tool draft:', error);
      throw error;
    }
  }

  // Update tool draft configuration
  async updateDraft(draftId: string, userId: string, updates: Partial<ToolDraft>): Promise<ToolDraft> {
    try {
      const result = await db
        .update(toolDrafts)
        .set({ 
          ...updates,
          updatedAt: new Date()
        })
        .where(and(
          eq(toolDrafts.id, draftId),
          eq(toolDrafts.userId, userId),
          sql`${toolDrafts.deletedAt} IS NULL` // SECURITY: Exclude soft-deleted
        ))
        .returning();

      if (result.length === 0) {
        throw new Error('Draft not found or access denied');
      }

      console.log(`📝 Updated tool draft: ${draftId}`);
      return result[0];
    } catch (error) {
      console.error('Error updating tool draft:', error);
      throw error;
    }
  }

  // Get user's drafts (exclude soft-deleted)
  async getUserDrafts(userId: string, status?: string): Promise<ToolDraft[]> {
    try {
      const whereConditions = [
        eq(toolDrafts.userId, userId),
        sql`${toolDrafts.deletedAt} IS NULL` // Exclude soft-deleted
      ];
      if (status) {
        whereConditions.push(eq(toolDrafts.status, status));
      }

      const drafts = await db
        .select()
        .from(toolDrafts)
        .where(and(...whereConditions))
        .orderBy(sql`${toolDrafts.updatedAt} DESC`);

      return drafts;
    } catch (error) {
      console.error('Error fetching user drafts:', error);
      throw error;
    }
  }

  // Get specific draft by ID and userId (ADDED: Direct query for efficiency)
  async getDraftById(draftId: string, userId: string): Promise<ToolDraft | null> {
    try {
      const drafts = await db
        .select()
        .from(toolDrafts)
        .where(and(
          eq(toolDrafts.id, draftId),
          eq(toolDrafts.userId, userId),
          sql`${toolDrafts.deletedAt} IS NULL`
        ))
        .limit(1);

      return drafts.length > 0 ? drafts[0] : null;
    } catch (error) {
      console.error('Error fetching draft by ID:', error);
      throw error;
    }
  }

  // Test tool draft execution
  async testDraft(draftId: string, userId: string, testData: Record<string, any>): Promise<any> {
    try {
      const draft = await db
        .select()
        .from(toolDrafts)
        .where(and(
          eq(toolDrafts.id, draftId),
          eq(toolDrafts.userId, userId),
          sql`${toolDrafts.deletedAt} IS NULL` // SECURITY: Exclude soft-deleted
        ))
        .limit(1);

      if (draft.length === 0) {
        throw new Error('Draft not found or access denied');
      }

      // Execute the draft logic with test data
      const result = await this.executeToolLogic(
        draft[0].inputConfig as FormField[],
        draft[0].logicConfig as LogicStep[],
        draft[0].outputConfig as OutputConfig,
        testData
      );

      // Store test results (SECURITY: Include userId in WHERE clause)
      const testResults = {
        timestamp: new Date().toISOString(),
        input: testData,
        output: result,
        success: true
      };

      await db
        .update(toolDrafts)
        .set({
          testResults: testResults,
          updatedAt: new Date()
        })
        .where(and(
          eq(toolDrafts.id, draftId),
          eq(toolDrafts.userId, userId)
        ));

      console.log(`🧪 Successfully tested draft: ${draftId}`);
      return result;
    } catch (error) {
      console.error('Error testing draft:', error);
      
      // Store failed test results (SECURITY: Include userId in WHERE clause)
      const testResults = {
        timestamp: new Date().toISOString(),
        input: testData,
        output: null,
        success: false,
        error: (error as any).message || 'Unknown error'
      };

      await db
        .update(toolDrafts)
        .set({
          testResults: testResults,
          updatedAt: new Date()
        })
        .where(and(
          eq(toolDrafts.id, draftId),
          eq(toolDrafts.userId, userId)
        ));

      throw error;
    }
  }

  // Publish draft as live tool
  async publishDraft(draftId: string, userId: string): Promise<string> {
    try {
      const draft = await db
        .select()
        .from(toolDrafts)
        .where(and(
          eq(toolDrafts.id, draftId),
          eq(toolDrafts.userId, userId),
          sql`${toolDrafts.deletedAt} IS NULL`
        ))
        .limit(1);

      if (draft.length === 0) {
        throw new Error('Draft not found or access denied');
      }

      const draftData = draft[0];

      // CRITICAL FIX: Comprehensive server-side validation before publishing
      const inputConfig = draftData.inputConfig as FormField[];
      const logicConfig = draftData.logicConfig as LogicStep[];
      
      // Validate tool metadata
      if (!draftData.name || draftData.name.trim().length === 0) {
        const error = new Error('Tool name is required') as any;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }
      
      if (!draftData.description || draftData.description.trim().length === 0) {
        const error = new Error('Tool description is required') as any;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }
      
      if (!draftData.category || draftData.category.trim().length === 0) {
        const error = new Error('Tool category is required') as any;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }
      
      // Validate input configuration
      if (!inputConfig || inputConfig.length === 0) {
        const error = new Error('Cannot publish tool without input fields. Please add at least one input field.') as any;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }
      
      // Validate each input field
      for (const field of inputConfig) {
        if (!field.label || field.label.trim().length === 0) {
          const error = new Error(`Input field "${field.id}" must have a label`) as any;
          error.code = 'VALIDATION_ERROR';
          throw error;
        }
      }
      
      // Validate logic configuration
      if (!logicConfig || logicConfig.length === 0) {
        const error = new Error('Cannot publish tool without logic steps. Please add at least one logic step.') as any;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }
      
      // Validate each logic step with detailed error messages
      for (const step of logicConfig) {
        const stepLabel = step.title || step.id;
        
        if (step.type === 'calculation') {
          if (!step.config.calculation?.formula || step.config.calculation.formula.trim().length === 0) {
            const error = new Error(`Calculation step "${stepLabel}" is missing a formula. Please add a valid calculation formula.`) as any;
            error.code = 'VALIDATION_ERROR';
            throw error;
          }
          if (!step.config.calculation.variables || step.config.calculation.variables.length === 0) {
            const error = new Error(`Calculation step "${stepLabel}" has no variables defined. Add at least one variable to use in your formula.`) as any;
            error.code = 'VALIDATION_ERROR';
            throw error;
          }
        }
        
        if (step.type === 'api_call') {
          if (!step.config.apiCall?.url || step.config.apiCall.url.trim().length === 0) {
            const error = new Error(`API Call step "${stepLabel}" is missing a URL. Please specify the API endpoint to call.`) as any;
            error.code = 'VALIDATION_ERROR';
            throw error;
          }
          if (!step.config.apiCall?.method) {
            const error = new Error(`API Call step "${stepLabel}" is missing an HTTP method (GET, POST, etc.). Please select a method.`) as any;
            error.code = 'VALIDATION_ERROR';
            throw error;
          }
        }
        
        if (step.type === 'ai_analysis') {
          if (!step.config.aiAnalysis?.prompt || step.config.aiAnalysis.prompt.trim().length === 0) {
            const error = new Error(`AI Analysis step "${stepLabel}" is missing a prompt. Please provide instructions for the AI.`) as any;
            error.code = 'VALIDATION_ERROR';
            throw error;
          }
          if (!step.config.aiAnalysis?.inputFields || step.config.aiAnalysis.inputFields.length === 0) {
            const error = new Error(`AI Analysis step "${stepLabel}" has no input fields selected. Choose which fields the AI should analyze.`) as any;
            error.code = 'VALIDATION_ERROR';
            throw error;
          }
        }
        
        if (step.type === 'transform') {
          if (!step.config.transform?.inputFieldId) {
            const error = new Error(`Transform step "${stepLabel}" has no input field selected. Choose a field to transform.`) as any;
            error.code = 'VALIDATION_ERROR';
            throw error;
          }
          if (!step.config.transform?.transformType || step.config.transform.transformType.trim().length === 0) {
            const error = new Error(`Transform step "${stepLabel}" has no transformation type selected. Choose what type of transformation to apply (uppercase, lowercase, etc.).`) as any;
            error.code = 'VALIDATION_ERROR';
            throw error;
          }
        }
        
        if (step.type === 'condition') {
          if (!step.config.condition?.if?.fieldId) {
            const error = new Error(`Condition step "${stepLabel}" has no field selected for the condition. Choose a field to check.`) as any;
            error.code = 'VALIDATION_ERROR';
            throw error;
          }
          if (!step.config.condition?.if?.operator) {
            const error = new Error(`Condition step "${stepLabel}" has no comparison operator selected. Choose an operator (equals, greater than, etc.).`) as any;
            error.code = 'VALIDATION_ERROR';
            throw error;
          }
          if (step.config.condition?.if?.value === undefined || step.config.condition?.if?.value === null || step.config.condition?.if?.value === '') {
            const error = new Error(`Condition step "${stepLabel}" has no comparison value set. Provide a value to compare against.`) as any;
            error.code = 'VALIDATION_ERROR';
            throw error;
          }
        }
        
        if (step.type === 'lookup') {
          // Lookup validation would go here when lookup config structure is defined
          // Currently lookup steps don't have a dedicated config structure in the type definition
          console.log(`ℹ️  Lookup step "${stepLabel}" - validation skipped (config structure not defined)`);
        }
        
        if (step.type === 'custom') {
          if (!step.config.custom?.code || step.config.custom.code.trim().length === 0) {
            const error = new Error(`Custom Code step "${stepLabel}" has no code. Please add JavaScript code to execute.`) as any;
            error.code = 'VALIDATION_ERROR';
            throw error;
          }
        }
      }
      
      // Validate output configuration
      const outputConfig = draftData.outputConfig as any;
      if (!outputConfig) {
        const error = new Error('Output configuration is missing. Please configure how results should be displayed.') as any;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }
      
      // Skip section validation for single_value outputs (used in tests and simple tools)
      const isSingleValue = outputConfig.type === 'single_value';
      
      if (!isSingleValue) {
        if (!outputConfig.sections || outputConfig.sections.length === 0) {
          const error = new Error('Output must have at least one section. Add a section to display your results.') as any;
          error.code = 'VALIDATION_ERROR';
          throw error;
        }
        
        for (const section of outputConfig.sections) {
          if (!section.title || section.title.trim().length === 0) {
            const error = new Error('All output sections must have a title. Please add a title for each section.') as any;
            error.code = 'VALIDATION_ERROR';
            throw error;
          }
        }
      }
      
      console.log(`🔍 Publishing validation passed for draft: ${draftId}`);
      console.log(`📝 Input fields: ${inputConfig.length}, Logic steps: ${logicConfig.length}`);

      // Code Safety Scanner - Extract and scan all custom code
      const allViolations: string[] = [];
      let highestRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

      for (const step of logicConfig) {
        if (step.type === 'custom' && step.config.custom?.code) {
          const scanResult = scanCodeForSafety(step.config.custom.code);
          
          if (!scanResult.safe) {
            allViolations.push(...scanResult.violations);
            
            // Update highest risk level
            const riskLevels = ['low', 'medium', 'high', 'critical'];
            if (riskLevels.indexOf(scanResult.riskLevel) > riskLevels.indexOf(highestRiskLevel)) {
              highestRiskLevel = scanResult.riskLevel;
            }
          }
        }
      }

      // Determine moderation status based on risk level
      let moderationStatus = 'pending';
      let flaggedReasons: string[] | null = null;
      let moderationNotes: string | null = null;

      if (highestRiskLevel === 'high' || highestRiskLevel === 'critical') {
        moderationStatus = 'flagged';
        flaggedReasons = allViolations;
        moderationNotes = `Auto-flagged for code safety violations: ${allViolations.join(', ')}`;
        console.log(`🚨 Tool auto-flagged: ${draftData.name} - ${allViolations.length} violations`);
      } else if (allViolations.length > 0) {
        // Low or medium risk - still log but don't flag
        console.log(`⚠️  Tool has ${allViolations.length} low/medium risk violations but passed safety check: ${draftData.name}`);
        console.log(`✅ Tool passed safety check: ${draftData.name}`);
      } else {
        console.log(`✅ Tool passed safety check: ${draftData.name}`);
      }

      // Generate unique slug with collision handling
      let baseSlug = draftData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      
      let finalSlug = baseSlug;
      let counter = 1;
      
      // Check for slug uniqueness (SECURITY: Ensure slug uniqueness)
      while (counter < 100) { // Prevent infinite loops
        const existingFxn = await db
          .select()
          .from(fxns)
          .where(eq(fxns.slug, finalSlug))
          .limit(1);
          
        if (existingFxn.length === 0) break;
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      if (counter >= 100) {
        throw new Error('Unable to generate unique slug after 100 attempts');
      }

      // Generate complete JSON schema for the tool
      const generatedSchema = this.generateToolSchema(
        inputConfig,
        logicConfig,
        draftData.outputConfig as OutputConfig
      );

      // Create the live tool in fxns table (TRANSACTION: Handle slug conflicts)
      let newTool;
      let publishAttempts = 0;
      
      while (publishAttempts < 5) {
        try {
          newTool = await db
            .insert(fxns)
            .values({
              slug: finalSlug,
              title: draftData.name,
              description: draftData.description || '',
              category: draftData.category,
              inputSchema: JSON.parse(generatedSchema.inputSchema),
              outputSchema: JSON.parse(generatedSchema.outputSchema),
              codeKind: 'config' as const, // INTEGRATION: Use 'config' for visual tools
              codeRef: generatedSchema.resolver,
              builderConfig: {
                inputConfig,
                logicConfig,
                outputConfig: draftData.outputConfig
              },
              isPublic: true,
              createdBy: userId,
              moderationStatus: moderationStatus,
              flaggedReasons: flaggedReasons,
              moderationNotes: moderationNotes,
            })
            .returning();
          break; // Success, exit retry loop
        } catch (error: any) {
          // Handle unique constraint violation (race condition)
          if (error?.code === '23505' && error?.constraint?.includes('slug')) {
            publishAttempts++;
            finalSlug = `${baseSlug}-${counter + publishAttempts}`;
            console.log(`Slug conflict, retrying with: ${finalSlug}`);
            continue;
          }
          throw error; // Different error, propagate
        }
      }
      
      if (!newTool) {
        throw new Error('Failed to publish after multiple attempts due to slug conflicts');
      }

      // Update draft status (CONSISTENCY: Include userId in WHERE clause)
      await db
        .update(toolDrafts)
        .set({
          status: 'published',
          generatedSchema: generatedSchema,
          updatedAt: new Date()
        })
        .where(and(
          eq(toolDrafts.id, draftId),
          eq(toolDrafts.userId, userId)
        ));

      console.log(`🚀 Published tool: ${draftData.name} (${newTool[0].id})`);
      return newTool[0].id;
    } catch (error: any) {
      console.error('Error publishing draft:', error);
      throw error;
    }
  }

  // Execute tool logic (used for testing and live execution)
  private async executeToolLogic(
    inputConfig: FormField[],
    logicConfig: LogicStep[],
    outputConfig: OutputConfig,
    inputData: Record<string, any>
  ): Promise<any> {
    // Validate required input fields before processing
    for (const field of inputConfig) {
      if (field.required) {
        const value = inputData[field.id];
        if (value === undefined || value === null || value === '') {
          throw new Error(`VALIDATION_ERROR: Required field "${field.label}" is missing. Please provide a value.`);
        }
        
        // Type validation
        if (field.type === 'number' && isNaN(Number(value))) {
          throw new Error(`VALIDATION_ERROR: Field "${field.label}" must be a number. You provided: "${value}"`);
        }
        
        if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          throw new Error(`VALIDATION_ERROR: Field "${field.label}" must be a valid email address.`);
        }
        
        if (field.type === 'url' && value) {
          try {
            new URL(String(value));
          } catch (e) {
            throw new Error(`VALIDATION_ERROR: Field "${field.label}" must be a valid URL.`);
          }
        }
        
        // Min/max validation for numbers
        if (field.type === 'number' && field.validation) {
          const numValue = Number(value);
          if (field.validation.min !== undefined && numValue < field.validation.min) {
            throw new Error(`VALIDATION_ERROR: Field "${field.label}" must be at least ${field.validation.min}. You provided: ${numValue}`);
          }
          if (field.validation.max !== undefined && numValue > field.validation.max) {
            throw new Error(`VALIDATION_ERROR: Field "${field.label}" must be at most ${field.validation.max}. You provided: ${numValue}`);
          }
        }
      }
    }
    
    const context = { ...inputData };
    
    // Execute logic steps in sequence
    for (const step of logicConfig) {
      try {
        // SECURITY: Whitelist only safe step types
        const allowedStepTypes = ['calculation', 'condition', 'transform', 'ai_analysis', 'api_call', 'custom', 'lookup'];
        if (!allowedStepTypes.includes(step.type)) {
          console.warn(`SECURITY: Blocked unauthorized step type: ${step.type}`);
          throw new Error(`EXECUTION_ERROR: Step type '${step.type}' is not allowed for security reasons.`);
        }

        switch (step.type) {
          case 'custom':
            // Execute custom code with controlled context
            if (step.config.custom?.code) {
              try {
                // Create a function from the code with context variables
                const func = new Function(...Object.keys(context), step.config.custom.code);
                const result = func(...Object.values(context));
                context[`step_${step.id}`] = result;
              } catch (error: any) {
                console.error('Custom code execution error:', error);
                throw new Error(`CUSTOM_CODE_ERROR: Custom code execution failed in step "${step.title || step.id}". ${error.message || 'Syntax error in custom code.'}`);
              }
            }
            break;

          case 'calculation':
            const formula = step.config.calculation?.formula || '';
            const variables = step.config.calculation?.variables || [];
            
            if (!formula || formula.trim() === '') {
              throw new Error(`CALCULATION_ERROR: Calculation step "${step.title || step.id}" has no formula defined.`);
            }
            
            // Validate all required variables are present
            const missingVars = variables.filter(v => context[v.fieldId] === undefined);
            if (missingVars.length > 0) {
              const missingNames = missingVars.map(v => v.name).join(', ');
              throw new Error(`CALCULATION_ERROR: Missing required values for calculation: ${missingNames}. Please provide these inputs.`);
            }
            
            // Replace variables in formula with actual values
            let processedFormula = formula;
            variables.forEach(variable => {
              const value = context[variable.fieldId];
              
              // Type check for numbers
              if (isNaN(Number(value))) {
                throw new Error(`CALCULATION_ERROR: Variable "${variable.name}" must be a number for calculation. Current value: "${value}"`);
              }
              
              processedFormula = processedFormula.replace(
                new RegExp(`\\b${variable.name}\\b`, 'g'),
                String(value)
              );
            });
            
            // Safe evaluation
            try {
              const result = this.safeEvaluateExpression(processedFormula);
              context[`step_${step.id}`] = result;
            } catch (calcError: any) {
              throw new Error(`CALCULATION_ERROR: Failed to evaluate formula "${formula}". ${calcError.message || 'Invalid mathematical expression.'}`);
            }
            break;

          case 'transform':
            const inputFieldId = step.config.transform?.inputFieldId || '';
            const transformType = step.config.transform?.transformType || 'trim';
            
            if (!inputFieldId) {
              throw new Error(`TRANSFORM_ERROR: Transform step "${step.title || step.id}" has no input field specified.`);
            }
            
            const inputValue = context[inputFieldId];
            
            if (inputValue === undefined) {
              throw new Error(`TRANSFORM_ERROR: Input field "${inputFieldId}" not found for transform operation.`);
            }
            
            let transformed = inputValue;
            try {
              switch (transformType) {
                case 'uppercase':
                  transformed = String(inputValue).toUpperCase();
                  break;
                case 'lowercase':
                  transformed = String(inputValue).toLowerCase();
                  break;
                case 'trim':
                  transformed = String(inputValue).trim();
                  break;
                case 'format_currency':
                  const currencyValue = Number(inputValue);
                  if (isNaN(currencyValue)) {
                    throw new Error(`Value must be a number for currency formatting. Received: "${inputValue}"`);
                  }
                  transformed = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(currencyValue);
                  break;
                case 'format_date':
                  const date = new Date(inputValue);
                  if (isNaN(date.getTime())) {
                    throw new Error(`Value must be a valid date. Received: "${inputValue}"`);
                  }
                  transformed = date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                  break;
                case 'extract_domain':
                  try {
                    const url = new URL(String(inputValue));
                    transformed = url.hostname;
                  } catch (e) {
                    // Try to extract domain from email
                    const emailMatch = String(inputValue).match(/@([^@]+)$/);
                    if (emailMatch) {
                      transformed = emailMatch[1];
                    } else {
                      throw new Error(`Value must be a valid URL or email address. Received: "${inputValue}"`);
                    }
                  }
                  break;
                default:
                  transformed = String(inputValue);
              }
            } catch (transformError: any) {
              throw new Error(`TRANSFORM_ERROR: Failed to transform value in step "${step.title || step.id}". ${transformError.message}`);
            }
            
            context[`step_${step.id}`] = transformed;
            break;

          case 'condition':
            const condition = step.config.condition;
            if (condition) {
              const fieldValue = context[condition.if.fieldId];
              
              if (fieldValue === undefined) {
                throw new Error(`CONDITION_ERROR: Field "${condition.if.fieldId}" not found for condition evaluation.`);
              }
              
              let branchTaken = 'none';
              let stepsToExecute: any[] | undefined;
              
              // Evaluate main IF condition
              const mainConditionMet = this.evaluateCondition(fieldValue, condition.if.operator, condition.if.value);
              
              if (mainConditionMet) {
                branchTaken = 'then';
                stepsToExecute = condition.then;
                context[`step_${step.id}`] = { branch: 'then', conditionMet: true };
              } else {
                // Check ELSE-IF conditions
                let elseIfMatched = false;
                if (condition.elseIf && condition.elseIf.length > 0) {
                  for (let i = 0; i < condition.elseIf.length; i++) {
                    const elseIfBranch = condition.elseIf[i];
                    const elseIfFieldValue = context[elseIfBranch.condition.fieldId];
                    
                    if (elseIfFieldValue === undefined) {
                      throw new Error(`CONDITION_ERROR: Field "${elseIfBranch.condition.fieldId}" not found for else-if condition evaluation.`);
                    }
                    
                    const elseIfMet = this.evaluateCondition(
                      elseIfFieldValue, 
                      elseIfBranch.condition.operator, 
                      elseIfBranch.condition.value
                    );
                    
                    if (elseIfMet) {
                      branchTaken = `elseif_${i}`;
                      elseIfMatched = true;
                      stepsToExecute = elseIfBranch.then;
                      context[`step_${step.id}`] = { branch: `elseif_${i}`, conditionMet: true };
                      break;
                    }
                  }
                }
                
                // If no ELSE-IF matched, use ELSE
                if (!elseIfMatched) {
                  branchTaken = 'else';
                  stepsToExecute = condition.else;
                  context[`step_${step.id}`] = { branch: 'else', conditionMet: false };
                }
              }
              
              // Execute nested steps for the taken branch
              if (stepsToExecute && stepsToExecute.length > 0) {
                await this.executeNestedSteps(stepsToExecute, context, inputConfig);
              }
            }
            break;

          case 'switch':
            const switchConfig = step.config.switch;
            if (switchConfig) {
              const switchFieldValue = context[switchConfig.fieldId];
              
              if (switchFieldValue === undefined) {
                throw new Error(`SWITCH_ERROR: Field "${switchConfig.fieldId}" not found for switch evaluation.`);
              }
              
              let caseMatched = false;
              let matchedCaseIndex = -1;
              let stepsToExecute: any[] | undefined;
              
              // Check each case
              if (switchConfig.cases && switchConfig.cases.length > 0) {
                for (let i = 0; i < switchConfig.cases.length; i++) {
                  const caseItem = switchConfig.cases[i];
                  // Perform exact string comparison
                  if (String(switchFieldValue) === String(caseItem.value)) {
                    caseMatched = true;
                    matchedCaseIndex = i;
                    stepsToExecute = caseItem.then;
                    context[`step_${step.id}`] = { 
                      branch: `case_${i}`, 
                      matchedValue: caseItem.value,
                      matched: true 
                    };
                    break;
                  }
                }
              }
              
              // If no case matched, use default
              if (!caseMatched) {
                stepsToExecute = switchConfig.default;
                context[`step_${step.id}`] = { 
                  branch: 'default', 
                  matched: false,
                  actualValue: switchFieldValue
                };
              }
              
              // Execute nested steps for the matching branch
              if (stepsToExecute && stepsToExecute.length > 0) {
                await this.executeNestedSteps(stepsToExecute, context, inputConfig);
              }
            }
            break;

          case 'api_call':
            const apiConfig = step.config.apiCall;
            if (!apiConfig || !apiConfig.url) {
              throw new Error(`API_CALL_ERROR: API call step "${step.title || step.id}" is not properly configured. Missing URL.`);
            }
            
            try {
              const apiResult = await this.executeAPICall(apiConfig, context);
              context[`step_${step.id}`] = apiResult;
            } catch (apiError: any) {
              console.error('API call error:', apiError);
              // Re-throw with step context
              throw new Error(`${apiError.message || 'API call failed'} (in step: ${step.title || step.id})`);
            }
            break;

          case 'ai_analysis':
            const aiConfig = step.config.aiAnalysis;
            if (!aiConfig || !aiConfig.prompt) {
              throw new Error(`AI_ANALYSIS_ERROR: AI analysis step "${step.title || step.id}" is not properly configured. Missing prompt.`);
            }
            
            try {
              const aiResult = await this.executeAIAnalysis(aiConfig, context);
              context[`step_${step.id}`] = aiResult;
            } catch (aiError: any) {
              console.error('AI analysis error:', aiError);
              // Re-throw with step context
              throw new Error(`${aiError.message || 'AI analysis failed'} (in step: ${step.title || step.id})`);
            }
            break;

          default:
            console.log(`Step type ${step.type} not yet implemented`);
            break;
        }
      } catch (stepError: any) {
        console.error(`Error executing step ${step.id}:`, stepError);
        // Re-throw with better context if not already formatted
        if (!stepError.message?.includes('ERROR:')) {
          throw new Error(`EXECUTION_ERROR: Failed to execute step "${step.title || step.id}". ${stepError.message}`);
        }
        throw stepError;
      }
    }

    // Format output based on configuration
    return this.formatOutput(outputConfig, context);
  }

  // Execute nested steps recursively (for condition/switch branches)
  private async executeNestedSteps(
    nestedSteps: any[],
    context: Record<string, any>,
    inputConfig: FormField[]
  ): Promise<void> {
    for (const step of nestedSteps) {
      try {
        // Execute each nested step using the same logic as main steps
        switch (step.type) {
          case 'calculation':
            const calcConfig = step.config.calculation;
            if (!calcConfig || !calcConfig.formula) {
              throw new Error(`CALCULATION_ERROR: Calculation step "${step.title || step.id}" is missing formula.`);
            }

            let formula = calcConfig.formula;
            if (calcConfig.variables) {
              calcConfig.variables.forEach((variable: any) => {
                const fieldValue = context[variable.fieldId];
                if (fieldValue !== undefined) {
                  const regex = new RegExp(`\\b${variable.name}\\b`, 'g');
                  formula = formula.replace(regex, String(fieldValue));
                }
              });
            }

            const calcResult = this.safeEvaluateExpression(formula);
            context[`step_${step.id}`] = calcResult;
            break;

          case 'transform':
            const transformConfig = step.config.transform;
            if (!transformConfig || !transformConfig.inputFieldId || !transformConfig.transformType) {
              throw new Error(`TRANSFORM_ERROR: Transform step "${step.title || step.id}" is missing configuration.`);
            }

            const inputValue = context[transformConfig.inputFieldId];
            if (inputValue === undefined) {
              throw new Error(`TRANSFORM_ERROR: Input field "${transformConfig.inputFieldId}" not found.`);
            }

            let transformed: any;
            switch (transformConfig.transformType) {
              case 'uppercase':
                transformed = String(inputValue).toUpperCase();
                break;
              case 'lowercase':
                transformed = String(inputValue).toLowerCase();
                break;
              case 'trim':
                transformed = String(inputValue).trim();
                break;
              case 'format_currency':
                transformed = new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(Number(inputValue));
                break;
              case 'format_date':
                transformed = new Date(inputValue).toLocaleDateString();
                break;
              case 'extract_domain':
                try {
                  const url = new URL(String(inputValue));
                  transformed = url.hostname;
                } catch {
                  transformed = inputValue;
                }
                break;
              default:
                transformed = inputValue;
            }

            context[`step_${step.id}`] = transformed;
            break;

          case 'condition':
            const condition = step.config.condition;
            if (condition) {
              const fieldValue = context[condition.if.fieldId];
              if (fieldValue === undefined) {
                throw new Error(`CONDITION_ERROR: Field "${condition.if.fieldId}" not found.`);
              }

              let stepsToExecute: any[] | undefined;
              const mainConditionMet = this.evaluateCondition(fieldValue, condition.if.operator, condition.if.value);

              if (mainConditionMet) {
                stepsToExecute = condition.then;
                context[`step_${step.id}`] = { branch: 'then', conditionMet: true };
              } else if (condition.elseIf) {
                let elseIfMatched = false;
                for (let i = 0; i < condition.elseIf.length; i++) {
                  const elseIfBranch = condition.elseIf[i];
                  const elseIfFieldValue = context[elseIfBranch.condition.fieldId];
                  if (elseIfFieldValue === undefined) {
                    throw new Error(`CONDITION_ERROR: Field "${elseIfBranch.condition.fieldId}" not found.`);
                  }

                  const elseIfMet = this.evaluateCondition(
                    elseIfFieldValue,
                    elseIfBranch.condition.operator,
                    elseIfBranch.condition.value
                  );

                  if (elseIfMet) {
                    stepsToExecute = elseIfBranch.then;
                    elseIfMatched = true;
                    context[`step_${step.id}`] = { branch: `elseif_${i}`, conditionMet: true };
                    break;
                  }
                }

                if (!elseIfMatched) {
                  stepsToExecute = condition.else;
                  context[`step_${step.id}`] = { branch: 'else', conditionMet: false };
                }
              } else {
                stepsToExecute = condition.else;
                context[`step_${step.id}`] = { branch: 'else', conditionMet: false };
              }

              if (stepsToExecute && stepsToExecute.length > 0) {
                await this.executeNestedSteps(stepsToExecute, context, inputConfig);
              }
            }
            break;

          case 'switch':
            const switchConfig = step.config.switch;
            if (switchConfig) {
              const switchFieldValue = context[switchConfig.fieldId];
              if (switchFieldValue === undefined) {
                throw new Error(`SWITCH_ERROR: Field "${switchConfig.fieldId}" not found.`);
              }

              let stepsToExecute: any[] | undefined;
              let caseMatched = false;

              if (switchConfig.cases) {
                for (let i = 0; i < switchConfig.cases.length; i++) {
                  const caseItem = switchConfig.cases[i];
                  if (String(switchFieldValue) === String(caseItem.value)) {
                    caseMatched = true;
                    stepsToExecute = caseItem.then;
                    context[`step_${step.id}`] = {
                      branch: `case_${i}`,
                      matchedValue: caseItem.value,
                      matched: true
                    };
                    break;
                  }
                }
              }

              if (!caseMatched) {
                stepsToExecute = switchConfig.default;
                context[`step_${step.id}`] = {
                  branch: 'default',
                  matched: false,
                  actualValue: switchFieldValue
                };
              }

              if (stepsToExecute && stepsToExecute.length > 0) {
                await this.executeNestedSteps(stepsToExecute, context, inputConfig);
              }
            }
            break;

          default:
            console.log(`Nested step type ${step.type} not yet implemented`);
            break;
        }
      } catch (stepError: any) {
        console.error(`Error executing nested step ${step.id}:`, stepError);
        throw stepError;
      }
    }
  }

  // Generate complete tool schema for publishing
  private generateToolSchema(inputConfig: FormField[], logicConfig: LogicStep[], outputConfig: OutputConfig) {
    console.log(`🔧 generateToolSchema called with:`, {
      inputConfigLength: inputConfig.length,
      logicConfigLength: logicConfig.length,
      inputFields: inputConfig.map(f => ({ id: f.id, type: f.type, label: f.label })),
      logicSteps: logicConfig.map(s => ({ id: s.id, type: s.type }))
    });
    // Generate Zod input schema
    const schemaFields: Record<string, any> = {};
    inputConfig.forEach(field => {
      let fieldSchema: any;
      
      switch (field.type) {
        case 'text':
        case 'email':
        case 'url':
          fieldSchema = z.string();
          break;
        case 'number':
        case 'range':
          fieldSchema = z.number();
          break;
        case 'checkbox':
          fieldSchema = z.boolean();
          break;
        case 'date':
          fieldSchema = z.string().datetime();
          break;
        default:
          fieldSchema = z.string();
      }

      if (field.required) {
        fieldSchema = fieldSchema.min(1, `${field.label} is required`);
      } else {
        fieldSchema = fieldSchema.optional();
      }

      schemaFields[field.id] = fieldSchema;
    });

    const inputSchema = z.object(schemaFields);
    const outputSchema = z.any(); // Dynamic based on logic configuration

    // Generate resolver function code as string based on actual logic configuration
    const resolver = this.generateResolverCode(inputConfig, logicConfig, outputConfig);

    // Convert to the format expected by validateAndCoerceInputs
    const schemaForValidation: Record<string, any> = {};
    inputConfig.forEach(field => {
      let fieldType: string;
      
      // Map tool builder field types to validation types
      switch (field.type) {
        case 'number':
          fieldType = 'number';
          break;
        case 'checkbox':  // checkbox maps to boolean
          fieldType = 'boolean';
          break;
        case 'select':
        case 'radio':     // radio maps to select
          fieldType = 'select';
          break;
        case 'textarea':
          fieldType = 'textarea';
          break;
        case 'text':
        case 'email':
        case 'password':
        case 'url':
        case 'date':
        case 'file':
        default:
          fieldType = 'string';
      }
      
      const fieldSchema: any = {
        type: fieldType,
        required: field.required || false,
        label: field.label,
        placeholder: field.placeholder,
        default: field.defaultValue,  // Use 'default' not 'defaultValue' for validateAndCoerceInputs
      };
      
      // Add type-specific properties
      if (field.type === 'number' && 'min' in field) {
        fieldSchema.min = (field as any).min;
      }
      if (field.type === 'number' && 'max' in field) {
        fieldSchema.max = (field as any).max;
      }
      if (field.type === 'number' && 'step' in field) {
        fieldSchema.step = (field as any).step;
      }
      
      if ((field.type === 'select' || field.type === 'radio') && 'options' in field) {
        fieldSchema.options = ((field as any).options || []).map((opt: any) => opt.value || opt.label || opt);
      }
      
      if (field.type === 'textarea' && 'rows' in field) {
        fieldSchema.rows = (field as any).rows;
      }
      
      schemaForValidation[field.id] = fieldSchema;
    });

    return {
      inputSchema: JSON.stringify(schemaForValidation),
      outputSchema: JSON.stringify({ type: 'object' }),
      resolver
    };
  }

  // Generate the actual resolver code from the logic configuration
  private generateResolverCode(inputConfig: FormField[], logicConfig: LogicStep[], outputConfig: any): string {
    // Generate the logic execution code based on the same logic as executeToolLogic
    const logicCode = logicConfig.map(step => {
      switch (step.type) {
        case 'calculation':
          const formula = step.config.calculation?.formula || '';
          const variables = step.config.calculation?.variables || [];
          
          let processedFormula = formula;
          variables.forEach(variable => {
            processedFormula = processedFormula.replace(
              new RegExp(`\\b${variable.name}\\b`, 'g'),
              `(context["${variable.fieldId}"] || 0)`
            );
          });
          
          return `
            // Step ${step.id}: ${step.type}
            try {
              context["step_${step.id}"] = ${this.generateSafeEvaluationCode(processedFormula)};
            } catch (e) {
              context["step_${step.id}"] = { error: "Calculation error: " + e.message };
            }
          `;
          
        case 'transform':
          const inputFieldId = step.config.transform?.inputFieldId || '';
          const transformType = step.config.transform?.transformType || 'trim';
          
          let transformCode = '';
          switch (transformType) {
            case 'uppercase':
              transformCode = `String(context["${inputFieldId}"] || "").toUpperCase()`;
              break;
            case 'lowercase':
              transformCode = `String(context["${inputFieldId}"] || "").toLowerCase()`;
              break;
            case 'trim':
              transformCode = `String(context["${inputFieldId}"] || "").trim()`;
              break;
            case 'format_currency':
              transformCode = `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(context["${inputFieldId}"]) || 0)`;
              break;
            default:
              transformCode = `context["${inputFieldId}"] || ""`;
          }
          
          return `
            // Step ${step.id}: ${step.type} - ${transformType}
            context["step_${step.id}"] = ${transformCode};
          `;
          
        case 'condition':
          // For simplicity, just evaluate the condition and store the result
          const condition = step.config.condition;
          if (condition) {
            return `
              // Step ${step.id}: ${step.type}
              const fieldValue_${step.id} = context["${condition.if.fieldId}"];
              const conditionMet_${step.id} = this.evaluateCondition(fieldValue_${step.id}, "${condition.if.operator}", ${JSON.stringify(condition.if.value)});
              context["step_${step.id}"] = conditionMet_${step.id};
            `;
          }
          return `// Step ${step.id}: condition (no config)`;
        
        case 'api_call':
          // For API calls in published tools, we'll store a placeholder
          // In production, these should be handled server-side for security
          return `
            // Step ${step.id}: ${step.type}
            context["step_${step.id}"] = { error: "API calls must be executed server-side" };
          `;
        
        case 'ai_analysis':
          // For AI analysis in published tools, we'll store a placeholder
          // In production, these should be handled server-side for security  
          return `
            // Step ${step.id}: ${step.type}
            context["step_${step.id}"] = { error: "AI analysis must be executed server-side" };
          `;
          
        default:
          return `// Step ${step.id}: unsupported type ${step.type}`;
      }
    }).join('\n');

    // Generate formatted output with sections
    const sections = (outputConfig.sections || []).map((section: any) => ({
      type: section.type,
      title: section.title,
      content: section.content,
      visible: section.visible
    }));
    
    // Helper function to replace variables in template strings
    const replaceVarsCode = `
      const replaceVariables = (template, context) => {
        let result = template;
        // Replace \${variable} format
        result = result.replace(/\\\$\\{(\\w+)\\}/g, (match, variableName) => {
          return context[variableName] !== undefined ? String(context[variableName]) : match;
        });
        // Replace {{variable}} format
        result = result.replace(/\\{\\{(\\w+)\\}\\}/g, (match, variableName) => {
          return context[variableName] !== undefined ? String(context[variableName]) : match;
        });
        // Replace {variable} format
        result = result.replace(/\\{(\\w+)\\}/g, (match, variableName) => {
          return context[variableName] !== undefined ? String(context[variableName]) : match;
        });
        return result;
      };
    `;

    // Check if this is a single_value output (used in tests and simple tools)
    const isSingleValue = outputConfig.type === 'single_value' || 
                          (outputConfig.config && outputConfig.config.sourceStepId);
    
    if (isSingleValue) {
      const sourceStepId = outputConfig.config?.sourceStepId || logicConfig[logicConfig.length - 1]?.id;
      return `
        async function resolver(input) {
          const context = { ...input };
          
          ${logicCode}
          
          return {
            result: context["step_${sourceStepId}"]
          };
        }
      `;
    }
    
    return `
      async function resolver(input) {
        const context = { ...input };
        
        ${logicCode}
        
        ${replaceVarsCode}
        
        // Format output with sections
        const sections = ${JSON.stringify(sections)};
        const formattedSections = sections.map(section => ({
          type: section.type,
          title: section.title,
          content: replaceVariables(section.content, context),
          visible: section.visible
        }));
        
        return {
          format: '${outputConfig.format}',
          sections: formattedSections,
          context: context
        };
      }
    `;
  }

  // Generate safe evaluation code for mathematical expressions
  private generateSafeEvaluationCode(formula: string): string {
    // Allow context access patterns, mathematical operations, and basic JavaScript operators
    // This supports: context["fieldName"], numbers, +, -, *, /, (, ), |, &, spaces, etc.
    const allowedChars = /^[a-zA-Z0-9+\-*/.()_\[\]"'|& ]*$/;
    if (!allowedChars.test(formula)) {
      console.warn('Formula rejected by character filter:', formula);
      return `{ error: "Invalid characters in formula: ${formula}" }`;
    }
    
    // Additional security: block dangerous patterns but allow context access
    const dangerousPatterns = [
      /eval\s*\(/i,
      /function\s*\(/i,
      /constructor/i,
      /prototype/i,
      /__proto__/i,
      /import\s*\(/i,
      /require\s*\(/i,
      /window\./i,
      /global\./i,
      /process\./i
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(formula)) {
        return `{ error: "Dangerous pattern detected in formula: ${formula}" }`;
      }
    }
    
    return `(${formula})`;
  }

  // SECURITY: Safe expression evaluation - NO EVAL OR FUNCTION CONSTRUCTOR
  private safeEvaluateExpression(expression: string): number {
    try {
      // SECURITY: Only allow basic math operations and variable names - NO CODE EXECUTION
      const allowedChars = /^[0-9+\-*/().\s_a-zA-Z^%]+$/;
      if (!allowedChars.test(expression)) {
        console.warn('SECURITY: Blocked unsafe expression:', expression);
        return 0;
      }
      
      // Use a proper expression parser that handles parentheses and order of operations
      return this.parseExpression(expression.replace(/\s+/g, ''));
    } catch (error) {
      console.warn('SECURITY: Expression parsing failed:', expression, error);
      return 0;
    }
  }

  // SECURITY: Safe math parser with proper order of operations - NO EVAL
  private parseExpression(expr: string): number {
    const self = this; // Capture 'this' for nested functions
    let pos = 0;

    const peek = () => expr[pos];
    const consume = () => expr[pos++];

    const parseNumber = (): number => {
      let num = '';
      while (pos < expr.length && (peek().match(/[0-9.]/) || (num === '' && peek() === '-'))) {
        num += consume();
      }
      return parseFloat(num);
    };

    const parseFactor = (): number => {
      if (peek() === '(') {
        consume(); // consume '('
        const endParen = expr.indexOf(')', pos);
        const subExpr = expr.substring(pos, endParen);
        const result = self.parseExpression(subExpr); // Use self instead of this
        pos = endParen + 1; // move past ')'
        return result;
      }
      return parseNumber();
    };

    const parsePower = (): number => {
      let result = parseFactor();
      while (pos < expr.length && (peek() === '^' || (peek() === '*' && expr[pos + 1] === '*'))) {
        if (peek() === '^') {
          consume();
          result = Math.pow(result, parseFactor());
        } else {
          consume(); consume(); // consume '**'
          result = Math.pow(result, parseFactor());
        }
      }
      return result;
    };

    const parseTerm = (): number => {
      let result = parsePower();
      while (pos < expr.length && (peek() === '*' || peek() === '/' || peek() === '%')) {
        const op = consume();
        const right = parsePower();
        if (op === '*') result *= right;
        else if (op === '/') result = right !== 0 ? result / right : 0;
        else if (op === '%') result = result % right;
      }
      return result;
    };

    const parseExpr = (): number => {
      let result = parseTerm();
      while (pos < expr.length && (peek() === '+' || peek() === '-')) {
        const op = consume();
        const right = parseTerm();
        if (op === '+') result += right;
        else if (op === '-') result -= right;
      }
      return result;
    };

    return parseExpr();
  }

  // Evaluate conditional logic
  private evaluateCondition(leftValue: any, operator: string, rightValue: any): boolean {
    switch (operator) {
      case 'equals':
        return leftValue === rightValue;
      case 'not_equals':
        return leftValue !== rightValue;
      case 'greater_than':
        return Number(leftValue) > Number(rightValue);
      case 'less_than':
        return Number(leftValue) < Number(rightValue);
      case 'contains':
        return String(leftValue).toLowerCase().includes(String(rightValue).toLowerCase());
      default:
        return false;
    }
  }

  // Format final output
  private formatOutput(outputConfig: any, context: Record<string, any>): any {
    // Handle single_value outputs (used in tests and simple tools)
    if (outputConfig.type === 'single_value' && outputConfig.config?.sourceStepId) {
      const sourceStepId = outputConfig.config.sourceStepId;
      return {
        result: context[`step_${sourceStepId}`],
        context // Include full context for debugging
      };
    }
    
    // Handle standard section-based outputs
    const result = {
      format: outputConfig.format,
      sections: (outputConfig.sections || []).map((section: any) => ({
        type: section.type,
        title: section.title,
        content: this.replaceVariables(section.content, context),
        visible: section.visible
      })),
      context // Include full context for debugging
    };

    return result;
  }

  // Replace variables in templates
  private replaceVariables(template: string, context: Record<string, any>): string {
    // Support both {{variable}} and ${variable} formats with nested property access
    let result = template;
    
    // Replace ${variable.nested.property} format (template literal style) - process first to avoid double matching
    result = result.replace(/\$\{([\w$.]+)\}/g, (match, path) => {
      const value = this.getNestedValue(context, path);
      return value !== undefined ? this.formatValue(value) : match;
    });
    
    // Replace {{variable.nested.property}} format (mustache style)
    result = result.replace(/\{\{([\w$.]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(context, path);
      return value !== undefined ? this.formatValue(value) : match;
    });
    
    // Replace {variable.nested.property} format (simple curly braces)
    result = result.replace(/\{([\w$.]+)\}/g, (match, path) => {
      const value = this.getNestedValue(context, path);
      return value !== undefined ? this.formatValue(value) : match;
    });
    
    return result;
  }

  // Safely access nested properties using dot notation
  private getNestedValue(context: Record<string, any>, path: string): any {
    const segments = path.split('.');
    let current: any = context;
    
    for (const segment of segments) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[segment];
    }
    
    return current;
  }

  // Format value for output (handle objects, arrays, primitives)
  private formatValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    
    // For objects and arrays, use JSON.stringify for readability
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  // Soft delete draft (ADDED: Proper soft delete implementation)
  async softDeleteDraft(draftId: string, userId: string): Promise<void> {
    try {
      const result = await db
        .update(toolDrafts)
        .set({ 
          deletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(toolDrafts.id, draftId),
          eq(toolDrafts.userId, userId),
          sql`${toolDrafts.deletedAt} IS NULL` // Only delete if not already deleted
        ));

      console.log(`🗑️  Soft deleted tool draft: ${draftId}`);
    } catch (error: any) {
      console.error('Error soft deleting draft:', error);
      throw new Error('Draft not found or access denied');
    }
  }

  // AI Analysis execution using OpenAI
  private async executeAIAnalysis(aiConfig: any, context: Record<string, any>): Promise<any> {
    const { prompt, inputFields, outputFormat } = aiConfig;
    
    // Replace field placeholders in prompt with actual values
    let processedPrompt = prompt;
    inputFields.forEach((fieldId: string) => {
      const fieldValue = context[fieldId] || '';
      processedPrompt = processedPrompt.replace(
        new RegExp(`\\{${fieldId}\\}`, 'g'),
        String(fieldValue)
      );
    });

    console.log(`🤖 Executing AI analysis with prompt: ${processedPrompt.substring(0, 100)}...`);

    try {
      // Check for API key configuration
      if (!process.env.OPENAI_API_KEY) {
        console.error('OpenAI API key not configured');
        throw new Error('AI_API_KEY_MISSING: AI analysis is not configured. Please contact the tool creator to set up the OpenAI API key.');
      }

      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const completion = await client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: processedPrompt
          }
        ],
        max_tokens: outputFormat === 'json' ? 1000 : 500,
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0]?.message?.content || '';
      
      // Format response based on output format
      switch (outputFormat) {
        case 'json':
          try {
            return JSON.parse(aiResponse);
          } catch (e) {
            return { text: aiResponse, _parsed: false };
          }
        case 'markdown':
          return { markdown: aiResponse };
        default:
          return { text: aiResponse };
      }
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      
      // Handle specific OpenAI API errors with user-friendly messages
      if (error.message?.includes('AI_API_KEY_MISSING')) {
        throw error; // Re-throw custom error
      }
      
      // Rate limit errors
      if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
        throw new Error('AI_RATE_LIMIT: The AI service is currently rate limited. Please wait a moment and try again.');
      }
      
      // Invalid API key
      if (error?.status === 401 || error?.code === 'invalid_api_key') {
        throw new Error('AI_AUTH_ERROR: AI service authentication failed. The API key may be invalid or expired. Please contact the tool creator.');
      }
      
      // Model not available
      if (error?.status === 404 || error?.code === 'model_not_found') {
        throw new Error('AI_MODEL_ERROR: The requested AI model is not available. Please contact the tool creator to update the configuration.');
      }
      
      // Quota exceeded
      if (error?.code === 'insufficient_quota') {
        throw new Error('AI_QUOTA_EXCEEDED: The AI service quota has been exceeded. Please contact the tool creator to upgrade their plan.');
      }
      
      // Context length exceeded
      if (error?.code === 'context_length_exceeded') {
        throw new Error('AI_INPUT_TOO_LONG: Your input text is too long for AI analysis. Please try with shorter text.');
      }
      
      // Network/timeout errors
      if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT' || error?.code === 'ENOTFOUND') {
        throw new Error('AI_NETWORK_ERROR: Unable to connect to the AI service. Please check your internet connection and try again.');
      }
      
      // Generic OpenAI error with status code
      if (error?.status) {
        throw new Error(`AI_ERROR_${error.status}: AI analysis failed (Error ${error.status}). ${error?.message || 'Please try again.'}`);
      }
      
      // Unknown error
      throw new Error(`AI_ANALYSIS_FAILED: AI analysis encountered an error: ${error?.message || 'Unknown error'}. Please try again or contact support.`);
    }
  }

  // API Call execution with security measures
  private async executeAPICall(apiConfig: any, context: Record<string, any>): Promise<any> {
    const { method, url, headers = {}, body = {} } = apiConfig;
    
    // STEP 1: Replace placeholders in URL, headers, and body FIRST
    let processedUrl = url;
    let processedHeaders = { ...headers };
    let processedBody = { ...body };

    // Replace field placeholders
    Object.keys(context).forEach(key => {
      const value = String(context[key] || '');
      const placeholder = `{${key}}`;
      
      processedUrl = processedUrl.replace(new RegExp(placeholder, 'g'), encodeURIComponent(value));
      
      // Replace in headers
      Object.keys(processedHeaders).forEach(headerKey => {
        processedHeaders[headerKey] = processedHeaders[headerKey].replace(new RegExp(placeholder, 'g'), value);
      });
      
      // Replace in body
      Object.keys(processedBody).forEach(bodyKey => {
        if (typeof processedBody[bodyKey] === 'string') {
          processedBody[bodyKey] = processedBody[bodyKey].replace(new RegExp(placeholder, 'g'), value);
        }
      });
    });

    // STEP 2: Handle relative URLs - convert to absolute for validation
    let fullUrl = processedUrl;
    if (processedUrl.startsWith('/')) {
      // Relative URL - construct full URL using current host
      const baseUrl = process.env.FRONTEND_URL || 'https://localhost:5000';
      fullUrl = `${baseUrl}${processedUrl}`;
    }
    
    // STEP 3: SECURITY - URL validation to prevent SSRF (after variable replacement)
    try {
      const parsedUrl = new URL(fullUrl);
      
      // Allow relative URLs to same origin
      if (!processedUrl.startsWith('/')) {
        // For external URLs, block private/internal URLs
        const hostname = parsedUrl.hostname.toLowerCase();
        const forbiddenHosts = [
          'localhost', '127.0.0.1', '0.0.0.0', '::1',
          '10.', '172.16.', '172.17.', '172.18.', '172.19.',
          '172.20.', '172.21.', '172.22.', '172.23.',
          '172.24.', '172.25.', '172.26.', '172.27.',
          '172.28.', '172.29.', '172.30.', '172.31.',
          '192.168.', 'metadata.google.internal'
        ];
        
        if (forbiddenHosts.some(host => hostname.includes(host))) {
          throw new Error('API_SECURITY_ERROR: Private or internal URLs are not allowed for security reasons.');
        }
      }
      
      // Only allow HTTP/HTTPS
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('API_PROTOCOL_ERROR: Only HTTP and HTTPS protocols are supported.');
      }
    } catch (error: any) {
      console.warn('API call blocked:', error);
      if (error.message?.includes('API_')) {
        throw error; // Re-throw custom errors
      }
      throw new Error(`API_URL_INVALID: The API URL "${processedUrl}" is not valid after variable replacement. Processed URL: "${fullUrl}". Please check the URL format.`);
    }

    console.log(`🌐 Executing API call: ${method} ${fullUrl}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const fetchOptions: any = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'fxns-tool-builder/1.0',
          ...processedHeaders
        },
        signal: controller.signal,
      };

      if (method === 'POST' && Object.keys(processedBody).length > 0) {
        fetchOptions.body = JSON.stringify(processedBody);
      }

      const response = await fetch(fullUrl, fetchOptions);
      clearTimeout(timeoutId);
      
      // Handle HTTP error status codes with specific messages
      if (!response.ok) {
        const statusCode = response.status;
        let errorMessage = '';
        
        try {
          // Try to get error details from response body
          const errorBody = await response.text();
          const errorJson = errorBody ? JSON.parse(errorBody) : null;
          errorMessage = errorJson?.message || errorJson?.error || errorBody.substring(0, 200);
        } catch (e) {
          // If can't parse, use status text
          errorMessage = response.statusText;
        }
        
        // Provide specific error messages based on status code
        switch (statusCode) {
          case 400:
            throw new Error(`API_BAD_REQUEST (400): The API rejected the request. ${errorMessage || 'Please check your input data and try again.'}`);
          case 401:
            throw new Error(`API_UNAUTHORIZED (401): Authentication failed. Please check your API key or credentials in the tool configuration.`);
          case 403:
            throw new Error(`API_FORBIDDEN (403): Access denied. You may not have permission to access this API endpoint.`);
          case 404:
            throw new Error(`API_NOT_FOUND (404): The API endpoint was not found. Please verify the URL: ${processedUrl}`);
          case 429:
            throw new Error(`API_RATE_LIMITED (429): Too many requests to the API. Please wait a moment and try again.`);
          case 500:
            throw new Error(`API_SERVER_ERROR (500): The API server encountered an error. ${errorMessage || 'Please try again later.'}`);
          case 502:
          case 503:
          case 504:
            throw new Error(`API_UNAVAILABLE (${statusCode}): The API service is temporarily unavailable. Please try again in a few moments.`);
          default:
            throw new Error(`API_ERROR (${statusCode}): API request failed. ${errorMessage || response.statusText}`);
        }
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        const textResponse = await response.text();
        return { text: textResponse };
      }
    } catch (error: any) {
      console.error('API call failed:', error);
      
      // Don't re-wrap errors that already have our custom format
      if (error.message?.includes('API_')) {
        throw error;
      }
      
      // Handle network and timeout errors
      if (error.name === 'AbortError') {
        throw new Error(`API_TIMEOUT: The API request timed out after 10 seconds. The service may be slow or unresponsive.`);
      }
      
      if (error.code === 'ENOTFOUND') {
        throw new Error(`API_DNS_ERROR: Unable to resolve the API hostname. Please check if the URL "${processedUrl}" is correct.`);
      }
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`API_CONNECTION_REFUSED: Connection refused by the API server. The service may be down.`);
      }
      
      if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
        throw new Error(`API_TIMEOUT: Connection to the API timed out. Please check your internet connection and try again.`);
      }
      
      if (error.code === 'ECONNRESET') {
        throw new Error(`API_CONNECTION_RESET: Connection was reset by the API server. Please try again.`);
      }
      
      // Network errors
      if (error.message?.includes('fetch failed') || error.message?.includes('network')) {
        throw new Error(`API_NETWORK_ERROR: Network error while connecting to the API. Please check your internet connection.`);
      }
      
      // Generic error
      throw new Error(`API_CALL_FAILED: API request failed: ${error.message || 'Unknown error'}. Please try again or contact the tool creator.`);
    }
  }

  // Public test helper method to execute tool logic without database
  async testToolTemplate(
    inputConfig: FormField[],
    logicConfig: LogicStep[],
    outputConfig: OutputConfig,
    testData: Record<string, any>
  ): Promise<any> {
    return await this.executeToolLogic(inputConfig, logicConfig, outputConfig, testData);
  }
}

export const toolBuilderService = new ToolBuilderService();
export default toolBuilderService;