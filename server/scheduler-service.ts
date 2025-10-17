import * as cron from 'node-cron';
import * as schedule from 'node-schedule';
import { db } from './db';
import { automationRules, tasks, progressPosts, workflows } from '../shared/schema';
import { and, eq, isNull, or, sql, lt } from 'drizzle-orm';
import { automationEngine } from './automation-engine';
import { productivityStorage } from './productivity-storage';
import { workflowExecutor } from './workflow-engine/executor';

interface ScheduledJob {
    id: string;
    ruleId: string;
    cronExpression: string;
    task: cron.ScheduledTask | schedule.Job;
    isActive: boolean;
}

class SchedulerService {
    private scheduledJobs: Map<string, ScheduledJob> = new Map();
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) return;

        console.log('🕒 Initializing Automation Scheduler...');
        
        // Load and schedule all active automation rules
        await this.loadAndScheduleRules();
        
        // Set up periodic cleanup job (runs daily at 2 AM)
        this.scheduleCleanupJob();
        
        // Set up health check job (runs every hour)
        this.scheduleHealthCheckJob();
        
        this.isInitialized = true;
        console.log(`✅ Scheduler initialized with ${this.scheduledJobs.size} active jobs`);
    }

    async loadAndScheduleRules() {
        try {
            const activeRules = await db
                .select()
                .from(automationRules)
                .where(eq(automationRules.isActive, true));

            for (const rule of activeRules) {
                if (rule.triggerType === 'schedule') {
                    await this.scheduleRule(rule);
                }
            }

            const scheduledWorkflows = await db
                .select()
                .from(workflows)
                .where(and(
                    eq(workflows.isActive, true),
                    eq(workflows.triggerType, 'schedule')
                ));

            for (const workflow of scheduledWorkflows) {
                await this.scheduleWorkflow(workflow);
            }
        } catch (error) {
            console.error('❌ Error loading automation rules:', error);
        }
    }

    async scheduleRule(rule: any) {
        try {
            const triggerData = rule.triggerConfig as any;
            
            if (!triggerData.cron && !triggerData.time) {
                console.warn(`⚠️ Rule ${rule.id} has schedule trigger but no cron/time specified`);
                return;
            }

            // Convert time-based triggers to cron expressions
            const cronExpression = this.convertToCronExpression(triggerData);
            
            if (!cronExpression) {
                console.warn(`⚠️ Could not convert trigger to cron expression for rule ${rule.id}`);
                return;
            }

            // Validate cron expression
            if (!cron.validate(cronExpression)) {
                console.error(`❌ Invalid cron expression for rule ${rule.id}: ${cronExpression}`);
                return;
            }

            // Remove existing job if it exists
            await this.removeScheduledJob(rule.id);

            // Create and schedule the job
            const task = cron.schedule(cronExpression, async () => {
                await this.executeScheduledRule(rule);
            }, {
                timezone: "America/New_York" // Use system timezone or make configurable
            });

            // Store the job reference
            const scheduledJob: ScheduledJob = {
                id: `rule_${rule.id}`,
                ruleId: rule.id,
                cronExpression,
                task,
                isActive: true
            };

            this.scheduledJobs.set(rule.id, scheduledJob);
            console.log(`✅ Scheduled rule ${rule.id} with cron: ${cronExpression}`);

        } catch (error) {
            console.error(`❌ Error scheduling rule ${rule.id}:`, error);
        }
    }

    private convertToCronExpression(triggerData: any): string | null {
        // Handle different schedule formats
        if (triggerData.cron) {
            return triggerData.cron;
        }

        if (triggerData.time) {
            // Convert "HH:MM" format to cron (daily at that time)
            const [hours, minutes] = triggerData.time.split(':');
            return `${minutes} ${hours} * * *`; // Daily at specified time
        }

        if (triggerData.interval) {
            // Handle interval-based schedules
            switch (triggerData.interval) {
                case 'daily':
                    return '0 9 * * *'; // Daily at 9 AM
                case 'weekly':
                    return '0 9 * * 1'; // Weekly on Monday at 9 AM
                case 'monthly':
                    return '0 9 1 * *'; // Monthly on 1st at 9 AM
                case 'hourly':
                    return '0 * * * *'; // Every hour
                default:
                    return null;
            }
        }

        return null;
    }

    private async executeScheduledRule(rule: any) {
        try {
            console.log(`🚀 Executing scheduled rule: ${rule.name} (${rule.id})`);
            
            // Execute the rule using automation engine
            const result = await automationEngine.executeAction(rule.actionType, rule.actionConfig);
            
            if (result) {
                console.log(`✅ Successfully executed rule ${rule.id}`);
                
                // Update rule execution count and last run time
                await db
                    .update(automationRules)
                    .set({
                        lastTriggered: new Date(),
                        runCount: sql`${automationRules.runCount} + 1`
                    })
                    .where(eq(automationRules.id, rule.id));
                    
            } else {
                console.error(`❌ Failed to execute rule ${rule.id}`);
                
                // Update error count
                await db
                    .update(automationRules)
                    .set({
                        lastTriggered: new Date(),
                        runCount: sql`${automationRules.runCount} + 1`
                    })
                    .where(eq(automationRules.id, rule.id));
            }
        } catch (error) {
            console.error(`❌ Error executing scheduled rule ${rule.id}:`, error);
        }
    }

    async addOrUpdateRule(ruleId: string) {
        try {
            const rule = await db
                .select()
                .from(automationRules)
                .where(eq(automationRules.id, ruleId))
                .limit(1);

            if (rule.length === 0) {
                console.warn(`⚠️ Rule ${ruleId} not found`);
                return;
            }

            const ruleData = rule[0];
            
            if (!ruleData.isActive) {
                await this.removeScheduledJob(ruleId);
                return;
            }

            if (ruleData.triggerType === 'schedule') {
                await this.scheduleRule(ruleData);
            }
        } catch (error) {
            console.error(`❌ Error updating scheduled rule ${ruleId}:`, error);
        }
    }

    async scheduleWorkflow(workflow: any) {
        try {
            const triggerConfig = workflow.triggerConfig as any;
            
            if (!triggerConfig || (!triggerConfig.cron && !triggerConfig.time && !triggerConfig.interval)) {
                console.warn(`⚠️ Workflow ${workflow.id} has schedule trigger but no cron/time specified`);
                return;
            }

            const cronExpression = this.convertToCronExpression(triggerConfig);
            
            if (!cronExpression) {
                console.warn(`⚠️ Could not convert trigger to cron expression for workflow ${workflow.id}`);
                return;
            }

            if (!cron.validate(cronExpression)) {
                console.error(`❌ Invalid cron expression for workflow ${workflow.id}: ${cronExpression}`);
                return;
            }

            await this.removeScheduledJob(`workflow_${workflow.id}`);

            const task = cron.schedule(cronExpression, async () => {
                await this.executeScheduledWorkflow(workflow);
            }, {
                timezone: "America/New_York"
            });

            const scheduledJob: ScheduledJob = {
                id: `workflow_${workflow.id}`,
                ruleId: workflow.id,
                cronExpression,
                task,
                isActive: true
            };

            this.scheduledJobs.set(`workflow_${workflow.id}`, scheduledJob);
            console.log(`✅ Scheduled workflow ${workflow.name} (${workflow.id}) with cron: ${cronExpression}`);

        } catch (error) {
            console.error(`❌ Error scheduling workflow ${workflow.id}:`, error);
        }
    }

    private async executeScheduledWorkflow(workflow: any) {
        try {
            console.log(`🚀 Executing scheduled workflow: ${workflow.name} (${workflow.id})`);
            
            const execution = await workflowExecutor.executeWorkflow(
                workflow.id,
                workflow.userId,
                'schedule',
                { scheduledAt: new Date() }
            );
            
            if (execution.status === 'completed') {
                console.log(`✅ Successfully executed workflow ${workflow.id}`);
                
                await db
                    .update(workflows)
                    .set({
                        lastExecutedAt: new Date(),
                        executionCount: sql`${workflows.executionCount} + 1`
                    })
                    .where(eq(workflows.id, workflow.id));
                    
            } else if (execution.status === 'failed') {
                console.error(`❌ Failed to execute workflow ${workflow.id}: ${execution.error}`);
                
                await db
                    .update(workflows)
                    .set({
                        lastExecutedAt: new Date(),
                        executionCount: sql`${workflows.executionCount} + 1`
                    })
                    .where(eq(workflows.id, workflow.id));
            }
        } catch (error) {
            console.error(`❌ Error executing scheduled workflow ${workflow.id}:`, error);
        }
    }

    async addOrUpdateWorkflow(workflowId: string) {
        try {
            const [workflow] = await db
                .select()
                .from(workflows)
                .where(eq(workflows.id, workflowId))
                .limit(1);

            if (!workflow) {
                console.warn(`⚠️ Workflow ${workflowId} not found`);
                return;
            }
            
            if (!workflow.isActive) {
                await this.removeScheduledJob(`workflow_${workflowId}`);
                return;
            }

            if (workflow.triggerType === 'schedule') {
                await this.scheduleWorkflow(workflow);
            }
        } catch (error) {
            console.error(`❌ Error updating scheduled workflow ${workflowId}:`, error);
        }
    }

    async removeScheduledJob(ruleId: string) {
        const job = this.scheduledJobs.get(ruleId);
        if (job) {
            // Destroy the cron task
            if ('destroy' in job.task) {
                job.task.destroy();
            } else if ('cancel' in job.task) {
                job.task.cancel();
            }
            
            this.scheduledJobs.delete(ruleId);
            console.log(`🗑️ Removed scheduled job for rule ${ruleId}`);
        }
    }

    private scheduleCleanupJob() {
        // Daily cleanup at 2 AM
        cron.schedule('0 2 * * *', async () => {
            console.log('🧹 Running daily cleanup...');
            try {
                // Clean up old completed tasks (older than 30 days)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                
                await db
                    .delete(tasks)
                    .where(
                        and(
                            eq(tasks.status, 'completed'),
                            lt(tasks.updatedAt, thirtyDaysAgo)
                        )
                    );

                // Clean up old progress posts (older than 90 days)
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                
                await db
                    .delete(progressPosts)
                    .where(
                        lt(progressPosts.createdAt, ninetyDaysAgo)
                    );

                console.log('✅ Daily cleanup completed');
            } catch (error) {
                console.error('❌ Error during cleanup:', error);
            }
        });
    }

    private scheduleHealthCheckJob() {
        // Hourly health check
        cron.schedule('0 * * * *', async () => {
            try {
                // Check for failed automation rules and retry if needed
                const failedRules = await db
                    .select()
                    .from(automationRules)
                    .where(
                        and(
                            eq(automationRules.isActive, true),
                            lt(automationRules.lastTriggered, new Date(Date.now() - 24 * 60 * 60 * 1000))
                        )
                    );

                for (const rule of failedRules) {
                    if (rule.triggerType === 'schedule') {
                        const job = this.scheduledJobs.get(rule.id);
                        if (!job || !job.isActive) {
                            console.log(`🔄 Rescheduling failed rule: ${rule.id}`);
                            await this.scheduleRule(rule);
                        }
                    }
                }
            } catch (error) {
                console.error('❌ Error during health check:', error);
            }
        });
    }

    // Smart scheduling helpers for common productivity patterns
    async scheduleRecurringTask(userId: string, taskData: any, recurrence: string) {
        try {
            const rule = {
                userId,
                name: `Recurring: ${taskData.title}`,
                triggerType: 'schedule',
                triggerConfig: { interval: recurrence },
                actionType: 'create_task',
                actionConfig: { data: taskData },
                isActive: true
            };

            // Save the rule to database
            const savedRule = await productivityStorage.createAutomationRule(rule);
            
            // Schedule it
            await this.scheduleRule(savedRule);
            
            return savedRule;
        } catch (error) {
            console.error('❌ Error creating recurring task:', error);
            throw error;
        }
    }

    async scheduleDailyReview(userId: string, time: string = '18:00') {
        try {
            const rule = {
                userId,
                name: 'Daily Review Reminder',
                triggerType: 'schedule',
                triggerConfig: { time: time },
                actionType: 'create_task',
                actionConfig: {
                    data: {
                        title: 'Daily Review',
                        description: 'Review your progress and plan tomorrow',
                        priority: 'medium',
                        estimatedMinutes: 15,
                        tags: ['review', 'planning']
                    }
                },
                isActive: true
            };

            const savedRule = await productivityStorage.createAutomationRule(rule);
            await this.scheduleRule(savedRule);
            
            return savedRule;
        } catch (error) {
            console.error('❌ Error scheduling daily review:', error);
            throw error;
        }
    }

    // Get scheduler status and statistics
    getStatus() {
        const activeJobs = Array.from(this.scheduledJobs.values()).filter(job => job.isActive);
        
        return {
            isInitialized: this.isInitialized,
            totalJobs: this.scheduledJobs.size,
            activeJobs: activeJobs.length,
            jobs: activeJobs.map(job => ({
                id: job.id,
                ruleId: job.ruleId,
                cronExpression: job.cronExpression,
                isActive: job.isActive
            }))
        };
    }

    // Graceful shutdown
    async shutdown() {
        console.log('🛑 Shutting down scheduler...');
        
        for (const [ruleId, job] of Array.from(this.scheduledJobs.entries())) {
            await this.removeScheduledJob(ruleId);
        }
        
        this.scheduledJobs.clear();
        this.isInitialized = false;
        
        console.log('✅ Scheduler shutdown complete');
    }
}

export const schedulerService = new SchedulerService();