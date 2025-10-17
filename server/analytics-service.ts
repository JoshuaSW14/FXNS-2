import { db } from "./db.js";
import { 
  fxns, 
  runs, 
  favorites, 
  toolUsageStats, 
  aiUsage, 
  users, 
  toolDrafts,
  subscriptions,
  plans
} from "../shared/schema.js";
import { eq, and, gte, lte, desc, sql, count, avg, sum, isNull } from "drizzle-orm";
import { websocketService } from "./websocket-service.js";

// Comprehensive analytics types
export interface ToolAnalytics {
  totalRuns: number;
  successfulRuns: number;
  failureRate: number;
  averageRunTime: number;
  uniqueUsers: number;
  lastUsed: Date | null;
  popularityRank: number;
  usageGrowth: number;
}

export interface UserEngagementMetrics {
  totalSessions: number;
  averageSessionDuration: number;
  toolsCreated: number;
  toolsPublished: number;
  favoriteTools: number;
  lastActive: Date | null;
  retentionScore: number;
  engagementLevel: 'high' | 'medium' | 'low';
}

export interface PlatformAnalytics {
  totalTools: number;
  activeTools: number;
  totalUsers: number;
  activeUsers: number;
  totalRuns: number;
  successRate: number;
  avgRunTime: number;
  topCategories: Array<{ category: string; count: number; usage: number }>;
  growthMetrics: {
    toolsThisMonth: number;
    usersThisMonth: number;
    runsThisMonth: number;
    monthOverMonthGrowth: {
      tools: number;
      users: number;
      usage: number;
    };
  };
  performanceMetrics: {
    p95RunTime: number;
    errorRate: number;
    uptime: number;
  };
}

export interface ProAnalytics {
  subscriptionMetrics: {
    totalSubscribers: number;
    newSubscribersThisMonth: number;
    churnRate: number;
    monthlyRecurringRevenue: number;
  };
  featureUsage: {
    aiRequests: number;
    aiCost: number;
    advancedFeatures: number;
    storageUsed: number;
  };
  conversionMetrics: {
    freeToProConversion: number;
    trialConversion: number;
    averageTimeToConvert: number;
  };
}

class AnalyticsService {
  
  // Track tool usage with detailed metrics
  async trackToolUsage(
    userId: string, 
    toolId: string, 
    executionTime: number, 
    success: boolean,
    draftId?: string
  ): Promise<void> {
    try {
      // Check if usage stats record exists for this user-tool combination
      const existingStats = await db
        .select()
        .from(toolUsageStats)
        .where(and(
          eq(toolUsageStats.userId, userId),
          eq(toolUsageStats.toolId, toolId)
        ))
        .limit(1);

      if (existingStats.length > 0) {
        // Update existing record with new metrics
        const stats = existingStats[0];
        const newRunCount = stats.runCount + 1;
        const newSuccessfulRuns = success ? stats.successfulRuns + 1 : stats.successfulRuns;
        const newAverageRunTime = Math.round(
          ((stats.averageRunTime || 0) * stats.runCount + executionTime) / newRunCount
        );

        await db
          .update(toolUsageStats)
          .set({
            runCount: newRunCount,
            successfulRuns: newSuccessfulRuns,
            averageRunTime: newAverageRunTime,
            lastUsed: new Date(),
          })
          .where(eq(toolUsageStats.id, stats.id));
      } else {
        // Create new usage stats record
        await db.insert(toolUsageStats).values({
          userId,
          toolId,
          draftId: draftId || null,
          runCount: 1,
          successfulRuns: success ? 1 : 0,
          averageRunTime: executionTime,
          lastUsed: new Date(),
        });
      }

      console.log(`📊 Tracked tool usage: ${toolId}, execution: ${executionTime}ms, success: ${success}`);
      
      // Broadcast real-time analytics update to the user
      websocketService.broadcastToolUsage(userId, toolId, executionTime, success);
    } catch (error) {
      console.error('Error tracking tool usage:', error);
      // Don't throw - analytics shouldn't break the main flow
    }
  }

