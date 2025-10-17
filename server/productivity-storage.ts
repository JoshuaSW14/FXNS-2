///
/// IGNORE THIS FILE
/// NOT IMPLEMENTED YET AND OUTSIDE OF MVP SCOPE
/// (productivity feature)
///

// Storage functions for Smart Productivity Suite
import { db } from "./db";
import { 
  tasks, notes, automationRules, progressPosts, encouragements, goals, aiUsage,
  type Task, type InsertTask, type Note, type InsertNote, 
  type AutomationRule, type InsertAutomationRule,
  type ProgressPost, type InsertProgressPost,
  type Encouragement, type InsertEncouragement,
  type Goal, type InsertGoal
} from "@shared/schema";
import { eq, desc, and, or, gte, lte, sql, count } from "drizzle-orm";
import { UUID } from "crypto";

export class ProductivityStorage {
  
  // Task Management
  async getTasks(userId: UUID, filters?: {
    status?: string;
    priority?: string;
    category?: string;
    limit?: number;
  }): Promise<Task[]> {
    let query = db.select().from(tasks).where(eq(tasks.userId, userId));
    
    if (filters?.status) {
      query = query.where(eq(tasks.status, filters.status));
    }
    if (filters?.priority) {
      query = query.where(eq(tasks.priority, filters.priority));
    }
    if (filters?.category) {
      query = query.where(eq(tasks.category, filters.category));
    }
    
    query = query.orderBy(
      desc(tasks.aiPriorityScore),
      desc(tasks.createdAt)
    );
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  async getTask(userId: UUID, taskId: UUID): Promise<Task | undefined> {
    const [task] = await db.select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
    return task;
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(taskData).returning();
    return task;
  }

  async updateTask(userId: UUID, taskId: UUID, updates: Partial<Task>): Promise<Task | undefined> {
    const [task] = await db.update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();
    return task;
  }

  async deleteTask(userId: UUID, taskId: UUID): Promise<boolean> {
    const result = await db.delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
    return result.rowCount > 0;
  }

  async getTaskStats(userId: UUID): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
  }> {
    const stats = await db.select({
      status: tasks.status,
      count: count()
    })
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .groupBy(tasks.status);

    const today = new Date();
    const [overdueResult] = await db.select({ count: count() })
      .from(tasks)
      .where(and(
        eq(tasks.userId, userId),
        eq(tasks.status, 'todo'),
        lte(tasks.dueDate, today)
      ));

    const totals = stats.reduce((acc, stat) => {
      acc[stat.status] = stat.count;
      acc.total += stat.count;
      return acc;
    }, { total: 0, todo: 0, in_progress: 0, completed: 0, cancelled: 0 });

    return {
      total: totals.total,
      completed: totals.completed,
      inProgress: totals.in_progress,
      overdue: overdueResult?.count || 0
    };
  }

