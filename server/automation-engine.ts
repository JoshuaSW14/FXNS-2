// Automation Engine for Smart Productivity Suite
import { db } from "./db";
import { automationRules, tasks, notes, progressPosts } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { AutomationRule, Task, Note } from "@shared/schema";
import { analyzeTranscript, prioritizeTasks } from "./ai-service";

// Trigger Types
export interface ScheduleTrigger {
  type: 'schedule';
  cron: string; // cron expression
  timezone?: string;
}

export interface TaskCompletionTrigger {
  type: 'task_completion';
  taskCategory?: string;
  taskPriority?: string;
  taskTags?: string[];
}

export interface NoteCreatedTrigger {
  type: 'note_created';
  noteType?: string;
  noteContains?: string[];
}

export interface ExternalEventTrigger {
  type: 'external_event';
  webhookUrl?: string;
  eventType: string;
}

export type TriggerConfig = ScheduleTrigger | TaskCompletionTrigger | NoteCreatedTrigger | ExternalEventTrigger;

// Action Types
export interface CreateTaskAction {
  type: 'create_task';
  taskTemplate: {
    title: string;
    description?: string;
    priority: string;
    category?: string;
    estimatedMinutes?: number;
    tags?: string[];
  };
}

export interface SendNotificationAction {
  type: 'send_notification';
  message: string;
  channels: ('email' | 'push' | 'slack')[];
  priority: 'low' | 'medium' | 'high';
}

export interface UpdateStatusAction {
  type: 'update_status';
  entityType: 'task' | 'goal' | 'note';
  entityId?: string;
  newStatus: string;
  conditions?: Record<string, any>;
}

export interface AiAnalysisAction {
  type: 'ai_analysis';
  analysisType: 'prioritize_tasks' | 'analyze_notes' | 'generate_insights';
  targetData: string; // JSON selector or identifier
  saveResults: boolean;
}

export type ActionConfig = CreateTaskAction | SendNotificationAction | UpdateStatusAction | AiAnalysisAction;

// Automation Engine Class
export class AutomationEngine {
  
  // Evaluate if a trigger condition is met
  async evaluateTrigger(rule: AutomationRule, eventData: any): Promise<boolean> {
    const trigger = rule.triggerConfig as TriggerConfig;
    
    switch (trigger.type) {
      case 'schedule':
        return this.evaluateScheduleTrigger(trigger, eventData);
      
      case 'task_completion':
        return this.evaluateTaskCompletionTrigger(trigger, eventData);
      
      case 'note_created':
        return this.evaluateNoteCreatedTrigger(trigger, eventData);
      
      case 'external_event':
        return this.evaluateExternalEventTrigger(trigger, eventData);
      
      default:
        console.warn(`Unknown trigger type: ${(trigger as any).type}`);
        return false;
    }
  }

  // Execute an action
  async executeAction(rule: AutomationRule, triggerData: any): Promise<boolean> {
    const action = rule.actionConfig as ActionConfig;
    
    try {
      switch (action.type) {
        case 'create_task':
          return await this.executeCreateTaskAction(rule.userId, action, triggerData);
        
        case 'send_notification':
          return await this.executeSendNotificationAction(rule.userId, action, triggerData);
        
        case 'update_status':
          return await this.executeUpdateStatusAction(rule.userId, action, triggerData);
        
        case 'ai_analysis':
          return await this.executeAiAnalysisAction(rule.userId, action, triggerData);
        
        default:
          console.warn(`Unknown action type: ${(action as any).type}`);
          return false;
      }
    } catch (error) {
      console.error(`Error executing action for rule ${rule.id}:`, error);
      return false;
    }
  }

