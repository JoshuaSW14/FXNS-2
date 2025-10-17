// API Integration Routes - Comprehensive external service integration
import express from 'express';
import { z } from 'zod';
// Authentication middleware - check if user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};
import { apiIntegrationService } from './api-integration-service';
import { proService } from './pro-service';

const router = express.Router();

// ==================== API CONFIGURATION ROUTES ====================

// Get user's API configurations
router.get('/configurations', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const configurations = await apiIntegrationService.getUserApiConfigurations(userId);
    
    // Remove sensitive data before sending to client
    const sanitizedConfigs = configurations.map(config => ({
      ...config,
      authConfig: config.authConfig ? { ...config.authConfig, hasCredentials: true } : null
    }));

    res.json({ success: true, data: sanitizedConfigs });
  } catch (error) {
    console.error('Get API configurations error:', error);
    res.status(500).json({
      error: 'Failed to fetch API configurations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new API configuration
router.post('/configurations', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    // Check Pro subscription for advanced API features
    const hasPro = await proService.hasProSubscription(userId);
    if (!hasPro) {
      return res.status(403).json({
        error: 'Pro subscription required',
        message: 'Advanced API integration requires a Pro subscription',
        upgradeRequired: true
      });
    }

    const validationResult = z.object({
      name: z.string().min(1, 'Name is required'),
      description: z.string().optional(),
      baseUrl: z.string().url('Base URL must be a valid URL'),
      authMethod: z.enum(['none', 'api_key', 'bearer', 'basic']),
      authConfig: z.any().optional(),
      defaultHeaders: z.record(z.string()).optional(),
      rateLimit: z.number().min(1).max(1000).default(100),
    }).safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.errors
      });
    }

    const configuration = await apiIntegrationService.createApiConfiguration(userId, validationResult.data);
    res.json({ success: true, data: configuration });
  } catch (error) {
    console.error('Create API configuration error:', error);
    res.status(500).json({
      error: 'Failed to create API configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update API configuration
router.put('/configurations/:configId', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { configId } = req.params;

    const validationResult = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      baseUrl: z.string().url().optional(),
      authMethod: z.enum(['none', 'api_key', 'bearer', 'basic']).optional(),
      authConfig: z.any().optional(),
      defaultHeaders: z.record(z.string()).optional(),
      rateLimit: z.number().min(1).max(1000).optional(),
    }).safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.errors
      });
    }

    const updated = await apiIntegrationService.updateApiConfiguration(userId, configId, validationResult.data);
    if (!updated) {
      return res.status(404).json({ error: 'API configuration not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update API configuration error:', error);
    res.status(500).json({
      error: 'Failed to update API configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete API configuration
router.delete('/configurations/:configId', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { configId } = req.params;

    await apiIntegrationService.deleteApiConfiguration(userId, configId);
    res.json({ success: true, message: 'API configuration deleted' });
  } catch (error) {
    console.error('Delete API configuration error:', error);
    res.status(500).json({
      error: 'Failed to delete API configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== CREDENTIAL MANAGEMENT ROUTES ====================

// Store API credential
router.post('/configurations/:configId/credentials', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { configId } = req.params;

    // Check Pro subscription
    const hasPro = await proService.hasProSubscription(userId);
    if (!hasPro) {
      return res.status(403).json({
        error: 'Pro subscription required',
        message: 'Credential management requires a Pro subscription',
        upgradeRequired: true
      });
    }

    const validationResult = z.object({
      credentialType: z.enum(['api_key', 'username_password']),
      value: z.string().min(1, 'Credential value is required'),
      expiresAt: z.string().datetime().optional(),
    }).safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.errors
      });
    }

    const credential = await apiIntegrationService.storeApiCredential(userId, configId, {
      ...validationResult.data,
      expiresAt: validationResult.data.expiresAt ? new Date(validationResult.data.expiresAt) : undefined,
    });

    // Don't return the actual credential value
    res.json({ 
      success: true, 
      data: { 
        id: credential.id,
        credentialType: credential.credentialType,
        expiresAt: credential.expiresAt,
        isActive: credential.isActive
      }
    });
  } catch (error) {
    console.error('Store API credential error:', error);
    res.status(500).json({
      error: 'Failed to store credential',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== API EXECUTION ROUTES ====================

// Execute API call
router.post('/configurations/:configId/execute', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { configId } = req.params;

    // Check Pro subscription
    const hasPro = await proService.hasProSubscription(userId);
    if (!hasPro) {
      return res.status(403).json({
        error: 'Pro subscription required',
        message: 'API execution requires a Pro subscription',
        upgradeRequired: true
      });
    }

    const validationResult = z.object({
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
      endpoint: z.string().min(1, 'Endpoint is required'),
      headers: z.record(z.string()).optional(),
      queryParams: z.record(z.string()).optional(),
      body: z.any().optional(),
      authOverride: z.object({
        method: z.enum(['api_key', 'bearer', 'basic']),
        value: z.string(),
        location: z.enum(['header', 'query']).optional(),
        key: z.string().optional(),
      }).optional(),
      timeout: z.number().min(1000).max(30000).default(10000),
      retries: z.number().min(0).max(3).default(0),
      context: z.record(z.any()).optional(),
    }).safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.errors
      });
    }

    const result = await apiIntegrationService.executeAdvancedApiCall(
      userId,
      configId,
      validationResult.data,
      validationResult.data.context || {}
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Execute API call error:', error);
    res.status(500).json({
      error: 'Failed to execute API call',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test API configuration
router.post('/configurations/:configId/test', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { configId } = req.params;

    // Check Pro subscription
    const hasPro = await proService.hasProSubscription(userId);
    if (!hasPro) {
      return res.status(403).json({
        error: 'Pro subscription required',
        message: 'API testing requires a Pro subscription',
        upgradeRequired: true
      });
    }

    // Execute a simple GET request to test the configuration
    const result = await apiIntegrationService.executeAdvancedApiCall(
      userId,
      configId,
      { method: 'GET', endpoint: '' },
      {}
    );

    res.json({ 
      success: true, 
      data: { 
        status: result.status,
        success: result.success,
        responseTime: result.responseTime,
        error: result.error
      }
    });
  } catch (error) {
    console.error('Test API configuration error:', error);
    res.status(500).json({
      error: 'Failed to test API configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== USAGE ANALYTICS ROUTES ====================

// Get API usage statistics
router.get('/configurations/:configId/usage', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { configId } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;

    const stats = await apiIntegrationService.getApiUsageStats(userId, configId, hours);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get API usage stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch usage statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get overall usage statistics
router.get('/usage', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const hours = parseInt(req.query.hours as string) || 24;

    const stats = await apiIntegrationService.getApiUsageStats(userId, undefined, hours);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get overall usage stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch usage statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== WEBHOOK MANAGEMENT ROUTES ====================

// Get user's webhooks
router.get('/webhooks', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const webhooks = await apiIntegrationService.getUserWebhooks(userId);
    
    // Remove sensitive data before sending to client
    const sanitizedWebhooks = webhooks.map(webhook => ({
      ...webhook,
      secret: '***hidden***' // Don't expose the secret
    }));

    res.json({ success: true, data: sanitizedWebhooks });
  } catch (error) {
    console.error('Get webhooks error:', error);
    res.status(500).json({
      error: 'Failed to fetch webhooks',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create webhook endpoint
router.post('/webhooks', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    // Check Pro subscription
    const hasPro = await proService.hasProSubscription(userId);
    if (!hasPro) {
      return res.status(403).json({
        error: 'Pro subscription required',
        message: 'Webhook creation requires a Pro subscription',
        upgradeRequired: true
      });
    }

    const validationResult = z.object({
      name: z.string().min(1, 'Name is required'),
      description: z.string().optional(),
      targetToolId: z.string().uuid().optional(),
      processingConfig: z.any().optional(),
    }).safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.errors
      });
    }

    const webhook = await apiIntegrationService.createWebhookEndpoint(userId, validationResult.data);
    
    res.json({ 
      success: true, 
      data: {
        ...webhook,
        fullUrl: `${req.protocol}://${req.get('host')}/api/integrations${webhook.endpoint}`
      }
    });
  } catch (error) {
    console.error('Create webhook error:', error);
    res.status(500).json({
      error: 'Failed to create webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== PUBLIC WEBHOOK ENDPOINT ====================
// This router is for public webhook endpoints that should NOT have CSRF protection
// These endpoints are called by external services and use signature verification instead

export const publicWebhookRouter = express.Router();

// Handle incoming webhooks (public endpoint - no CSRF protection needed)
publicWebhookRouter.post('/webhooks/*', express.raw({ type: 'application/json' }), async (req: any, res: any) => {
  try {
    const endpoint = req.path;
    const headers = req.headers;
    
    // Parse raw body for signature verification
    let payload: any;
    try {
      payload = JSON.parse(req.body.toString());
    } catch (parseError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid JSON payload' 
      });
    }
    
    const sourceIp = req.ip || req.connection.remoteAddress;

    const result = await apiIntegrationService.processWebhookDelivery(endpoint, headers, payload, sourceIp);
    
    if (result.success) {
      res.status(200).json({ success: true, message: 'Webhook processed successfully' });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Process webhook error:', error);
    res.status(500).json({
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;