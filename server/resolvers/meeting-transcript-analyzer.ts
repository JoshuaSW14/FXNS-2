import { z } from "zod";
import { analyzeTranscript } from "../ai-service";

export const meetingTranscriptAnalyzerInputSchema = z.object({
  transcriptText: z.string().min(10, "Transcript must be at least 10 characters"),
  meetingTitle: z.string().optional(),
  participants: z.array(z.string()).optional(),
  userId: z.string()
});

export const meetingTranscriptAnalyzerOutputSchema = z.object({
  summary: z.string(),
  actionItems: z.array(z.object({
    task: z.string(),
    assignee: z.string().optional(),
    priority: z.string(),
    estimatedMinutes: z.number().optional()
  })),
  keyInsights: z.array(z.string()),
  suggestedTasks: z.array(z.object({
    title: z.string(),
    description: z.string(),
    priority: z.string(),
    estimatedMinutes: z.number(),
    category: z.string().optional()
  })),
  keyTopics: z.array(z.string()),
  sentimentAnalysis: z.object({
    overall: z.string(),
    score: z.number()
  })
});

export async function meetingTranscriptAnalyzerResolver(input: z.infer<typeof meetingTranscriptAnalyzerInputSchema>) {
  const { transcriptText, meetingTitle, participants, userId } = input;
  
  try {
    const analysis = await analyzeTranscript(userId, transcriptText);
    
    // Extract key topics from the transcript
    const keyTopics = extractKeyTopics(transcriptText);
    
    // Simple sentiment analysis based on keywords
    const sentimentAnalysis = analyzeSentiment(transcriptText);
    
    return {
      summary: analysis.summary,
      actionItems: analysis.actionItems.map(item => ({
        ...item,
        estimatedMinutes: estimateTaskDuration(item.task)
      })),
      keyInsights: analysis.keyInsights,
      suggestedTasks: analysis.suggestedTasks.map(task => ({
        ...task,
        category: categorizeTask(task.title)
      })),
      keyTopics,
      sentimentAnalysis
    };
  } catch (error) {
    console.error("Meeting transcript analysis error:", error);
    return {
      summary: "Unable to analyze transcript at this time. Please try again later.",
      actionItems: [],
      keyInsights: [],
      suggestedTasks: [],
      keyTopics: [],
      sentimentAnalysis: {
        overall: "neutral",
        score: 0.5
      }
    };
  }
}

function extractKeyTopics(text: string): string[] {
  // Simple keyword extraction based on common business terms
  const keywords = [
    'budget', 'deadline', 'project', 'milestone', 'deliverable', 'timeline',
    'strategy', 'goals', 'objectives', 'requirements', 'specifications',
    'marketing', 'sales', 'revenue', 'costs', 'resources', 'team',
    'priority', 'risks', 'challenges', 'opportunities', 'decisions'
  ];
  
  const foundTopics = keywords.filter(keyword => 
    text.toLowerCase().includes(keyword)
  );
  
  return foundTopics.length > 0 ? foundTopics.slice(0, 8) : ['general discussion'];
}

function analyzeSentiment(text: string): { overall: string; score: number } {
  const positiveWords = ['good', 'great', 'excellent', 'success', 'achieve', 'progress', 'improvement'];
  const negativeWords = ['problem', 'issue', 'concern', 'delay', 'risk', 'challenge', 'difficulty'];
  
  const words = text.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;
  
  words.forEach(word => {
    if (positiveWords.some(pos => word.includes(pos))) positiveCount++;
    if (negativeWords.some(neg => word.includes(neg))) negativeCount++;
  });
  
  const total = positiveCount + negativeCount;
  if (total === 0) return { overall: 'neutral', score: 0.5 };
  
  const score = positiveCount / total;
  let overall = 'neutral';
  if (score > 0.6) overall = 'positive';
  else if (score < 0.4) overall = 'negative';
  
  return { overall, score };
}

function estimateTaskDuration(taskDescription: string): number {
  const words = taskDescription.split(' ').length;
  // Rough estimation: 5 minutes per word for planning, more for complex tasks
  if (words < 5) return 15;
  if (words < 10) return 30;
  if (words < 20) return 60;
  return 120;
}

function categorizeTask(title: string): string {
  const title_lower = title.toLowerCase();
  
  if (title_lower.includes('meeting') || title_lower.includes('call') || title_lower.includes('discussion')) {
    return 'communication';
  }
  if (title_lower.includes('report') || title_lower.includes('document') || title_lower.includes('write')) {
    return 'documentation';
  }
  if (title_lower.includes('review') || title_lower.includes('analyze') || title_lower.includes('research')) {
    return 'analysis';
  }
  if (title_lower.includes('develop') || title_lower.includes('build') || title_lower.includes('create')) {
    return 'development';
  }
  if (title_lower.includes('plan') || title_lower.includes('strategy') || title_lower.includes('organize')) {
    return 'planning';
  }
  
  return 'general';
}