  // Process automation rules for a specific event
  async processEvent(eventType: string, eventData: any, userId?: string): Promise<void> {
    try {
      // Get relevant automation rules
      let rulesQuery = db.select().from(automationRules).where(eq(automationRules.isActive, true));
      
      if (userId) {
        rulesQuery = rulesQuery.where(eq(automationRules.userId, userId));
      }
      
      const rules = await rulesQuery;
      
      for (const rule of rules) {
        try {
          // Check if trigger matches
          const shouldTrigger = await this.evaluateTrigger(rule, { ...eventData, eventType });
          
          if (shouldTrigger) {
            console.log(`Triggering automation rule: ${rule.name} (${rule.id})`);
            
            // Execute action
            const success = await this.executeAction(rule, eventData);
            
            // Update rule statistics
            await db.update(automationRules)
              .set({
                lastTriggered: new Date(),
                runCount: rule.runCount + 1,
                updatedAt: new Date()
              })
              .where(eq(automationRules.id, rule.id));
            
            if (success) {
              console.log(`Successfully executed automation rule: ${rule.name}`);
            } else {
              console.error(`Failed to execute automation rule: ${rule.name}`);
            }
          }
        } catch (error) {
          console.error(`Error processing rule ${rule.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing automation event:', error);
    }
  }

  // Trigger evaluators
  private evaluateScheduleTrigger(trigger: ScheduleTrigger, eventData: any): boolean {
    // For schedule triggers, we'd typically use a cron job scheduler
    // This is a simplified check for demo purposes
    return eventData.eventType === 'schedule' && eventData.cronMatch === trigger.cron;
  }

  private evaluateTaskCompletionTrigger(trigger: TaskCompletionTrigger, eventData: any): boolean {
    if (eventData.eventType !== 'task_completed') return false;
    
    const task = eventData.task as Task;
    
    // Check category filter
    if (trigger.taskCategory && task.category !== trigger.taskCategory) {
      return false;
    }
    
    // Check priority filter
    if (trigger.taskPriority && task.priority !== trigger.taskPriority) {
      return false;
    }
    
    // Check tags filter
    if (trigger.taskTags && trigger.taskTags.length > 0) {
      const taskTags = (task.tags as string[]) || [];
      const hasMatchingTag = trigger.taskTags.some(tag => taskTags.includes(tag));
      if (!hasMatchingTag) return false;
    }
    
    return true;
  }

  private evaluateNoteCreatedTrigger(trigger: NoteCreatedTrigger, eventData: any): boolean {
    if (eventData.eventType !== 'note_created') return false;
    
    const note = eventData.note as Note;
    
    // Check note type filter
    if (trigger.noteType && note.type !== trigger.noteType) {
      return false;
    }
    
    // Check content contains filter
    if (trigger.noteContains && trigger.noteContains.length > 0) {
      const content = note.content.toLowerCase();
      const hasMatchingContent = trigger.noteContains.some(keyword => 
        content.includes(keyword.toLowerCase())
      );
      if (!hasMatchingContent) return false;
    }
    
    return true;
  }

  private evaluateExternalEventTrigger(trigger: ExternalEventTrigger, eventData: any): boolean {
    return eventData.eventType === 'external_event' && 
           eventData.externalEventType === trigger.eventType;
  }

  // Action executors
  private async executeCreateTaskAction(userId: string, action: CreateTaskAction, triggerData: any): Promise<boolean> {
    try {
      // Template variables can be replaced with trigger data
      const title = this.replaceTemplateVariables(action.taskTemplate.title, triggerData);
      const description = action.taskTemplate.description 
        ? this.replaceTemplateVariables(action.taskTemplate.description, triggerData)
        : undefined;

      await db.insert(tasks).values({
        userId,
        title,
        description,
        priority: action.taskTemplate.priority,
        category: action.taskTemplate.category,
        estimatedMinutes: action.taskTemplate.estimatedMinutes,
        tags: action.taskTemplate.tags || [],
        status: 'todo'
      });
      
      return true;
    } catch (error) {
      console.error('Error creating task:', error);
      return false;
    }
  }

  private async executeSendNotificationAction(userId: string, action: SendNotificationAction, triggerData: any): Promise<boolean> {
    try {
      const message = this.replaceTemplateVariables(action.message, triggerData);
      
      // Here you would integrate with actual notification services
      // For now, we'll just log the notification
      console.log(`Notification for user ${userId}: ${message}`);
      console.log(`Channels: ${action.channels.join(', ')}`);
      console.log(`Priority: ${action.priority}`);
      
      // In a real implementation, you'd send via email, push notifications, Slack, etc.
      
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  private async executeUpdateStatusAction(userId: string, action: UpdateStatusAction, triggerData: any): Promise<boolean> {
    try {
      // This would update the status of tasks, goals, or notes based on conditions
      // Implementation depends on the specific entity type and conditions
      
      if (action.entityType === 'task' && action.entityId) {
        await db.update(tasks)
          .set({ 
            status: action.newStatus,
            updatedAt: new Date()
          })
          .where(and(
            eq(tasks.id, action.entityId),
            eq(tasks.userId, userId)
          ));
      }
      
      return true;
    } catch (error) {
      console.error('Error updating status:', error);
      return false;
    }
  }

  private async executeAiAnalysisAction(userId: string, action: AiAnalysisAction, triggerData: any): Promise<boolean> {
    try {
      switch (action.analysisType) {
        case 'prioritize_tasks':
          // Get user's current tasks and prioritize them
          const userTasks = await db.select().from(tasks)
            .where(and(eq(tasks.userId, userId), eq(tasks.status, 'todo')));
          
          const { prioritizedTasks } = await prioritizeTasks(userId, userTasks);
          
          // Update AI priority scores
          for (const task of prioritizedTasks) {
            await db.update(tasks)
              .set({ 
                aiPriorityScore: task.aiPriorityScore,
                updatedAt: new Date()
              })
              .where(eq(tasks.id, task.id));
          }
          break;
          
        case 'analyze_notes':
          // Could implement note analysis here
          break;
          
        case 'generate_insights':
          // Could implement general insights generation
          break;
      }
      
      return true;
    } catch (error) {
      console.error('Error executing AI analysis:', error);
      return false;
    }
  }

  // Utility method to replace template variables
  private replaceTemplateVariables(template: string, data: any): string {
    let result = template;
    
    // Replace common variables
    const variables = {
      '{{user.name}}': data.user?.name || 'User',
      '{{task.title}}': data.task?.title || '',
      '{{task.category}}': data.task?.category || '',
      '{{note.title}}': data.note?.title || '',
      '{{date}}': new Date().toLocaleDateString(),
      '{{time}}': new Date().toLocaleTimeString(),
    };
    
    for (const [variable, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }
    
    return result;
  }
}

// Export singleton instance
export const automationEngine = new AutomationEngine();

// Convenience functions for triggering events
export async function triggerTaskCompleted(userId: string, task: Task) {
  await automationEngine.processEvent('task_completed', { task, user: { id: userId } }, userId);
}

export async function triggerNoteCreated(userId: string, note: Note) {
  await automationEngine.processEvent('note_created', { note, user: { id: userId } }, userId);
}

export async function triggerScheduledEvent(userId: string, cronExpression: string) {
  await automationEngine.processEvent('schedule', { cronMatch: cronExpression, user: { id: userId } }, userId);
}

export async function triggerExternalEvent(userId: string, eventType: string, eventData: any) {
  await automationEngine.processEvent('external_event', { 
    externalEventType: eventType, 
    ...eventData,
    user: { id: userId } 
  }, userId);
}