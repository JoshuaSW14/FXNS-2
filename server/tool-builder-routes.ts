// Tool Builder API Routes - RESTful endpoints for visual tool creation
import { Router } from 'express';
import { toolBuilderService } from './tool-builder-service';
import { proService } from './pro-service';
import { z } from 'zod';

const router = Router();

// Middleware to ensure user is authenticated
function requireAuth(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Authentication required" }
    });
  }
  next();
}

// Validation schemas
const createDraftSchema = z.object({
  name: z.string().min(1, "Tool name is required").max(100, "Tool name too long"),
  category: z.string().default("custom"),
  templateId: z.string().optional(),
});

const updateDraftSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.string().optional(),
  status: z.enum(['draft', 'testing']).optional(), // SECURITY: Remove 'published' - use publish endpoint
  inputConfig: z.array(z.any()).optional(), // FormField[]
  logicConfig: z.array(z.any()).optional(), // LogicStep[]
  outputConfig: z.any().optional(), // OutputConfig
});

const testDraftSchema = z.object({
  testData: z.record(z.any()), // Test input values
});

// Pro Feature Detection - Check if draft uses advanced features
function hasAdvancedFieldTypes(inputConfig: any[]): boolean {
  const advancedTypes = ['rich_text', 'location', 'rating', 'signature', 'currency', 'json', 'barcode'];
  return inputConfig.some((field: any) => advancedTypes.includes(field.type));
}

function hasAdvancedLogicSteps(logicConfig: any[]): boolean {
  return logicConfig.some((step: any) => 
    step.type === 'api_call' || step.type === 'ai_analysis'
  );
}

// Middleware to check if the draft requires Pro features
const checkProFeatures = async (req: any, res: any, next: any) => {
  try {
    const { inputConfig = [], logicConfig = [] } = req.body;
    
    if (hasAdvancedFieldTypes(inputConfig) || hasAdvancedLogicSteps(logicConfig)) {
      // Check if user has Pro subscription
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasPro = await proService.hasProSubscription(userId);
      if (!hasPro) {
        return res.status(403).json({
          error: 'Pro subscription required',
          message: 'Advanced field types and logic steps require a Pro subscription',
          upgradeRequired: true,
          proFeatures: {
            advancedFields: hasAdvancedFieldTypes(inputConfig),
            advancedLogic: hasAdvancedLogicSteps(logicConfig)
          }
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error checking Pro features:', error);
    res.status(500).json({ error: 'Error validating Pro features' });
  }
};

// Middleware to check Pro features for existing draft (for test/publish routes)
const checkDraftProFeatures = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.id;
    const { draftId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get the draft to check its features
    const draft = await toolBuilderService.getDraftById(draftId, userId);
    if (!draft) {
      return res.status(404).json({
        error: 'Draft not found or access denied'
      });
    }

    const inputConfig = draft.inputConfig as any[] || [];
    const logicConfig = draft.logicConfig as any[] || [];
    
    if (hasAdvancedFieldTypes(inputConfig) || hasAdvancedLogicSteps(logicConfig)) {
      const hasPro = await proService.hasProSubscription(userId);
      if (!hasPro) {
        return res.status(403).json({
          error: 'Pro subscription required',
          message: 'This draft contains advanced features that require a Pro subscription',
          upgradeRequired: true,
          proFeatures: {
            advancedFields: hasAdvancedFieldTypes(inputConfig),
            advancedLogic: hasAdvancedLogicSteps(logicConfig)
          }
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error checking draft Pro features:', error);
    res.status(500).json({ error: 'Error validating draft features' });
  }
};

// --- Draft Management ---

// Create new tool draft
router.post('/drafts', requireAuth, async (req, res) => {
  try {
    const validatedData = createDraftSchema.parse(req.body);
    const userId = req.user!.id;

    const draft = await toolBuilderService.createDraft(
      userId,
      validatedData.name,
      validatedData.category,
      validatedData.templateId
    );

    res.status(201).json({
      success: true,
      data: draft
    });
  } catch (error: any) {
    console.error('Error creating tool draft:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: error.errors
        }
      });
    } else {
      res.status(500).json({
        error: {
          code: "CREATE_DRAFT_ERROR",
          message: "Failed to create tool draft"
        }
      });
    }
  }
});

// Get user's drafts
router.get('/drafts', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const status = req.query.status as string | undefined;

    const drafts = await toolBuilderService.getUserDrafts(userId, status);

    res.json({
      success: true,
      data: drafts
    });
  } catch (error: any) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({
      error: {
        code: "FETCH_DRAFTS_ERROR",
        message: "Failed to fetch tool drafts"
      }
    });
  }
});

// Get specific draft
router.get('/drafts/:draftId', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { draftId } = req.params;

    // Direct query by ID and userId (FIXED: More efficient than fetching all drafts)
    const draft = await toolBuilderService.getDraftById(draftId, userId);

    if (!draft) {
      return res.status(404).json({
        error: {
          code: "DRAFT_NOT_FOUND",
          message: "Tool draft not found or access denied"
        }
      });
    }

    res.json({
      success: true,
      data: draft
    });
  } catch (error) {
    console.error('Error fetching draft:', error);
    res.status(500).json({
      error: {
        code: "FETCH_DRAFT_ERROR",
        message: "Failed to fetch tool draft"
      }
    });
  }
});

