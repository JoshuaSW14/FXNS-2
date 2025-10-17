import { db } from './db';
import { users, aiUsage, subscriptions, plans, fxns, runs } from '../shared/schema';
import { eq, and, sql, gte, lte } from 'drizzle-orm';

// Pro plan limits and features
export const PRO_LIMITS = {
    FREE_PLAN: {
        aiRequestsPerMonth: 10,
        maxTasks: 50,
        maxNotes: 20,
        maxAutomationRules: 2,
        maxFileUploads: 2, // Audio files per month
        features: ['basic_tasks', 'basic_notes', 'community_feed']
    },
    PRO_PLAN: {
        aiRequestsPerMonth: 1000,
        maxTasks: -1, // Unlimited
        maxNotes: -1, // Unlimited
        maxAutomationRules: 50,
        maxFileUploads: 100, // Audio files per month
        features: [
            'basic_tasks', 'basic_notes', 'community_feed',
            'ai_task_prioritization', 'ai_transcript_analysis', 
            'ai_smart_scheduling', 'advanced_automation', 'ai_audio_transcription',
            'ai_notes_analysis', 'ai_tool_suggestions', 'ai_code_generation',
            'ai_template_recommendations', 'ai_tool_analysis', 'priority_support',
            // API Integration Pro Features
            'api_integration_advanced', 'api_webhooks', 'api_automation',
            'custom_authentication', 'enterprise_integrations',
            // Analytics & Insights Pro Features  
            'advanced_analytics', 'usage_insights', 'performance_analytics',
            'custom_dashboards', 'export_analytics',
            // Team & Collaboration Pro Features
            'team_workspaces', 'tool_sharing', 'team_analytics',
            'role_management', 'team_templates'
        ]
    }
};

export const AI_FEATURE_COSTS = {
    'ai_task_prioritization': 1,
    'ai_transcript_analysis': 3,
    'ai_smart_scheduling': 2,
    'ai_notes_analysis': 1,
    'ai_audio_transcription': 5,
    'ai_tool_suggestions': 2,
    'ai_code_generation': 4,
    'ai_template_recommendations': 2,
    'ai_tool_analysis': 3
};

export const API_INTEGRATION_LIMITS = {
    FREE_PLAN: {
        maxApiConfigurations: 2,
        maxApiCallsPerMonth: 100,
        maxWebhookEndpoints: 1,
        allowedAuthTypes: ['api_key', 'basic'],
        maxRequestSizeKB: 10,
        maxResponseSizeKB: 10
    },
    PRO_PLAN: {
        maxApiConfigurations: 50,
        maxApiCallsPerMonth: 10000,
        maxWebhookEndpoints: 25,
        allowedAuthTypes: ['api_key', 'basic', 'bearer', 'custom'],
        maxRequestSizeKB: 100,
        maxResponseSizeKB: 100,
        customHeaders: true,
        rateLimitOverride: true,
        webhookRetries: true,
        apiAnalytics: true
    }
};

interface UserSubscription {
    id: string;
    userId: string;
    planId: string;
    provider: string;
    status: string;
    currentPeriodEnd: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

interface UsageStats {
    aiRequestsThisMonth: number;
    currentTasks: number;
    currentNotes: number;
    currentAutomationRules: number;
    fileUploadsThisMonth: number;
    // API Integration Usage
    apiConfigurationsCount: number;
    apiCallsThisMonth: number;
    webhookEndpointsCount: number;
    // Tool Creation Usage
    toolsCreated: number;
    toolRunsThisMonth: number;
    // Team Usage (for Pro)
    teamMembersCount: number;
    sharedToolsCount: number;
}

class ProService {
    private proCache = new Map<string, { hasPro: boolean; expiresAt: number }>();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    // Check if user has Pro subscription (with caching)
    async hasProSubscription(userId: string): Promise<boolean> {
        // Check cache first
        const cached = this.proCache.get(userId);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.hasPro;
        }