  // Get comprehensive tool analytics
  async getToolAnalytics(toolId: string, timeRange?: { start: Date; end: Date }): Promise<ToolAnalytics> {
    const whereConditions = [eq(toolUsageStats.toolId, toolId)];
    
    if (timeRange) {
      whereConditions.push(
        gte(toolUsageStats.lastUsed, timeRange.start),
        lte(toolUsageStats.lastUsed, timeRange.end)
      );
    }

    const [
      usageStats,
      runsStats,
      uniqueUsersResult,
      lastUsedResult
    ] = await Promise.all([
      // Usage statistics
      db
        .select({
          totalRuns: sql<number>`COALESCE(SUM(${toolUsageStats.runCount}), 0)`,
          successfulRuns: sql<number>`COALESCE(SUM(${toolUsageStats.successfulRuns}), 0)`,
          avgRunTime: sql<number>`COALESCE(AVG(${toolUsageStats.averageRunTime}), 0)`
        })
        .from(toolUsageStats)
        .where(and(...whereConditions)),
      
      // Run statistics from runs table  
      db
        .select({ 
          count: count(),
          avgDuration: sql<number>`AVG(${runs.durationMs})`
        })
        .from(runs)
        .where(eq(runs.fxnId, toolId)),
      
      // Unique users
      db
        .select({ 
          uniqueUsers: sql<number>`COUNT(DISTINCT ${toolUsageStats.userId})` 
        })
        .from(toolUsageStats)
        .where(and(...whereConditions)),
      
      // Last usage
      db
        .select({ lastUsed: toolUsageStats.lastUsed })
        .from(toolUsageStats)
        .where(and(...whereConditions))
        .orderBy(desc(toolUsageStats.lastUsed))
        .limit(1)
    ]);

    const totalRuns = usageStats[0]?.totalRuns || runsStats[0]?.count || 0;
    const successfulRuns = usageStats[0]?.successfulRuns || 0;
    const failureRate = totalRuns > 0 ? Math.round(((totalRuns - successfulRuns) / totalRuns) * 100) / 100 : 0;

    return {
      totalRuns,
      successfulRuns,
      failureRate,
      averageRunTime: Math.round(usageStats[0]?.avgRunTime || 0),
      uniqueUsers: uniqueUsersResult[0]?.uniqueUsers || 0,
      lastUsed: lastUsedResult[0]?.lastUsed || null,
      popularityRank: 0, // Will be calculated in getPlatformAnalytics
      usageGrowth: 0, // Will be calculated by comparing time periods
    };
  }