// Update tool draft
router.put('/drafts/:draftId', requireAuth, checkProFeatures, async (req, res) => {
  try {
    const validatedData = updateDraftSchema.parse(req.body);
    const userId = req.user!.id;
    const { draftId } = req.params;

    const updatedDraft = await toolBuilderService.updateDraft(
      draftId,
      userId,
      validatedData
    );

    res.json({
      success: true,
      data: updatedDraft
    });
  } catch (error: any) {
    console.error('Error updating draft:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: error.errors
        }
      });
    } else if (error.message.includes('not found')) {
      res.status(404).json({
        error: {
          code: "DRAFT_NOT_FOUND",
          message: "Tool draft not found or access denied"
        }
      });
    } else {
      res.status(500).json({
        error: {
          code: "UPDATE_DRAFT_ERROR",
          message: "Failed to update tool draft"
        }
      });
    }
  }
});

// Test tool draft execution
router.post('/drafts/:draftId/test', requireAuth, checkDraftProFeatures, async (req, res) => {
  try {
    const validatedData = testDraftSchema.parse(req.body);
    const userId = req.user!.id;
    const { draftId } = req.params;

    const startTime = Date.now();
    const result = await toolBuilderService.testDraft(
      draftId,
      userId,
      validatedData.testData
    );
    const executionTime = Date.now() - startTime;

    // Match frontend expectations: result and executionTime at top level
    res.json({
      result,
      executionTime
    });
  } catch (error: any) {
    console.error('Error testing draft:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid test data",
          details: error.errors
        }
      });
    } else if (error.message.includes('not found')) {
      res.status(404).json({
        error: {
          code: "DRAFT_NOT_FOUND",
          message: "Tool draft not found or access denied"
        }
      });
    } else {
      // Extract error code if present (e.g., "API_URL_INVALID: message")
      const errorMatch = error.message.match(/^([A-Z_]+):\s*(.+)$/);
      const errorCode = errorMatch ? errorMatch[1] : "TEST_EXECUTION_ERROR";
      const errorMessage = errorMatch ? errorMatch[2] : error.message;
      
      // Provide user-friendly message based on error type
      let userMessage = errorMessage;
      let helpText = "";
      
      if (errorCode.includes('API_URL_INVALID')) {
        helpText = "Check that your API URL is correct and all variables are properly defined.";
      } else if (errorCode.includes('API_CALL')) {
        helpText = "Verify the API endpoint is accessible and your parameters are correct.";
      } else if (errorCode.includes('AI_')) {
        helpText = "Check your AI configuration and ensure the API key is valid.";
      } else if (errorCode.includes('VALIDATION')) {
        helpText = "Make sure all required input fields are filled in correctly.";
      } else if (errorCode.includes('CALCULATION')) {
        helpText = "Review your calculation formula and ensure all variables are defined.";
      }
      
      res.status(500).json({
        error: {
          code: errorCode,
          message: userMessage,
          help: helpText,
          technicalDetails: error.stack || error.toString()
        }
      });
    }
  }
});

// Create draft from published tool for editing
router.post('/drafts/from-published/:fxnId', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { fxnId } = req.params;

    const draft = await toolBuilderService.createDraftFromPublished(fxnId, userId);

    res.status(201).json({
      success: true,
      data: draft
    });
  } catch (error: any) {
    console.error('Error creating draft from published tool:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: {
          code: "TOOL_NOT_FOUND",
          message: "Published tool not found or access denied"
        }
      });
    } else if (error instanceof Error && error.message.includes('not supported')) {
      res.status(400).json({
        error: {
          code: "TOOL_NOT_EDITABLE", 
          message: "This tool type cannot be edited with the visual builder"
        }
      });
    } else {
      res.status(500).json({
        error: {
          code: "CREATE_DRAFT_ERROR",
          message: "Failed to create draft from published tool"
        }
      });
    }
  }
});

