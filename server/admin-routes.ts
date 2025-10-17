import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from './db';
import { users, fxns, runs, subscriptions, plans } from '../shared/schema';
import { eq, desc, count, sql, gte, and } from 'drizzle-orm';

const router = Router();

const userQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

const toolQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  status: z.enum(['pending', 'approved', 'rejected', 'flagged']).optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
});

const updateModerationSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'flagged']),
  notes: z.string().optional(),
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsersResult] = await db
      .select({ count: count() })
      .from(users);

    const [totalToolsResult] = await db
      .select({ count: count() })
      .from(fxns);

    const [totalRunsResult] = await db
      .select({ count: count() })
      .from(runs);

    const [activeProSubsResult] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));

    const [recentUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo));

    const [recentToolsResult] = await db
      .select({ count: count() })
      .from(fxns)
      .where(gte(fxns.createdAt, thirtyDaysAgo));

    const activeSubscriptionsWithPlans = await db
      .select({
        price: plans.price,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.status, 'active'));

    const totalRevenue = activeSubscriptionsWithPlans.reduce(
      (sum, sub) => sum + (sub.price || 0),
      0
    );

    res.json({
      totalUsers: totalUsersResult.count,
      totalTools: totalToolsResult.count,
      totalRuns: totalRunsResult.count,
      activeProSubscriptions: activeProSubsResult.count,
      usersLast30Days: recentUsersResult.count,
      toolsLast30Days: recentToolsResult.count,
      totalRevenue,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

router.get('/users', async (req: Request, res: Response) => {
  try {
    const query = userQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const usersData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        subscriptionStatus: users.subscriptionStatus,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(query.limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: count() })
      .from(users);

    res.json({
      users: usersData,
      total: totalResult.count,
      page: query.page,
      limit: query.limit,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/tools', async (req: Request, res: Response) => {
  try {
    const query = toolQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;

    const whereConditions = [];
    if (query.status) {
      whereConditions.push(eq(fxns.moderationStatus, query.status));
    }

    const toolsWithRunCounts = await db
      .select({
        id: fxns.id,
        title: fxns.title,
        slug: fxns.slug,
        category: fxns.category,
        isPublic: fxns.isPublic,
        moderationStatus: fxns.moderationStatus,
        createdBy: users.name,
        createdAt: fxns.createdAt,
        runCount: count(runs.id),
      })
      .from(fxns)
      .leftJoin(users, eq(fxns.createdBy, users.id))
      .leftJoin(runs, eq(fxns.id, runs.fxnId))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(fxns.id, users.name)
      .orderBy(desc(fxns.createdAt))
      .limit(query.limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: count() })
      .from(fxns)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    res.json({
      tools: toolsWithRunCounts,
      total: totalResult.count,
      page: query.page,
      limit: query.limit,
    });
  } catch (error) {
    console.error('Error fetching tools:', error);
    res.status(500).json({ error: 'Failed to fetch tools' });
  }
});

router.patch('/users/:userId/role', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = updateRoleSchema.parse(req.body);

    const [updatedUser] = await db
      .update(users)
      .set({ 
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

router.patch('/tools/:toolId/moderation', async (req: Request, res: Response) => {
  try {
    const { toolId } = req.params;
    const { status, notes } = updateModerationSchema.parse(req.body);
    const moderatorId = (req.user as any)?.id;

    if (!moderatorId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [updatedTool] = await db
      .update(fxns)
      .set({
        moderationStatus: status,
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
        moderationNotes: notes || null,
        updatedAt: new Date(),
      })
      .where(eq(fxns.id, toolId))
      .returning({
        id: fxns.id,
        title: fxns.title,
        moderationStatus: fxns.moderationStatus,
        moderatedBy: fxns.moderatedBy,
        moderatedAt: fxns.moderatedAt,
        moderationNotes: fxns.moderationNotes,
      });

    if (!updatedTool) {
      return res.status(404).json({ error: 'Tool not found' });
    }

    res.json(updatedTool);
  } catch (error) {
    console.error('Error updating tool moderation:', error);
    res.status(500).json({ error: 'Failed to update tool moderation' });
  }
});

export default router;