  // Get user engagement metrics
  async getUserEngagementMetrics(userId: string): Promise<UserEngagementMetrics> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      toolsData,
      draftsData,
      favoritesData,
      usageData,
      lastActiveData
    ] = await Promise.all([
      // Tools created
      db
        .select({ count: count() })
        .from(fxns)
        .where(eq(fxns.createdBy, userId)),
      
      // Drafts and published tools
      db
        .select({ 
          total: count(),
          published: sql<number>`SUM(CASE WHEN ${toolDrafts.status} = 'published' THEN 1 ELSE 0 END)`
        })
        .from(toolDrafts)
        .where(and(
          eq(toolDrafts.userId, userId),
          isNull(toolDrafts.deletedAt)
        )),
      
      // Favorites
      db
        .select({ count: count() })
        .from(favorites)
        .where(eq(favorites.userId, userId)),
      
      // Usage patterns
      db
        .select({
          totalRuns: sql<number>`COALESCE(SUM(${toolUsageStats.runCount}), 0)`,
          recentActivity: sql<number>`COUNT(CASE WHEN ${toolUsageStats.lastUsed} >= ${thirtyDaysAgo} THEN 1 END)`
        })
        .from(toolUsageStats)
        .where(eq(toolUsageStats.userId, userId)),
      
      // Last active
      db
        .select({ lastUsed: toolUsageStats.lastUsed })
        .from(toolUsageStats)
        .where(eq(toolUsageStats.userId, userId))
        .orderBy(desc(toolUsageStats.lastUsed))
        .limit(1)
    ]);

    const toolsCreated = toolsData[0]?.count || 0;
    const toolsPublished = draftsData[0]?.published || 0;
    const totalRuns = usageData[0]?.totalRuns || 0;
    const recentActivity = usageData[0]?.recentActivity || 0;

    // Calculate engagement level based on activity
    let engagementLevel: 'high' | 'medium' | 'low' = 'low';
    if (recentActivity > 10 && toolsCreated > 2) {
      engagementLevel = 'high';
    } else if (recentActivity > 3 || toolsCreated > 0) {
      engagementLevel = 'medium';
    }

    // Calculate retention score (0-100)
    const retentionScore = Math.min(
      100,
      Math.round(
        (recentActivity * 10) + 
        (toolsCreated * 15) + 
        (toolsPublished * 20) + 
        (favoritesData[0]?.count || 0) * 5
      )
    );

    return {
      totalSessions: totalRuns,
      averageSessionDuration: 0, // Would need session tracking
      toolsCreated,
      toolsPublished,
      favoriteTools: favoritesData[0]?.count || 0,
      lastActive: lastActiveData[0]?.lastUsed || null,
      retentionScore,
      engagementLevel,
    };
  }

  // Get comprehensive platform analytics
  async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      toolsStats,
      usersStats,
      runsStats,
      categoryStats,
      monthlyGrowth,
      performanceStats
    ] = await Promise.all([
      // Tools statistics
      db
        .select({
          total: count(),
          active: sql<number>`COUNT(CASE WHEN ${fxns.isPublic} = true THEN 1 END)`,
          thisMonth: sql<number>`COUNT(CASE WHEN ${fxns.createdAt} >= ${startOfMonth} THEN 1 END)`
        })
        .from(fxns),
      
      // Users statistics
      db
        .select({
          total: count(),
          thisMonth: sql<number>`COUNT(CASE WHEN ${users.createdAt} >= ${startOfMonth} THEN 1 END)`
        })
        .from(users),
      
      // Runs statistics
      db
        .select({
          total: count(),
          thisMonth: sql<number>`COUNT(CASE WHEN ${runs.createdAt} >= ${startOfMonth} THEN 1 END)`,
          avgDuration: sql<number>`AVG(${runs.durationMs})`
        })
        .from(runs),
      
      // Category statistics
      db
        .select({
          category: fxns.category,
          count: count(),
          usage: sql<number>`COALESCE(SUM(run_counts.run_count), 0)`
        })
        .from(fxns)
        .leftJoin(
          sql`(
            SELECT tool_id, SUM(run_count) as run_count 
            FROM tool_usage_stats 
            GROUP BY tool_id
          ) as run_counts`,
          sql`run_counts.tool_id = ${fxns.id}`
        )
        .groupBy(fxns.category)
        .orderBy(desc(sql`count`)),
      
      // Monthly growth comparison
      Promise.all([
        // This month vs last month - tools
        db
          .select({ count: count() })
          .from(fxns)
          .where(
            and(
              gte(fxns.createdAt, startOfLastMonth),
              lte(fxns.createdAt, endOfLastMonth)
            )
          ),
        // This month vs last month - users  
        db
          .select({ count: count() })
          .from(users)
          .where(
            and(
              gte(users.createdAt, startOfLastMonth),
              lte(users.createdAt, endOfLastMonth)
            )
          ),
        // This month vs last month - usage
        db
          .select({ 
            totalRuns: sql<number>`COALESCE(SUM(${toolUsageStats.runCount}), 0)`
          })
          .from(toolUsageStats)
          .where(
            and(
              gte(toolUsageStats.lastUsed, startOfLastMonth),
              lte(toolUsageStats.lastUsed, endOfLastMonth)
            )
          )
      ]),
      
      // Performance metrics
      db
        .select({
          avgRunTime: sql<number>`AVG(${toolUsageStats.averageRunTime})`,
          p95RunTime: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${toolUsageStats.averageRunTime})`,
          successRate: sql<number>`AVG(CASE WHEN ${toolUsageStats.successfulRuns} > 0 THEN 1.0 ELSE 0.0 END)`
        })
        .from(toolUsageStats)
    ]);

    const [lastMonthTools, lastMonthUsers, lastMonthUsage] = monthlyGrowth;

    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      totalTools: toolsStats[0]?.total || 0,
      activeTools: toolsStats[0]?.active || 0,
      totalUsers: usersStats[0]?.total || 0,
      activeUsers: 0, // Would need session tracking
      totalRuns: runsStats[0]?.total || 0,
      successRate: performanceStats[0]?.successRate || 0,
      avgRunTime: Math.round(runsStats[0]?.avgDuration || 0),
      topCategories: categoryStats.map(cat => ({
        category: cat.category || 'uncategorized',
        count: cat.count || 0,
        usage: cat.usage || 0,
      })),
      growthMetrics: {
        toolsThisMonth: toolsStats[0]?.thisMonth || 0,
        usersThisMonth: usersStats[0]?.thisMonth || 0,
        runsThisMonth: runsStats[0]?.thisMonth || 0,
        monthOverMonthGrowth: {
          tools: calculateGrowth(
            toolsStats[0]?.thisMonth || 0,
            lastMonthTools[0]?.count || 0
          ),
          users: calculateGrowth(
            usersStats[0]?.thisMonth || 0,
            lastMonthUsers[0]?.count || 0
          ),
          usage: calculateGrowth(
            runsStats[0]?.thisMonth || 0,
            lastMonthUsage[0]?.totalRuns || 0
          ),
        },
      },
      performanceMetrics: {
        p95RunTime: Math.round(performanceStats[0]?.p95RunTime || 0),
        errorRate: Math.round((1 - (performanceStats[0]?.successRate || 1)) * 100) / 100,
        uptime: 99.9, // Would need uptime monitoring
      },
    };
  }

  // Get Pro subscription analytics
  async getProAnalytics(): Promise<ProAnalytics> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      subscriptionStats,
      aiUsageStats,
      conversionStats
    ] = await Promise.all([
      // Subscription metrics
      db
        .select({
          totalActive: sql<number>`COUNT(CASE WHEN ${subscriptions.status} = 'active' THEN 1 END)`,
          newThisMonth: sql<number>`COUNT(CASE WHEN ${subscriptions.createdAt} >= ${startOfMonth} AND ${subscriptions.status} = 'active' THEN 1 END)`,
          churned: sql<number>`COUNT(CASE WHEN ${subscriptions.status} = 'cancelled' AND ${subscriptions.updatedAt} >= ${startOfMonth} THEN 1 END)`
        })
        .from(subscriptions)
        .innerJoin(plans, eq(subscriptions.planId, plans.id))
        .where(eq(plans.code, 'pro')),
      
      // AI usage and costs
      db
        .select({
          totalRequests: count(),
          totalCost: sql<number>`COALESCE(SUM(${aiUsage.cost}), 0)`,
          thisMonthRequests: sql<number>`COUNT(CASE WHEN ${aiUsage.createdAt} >= ${startOfMonth} THEN 1 END)`,
          thisMonthCost: sql<number>`COALESCE(SUM(CASE WHEN ${aiUsage.createdAt} >= ${startOfMonth} THEN ${aiUsage.cost} END), 0)`
        })
        .from(aiUsage),
      
      // Conversion metrics (simplified)
      db
        .select({
          totalFreeUsers: sql<number>`COUNT(CASE WHEN pro_subs.id IS NULL THEN 1 END)`,
          totalProUsers: sql<number>`COUNT(CASE WHEN pro_subs.id IS NOT NULL THEN 1 END)`
        })
        .from(users)
        .leftJoin(
          sql`(
            SELECT DISTINCT user_id, id 
            FROM subscriptions s
            INNER JOIN plans p ON s.plan_id = p.id
            WHERE p.code = 'pro' AND s.status = 'active'
          ) as pro_subs`,
          sql`pro_subs.user_id = ${users.id}`
        )
    ]);

    const totalSubscribers = subscriptionStats[0]?.totalActive || 0;
    const newSubscribers = subscriptionStats[0]?.newThisMonth || 0;
    const churned = subscriptionStats[0]?.churned || 0;
    
    return {
      subscriptionMetrics: {
        totalSubscribers,
        newSubscribersThisMonth: newSubscribers,
        churnRate: totalSubscribers > 0 ? Math.round((churned / totalSubscribers) * 100) / 100 : 0,
        monthlyRecurringRevenue: totalSubscribers * 20, // $20/month per Pro user
      },
      featureUsage: {
        aiRequests: aiUsageStats[0]?.thisMonthRequests || 0,
        aiCost: aiUsageStats[0]?.thisMonthCost || 0,
        advancedFeatures: 0, // Would need feature usage tracking
        storageUsed: 0, // Would need storage tracking
      },
      conversionMetrics: {
        freeToProConversion: conversionStats[0]?.totalFreeUsers > 0 
          ? Math.round((conversionStats[0]?.totalProUsers / (conversionStats[0]?.totalFreeUsers + conversionStats[0]?.totalProUsers)) * 100) / 100 
          : 0,
        trialConversion: 0, // Would need trial tracking
        averageTimeToConvert: 0, // Would need conversion timeline tracking
      },
    };
  }

  // Get user's personal dashboard analytics
  async getUserDashboardAnalytics(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      myToolsStats,
      usageStats,
      engagementMetrics,
      recentActivity,
      topTools
    ] = await Promise.all([
      // My tools statistics
      db
        .select({
          totalTools: count(),
          publishedTools: sql<number>`COUNT(CASE WHEN ${fxns.isPublic} = true THEN 1 END)`,
          totalViews: sql<number>`COALESCE(SUM(tool_stats.run_count), 0)`,
          totalFavorites: sql<number>`COALESCE(SUM(tool_stats.favorite_count), 0)`
        })
        .from(fxns)
        .leftJoin(
          sql`(
            SELECT 
              tool_id,
              SUM(run_count) as run_count,
              COUNT(DISTINCT user_id) as favorite_count
            FROM tool_usage_stats 
            GROUP BY tool_id
          ) as tool_stats`,
          sql`tool_stats.tool_id = ${fxns.id}`
        )
        .where(eq(fxns.createdBy, userId)),
      
      // Usage patterns
      db
        .select({
          totalRuns: sql<number>`COALESCE(SUM(${toolUsageStats.runCount}), 0)`,
          avgRunTime: sql<number>`COALESCE(AVG(${toolUsageStats.averageRunTime}), 0)`,
          successRate: sql<number>`AVG(CASE WHEN ${toolUsageStats.successfulRuns} > 0 THEN ${toolUsageStats.successfulRuns}::float / ${toolUsageStats.runCount} ELSE 0 END)`
        })
        .from(toolUsageStats)
        .where(eq(toolUsageStats.userId, userId)),
      
      // Get engagement metrics
      this.getUserEngagementMetrics(userId),
      
      // Recent activity
      db
        .select({
          toolId: toolUsageStats.toolId,
          toolName: fxns.title,
          lastUsed: toolUsageStats.lastUsed,
          runCount: toolUsageStats.runCount
        })
        .from(toolUsageStats)
        .innerJoin(fxns, eq(toolUsageStats.toolId, fxns.id))
        .where(
          and(
            eq(toolUsageStats.userId, userId),
            gte(toolUsageStats.lastUsed, thirtyDaysAgo)
          )
        )
        .orderBy(desc(toolUsageStats.lastUsed))
        .limit(10),
      
      // Top performing tools I created
      db
        .select({
          toolId: fxns.id,
          toolName: fxns.title,
          category: fxns.category,
          totalRuns: sql<number>`COALESCE(SUM(${toolUsageStats.runCount}), 0)`,
          uniqueUsers: sql<number>`COUNT(DISTINCT ${toolUsageStats.userId})`
        })
        .from(fxns)
        .leftJoin(toolUsageStats, eq(fxns.id, toolUsageStats.toolId))
        .where(eq(fxns.createdBy, userId))
        .groupBy(fxns.id, fxns.title, fxns.category)
        .orderBy(desc(sql`COALESCE(SUM(${toolUsageStats.runCount}), 0)`))
        .limit(5)
    ]);

    return {
      myTools: {
        total: myToolsStats[0]?.totalTools || 0,
        published: myToolsStats[0]?.publishedTools || 0,
        totalViews: myToolsStats[0]?.totalViews || 0,
        totalFavorites: myToolsStats[0]?.totalFavorites || 0,
      },
      usage: {
        totalRuns: usageStats[0]?.totalRuns || 0,
        averageRunTime: Math.round(usageStats[0]?.avgRunTime || 0),
        successRate: Math.round((usageStats[0]?.successRate || 0) * 100) / 100,
      },
      engagement: engagementMetrics,
      recentActivity,
      topTools,
      insights: this.generateUserInsights(myToolsStats[0], usageStats[0], engagementMetrics),
    };
  }

  // Generate actionable insights for users
  private generateUserInsights(toolsStats: any, usageStats: any, engagement: UserEngagementMetrics): string[] {
    const insights: string[] = [];
    
    if (engagement.engagementLevel === 'high') {
      insights.push('🔥 You\'re a power user! Your engagement is in the top tier.');
    }
    
    if (toolsStats?.totalTools > 0 && toolsStats?.publishedTools === 0) {
      insights.push('📝 Consider publishing some of your tools to share with the community.');
    }
    
    if (usageStats?.successRate < 0.8) {
      insights.push('⚠️ Some tools might need optimization - your success rate could be improved.');
    }
    
    if (engagement.toolsCreated > 5) {
      insights.push('🏆 Tool creator extraordinaire! You\'ve built an impressive collection.');
    }
    
    if (usageStats?.avgRunTime > 5000) {
      insights.push('⏱️ Consider optimizing tool performance - average run time is above 5 seconds.');
    }

    return insights;
  }
}

export const analyticsService = new AnalyticsService();