// Publish draft as live tool
router.post('/drafts/:draftId/publish', requireAuth, checkDraftProFeatures, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { draftId } = req.params;

    const toolId = await toolBuilderService.publishDraft(draftId, userId);

    res.json({
      success: true,
      data: {
        toolId,
        message: "Tool published successfully!",
        publishedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error publishing draft:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: {
          code: "DRAFT_NOT_FOUND",
          message: "Tool draft not found or access denied"
        }
      });
    } else if ((error as any).code === 'VALIDATION_ERROR') {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Tool validation failed",
          details: error.message
        }
      });
    } else {
      res.status(500).json({
        error: {
          code: "PUBLISH_ERROR",
          message: "Failed to publish tool",
          details: error.message
        }
      });
    }
  }
});

// Delete draft (soft delete)
router.delete('/drafts/:draftId', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { draftId } = req.params;

    // Soft delete by setting deletedAt timestamp
    await toolBuilderService.softDeleteDraft(draftId, userId);

    res.json({
      success: true,
      message: "Draft deleted successfully"
    });
  } catch (error: any) {
    console.error('Error deleting draft:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: {
          code: "DRAFT_NOT_FOUND",
          message: "Tool draft not found or access denied"
        }
      });
    } else {
      res.status(500).json({
        error: {
          code: "DELETE_ERROR",
          message: "Failed to delete draft"
        }
      });
    }
  }
});

// --- Template Management (Phase 2) ---

// Get public templates (for marketplace)
router.get('/templates', async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    
    // This would be implemented to fetch public templates
    // For now, return empty array as placeholder
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      error: {
        code: "FETCH_TEMPLATES_ERROR",
        message: "Failed to fetch tool templates"
      }
    });
  }
});

// --- Builder Configuration Endpoints ---

// Get available field types for form builder
router.get('/field-types', (req, res) => {
  const fieldTypes = [
    {
      type: 'text',
      label: 'Text Input',
      icon: 'Type',
      description: 'Single line text input',
      validationOptions: ['required', 'minLength', 'maxLength', 'pattern']
    },
    {
      type: 'textarea',
      label: 'Long Text',
      icon: 'AlignLeft',
      description: 'Multi-line text input',
      validationOptions: ['required', 'minLength', 'maxLength']
    },
    {
      type: 'number',
      label: 'Number',
      icon: 'Hash',
      description: 'Numeric input',
      validationOptions: ['required', 'min', 'max']
    },
    {
      type: 'email',
      label: 'Email',
      icon: 'Mail',
      description: 'Email address input',
      validationOptions: ['required']
    },
    {
      type: 'date',
      label: 'Date',
      icon: 'Calendar',
      description: 'Date picker',
      validationOptions: ['required']
    },
    {
      type: 'select',
      label: 'Dropdown',
      icon: 'ChevronDown',
      description: 'Select from options',
      validationOptions: ['required'],
      requiresOptions: true
    },
    {
      type: 'checkbox',
      label: 'Checkbox',
      icon: 'Check',
      description: 'Yes/no input',
      validationOptions: []
    },
    {
      type: 'range',
      label: 'Slider',
      icon: 'Sliders',
      description: 'Range slider input',
      validationOptions: ['min', 'max']
    }
  ];

  res.json({
    success: true,
    data: fieldTypes
  });
});

// Get available logic step types
router.get('/logic-types', (req, res) => {
  // SECURITY: Only expose safe logic types (removed api_call and ai_analysis)
  const logicTypes = [
    {
      type: 'calculation',
      label: 'Calculate',
      icon: 'Calculator',
      description: 'Perform mathematical calculations',
      configFields: ['formula', 'variables']
    },
    {
      type: 'condition',
      label: 'If/Then',
      icon: 'GitBranch',
      description: 'Conditional logic branching',
      configFields: ['condition', 'thenSteps', 'elseSteps']
    },
    {
      type: 'transform',
      label: 'Transform',
      icon: 'Shuffle',
      description: 'Transform text or data',
      configFields: ['inputField', 'transformType']
    }
  ];

  res.json({
    success: true,
    data: logicTypes
  });
});

