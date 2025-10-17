// Admin-only routes for platform management
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { users, fxns, runs, fxnReports } from '../../shared/schema.js';
import { eq, desc, count, sql, and, gte, lte, inArray, or } from 'drizzle-orm';
import { asyncHandler, createValidationError } from '../middleware/error-handler.js';
import { 
  requireAdmin, 
  requireUserManagement,
  requireContentModeration,
  requireSubscriptionManagement,
  requireSuperAdmin,
  UserRole,
  attachUserPermissions 
} from '../middleware/admin-auth.js';

const router = Router();

// Attach user permissions to all admin routes
router.use(attachUserPermissions);

// Schema validations
const UpdateUserRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['user', 'moderator', 'admin', 'super_admin'])
});

const UserQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['user', 'moderator', 'admin', 'super_admin']).optional(),
  subscriptionStatus: z.enum(['free', 'active', 'canceled', 'past_due']).optional(),
  sortBy: z.enum(['createdAt', 'lastLoginAt', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

const BulkActionSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(50),
  action: z.enum(['suspend', 'unsuspend', 'delete', 'export'])
});

// Content moderation schemas
const ModerationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'flagged']).optional(),
  category: z.string().optional(),
  sortBy: z.enum(['createdAt', 'moderatedAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

const ModerationActionSchema = z.object({
  toolId: z.string().uuid('Invalid tool ID'),
  status: z.enum(['approved', 'rejected', 'flagged']),
  notes: z.string().optional(),
  flaggedReasons: z.array(z.string()).optional()
});

const BulkModerationSchema = z.object({
  toolIds: z.array(z.string().uuid()).min(1).max(50),
  status: z.enum(['approved', 'rejected', 'flagged']),
  notes: z.string().optional()
});

// Get all users with advanced filtering and pagination
router.get('/users', requireUserManagement, asyncHandler(async (req: Request, res: Response) => {
  const query = UserQuerySchema.parse(req.query);
  const offset = (query.page - 1) * query.limit;

  try {
    // Build where conditions
    const whereConditions = [];
    
    if (query.search) {
      whereConditions.push(sql`(LOWER(${users.email}) LIKE ${`%${query.search.toLowerCase()}%`} OR LOWER(${users.name}) LIKE ${`%${query.search.toLowerCase()}%`})`);
    }
    
    if (query.role) {
      whereConditions.push(eq(users.role, query.role));
    }
    
    if (query.subscriptionStatus) {
      whereConditions.push(eq(users.subscriptionStatus, query.subscriptionStatus));
    }

    // Get users with subscription details
    const usersData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        subscriptionStatus: users.subscriptionStatus,
        subscriptionCurrentPeriodEnd: users.subscriptionCurrentPeriodEnd,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        emailVerified: users.emailVerified,
        twoFactorEnabled: users.twoFactorEnabled,
        suspended: users.suspended,
        suspendedAt: users.suspendedAt
      })
      .from(users)
      .where(whereConditions.length > 0 ? sql.join(whereConditions, sql` AND `) : undefined)
      .orderBy(
        query.sortOrder === 'desc' 
          ? desc(users[query.sortBy]) 
          : users[query.sortBy]
      )
      .limit(query.limit)
      .offset(offset);

    // Get total count for pagination
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(users)
      .where(whereConditions.length > 0 ? sql.join(whereConditions, sql` AND `) : undefined);

    const totalPages = Math.ceil(totalCount / query.limit);

    res.json({
      success: true,
      data: {
        users: usersData,
        pagination: {
          currentPage: query.page,
          totalPages,
          totalCount,
          limit: query.limit,
          hasNext: query.page < totalPages,
          hasPrev: query.page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    throw createValidationError('Failed to fetch users');
  }
}));

// Get detailed user information
router.get('/users/:userId', requireUserManagement, asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    throw createValidationError('User ID is required');
  }

  try {
    // Get user with subscription and activity data
    const userData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        subscriptionStatus: users.subscriptionStatus,
        subscriptionCurrentPeriodEnd: users.subscriptionCurrentPeriodEnd,
        stripeCustomerId: users.stripeCustomerId,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        emailVerified: users.emailVerified,
        twoFactorEnabled: users.twoFactorEnabled
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userData.length === 0) {
      throw createValidationError('User not found');
    }

    // Get user's tool creation stats
    const [toolStats] = await db
      .select({
        totalTools: count(),
        publicTools: count(sql`CASE WHEN ${fxns.isPublic} = true THEN 1 END`)
      })
      .from(fxns)
      .where(eq(fxns.createdBy, userId));

    // Get user's recent activity
    const recentRuns = await db
      .select({
        id: runs.id,
        fxnId: runs.fxnId,
        createdAt: runs.createdAt,
        durationMs: runs.durationMs,
        fxnTitle: fxns.title
      })
      .from(runs)
      .innerJoin(fxns, eq(runs.fxnId, fxns.id))
      .where(eq(runs.userId, userId))
      .orderBy(desc(runs.createdAt))
      .limit(10);

    res.json({
      success: true,
      data: {
        user: userData[0],
        stats: {
          tools: toolStats || { totalTools: 0, publicTools: 0 },
          recentActivity: recentRuns
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    throw createValidationError('Failed to fetch user details');
  }
}));

// Update user role (super admin only for admin role changes)
router.patch('/users/:userId/role', requireUserManagement, asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { role } = UpdateUserRoleSchema.parse({ userId, ...req.body });
  const currentUserRole = (req.user as any).role;
  const currentUserId = (req.user as any).id;

  // Prevent users from changing their own role
  if (userId === currentUserId) {
    throw createValidationError('Cannot change your own role');
  }

  // Get target user's current role
  const [targetUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId));

  if (!targetUser) {
    throw createValidationError('Target user not found');
  }

  const targetCurrentRole = targetUser.role as UserRole;

  // CRITICAL: Only super admins can modify admin/super_admin accounts (promotion OR demotion)
  if ([UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(targetCurrentRole) && currentUserRole !== UserRole.SUPER_ADMIN) {
    throw createValidationError('Only super admins can modify admin or super admin accounts');
  }

  // Super admin check for admin role assignments
  if ((role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) && currentUserRole !== UserRole.SUPER_ADMIN) {
    throw createValidationError('Only super admins can assign admin roles');
  }

  // Admin check for moderator assignments
  if (role === UserRole.MODERATOR && ![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(currentUserRole)) {
    throw createValidationError('Admin privileges required to assign moderator role');
  }

  try {
    const updatedUser = await db
      .update(users)
      .set({ 
        role,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        role: users.role
      });

    if (updatedUser.length === 0) {
      throw createValidationError('User not found');
    }

    console.log(`👑 Role updated: ${updatedUser[0].email} → ${role} by ${(req.user as any).email}`);

    res.json({
      success: true,
      data: updatedUser[0],
      message: `User role updated to ${role}`
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw createValidationError('Failed to update user role');
  }
}));

// Suspend user endpoint
router.post('/users/:userId/suspend', requireUserManagement, asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    throw createValidationError('User ID is required');
  }

  try {
    const result = await db
      .update(users)
      .set({ 
        suspended: true,
        suspendedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({ 
        id: users.id, 
        email: users.email,
        suspended: users.suspended,
        suspendedAt: users.suspendedAt
      });

    if (result.length === 0) {
      throw createValidationError('User not found');
    }

    console.log(`🚫 User suspended: ${result[0].email} by ${(req.user as any).email}`);

    res.json({
      success: true,
      data: result[0],
      message: 'User suspended successfully'
    });
  } catch (error) {
    console.error('Error suspending user:', error);
    throw createValidationError('Failed to suspend user');
  }
}));

// Unsuspend user endpoint
router.post('/users/:userId/unsuspend', requireUserManagement, asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    throw createValidationError('User ID is required');
  }

  try {
    const result = await db
      .update(users)
      .set({ 
        suspended: false,
        suspendedAt: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({ 
        id: users.id, 
        email: users.email,
        suspended: users.suspended,
        suspendedAt: users.suspendedAt
      });

    if (result.length === 0) {
      throw createValidationError('User not found');
    }

    console.log(`✅ User unsuspended: ${result[0].email} by ${(req.user as any).email}`);

    res.json({
      success: true,
      data: result[0],
      message: 'User unsuspended successfully'
    });
  } catch (error) {
    console.error('Error unsuspending user:', error);
    throw createValidationError('Failed to unsuspend user');
  }
}));

// Get platform-wide user statistics
router.get('/stats/users', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const stats = await Promise.all([
      // Total users by role
      db.select({
        role: users.role,
        count: count()
      }).from(users).groupBy(users.role),
      
      // Subscription distribution
      db.select({
        status: users.subscriptionStatus,
        count: count()
      }).from(users).groupBy(users.subscriptionStatus),
      
      // Recent registrations (last 30 days)
      db.select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, sql`NOW() - INTERVAL '30 days'`)),
        
      // Users with verified emails
      db.select({ count: count() })
        .from(users)
        .where(sql`${users.emailVerified} IS NOT NULL`)
    ]);

    res.json({
      success: true,
      data: {
        roleDistribution: stats[0],
        subscriptionDistribution: stats[1],
        recentRegistrations: stats[2][0].count,
        verifiedUsers: stats[3][0].count
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw createValidationError('Failed to fetch user statistics');
  }
}));

// Bulk user actions
router.post('/users/bulk', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { userIds, action } = BulkActionSchema.parse(req.body);

  try {
    let result;
    
    switch (action) {
      case 'suspend':
      case 'unsuspend':
        result = await db
          .update(users)
          .set({ updatedAt: new Date() })
          .where(sql`${users.id} = ANY(${userIds})`)
          .returning({ id: users.id, email: users.email });
        break;
        
      case 'export':
        const exportData = await db
          .select({
            id: users.id,
            email: users.email,
            role: users.role,
            subscriptionStatus: users.subscriptionStatus,
            createdAt: users.createdAt
          })
          .from(users)
          .where(sql`${users.id} = ANY(${userIds})`);
        
        return res.json({
          success: true,
          data: exportData,
          message: `Exported ${exportData.length} users`
        });
        
      default:
        throw createValidationError('Invalid bulk action');
    }

    console.log(`🔄 Bulk ${action} performed on ${result.length} users by ${(req.user as any).email}`);

    res.json({
      success: true,
      data: result,
      message: `Bulk ${action} completed on ${result.length} users`
    });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    throw createValidationError('Failed to perform bulk action');
  }
}));