  // Notes Management
  async getNotes(userId: UUID, filters?: {
    type?: string;
    limit?: number;
    search?: string;
  }): Promise<Note[]> {
    let query = db.select().from(notes).where(eq(notes.userId, userId));
    
    if (filters?.type) {
      query = query.where(eq(notes.type, filters.type));
    }
    
    if (filters?.search) {
      query = query.where(
        or(
          sql`${notes.title} ILIKE ${'%' + filters.search + '%'}`,
          sql`${notes.content} ILIKE ${'%' + filters.search + '%'}`
        )
      );
    }
    
    query = query.orderBy(desc(notes.updatedAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  async getNote(userId: UUID, noteId: UUID): Promise<Note | undefined> {
    const [note] = await db.select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
    return note;
  }

  async createNote(noteData: InsertNote): Promise<Note> {
    const [note] = await db.insert(notes).values(noteData).returning();
    return note;
  }

  async updateNote(userId: UUID, noteId: UUID, updates: Partial<Note>): Promise<Note | undefined> {
    const [note] = await db.update(notes)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
      .returning();
    return note;
  }

  async deleteNote(userId: UUID, noteId: UUID): Promise<boolean> {
    const result = await db.delete(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
    return result.rowCount > 0;
  }

  // Automation Rules
  async getAutomationRules(userId: UUID): Promise<AutomationRule[]> {
    return await db.select()
      .from(automationRules)
      .where(eq(automationRules.userId, userId))
      .orderBy(desc(automationRules.createdAt));
  }

  async getAutomationRule(userId: UUID, ruleId: UUID): Promise<AutomationRule | undefined> {
    const [rule] = await db.select()
      .from(automationRules)
      .where(and(eq(automationRules.id, ruleId), eq(automationRules.userId, userId)));
    return rule;
  }

  async createAutomationRule(ruleData: InsertAutomationRule): Promise<AutomationRule> {
    const [rule] = await db.insert(automationRules).values(ruleData).returning();
    return rule;
  }

  async updateAutomationRule(userId: UUID, ruleId: UUID, updates: Partial<AutomationRule>): Promise<AutomationRule | undefined> {
    const [rule] = await db.update(automationRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(automationRules.id, ruleId), eq(automationRules.userId, userId)))
      .returning();
    return rule;
  }

  async deleteAutomationRule(userId: UUID, ruleId: UUID): Promise<boolean> {
    const result = await db.delete(automationRules)
      .where(and(eq(automationRules.id, ruleId), eq(automationRules.userId, userId)));
    return result.rowCount > 0;
  }

  // Goals Management
  async getGoals(userId: UUID, filters?: {
    status?: string;
    isPublic?: boolean;
  }): Promise<Goal[]> {
    let query = db.select().from(goals).where(eq(goals.userId, userId));
    
    if (filters?.status) {
      query = query.where(eq(goals.status, filters.status));
    }
    if (filters?.isPublic !== undefined) {
      query = query.where(eq(goals.isPublic, filters.isPublic));
    }
    
    return await query.orderBy(desc(goals.createdAt));
  }

  async getGoal(userId: UUID, goalId: UUID): Promise<Goal | undefined> {
    const [goal] = await db.select()
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
    return goal;
  }

  async createGoal(goalData: InsertGoal): Promise<Goal> {
    const [goal] = await db.insert(goals).values(goalData).returning();
    return goal;
  }

  async updateGoal(userId: UUID, goalId: UUID, updates: Partial<Goal>): Promise<Goal | undefined> {
    const [goal] = await db.update(goals)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
      .returning();
    return goal;
  }

  async deleteGoal(userId: UUID, goalId: UUID): Promise<boolean> {
    const result = await db.delete(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
    return result.rowCount > 0;
  }

  // Progress Posts (Social Features)
  async getProgressPosts(userId?: UUID, filters?: {
    visibility?: string;
    limit?: number;
  }): Promise<ProgressPost[]> {
    let query = db.select().from(progressPosts);
    
    if (userId) {
      query = query.where(eq(progressPosts.userId, userId));
    } else {
      // Public posts only when not filtering by user
      query = query.where(eq(progressPosts.visibility, 'public'));
    }
    
    if (filters?.visibility) {
      query = query.where(eq(progressPosts.visibility, filters.visibility));
    }
    
    query = query.orderBy(desc(progressPosts.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  async createProgressPost(postData: InsertProgressPost): Promise<ProgressPost> {
    const [post] = await db.insert(progressPosts).values(postData).returning();
    return post;
  }

  async deleteProgressPost(userId: UUID, postId: UUID): Promise<boolean> {
    const result = await db.delete(progressPosts)
      .where(and(eq(progressPosts.id, postId), eq(progressPosts.userId, userId)));
    return result.rowCount > 0;
  }

  // Encouragements (Social Features)
  async getEncouragements(userId: UUID, type: 'sent' | 'received'): Promise<Encouragement[]> {
    const field = type === 'sent' ? encouragements.fromUserId : encouragements.toUserId;
    return await db.select()
      .from(encouragements)
      .where(eq(field, userId))
      .orderBy(desc(encouragements.createdAt));
  }

  async createEncouragement(encouragementData: InsertEncouragement): Promise<Encouragement> {
    const [encouragement] = await db.insert(encouragements).values(encouragementData).returning();
    return encouragement;
  }

  // AI Usage Tracking
  async getAiUsage(userId: UUID, filters?: {
    feature?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ usage: any[], totalTokens: number, totalCost: number }> {
    let query = db.select().from(aiUsage).where(eq(aiUsage.userId, userId));
    
    if (filters?.feature) {
      query = query.where(eq(aiUsage.feature, filters.feature));
    }
    if (filters?.startDate) {
      query = query.where(gte(aiUsage.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      query = query.where(lte(aiUsage.createdAt, filters.endDate));
    }
    
    const usage = await query.orderBy(desc(aiUsage.createdAt));
    
    const totals = usage.reduce((acc, record) => ({
      totalTokens: acc.totalTokens + record.tokensUsed,
      totalCost: acc.totalCost + (record.cost || 0)
    }), { totalTokens: 0, totalCost: 0 });
    
    return {
      usage,
      ...totals
    };
  }

  // Dashboard Analytics
  async getDashboardData(userId: UUID): Promise<{
    taskStats: any;
    recentTasks: Task[];
    recentNotes: Note[];
    activeGoals: Goal[];
    weeklyProgress: any;
  }> {
    const [taskStats, recentTasks, recentNotes, activeGoals] = await Promise.all([
      this.getTaskStats(userId),
      this.getTasks(userId, { limit: 5 }),
      this.getNotes(userId, { limit: 5 }),
      this.getGoals(userId, { status: 'active' })
    ]);

    // Calculate weekly progress
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const [weeklyCompleted] = await db.select({ count: count() })
      .from(tasks)
      .where(and(
        eq(tasks.userId, userId),
        eq(tasks.status, 'completed'),
        gte(tasks.updatedAt, weekAgo)
      ));

    return {
      taskStats,
      recentTasks,
      recentNotes,
      activeGoals,
      weeklyProgress: {
        completedTasks: weeklyCompleted?.count || 0,
        totalGoals: activeGoals.length
      }
    };
  }
}

export const productivityStorage = new ProductivityStorage();