// ===============================
// ENHANCED AI ANALYSIS ENDPOINTS
// ===============================

// AI Tool Suggestions - Generate tool ideas from user requirements
router.post('/ai/suggest-tools', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    
    // Check Pro subscription for AI features
    const hasPro = await proService.hasProSubscription(userId);
    if (!hasPro) {
      return res.status(403).json({
        error: 'Pro subscription required',
        message: 'AI tool suggestions require a Pro subscription',
        upgradeRequired: true
      });
    }

    const validationResult = z.object({
      description: z.string().min(10, 'Description must be at least 10 characters'),
      category: z.string().optional(),
      targetUsers: z.string().optional(),
      complexity: z.enum(['simple', 'medium', 'advanced']).optional()
    }).safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.errors
      });
    }

    const { suggestToolIdeas } = await import('./ai-service');
    const suggestions = await suggestToolIdeas(userId, validationResult.data);

    console.log(`✅ AI tool suggestions generated for user ${userId}`);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    console.error('AI tool suggestions error:', error);
    res.status(500).json({
      error: 'Failed to generate tool suggestions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// AI Code Generation - Generate code from specifications  
router.post('/ai/generate-code', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    
    // Check Pro subscription for AI features
    const hasPro = await proService.hasProSubscription(userId);
    if (!hasPro) {
      return res.status(403).json({
        error: 'Pro subscription required',
        message: 'AI code generation requires a Pro subscription',
        upgradeRequired: true
      });
    }

    const validationResult = z.object({
      toolName: z.string().min(1, 'Tool name is required'),
      description: z.string().min(10, 'Description must be at least 10 characters'),
      inputFields: z.array(z.object({
        name: z.string(),
        type: z.string(),
        description: z.string()
      })),
      outputFormat: z.string(),
      logic: z.string().min(10, 'Logic description is required'),
      examples: z.array(z.object({
        input: z.any().optional(),
        expectedOutput: z.any().optional()
      })).optional()
    }).safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.errors
      });
    }

    const { generateToolCode } = await import('./ai-service');
    const codeResult = await generateToolCode(userId, validationResult.data);

    console.log(`✅ AI code generation completed for user ${userId}`);
    res.json({ success: true, data: codeResult });
  } catch (error) {
    console.error('AI code generation error:', error);
    res.status(500).json({
      error: 'Failed to generate code',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// AI Template Recommendations - Smart template matching
router.post('/ai/recommend-templates', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    
    // Check Pro subscription for AI features
    const hasPro = await proService.hasProSubscription(userId);
    if (!hasPro) {
      return res.status(403).json({
        error: 'Pro subscription required',
        message: 'AI template recommendations require a Pro subscription',
        upgradeRequired: true
      });
    }

    const validationResult = z.object({
      description: z.string().min(10, 'Description must be at least 10 characters'),
      preferredCategory: z.string().optional(),
      skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      timeConstraint: z.string().optional()
    }).safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.errors
      });
    }

    const { recommendTemplates } = await import('./ai-service');
    const recommendations = await recommendTemplates(userId, validationResult.data);

    console.log(`✅ AI template recommendations generated for user ${userId}`);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('AI template recommendations error:', error);
    res.status(500).json({
      error: 'Failed to generate template recommendations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// AI Tool Analysis - Analyze and optimize existing tools
router.post('/ai/analyze-tool', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    
    // Check Pro subscription for AI features
    const hasPro = await proService.hasProSubscription(userId);
    if (!hasPro) {
      return res.status(403).json({
        error: 'Pro subscription required',
        message: 'AI tool analysis requires a Pro subscription',
        upgradeRequired: true
      });
    }

    const validationResult = z.object({
      name: z.string().min(1, 'Tool name is required'),
      description: z.string().min(10, 'Description is required'),
      code: z.string().min(10, 'Code is required'),
      inputSchema: z.any().optional(),
      outputSchema: z.any().optional(),
      usageStats: z.object({
        totalRuns: z.number(),
        averageExecutionTime: z.number(),
        errorRate: z.number(),
        userFeedback: z.number().optional()
      }).optional()
    }).safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.errors
      });
    }

    const { analyzeToolPerformance } = await import('./ai-service');
    const analysis = await analyzeToolPerformance(userId, validationResult.data);

    console.log(`✅ AI tool analysis completed for user ${userId}`);
    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('AI tool analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze tool',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;