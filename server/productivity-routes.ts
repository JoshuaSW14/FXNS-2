///
/// IGNORE THIS FILE
/// NOT IMPLEMENTED YET AND OUTSIDE OF MVP SCOPE
/// (productivity feature)
///

// API Routes for Smart Productivity Suite
import type { Express } from "express";
import { z } from "zod";
import { productivityStorage } from "./productivity-storage";
import { automationEngine, triggerTaskCompleted, triggerNoteCreated } from "./automation-engine";
import { prioritizeTasks, analyzeTranscript, analyzeNotes, generateSmartSchedule, transcribeAudio } from "./ai-service";
import { 
  insertTaskSchema, insertNoteSchema, insertAutomationRuleSchema, 
  insertProgressPostSchema, insertEncouragementSchema, insertGoalSchema 
} from "@shared/schema";
import type { UUID } from "crypto";

// Middleware to ensure user is authenticated
function requireAuth(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Authentication required" }
    });
  }
  next();
}

// Import proper Pro service with real subscription checking
import { proService } from "./pro-service";

export function registerProductivityRoutes(app: Express) {
  
  // ===== TASK MANAGEMENT ROUTES =====
  
  // Get user's tasks
  app.get("/api/productivity/tasks", requireAuth, async (req, res, next) => {
    try {
      const { status, priority, category, limit } = req.query;
      const tasks = await productivityStorage.getTasks(req.user.id, {
        status: status as string,
        priority: priority as string,
        category: category as string,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json({ tasks });
    } catch (error) {
      next(error);
    }
  });

  // Get specific task
  app.get("/api/productivity/tasks/:id", requireAuth, async (req, res, next) => {
    try {
      const task = await productivityStorage.getTask(req.user.id, req.params.id as UUID);
      if (!task) {
        return res.status(404).json({
          error: { code: "TASK_NOT_FOUND", message: "Task not found" }
        });
      }
      res.json({ task });
    } catch (error) {
      next(error);
    }
  });

  // Create new task
  app.post("/api/productivity/tasks", requireAuth, async (req, res, next) => {
    try {
      const taskData = insertTaskSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      const task = await productivityStorage.createTask(taskData);
      res.status(201).json({ task });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Invalid task data", details: error.errors }
        });
      }
      next(error);
    }
  });

  // Update task
  app.put("/api/productivity/tasks/:id", requireAuth, async (req, res, next) => {
    try {
      const taskId = req.params.id as UUID;
      const updates = req.body;
      
      const task = await productivityStorage.updateTask(req.user.id, taskId, updates);
      if (!task) {
        return res.status(404).json({
          error: { code: "TASK_NOT_FOUND", message: "Task not found" }
        });
      }

      // Trigger automation if task was completed
      if (updates.status === 'completed') {
        await triggerTaskCompleted(req.user.id, task);
      }

      res.json({ task });
    } catch (error) {
      next(error);
    }
  });

  // Delete task
  app.delete("/api/productivity/tasks/:id", requireAuth, async (req, res, next) => {
    try {
      const success = await productivityStorage.deleteTask(req.user.id, req.params.id as UUID);
      if (!success) {
        return res.status(404).json({
          error: { code: "TASK_NOT_FOUND", message: "Task not found" }
        });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Get task statistics
  app.get("/api/productivity/tasks/stats", requireAuth, async (req, res, next) => {
    try {
      const stats = await productivityStorage.getTaskStats(req.user.id);
      res.json({ stats });
    } catch (error) {
      next(error);
    }
  });

  // ===== AI-POWERED TASK PRIORITIZATION =====
  
  app.post("/api/productivity/tasks/prioritize", requireAuth, proService.requireProFeature('ai_task_prioritization'), async (req, res, next) => {
    try {
      const tasks = await productivityStorage.getTasks(req.user.id, { status: 'todo' });
      const result = await prioritizeTasks(req.user.id, tasks);
      
      // Update task priority scores in database
      for (const task of result.prioritizedTasks) {
        await productivityStorage.updateTask(req.user.id, task.id, {
          aiPriorityScore: task.aiPriorityScore
        });
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // ===== NOTES MANAGEMENT ROUTES =====
  
  // Get user's notes
  app.get("/api/productivity/notes", requireAuth, async (req, res, next) => {
    try {
      const { type, limit, search } = req.query;
      const notes = await productivityStorage.getNotes(req.user.id, {
        type: type as string,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string
      });
      res.json({ notes });
    } catch (error) {
      next(error);
    }
  });

  // Get specific note
  app.get("/api/productivity/notes/:id", requireAuth, async (req, res, next) => {
    try {
      const note = await productivityStorage.getNote(req.user.id, req.params.id as UUID);
      if (!note) {
        return res.status(404).json({
          error: { code: "NOTE_NOT_FOUND", message: "Note not found" }
        });
      }
      res.json({ note });
    } catch (error) {
      next(error);
    }
  });

  // Create new note
  app.post("/api/productivity/notes", requireAuth, async (req, res, next) => {
    try {
      const noteData = insertNoteSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      const note = await productivityStorage.createNote(noteData);
      
      // Trigger automation for note creation
      await triggerNoteCreated(req.user.id, note);
      
      res.status(201).json({ note });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Invalid note data", details: error.errors }
        });
      }
      next(error);
    }
  });

  // Update note
  app.put("/api/productivity/notes/:id", requireAuth, async (req, res, next) => {
    try {
      const noteId = req.params.id as UUID;
      const updates = req.body;
      
      const note = await productivityStorage.updateNote(req.user.id, noteId, updates);
      if (!note) {
        return res.status(404).json({
          error: { code: "NOTE_NOT_FOUND", message: "Note not found" }
        });
      }

      res.json({ note });
    } catch (error) {
      next(error);
    }
  });

  // Delete note
  app.delete("/api/productivity/notes/:id", requireAuth, async (req, res, next) => {
    try {
      const success = await productivityStorage.deleteNote(req.user.id, req.params.id as UUID);
      if (!success) {
        return res.status(404).json({
          error: { code: "NOTE_NOT_FOUND", message: "Note not found" }
        });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // ===== AI MEETING TRANSCRIPT ANALYSIS =====
  
  app.post("/api/productivity/analyze-transcript", requireAuth, proService.requireProFeature('ai_transcript_analysis'), async (req, res, next) => {
    try {
      const { transcriptText, meetingTitle, participants } = req.body;
      
      if (!transcriptText || transcriptText.length < 10) {
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Transcript text is required and must be at least 10 characters" }
        });
      }

      const analysis = await analyzeTranscript(req.user.id, transcriptText);
      
      // Optionally create a note with the analysis
      if (meetingTitle) {
        await productivityStorage.createNote({
          userId: req.user.id,
          title: `Meeting Analysis: ${meetingTitle}`,
          content: transcriptText,
          type: 'meeting_transcript',
          aiSummary: analysis.summary,
          aiInsights: analysis.keyInsights,
          metadata: {
            analysis,
            participants: participants || []
          }
        });
      }

      res.json(analysis);
    } catch (error) {
      next(error);
    }
  });

  // ===== AI NOTES ANALYSIS =====
  
  app.post("/api/productivity/analyze-notes", requireAuth, proService.requireProFeature('ai_notes_analysis'), async (req, res, next) => {
    try {
      const { noteIds } = req.body;
      
      let notes;
      if (noteIds && noteIds.length > 0) {
        // Get specific notes
        notes = [];
        for (const noteId of noteIds) {
          const note = await productivityStorage.getNote(req.user.id, noteId);
          if (note) notes.push(note);
        }
      } else {
        // Get recent notes
        notes = await productivityStorage.getNotes(req.user.id, { limit: 10 });
      }

      const analysis = await analyzeNotes(req.user.id, notes);
      res.json(analysis);
    } catch (error) {
      next(error);
    }
  });

  // ===== SMART SCHEDULING =====
  
  app.post("/api/productivity/smart-schedule", requireAuth, proService.requireProFeature('ai_smart_scheduling'), async (req, res, next) => {
    try {
      const { preferences, date } = req.body;
      
      const tasks = await productivityStorage.getTasks(req.user.id, { status: 'todo' });
      const schedule = await generateSmartSchedule(req.user.id, tasks, preferences);
      
      res.json(schedule);
    } catch (error) {
      next(error);
    }
  });

  // ===== AUDIO TRANSCRIPTION =====
  
  app.post("/api/productivity/transcribe-audio", requireAuth, proService.requireProFeature('ai_audio_transcription'), async (req, res, next) => {
    try {
      // Handle file upload (this would typically use multer middleware)
      const audioFile = req.file;
      if (!audioFile) {
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Audio file is required" }
        });
      }

      const result = await transcribeAudio(req.user.id, audioFile.buffer, audioFile.mimetype);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // ===== AUTOMATION RULES =====
  
  // Get user's automation rules
  app.get("/api/productivity/automation", requireAuth, async (req, res, next) => {
    try {
      const rules = await productivityStorage.getAutomationRules(req.user.id);
      res.json({ rules });
    } catch (error) {
      next(error);
    }
  });

  // Create automation rule
  app.post("/api/productivity/automation", requireAuth, async (req, res, next) => {
    try {
      const ruleData = insertAutomationRuleSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      const rule = await productivityStorage.createAutomationRule(ruleData);
      res.status(201).json({ rule });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Invalid automation rule data", details: error.errors }
        });
      }
      next(error);
    }
  });

  // Update automation rule
  app.put("/api/productivity/automation/:id", requireAuth, async (req, res, next) => {
    try {
      const ruleId = req.params.id as UUID;
      const updates = req.body;
      
      const rule = await productivityStorage.updateAutomationRule(req.user.id, ruleId, updates);
      if (!rule) {
        return res.status(404).json({
          error: { code: "RULE_NOT_FOUND", message: "Automation rule not found" }
        });
      }

      res.json({ rule });
    } catch (error) {
      next(error);
    }
  });

  // Delete automation rule
  app.delete("/api/productivity/automation/:id", requireAuth, async (req, res, next) => {
    try {
      const success = await productivityStorage.deleteAutomationRule(req.user.id, req.params.id as UUID);
      if (!success) {
        return res.status(404).json({
          error: { code: "RULE_NOT_FOUND", message: "Automation rule not found" }
        });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // ===== GOALS MANAGEMENT =====
  
  // Get user's goals
  app.get("/api/productivity/goals", requireAuth, async (req, res, next) => {
    try {
      const { status, isPublic } = req.query;
      const goals = await productivityStorage.getGoals(req.user.id, {
        status: status as string,
        isPublic: isPublic === 'true'
      });
      res.json({ goals });
    } catch (error) {
      next(error);
    }
  });

  // Create goal
  app.post("/api/productivity/goals", requireAuth, async (req, res, next) => {
    try {
      const goalData = insertGoalSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      const goal = await productivityStorage.createGoal(goalData);
      res.status(201).json({ goal });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Invalid goal data", details: error.errors }
        });
      }
      next(error);
    }
  });

  // Update goal
  app.put("/api/productivity/goals/:id", requireAuth, async (req, res, next) => {
    try {
      const goalId = req.params.id as UUID;
      const updates = req.body;
      
      const goal = await productivityStorage.updateGoal(req.user.id, goalId, updates);
      if (!goal) {
        return res.status(404).json({
          error: { code: "GOAL_NOT_FOUND", message: "Goal not found" }
        });
      }

      res.json({ goal });
    } catch (error) {
      next(error);
    }
  });

  // ===== SOCIAL FEATURES =====
  
  // Get progress posts (public feed or user's posts)
  app.get("/api/productivity/feed", async (req, res, next) => {
    try {
      const { userId, visibility, limit } = req.query;
      const posts = await productivityStorage.getProgressPosts(
        userId as UUID,
        {
          visibility: visibility as string,
          limit: limit ? parseInt(limit as string) : 20
        }
      );
      res.json({ posts });
    } catch (error) {
      next(error);
    }
  });

  // Create progress post
  app.post("/api/productivity/progress", requireAuth, async (req, res, next) => {
    try {
      const postData = insertProgressPostSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      const post = await productivityStorage.createProgressPost(postData);
      res.status(201).json({ post });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Invalid progress post data", details: error.errors }
        });
      }
      next(error);
    }
  });

  // Send encouragement
  app.post("/api/productivity/encourage", requireAuth, async (req, res, next) => {
    try {
      const encouragementData = insertEncouragementSchema.parse({
        ...req.body,
        fromUserId: req.user.id
      });
      
      const encouragement = await productivityStorage.createEncouragement(encouragementData);
      res.status(201).json({ encouragement });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Invalid encouragement data", details: error.errors }
        });
      }
      next(error);
    }
  });

  // Get user's encouragements
  app.get("/api/productivity/encouragements", requireAuth, async (req, res, next) => {
    try {
      const { type } = req.query;
      const encouragements = await productivityStorage.getEncouragements(
        req.user.id, 
        (type as 'sent' | 'received') || 'received'
      );
      res.json({ encouragements });
    } catch (error) {
      next(error);
    }
  });

  // ===== DASHBOARD =====
  
  // Get dashboard data
  app.get("/api/productivity/dashboard", requireAuth, async (req, res, next) => {
    try {
      const dashboardData = await productivityStorage.getDashboardData(req.user.id);
      res.json(dashboardData);
    } catch (error) {
      next(error);
    }
  });

  // ===== AI USAGE ANALYTICS =====
  
  // Get AI usage statistics
  app.get("/api/productivity/ai-usage", requireAuth, async (req, res, next) => {
    try {
      const { feature, startDate, endDate } = req.query;
      const filters: any = {};
      
      if (feature) filters.feature = feature;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const usage = await productivityStorage.getAiUsage(req.user.id, filters);
      res.json(usage);
    } catch (error) {
      next(error);
    }
  });
}