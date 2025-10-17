import { z } from "zod";
import { generateSmartSchedule } from "../ai-service";

export const smartSchedulerInputSchema = z.object({
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    estimatedMinutes: z.number().optional().default(30),
    priority: z.string(),
    aiPriorityScore: z.number().optional(),
    dueDate: z.string().optional(),
    category: z.string().optional()
  })),
  preferences: z.object({
    workingHours: z.object({
      start: z.string(), // "09:00"
      end: z.string()     // "17:00"
    }),
    breakPreferences: z.object({
      duration: z.number().default(15), // minutes
      frequency: z.number().default(90) // every 90 minutes
    }),
    habitProtectedTimes: z.array(z.object({
      start: z.string(),
      end: z.string(),
      description: z.string()
    })).optional().default([])
  }),
  userId: z.string(),
  date: z.string().optional() // "2025-01-15"
});

export const smartSchedulerOutputSchema = z.object({
  schedule: z.array(z.object({
    taskId: z.string().optional(),
    type: z.enum(['task', 'break', 'habit', 'buffer']),
    startTime: z.string(),
    endTime: z.string(),
    title: z.string(),
    description: z.string().optional(),
    energyLevel: z.enum(['high', 'medium', 'low']).optional(),
    estimatedProductivity: z.number().optional() // 0-100
  })),
  insights: z.array(z.string()),
  warnings: z.array(z.string()),
  metrics: z.object({
    totalWorkTime: z.number(),
    totalBreakTime: z.number(),
    tasksScheduled: z.number(),
    estimatedCompletion: z.number() // percentage
  })
});

export async function smartSchedulerResolver(input: z.infer<typeof smartSchedulerInputSchema>) {
  const { tasks, preferences, userId, date } = input;
  
  try {
    // Convert input tasks to internal format
    const taskObjects = tasks.map(task => ({
      ...task,
      id: task.id,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'todo',
      habitProtected: false,
      metadata: {},
      actualMinutes: null,
      tags: [],
      description: null
    }));

    const scheduleResult = await generateSmartSchedule(userId, taskObjects, preferences);
    
    // Enhance schedule with energy levels and productivity estimates
    const enhancedSchedule = scheduleResult.schedule.map(item => ({
      ...item,
      energyLevel: determineEnergyLevel(item.startTime, preferences.workingHours),
      estimatedProductivity: calculateProductivityScore(item, preferences)
    }));

    // Calculate metrics
    const metrics = calculateScheduleMetrics(enhancedSchedule, tasks);

    return {
      schedule: enhancedSchedule,
      insights: [
        ...scheduleResult.insights,
        generatePersonalizedInsights(enhancedSchedule, preferences)
      ].filter(Boolean),
      warnings: scheduleResult.warnings,
      metrics
    };
  } catch (error) {
    console.error("Smart scheduling error:", error);
    
    // Fallback: simple time-based scheduling
    const fallbackSchedule = createFallbackSchedule(tasks, preferences);
    
    return {
      schedule: fallbackSchedule,
      insights: ["Using basic scheduling due to temporary AI unavailability"],
      warnings: ["AI scheduling temporarily unavailable - using simplified approach"],
      metrics: calculateScheduleMetrics(fallbackSchedule, tasks)
    };
  }
}

function determineEnergyLevel(startTime: string, workingHours: { start: string; end: string }): 'high' | 'medium' | 'low' {
  const hour = parseInt(startTime.split(':')[0]);
  const startHour = parseInt(workingHours.start.split(':')[0]);
  const endHour = parseInt(workingHours.end.split(':')[0]);
  
  // Morning hours (first 3 hours of work): high energy
  if (hour >= startHour && hour < startHour + 3) return 'high';
  
  // Afternoon slump: low energy
  if (hour >= 13 && hour <= 15) return 'low';
  
  // End of day: low energy
  if (hour >= endHour - 2) return 'low';
  
  return 'medium';
}

function calculateProductivityScore(item: any, preferences: any): number {
  let score = 70; // base score
  
  // Energy level impact
  if (item.energyLevel === 'high') score += 20;
  else if (item.energLevel === 'low') score -= 15;
  
  // Task type impact
  if (item.type === 'task') {
    // Complex tasks better in high energy periods
    if (item.energyLevel === 'high') score += 10;
  } else if (item.type === 'break') {
    score = 0; // breaks don't have productivity scores
  }
  
  return Math.max(0, Math.min(100, score));
}

function calculateScheduleMetrics(schedule: any[], tasks: any[]) {
  const workItems = schedule.filter(item => item.type === 'task');
  const breakItems = schedule.filter(item => item.type === 'break');
  
  const totalWorkTime = workItems.reduce((acc, item) => {
    const start = timeToMinutes(item.startTime);
    const end = timeToMinutes(item.endTime);
    return acc + (end - start);
  }, 0);
  
  const totalBreakTime = breakItems.reduce((acc, item) => {
    const start = timeToMinutes(item.startTime);
    const end = timeToMinutes(item.endTime);
    return acc + (end - start);
  }, 0);
  
  const tasksScheduled = workItems.length;
  const totalTaskTime = tasks.reduce((acc, task) => acc + (task.estimatedMinutes || 30), 0);
  const estimatedCompletion = totalTaskTime > 0 ? Math.min(100, (totalWorkTime / totalTaskTime) * 100) : 0;
  
  return {
    totalWorkTime,
    totalBreakTime,
    tasksScheduled,
    estimatedCompletion: Math.round(estimatedCompletion)
  };
}

function generatePersonalizedInsights(schedule: any[], preferences: any): string {
  const workBlocks = schedule.filter(item => item.type === 'task');
  const highEnergyTasks = workBlocks.filter(item => item.energyLevel === 'high').length;
  
  if (highEnergyTasks > workBlocks.length * 0.6) {
    return "Great! Most of your important tasks are scheduled during high-energy periods.";
  }
  
  return "Consider moving high-priority tasks to earlier in the day when your energy is typically higher.";
}

function createFallbackSchedule(tasks: any[], preferences: any) {
  const schedule = [];
  const workStart = timeToMinutes(preferences.workingHours.start);
  const workEnd = timeToMinutes(preferences.workingHours.end);
  
  let currentTime = workStart;
  let taskIndex = 0;
  
  while (currentTime < workEnd && taskIndex < tasks.length) {
    const task = tasks[taskIndex];
    const duration = task.estimatedMinutes || 30;
    
    // Add task
    schedule.push({
      taskId: task.id,
      type: 'task' as const,
      startTime: minutesToTime(currentTime),
      endTime: minutesToTime(currentTime + duration),
      title: task.title,
      energyLevel: 'medium' as const,
      estimatedProductivity: 70
    });
    
    currentTime += duration;
    taskIndex++;
    
    // Add break if needed and there's time
    if (taskIndex < tasks.length && currentTime + 15 < workEnd) {
      schedule.push({
        type: 'break' as const,
        startTime: minutesToTime(currentTime),
        endTime: minutesToTime(currentTime + 15),
        title: "Break",
        energyLevel: 'medium' as const,
        estimatedProductivity: 0
      });
      currentTime += 15;
    }
  }
  
  return schedule;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}