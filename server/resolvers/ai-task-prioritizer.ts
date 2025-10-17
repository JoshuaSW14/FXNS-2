import { z } from "zod";
import { prioritizeTasks } from "../ai-service";

export const aiTaskPrioritizerInputSchema = z.object({
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    status: z.string(),
    priority: z.string(),
    dueDate: z.string().optional(),
    estimatedMinutes: z.number().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional()
  })),
  userId: z.string()
});

export const aiTaskPrioritizerOutputSchema = z.object({
  prioritizedTasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    aiPriorityScore: z.number(),
    recommendedOrder: z.number()
  })),
  insights: z.array(z.string()),
  recommendations: z.array(z.string())
});

export async function aiTaskPrioritizerResolver(input: z.infer<typeof aiTaskPrioritizerInputSchema>) {
  const { tasks, userId } = input;
  
  // Convert input tasks to Task format
  const taskObjects = tasks.map(task => ({
    ...task,
    id: task.id,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    aiPriorityScore: null,
    habitProtected: false,
    metadata: {},
    actualMinutes: null
  }));

  const result = await prioritizeTasks(userId, taskObjects);
  
  return {
    prioritizedTasks: result.prioritizedTasks.map((task, index) => ({
      id: task.id,
      title: task.title,
      aiPriorityScore: task.aiPriorityScore || 50,
      recommendedOrder: index + 1
    })),
    insights: result.insights,
    recommendations: [
      "Focus on high-priority items during your peak energy hours",
      "Consider breaking large tasks into smaller, manageable chunks",
      "Schedule regular breaks to maintain productivity"
    ]
  };
}