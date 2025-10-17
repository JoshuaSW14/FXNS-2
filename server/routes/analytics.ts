import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler, createValidationError, createUnauthorizedError } from '../middleware/error-handler.js';
import { analyticsService } from '../analytics-service.js';
import { 
  requireAuth, 
  requireAnalyticsAccess,
  requireAdmin,
  attachUserPermissions 
} from '../middleware/admin-auth.js';

const router = Router();

// Attach user permissions to all routes
router.use(attachUserPermissions);

// Schema for analytics query parameters
const AnalyticsQuerySchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const ToolAnalyticsQuerySchema = z.object({
  toolId: z.string().uuid('Invalid tool ID'),
  ...AnalyticsQuerySchema.shape
});

// Helper function to parse time range
function parseTimeRange(timeRange: string, startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    return {
      start: new Date(startDate),
      end: new Date(endDate)
    };
  }

  const end = new Date();
  const start = new Date();
  
  switch (timeRange) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }
  
  return { start, end };
}

// Get user's personal dashboard analytics
router.get('/dashboard', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user!.id;
  
  try {
    const dashboardData = await analyticsService.getUserDashboardAnalytics(userId);
    
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    throw createValidationError('Failed to fetch dashboard analytics');
  }
}));

// Get tool-specific analytics
router.get('/tools/:toolId', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { toolId } = req.params;
  const queryResult = AnalyticsQuerySchema.safeParse(req.query);
  
  if (!queryResult.success) {
    throw createValidationError('Invalid query parameters', queryResult.error.errors);
  }
  
  const { timeRange, startDate, endDate } = queryResult.data;
  const timeRangeObj = parseTimeRange(timeRange, startDate, endDate);
  
  try {
    const analytics = await analyticsService.getToolAnalytics(toolId, timeRangeObj);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching tool analytics:', error);
    throw createValidationError('Failed to fetch tool analytics');
  }
}));

// Get user engagement metrics
router.get('/engagement', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user!.id;
  
  try {
    const engagement = await analyticsService.getUserEngagementMetrics(userId);
    
    res.json({
      success: true,
      data: engagement
    });
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    throw createValidationError('Failed to fetch engagement metrics');
  }
}));

// Get platform-wide analytics (admin only)
router.get('/platform', requireAnalyticsAccess, asyncHandler(async (req: Request, res: Response) => {
  try {
    const platformAnalytics = await analyticsService.getPlatformAnalytics();
    
    res.json({
      success: true,
      data: platformAnalytics,
      meta: {
        accessLevel: 'admin',
        userRole: (req.user as any).role
      }
    });
  } catch (error) {
    console.error('Error fetching platform analytics:', error);
    throw createValidationError('Failed to fetch platform analytics');
  }
}));

// Get Pro subscription analytics (admin only)
router.get('/pro', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const proAnalytics = await analyticsService.getProAnalytics();
    
    res.json({
      success: true,
      data: proAnalytics,
      meta: {
        accessLevel: 'admin',
        userRole: (req.user as any).role
      }
    });
  } catch (error) {
    console.error('Error fetching Pro analytics:', error);
    throw createValidationError('Failed to fetch Pro analytics');
  }
}));

// Track tool usage (internal endpoint for tool execution)
router.post('/track-usage', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { toolId, executionTime, success, draftId } = req.body;
  const userId = (req as any).user!.id;
  
  if (!toolId || typeof executionTime !== 'number' || typeof success !== 'boolean') {
    throw createValidationError('Missing required fields: toolId, executionTime, success');
  }
  
  try {
    await analyticsService.trackToolUsage(userId, toolId, executionTime, success, draftId);
    
    res.json({
      success: true,
      message: 'Usage tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking usage:', error);
    throw createValidationError('Failed to track usage');
  }
}));

// Get analytics summary for multiple tools (batch endpoint)
router.post('/tools/batch', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { toolIds, timeRange = '30d' } = req.body;
  
  if (!Array.isArray(toolIds) || toolIds.length === 0) {
    throw createValidationError('toolIds must be a non-empty array');
  }
  
  if (toolIds.length > 20) {
    throw createValidationError('Maximum 20 tools can be analyzed at once');
  }
  
  try {
    const timeRangeObj = parseTimeRange(timeRange);
    
    const analyticsPromises = toolIds.map(toolId => 
      analyticsService.getToolAnalytics(toolId, timeRangeObj)
    );
    
    const analytics = await Promise.all(analyticsPromises);
    
    const results = toolIds.map((toolId, index) => ({
      toolId,
      analytics: analytics[index]
    }));
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching batch analytics:', error);
    throw createValidationError('Failed to fetch batch analytics');
  }
}));

export default router;