        try {
            const subscription = await db
                .select({
                    id: subscriptions.id,
                    planCode: plans.code
                })
                .from(subscriptions)
                .innerJoin(plans, eq(subscriptions.planId, plans.id))
                .where(
                    and(
                        eq(subscriptions.userId, userId),
                        eq(subscriptions.status, 'active'),
                        gte(subscriptions.currentPeriodEnd, new Date())
                    )
                )
                .limit(1);

            const hasPro = subscription.length > 0 && subscription[0].planCode === 'pro';
            
            // Cache the result
            this.proCache.set(userId, {
                hasPro,
                expiresAt: Date.now() + this.CACHE_TTL
            });

            return hasPro;
        } catch (error) {
            console.error('Error checking Pro subscription:', error);
            return false;
        }
    }

    // Clear Pro cache for a user (call when subscription changes)
    clearProCache(userId: string): void {
        this.proCache.delete(userId);
    }

    // Get user's current plan limits
    async getUserLimits(userId: string) {
        const hasPro = await this.hasProSubscription(userId);
        return hasPro ? PRO_LIMITS.PRO_PLAN : PRO_LIMITS.FREE_PLAN;
    }

    // Get current usage statistics for user
    async getUserUsage(userId: string): Promise<UsageStats> {
        try {
            const currentMonth = new Date();
            currentMonth.setDate(1);
            currentMonth.setHours(0, 0, 0, 0);
            
            const nextMonth = new Date(currentMonth);
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            // AI requests this month
            const aiRequestsResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(aiUsage)
                .where(
                    and(
                        eq(aiUsage.userId, userId),
                        gte(aiUsage.createdAt, currentMonth),
                        lte(aiUsage.createdAt, nextMonth)
                    )
                );

            // File uploads this month (from AI usage with ai_audio_transcription feature)
            const fileUploadsResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(aiUsage)
                .where(
                    and(
                        eq(aiUsage.userId, userId),
                        eq(aiUsage.feature, 'ai_audio_transcription'),
                        gte(aiUsage.createdAt, currentMonth),
                        lte(aiUsage.createdAt, nextMonth)
                    )
                );

            // Current active items count (simplified for now)
            const currentTasksResult = [{ count: 0 }]; // Placeholder - would implement proper counting

            // API Integration usage (safely handle missing tables)
            let apiConfigsResult = [{ count: 0 }];
            let apiCallsResult = [{ count: 0 }];
            let webhookEndpointsResult = [{ count: 0 }];
            
            try {
                // Try to query API tables if they exist
                const { apiConfigurations, apiUsageLogs, webhookEndpoints } = await import('../shared/schema');
                
                apiConfigsResult = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(apiConfigurations)
                    .where(eq(apiConfigurations.userId, userId));

                apiCallsResult = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(apiUsageLogs)
                    .where(
                        and(
                            eq(apiUsageLogs.userId, userId),
                            gte(apiUsageLogs.createdAt, currentMonth),
                            lte(apiUsageLogs.createdAt, nextMonth)
                        )
                    );

                webhookEndpointsResult = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(webhookEndpoints)
                    .where(eq(webhookEndpoints.userId, userId));
            } catch (importError) {
                // API integration tables not yet available, use defaults
                console.log('API integration tables not available yet, using default values');
            }

            // Tool creation usage
            const toolsCreatedResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(fxns)
                .where(eq(fxns.createdBy, userId));

            const toolRunsResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(runs)
                .where(
                    and(
                        eq(runs.userId, userId),
                        gte(runs.createdAt, currentMonth),
                        lte(runs.createdAt, nextMonth)
                    )
                );

            return {
                aiRequestsThisMonth: aiRequestsResult[0]?.count || 0,
                currentTasks: 0, // Would implement proper counting
                currentNotes: 0,
                currentAutomationRules: 0,
                fileUploadsThisMonth: fileUploadsResult[0]?.count || 0,
                // API Integration Usage
                apiConfigurationsCount: apiConfigsResult[0]?.count || 0,
                apiCallsThisMonth: apiCallsResult[0]?.count || 0,
                webhookEndpointsCount: webhookEndpointsResult[0]?.count || 0,
                // Tool Creation Usage
                toolsCreated: toolsCreatedResult[0]?.count || 0,
                toolRunsThisMonth: toolRunsResult[0]?.count || 0,
                // Team Usage (placeholder for future implementation)
                teamMembersCount: 0,
                sharedToolsCount: 0
            };
        } catch (error) {
            console.error('Error getting user usage:', error);
            return {
                aiRequestsThisMonth: 0,
                currentTasks: 0,
                currentNotes: 0,
                currentAutomationRules: 0,
                fileUploadsThisMonth: 0,
                apiConfigurationsCount: 0,
                apiCallsThisMonth: 0,
                webhookEndpointsCount: 0,
                toolsCreated: 0,
                toolRunsThisMonth: 0,
                teamMembersCount: 0,
                sharedToolsCount: 0
            };
        }
    }