// Content Moderation Endpoints

// Get all tools for moderation review
router.get('/moderation/tools', requireContentModeration, asyncHandler(async (req: Request, res: Response) => {
  const query = ModerationQuerySchema.parse(req.query);
  const offset = (query.page - 1) * query.limit;

  try {
    // Build where conditions
    const whereConditions = [];
    
    if (query.search) {
      whereConditions.push(sql`(LOWER(${fxns.title}) LIKE ${`%${query.search.toLowerCase()}%`} OR LOWER(${fxns.description}) LIKE ${`%${query.search.toLowerCase()}%`})`);
    }
    
    if (query.status) {
      whereConditions.push(eq(fxns.moderationStatus, query.status));
    }
    
    if (query.category) {
      whereConditions.push(eq(fxns.category, query.category));
    }

    // Get tools with creator information
    const toolsData = await db
      .select({
        id: fxns.id,
        slug: fxns.slug,
        title: fxns.title,
        description: fxns.description,
        category: fxns.category,
        isPublic: fxns.isPublic,
        moderationStatus: fxns.moderationStatus,
        moderatedBy: fxns.moderatedBy,
        moderatedAt: fxns.moderatedAt,
        moderationNotes: fxns.moderationNotes,
        flaggedReasons: fxns.flaggedReasons,
        createdAt: fxns.createdAt,
        creatorName: users.name,
        creatorEmail: users.email
      })
      .from(fxns)
      .leftJoin(users, eq(fxns.createdBy, users.id))
      .where(whereConditions.length > 0 ? sql.join(whereConditions, sql` AND `) : undefined)
      .orderBy(
        query.sortOrder === 'desc' 
          ? desc(fxns[query.sortBy]) 
          : fxns[query.sortBy]
      )
      .limit(query.limit)
      .offset(offset);

    // Get total count for pagination
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(fxns)
      .where(whereConditions.length > 0 ? sql.join(whereConditions, sql` AND `) : undefined);

    const totalPages = Math.ceil(totalCount / query.limit);

    res.json({
      success: true,
      data: {
        tools: toolsData,
        pagination: {
          currentPage: query.page,
          totalPages,
          totalCount,
          limit: query.limit,
          hasNext: query.page < totalPages,
          hasPrev: query.page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching tools for moderation:', error);
    throw createValidationError('Failed to fetch tools for moderation');
  }
}));

// Update moderation status of a tool
router.post('/moderation/action', requireContentModeration, asyncHandler(async (req: Request, res: Response) => {
  const { toolId, status, notes, flaggedReasons } = ModerationActionSchema.parse(req.body);
  const moderatorId = (req.user as any).id;

  try {
    const updateData: any = {
      moderationStatus: status,
      moderatedBy: moderatorId,
      moderatedAt: new Date(),
      moderationNotes: notes || null,
      flaggedReasons: flaggedReasons || null
    };

    await db
      .update(fxns)
      .set(updateData)
      .where(eq(fxns.id, toolId));

    res.json({
      success: true,
      message: `Tool ${status} successfully`,
      data: { toolId, status, moderatedBy: moderatorId }
    });
  } catch (error) {
    console.error('Error updating moderation status:', error);
    throw createValidationError('Failed to update moderation status');
  }
}));

// Bulk moderation actions
router.post('/moderation/bulk', requireContentModeration, asyncHandler(async (req: Request, res: Response) => {
  const { toolIds, status, notes } = BulkModerationSchema.parse(req.body);
  const moderatorId = (req.user as any).id;

  try {
    const updateData: any = {
      moderationStatus: status,
      moderatedBy: moderatorId,
      moderatedAt: new Date(),
      moderationNotes: notes || null
    };

    await db
      .update(fxns)
      .set(updateData)
      .where(sql`${fxns.id} = ANY(${toolIds})`);

    res.json({
      success: true,
      message: `${toolIds.length} tools ${status} successfully`,
      data: { 
        count: toolIds.length, 
        status, 
        moderatedBy: moderatorId 
      }
    });
  } catch (error) {
    console.error('Error performing bulk moderation:', error);
    throw createValidationError('Failed to perform bulk moderation');
  }
}));

// Get moderation statistics
router.get('/moderation/stats', requireContentModeration, asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get overall moderation stats
    const [moderationStats] = await db
      .select({
        totalTools: count(),
        pendingTools: count(sql`CASE WHEN ${fxns.moderationStatus} = 'pending' THEN 1 END`),
        approvedTools: count(sql`CASE WHEN ${fxns.moderationStatus} = 'approved' THEN 1 END`),
        rejectedTools: count(sql`CASE WHEN ${fxns.moderationStatus} = 'rejected' THEN 1 END`),
        flaggedTools: count(sql`CASE WHEN ${fxns.moderationStatus} = 'flagged' THEN 1 END`)
      })
      .from(fxns);

    // Get recent moderation activity
    const recentActivity = await db
      .select({
        id: fxns.id,
        title: fxns.title,
        moderationStatus: fxns.moderationStatus,
        moderatedAt: fxns.moderatedAt,
        moderatorName: users.name
      })
      .from(fxns)
      .leftJoin(users, eq(fxns.moderatedBy, users.id))
      .where(sql`${fxns.moderatedAt} IS NOT NULL`)
      .orderBy(desc(fxns.moderatedAt))
      .limit(10);

    res.json({
      success: true,
      data: {
        stats: moderationStats,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error fetching moderation stats:', error);
    throw createValidationError('Failed to fetch moderation statistics');
  }
}));

// Get moderation queue - tools and reports needing attention
router.get('/moderation-queue', requireContentModeration, asyncHandler(async (req: Request, res: Response) => {
  try {
    const toolsNeedingModeration = await db
      .select({
        id: fxns.id,
        title: fxns.title,
        slug: fxns.slug,
        moderationStatus: fxns.moderationStatus,
        flaggedReasons: fxns.flaggedReasons,
        createdBy: users.name,
        createdAt: fxns.createdAt
      })
      .from(fxns)
      .leftJoin(users, eq(fxns.createdBy, users.id))
      .where(or(
        eq(fxns.moderationStatus, 'pending'),
        eq(fxns.moderationStatus, 'flagged')
      ))
      .orderBy(desc(fxns.createdAt))
      .limit(50);

    const openReports = await db
      .select({
        id: fxnReports.id,
        fxnId: fxnReports.fxnId,
        fxnTitle: fxns.title,
        reporterId: fxnReports.reporterId,
        reporterName: users.name,
        reason: fxnReports.reason,
        details: fxnReports.details,
        createdAt: fxnReports.createdAt
      })
      .from(fxnReports)
      .innerJoin(fxns, eq(fxnReports.fxnId, fxns.id))
      .leftJoin(users, eq(fxnReports.reporterId, users.id))
      .where(eq(fxnReports.status, 'open'))
      .orderBy(desc(fxnReports.createdAt))
      .limit(50);

    res.json({
      tools: toolsNeedingModeration,
      reports: openReports
    });
  } catch (error) {
    console.error('Error fetching moderation queue:', error);
    throw createValidationError('Failed to fetch moderation queue');
  }
}));

// Resolve a report
router.patch('/reports/:reportId/resolve', requireContentModeration, asyncHandler(async (req: Request, res: Response) => {
  const { reportId } = req.params;

  if (!reportId) {
    throw createValidationError('Report ID is required');
  }

  try {
    const [updatedReport] = await db
      .update(fxnReports)
      .set({
        status: 'resolved',
        updatedAt: new Date()
      })
      .where(eq(fxnReports.id, reportId))
      .returning({
        id: fxnReports.id,
        fxnId: fxnReports.fxnId,
        status: fxnReports.status,
        updatedAt: fxnReports.updatedAt
      });

    if (!updatedReport) {
      throw createValidationError('Report not found');
    }

    console.log(`📝 Report ${reportId} resolved by ${(req.user as any).email}`);

    res.json({
      success: true,
      data: updatedReport,
      message: 'Report resolved successfully'
    });
  } catch (error) {
    console.error('Error resolving report:', error);
    throw createValidationError('Failed to resolve report');
  }
}));

export default router;