    // Get API integration limits for user
    async getApiIntegrationLimits(userId: string) {
        const hasPro = await this.hasProSubscription(userId);
        return hasPro ? API_INTEGRATION_LIMITS.PRO_PLAN : API_INTEGRATION_LIMITS.FREE_PLAN;
    }

    // Check if user can create API configuration
    async canCreateApiConfiguration(userId: string): Promise<{
        allowed: boolean;
        reason?: string;
        upgradeRequired?: boolean;
        limits?: any;
    }> {
        try {
            const limits = await this.getApiIntegrationLimits(userId);
            const usage = await this.getUserUsage(userId);

            if (usage.apiConfigurationsCount >= limits.maxApiConfigurations) {
                return {
                    allowed: false,
                    reason: `API configuration limit reached (${limits.maxApiConfigurations})`,
                    upgradeRequired: !await this.hasProSubscription(userId),
                    limits
                };
            }

            return { allowed: true, limits };
        } catch (error) {
            console.error('Error checking API configuration limits:', error);
            return { allowed: false, reason: 'Error checking API limits' };
        }
    }

    // Check if user can make API call
    async canMakeApiCall(userId: string): Promise<{
        allowed: boolean;
        reason?: string;
        upgradeRequired?: boolean;
        usage?: any;
    }> {
        try {
            const limits = await this.getApiIntegrationLimits(userId);
            const usage = await this.getUserUsage(userId);

            if (usage.apiCallsThisMonth >= limits.maxApiCallsPerMonth) {
                return {
                    allowed: false,
                    reason: `Monthly API call limit reached (${limits.maxApiCallsPerMonth})`,
                    upgradeRequired: !await this.hasProSubscription(userId),
                    usage: {
                        current: usage.apiCallsThisMonth,
                        limit: limits.maxApiCallsPerMonth,
                        remaining: 0
                    }
                };
            }

            return {
                allowed: true,
                usage: {
                    current: usage.apiCallsThisMonth,
                    limit: limits.maxApiCallsPerMonth,
                    remaining: limits.maxApiCallsPerMonth - usage.apiCallsThisMonth
                }
            };
        } catch (error) {
            console.error('Error checking API call limits:', error);
            return { allowed: false, reason: 'Error checking API call limits' };
        }
    }

    // Get advanced analytics for Pro users
    async getAdvancedAnalytics(userId: string): Promise<any> {
        const hasPro = await this.hasProSubscription(userId);
        if (!hasPro) {
            return { error: 'Advanced analytics requires Pro subscription' };
        }

        try {
            const usage = await this.getUserUsage(userId);
            const currentMonth = new Date();
            currentMonth.setDate(1);
            currentMonth.setHours(0, 0, 0, 0);

            // Tool performance analytics
            const topToolsResult = await db
                .select({
                    fxnId: runs.fxnId,
                    toolName: fxns.title,
                    runCount: sql<number>`count(*)`,
                    avgDuration: sql<number>`avg(${runs.durationMs})`
                })
                .from(runs)
                .innerJoin(fxns, eq(runs.fxnId, fxns.id))
                .where(
                    and(
                        eq(runs.userId, userId),
                        gte(runs.createdAt, currentMonth)
                    )
                )
                .groupBy(runs.fxnId, fxns.title)
                .orderBy(sql`count(*) desc`)
                .limit(10);

            return {
                usage,
                topTools: topToolsResult,
                analytics: {
                    toolsCreated: usage.toolsCreated,
                    toolRunsThisMonth: usage.toolRunsThisMonth,
                    apiCallsThisMonth: usage.apiCallsThisMonth,
                    apiConfigurationsCount: usage.apiConfigurationsCount,
                    webhookEndpointsCount: usage.webhookEndpointsCount
                },
                trends: {
                    // Placeholder for more sophisticated trend analysis
                    monthlyGrowth: 0,
                    popularCategories: [],
                    usagePatterns: []
                }
            };
        } catch (error) {
            console.error('Error getting advanced analytics:', error);
            return { error: 'Failed to fetch analytics' };
        }
    }

    // Check if user can use a specific AI feature
    async canUseAIFeature(userId: string, feature: keyof typeof AI_FEATURE_COSTS): Promise<{
        allowed: boolean;
        reason?: string;
        upgradeRequired?: boolean;
        usageInfo?: {
            current: number;
            limit: number;
            remaining: number;
        };
    }> {
        try {
            const limits = await this.getUserLimits(userId);
            const usage = await this.getUserUsage(userId);
            
            // Check if feature is available on user's plan
            const featureMap: Record<string, string> = {
                'ai_task_prioritization': 'ai_task_prioritization',
                'ai_transcript_analysis': 'ai_transcript_analysis',
                'ai_smart_scheduling': 'ai_smart_scheduling',
                'ai_notes_analysis': 'ai_notes_analysis',
                'ai_audio_transcription': 'ai_audio_transcription'
            };

            const requiredFeature = featureMap[feature];
            if (requiredFeature && !limits.features.includes(requiredFeature)) {
                return {
                    allowed: false,
                    reason: `${feature} requires Pro subscription`,
                    upgradeRequired: true
                };
            }

            // Check monthly AI request limits
            const featureCost = AI_FEATURE_COSTS[feature] || 1;
            const remainingRequests = limits.aiRequestsPerMonth - usage.aiRequestsThisMonth;
            
            if (remainingRequests < featureCost) {
                return {
                    allowed: false,
                    reason: `Monthly AI request limit exceeded`,
                    upgradeRequired: !await this.hasProSubscription(userId),
                    usageInfo: {
                        current: usage.aiRequestsThisMonth,
                        limit: limits.aiRequestsPerMonth,
                        remaining: Math.max(0, remainingRequests)
                    }
                };
            }

            // Special check for audio transcription file limits
            if (feature === 'ai_audio_transcription') {
                if (usage.fileUploadsThisMonth >= limits.maxFileUploads) {
                    return {
                        allowed: false,
                        reason: `Monthly file upload limit exceeded`,
                        upgradeRequired: !await this.hasProSubscription(userId),
                        usageInfo: {
                            current: usage.fileUploadsThisMonth,
                            limit: limits.maxFileUploads,
                            remaining: Math.max(0, limits.maxFileUploads - usage.fileUploadsThisMonth)
                        }
                    };
                }
            }

            return {
                allowed: true,
                usageInfo: {
                    current: usage.aiRequestsThisMonth,
                    limit: limits.aiRequestsPerMonth,
                    remaining: remainingRequests - featureCost
                }
            };
        } catch (error) {
            console.error('Error checking AI feature access:', error);
            return {
                allowed: false,
                reason: 'Error checking feature access'
            };
        }
    }

    // Create or update user subscription  
    async createSubscription(userId: string, planCode: 'free' | 'pro'): Promise<UserSubscription> {
        try {
            // First get the plan ID
            const planResult = await db
                .select()
                .from(plans)
                .where(eq(plans.code, planCode))
                .limit(1);
            
            if (planResult.length === 0) {
                throw new Error(`Plan not found: ${planCode}`);
            }
            
            const planId = planResult[0].id;
            const currentPeriodEnd = new Date();
            currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

            const subscriptionData = {
                userId,
                planId,
                provider: 'stripe',
                status: 'active',
                currentPeriodEnd,
            };

            // Check if subscription exists
            const existing = await db
                .select()
                .from(subscriptions)
                .where(eq(subscriptions.userId, userId))
                .limit(1);

            if (existing.length > 0) {
                // Update existing subscription
                await db
                    .update(subscriptions)
                    .set({
                        planId,
                        status: 'active',
                        currentPeriodEnd,
                        updatedAt: new Date()
                    })
                    .where(eq(subscriptions.userId, userId));
                
                return {
                    ...existing[0],
                    planId,
                    status: 'active',
                    currentPeriodEnd,
                };
            } else {
                // Create new subscription
                const result = await db
                    .insert(subscriptions)
                    .values(subscriptionData)
                    .returning();
                
                return result[0];
            }
        } catch (error) {
            console.error('Error creating subscription:', error);
            throw error;
        }
    }

    // Cancel subscription
    async cancelSubscription(userId: string) {
        await db
            .update(subscriptions)
            .set({ 
                status: 'cancelled',
                updatedAt: new Date()
            })
            .where(eq(subscriptions.userId, userId));
    }

    // Get subscription info for dashboard
    async getSubscriptionInfo(userId: string) {
        try {
            const subscription = await db
                .select()
                .from(subscriptions)
                .where(eq(subscriptions.userId, userId))
                .limit(1);

            const limits = await this.getUserLimits(userId);
            const usage = await this.getUserUsage(userId);
            const hasPro = await this.hasProSubscription(userId);

            return {
                subscription: subscription[0] || null,
                plan: hasPro ? 'pro' : 'free',
                limits,
                usage,
                features: limits.features,
                usagePercentages: {
                    aiRequests: limits.aiRequestsPerMonth > 0 
                        ? Math.round((usage.aiRequestsThisMonth / limits.aiRequestsPerMonth) * 100)
                        : 0,
                    fileUploads: limits.maxFileUploads > 0
                        ? Math.round((usage.fileUploadsThisMonth / limits.maxFileUploads) * 100)
                        : 0
                },
                // API Integration usage info
                apiLimits: await this.getApiIntegrationLimits(userId),
                apiUsagePercentages: {
                    apiCalls: usage.apiCallsThisMonth,
                    apiConfigurations: usage.apiConfigurationsCount,
                    webhookEndpoints: usage.webhookEndpointsCount
                }
            };
        } catch (error) {
            console.error('Error getting subscription info:', error);
            return null;
        }
    }

    // Middleware to check Pro features
    requireProFeature(feature: string) {
        return async (req: any, res: any, next: any) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    return res.status(401).json({ error: 'Authentication required' });
                }

                const limits = await this.getUserLimits(userId);
                
                if (!limits.features.includes(feature)) {
                    return res.status(403).json({
                        error: 'Pro subscription required',
                        feature,
                        upgradeRequired: true,
                        message: `This feature requires a Pro subscription. Upgrade to unlock ${feature}.`
                    });
                }

                next();
            } catch (error) {
                console.error('Error in Pro feature middleware:', error);
                res.status(500).json({ error: 'Error checking subscription' });
            }
        };
    }

    // Middleware to check AI usage limits
    requireAIUsage(feature: keyof typeof AI_FEATURE_COSTS) {
        return async (req: any, res: any, next: any) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    return res.status(401).json({ error: 'Authentication required' });
                }

                const check = await this.canUseAIFeature(userId, feature);
                
                if (!check.allowed) {
                    return res.status(403).json({
                        error: check.reason,
                        feature,
                        upgradeRequired: check.upgradeRequired,
                        usageInfo: check.usageInfo,
                        message: check.upgradeRequired 
                            ? `Upgrade to Pro to continue using ${feature}`
                            : `You've reached your monthly limit for ${feature}`
                    });
                }

                // Add usage info to request for tracking
                req.aiUsageInfo = check.usageInfo;
                next();
            } catch (error) {
                console.error('Error in AI usage middleware:', error);
                res.status(500).json({ error: 'Error checking AI usage limits' });
            }
        };
    }
}

export const proService = new ProService();