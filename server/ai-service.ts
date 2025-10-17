// OpenAI Service for Smart Productivity Suite
// the newest OpenAI model is "gpt-4-turbo" which was released August 7, 2025. do not change this unless explicitly requested by the user
import OpenAI from "openai";
import { z } from "zod";
import type { Task, Note, InsertAiUsage } from "@shared/schema";
import { db } from "./db";
import { aiUsage } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Track AI usage for billing/limiting
async function trackAiUsage(userId: string, feature: string, tokensUsed: number, requestData: any, responseData: any) {
  const estimatedCost = Math.ceil(tokensUsed * 0.00002); // Rough estimate in cents
  
  await db.insert(aiUsage).values({
    userId,
    feature,
    tokensUsed,
    cost: estimatedCost,
    requestData,
    responseData,
  });
}

// AI Task Prioritization
export async function prioritizeTasks(userId: string, tasks: Task[]): Promise<{ prioritizedTasks: Task[], insights: string[] }> {
  if (!tasks.length) return { prioritizedTasks: [], insights: [] };

  const taskData = tasks.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    estimatedMinutes: task.estimatedMinutes,
    category: task.category,
    tags: task.tags
  }));

  const prompt = `You are an AI productivity assistant. Analyze these tasks and provide smart prioritization and insights.

Tasks to analyze:
${JSON.stringify(taskData, null, 2)}

Consider factors like:
- Due dates and urgency
- Task dependencies and blockers
- Energy levels and optimal timing
- Work-life balance
- Personal habits and preferences

Respond with JSON in this exact format:
{
  "prioritizedTaskIds": ["task-id-1", "task-id-2", ...],
  "priorityScores": {"task-id-1": 85, "task-id-2": 75, ...},
  "insights": [
    "Key insights about task prioritization",
    "Suggestions for scheduling",
    "Work-life balance recommendations"
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert productivity and task management AI. Provide actionable, personalized insights."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    const tokensUsed = response.usage?.total_tokens || 0;

    // Reorder tasks based on AI prioritization
    const priorityMap = new Map(
      result.prioritizedTaskIds.map((id: string, index: number) => [id, index])
    );
    
    const prioritizedTasks = tasks
      .map(task => ({
        ...task,
        aiPriorityScore: Number(result.priorityScores?.[task.id]) || 50
      }))
      .sort((a, b) => {
        const aIndex = Number(priorityMap.get(a.id) ?? 999);
        const bIndex = Number(priorityMap.get(b.id) ?? 999);
        return aIndex - bIndex;
      });

    await trackAiUsage(userId, "ai_task_prioritization", tokensUsed, { taskCount: tasks.length }, result);

    return {
      prioritizedTasks,
      insights: result.insights || []
    };
  } catch (error) {
    console.error("AI prioritization error:", error);
    return { prioritizedTasks: tasks, insights: ["Unable to analyze tasks at this time"] };
  }
}

// AI Meeting Transcript Analysis
export async function analyzeTranscript(userId: string, transcriptText: string): Promise<{
  summary: string;
  actionItems: Array<{ task: string; assignee?: string; priority: string }>;
  keyInsights: string[];
  suggestedTasks: Array<{ title: string; description: string; priority: string; estimatedMinutes: number }>;
}> {
  const prompt = `You are an AI meeting assistant. Analyze this meeting transcript and extract valuable information.

Transcript:
${transcriptText}

Provide a comprehensive analysis including:
1. Meeting summary
2. Action items with assignees
3. Key insights and decisions
4. Suggested tasks to create

Respond with JSON in this exact format:
{
  "summary": "Brief but comprehensive meeting summary",
  "actionItems": [
    {
      "task": "Specific action to take",
      "assignee": "Person responsible (if mentioned)",
      "priority": "high|medium|low"
    }
  ],
  "keyInsights": [
    "Important decisions made",
    "Key discussions and outcomes"
  ],
  "suggestedTasks": [
    {
      "title": "Task title",
      "description": "Detailed description",
      "priority": "high|medium|low",
      "estimatedMinutes": 30
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert meeting analyst and productivity assistant. Extract actionable information from meeting content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    const tokensUsed = response.usage?.total_tokens || 0;

    await trackAiUsage(userId, "ai_transcript_analysis", tokensUsed, { transcriptLength: transcriptText.length }, result);

    return result;
  } catch (error) {
    console.error("Transcript analysis error:", error);
    return {
      summary: "Unable to analyze transcript at this time",
      actionItems: [],
      keyInsights: [],
      suggestedTasks: []
    };
  }
}

// AI Note Insights and Summarization
export async function analyzeNotes(userId: string, notes: Note[]): Promise<{
  overallInsights: string[];
  summaryByCategory: Record<string, string>;
  suggestedConnections: Array<{ noteIds: string[]; reason: string }>;
  actionableItems: Array<{ content: string; priority: string }>;
}> {
  if (!notes.length) {
    return {
      overallInsights: [],
      summaryByCategory: {},
      suggestedConnections: [],
      actionableItems: []
    };
  }

  const noteData = notes.map(note => ({
    id: note.id,
    title: note.title,
    content: note.content.substring(0, 2000), // Limit content for token management
    type: note.type,
    tags: note.tags,
    createdAt: note.createdAt
  }));

  const prompt = `You are an AI knowledge assistant. Analyze these notes to provide insights and connections.

Notes to analyze:
${JSON.stringify(noteData, null, 2)}

Provide analysis including:
1. Overall insights and patterns
2. Summaries by topic/category
3. Suggested connections between notes
4. Actionable items that emerge from the content

Respond with JSON in this exact format:
{
  "overallInsights": [
    "Key patterns and themes across notes",
    "Important trends or recurring topics"
  ],
  "summaryByCategory": {
    "category_name": "Summary of notes in this category"
  },
  "suggestedConnections": [
    {
      "noteIds": ["note-id-1", "note-id-2"],
      "reason": "Why these notes are connected"
    }
  ],
  "actionableItems": [
    {
      "content": "Something actionable from the notes",
      "priority": "high|medium|low"
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert knowledge analyst and productivity assistant. Find meaningful patterns and actionable insights."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    const tokensUsed = response.usage?.total_tokens || 0;

    await trackAiUsage(userId, "ai_notes_analysis", tokensUsed, { noteCount: notes.length }, result);

    return result;
  } catch (error) {
    console.error("Note analysis error:", error);
    return {
      overallInsights: ["Unable to analyze notes at this time"],
      summaryByCategory: {},
      suggestedConnections: [],
      actionableItems: []
    };
  }
}

// AI Smart Scheduling
export async function generateSmartSchedule(userId: string, tasks: Task[], preferences: {
  workingHours: { start: string; end: string };
  breakPreferences: { duration: number; frequency: number };
  habitProtectedTimes: Array<{ start: string; end: string; description: string }>;
}): Promise<{
  schedule: Array<{
    taskId?: string;
    type: 'task' | 'break' | 'habit' | 'buffer';
    startTime: string;
    endTime: string;
    title: string;
    description?: string;
  }>;
  insights: string[];
  warnings: string[];
}> {
  const taskData = tasks.map(task => ({
    id: task.id,
    title: task.title,
    estimatedMinutes: task.estimatedMinutes || 30,
    priority: task.priority,
    aiPriorityScore: task.aiPriorityScore,
    dueDate: task.dueDate,
    category: task.category
  }));

  const prompt = `You are an AI scheduling assistant. Create an optimal daily schedule that balances productivity with well-being.

Tasks to schedule:
${JSON.stringify(taskData, null, 2)}

Preferences:
${JSON.stringify(preferences, null, 2)}

Create a schedule that:
- Respects working hours and protected times
- Includes appropriate breaks
- Prioritizes high-value tasks during peak hours
- Balances different types of work
- Leaves buffer time for unexpected items

Respond with JSON in this exact format:
{
  "schedule": [
    {
      "taskId": "task-id-or-null",
      "type": "task|break|habit|buffer",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "title": "Activity title",
      "description": "Optional description"
    }
  ],
  "insights": [
    "Why this schedule is optimized",
    "Key scheduling decisions made"
  ],
  "warnings": [
    "Potential issues or conflicts",
    "Suggestions for improvement"
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert productivity coach and scheduling assistant. Create balanced, sustainable schedules."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    const tokensUsed = response.usage?.total_tokens || 0;

    await trackAiUsage(userId, "ai_smart_scheduling", tokensUsed, { taskCount: tasks.length }, result);

    return result;
  } catch (error) {
    console.error("Smart scheduling error:", error);
    return {
      schedule: [],
      insights: ["Unable to generate schedule at this time"],
      warnings: ["Please try again later"]
    };
  }
}

// Audio transcription using Whisper
export async function transcribeAudio(userId: string, audioBuffer: Buffer, mimeType: string): Promise<{
  text: string;
  duration?: number;
}> {
  try {
    // Create a temporary file for the audio
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `audio-${Date.now()}.${mimeType.split('/')[1]}`);
    
    fs.writeFileSync(tempFile, audioBuffer);
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFile),
      model: "whisper-1",
    });

    // Clean up temp file
    fs.unlinkSync(tempFile);

    const tokensUsed = Math.ceil(transcription.text.length / 4); // Estimate tokens
    await trackAiUsage(userId, "ai_audio_transcription", tokensUsed, { audioSize: audioBuffer.length }, { text: transcription.text });

    return {
      text: transcription.text,
      duration: 0 // Whisper doesn't return duration in this format
    };
  } catch (error) {
    console.error("Audio transcription error:", error);
    return {
      text: "Unable to transcribe audio at this time"
    };
  }
}

// ===============================
// ENHANCED AI TOOL BUILDER FEATURES
// ===============================

// AI Tool Suggestions - Analyze user requirements and suggest tool ideas
export async function suggestToolIdeas(userId: string, requirements: {
  description: string;
  category?: string;
  targetUsers?: string;
  complexity?: 'simple' | 'medium' | 'advanced';
}): Promise<{
  suggestions: Array<{
    title: string;
    description: string;
    category: string;
    estimatedComplexity: 'simple' | 'medium' | 'advanced';
    keyFeatures: string[];
    useCase: string;
    templateRecommendation?: string;
  }>;
  insights: string[];
}> {
  const { description, category, targetUsers, complexity } = requirements;

  const prompt = `You are an expert AI assistant for a micro-tools platform. A user wants to create a tool and has provided this description:

"${description}"

Additional context:
- Category preference: ${category || 'any'}
- Target users: ${targetUsers || 'general users'}
- Desired complexity: ${complexity || 'medium'}

Based on this, suggest 3-5 specific tool ideas that would be valuable and feasible. Consider:
- Practical utility and real-world use cases
- Appropriate scope for a micro-tool
- User-friendly functionality
- Clear input/output patterns

Respond with JSON in this exact format:
{
  "suggestions": [
    {
      "title": "Tool Name",
      "description": "Clear 1-2 sentence description",
      "category": "calculator|converter|productivity|finance|utility|security",
      "estimatedComplexity": "simple|medium|advanced",
      "keyFeatures": ["feature1", "feature2", "feature3"],
      "useCase": "Specific use case example",
      "templateRecommendation": "suggested template if applicable"
    }
  ],
  "insights": [
    "Key insight about user's needs",
    "Recommendation for implementation approach",
    "Suggestion for user experience improvement"
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert product manager and tool designer. Provide practical, actionable tool suggestions that users can realistically build and use."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    const tokensUsed = response.usage?.total_tokens || 0;

    await trackAiUsage(userId, 'ai_tool_suggestions', tokensUsed, requirements, result);
    
    console.log(`✅ AI tool suggestions generated: ${result.suggestions?.length || 0} ideas`);
    return result;
  } catch (error) {
    console.error('AI tool suggestions error:', error);
    throw new Error('Failed to generate tool suggestions');
  }
}

// AI Code Generation - Generate optimized code for custom tools
export async function generateToolCode(userId: string, specifications: {
  toolName: string;
  description: string;
  inputFields: Array<{ name: string; type: string; description: string }>;
  outputFormat: string;
  logic: string;
  examples?: Array<{ input: any; expectedOutput: any }>;
}): Promise<{
  code: string;
  inputSchema: any;
  outputSchema: any;
  explanation: string;
  optimizations: string[];
  testCases: Array<{ input: any; expectedOutput: any }>;
}> {
  const { toolName, description, inputFields, outputFormat, logic, examples } = specifications;

  const prompt = `You are an expert JavaScript developer creating a micro-tool function. Generate production-ready code based on these specifications:

Tool Name: "${toolName}"
Description: "${description}"
Logic Requirements: "${logic}"

Input Fields:
${inputFields.map(f => `- ${f.name} (${f.type}): ${f.description}`).join('\n')}

Output Format: ${outputFormat}

${examples ? `Examples:\n${examples.map((ex, i) => `Example ${i + 1}:\nInput: ${JSON.stringify(ex.input)}\nExpected Output: ${JSON.stringify(ex.expectedOutput)}`).join('\n\n')}` : ''}

Generate a complete tool implementation including:
1. A clean, efficient JavaScript function
2. Proper input validation and error handling
3. Clear variable names and comments
4. Input/output schemas for form generation

Respond with JSON in this exact format:
{
  "code": "function customTool(inputs) { ... }",
  "inputSchema": {
    "field1": { "type": "text", "label": "Field Label", "required": true },
    "field2": { "type": "number", "label": "Number Field", "required": false }
  },
  "outputSchema": {
    "result": { "type": "string", "label": "Result", "renderer": "text" }
  },
  "explanation": "Clear explanation of how the code works",
  "optimizations": ["Performance tip 1", "Best practice 2"],
  "testCases": [
    { "input": {...}, "expectedOutput": {...} }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert JavaScript developer specializing in micro-tools and utility functions. Write clean, efficient, production-ready code with proper error handling."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    const tokensUsed = response.usage?.total_tokens || 0;

    await trackAiUsage(userId, 'ai_code_generation', tokensUsed, specifications, result);
    
    console.log(`✅ AI code generation completed for tool: ${toolName}`);
    return result;
  } catch (error) {
    console.error('AI code generation error:', error);
    throw new Error('Failed to generate tool code');
  }
}

// AI Template Recommendations - Smart template suggestions based on user needs
export async function recommendTemplates(userId: string, userInput: {
  description: string;
  preferredCategory?: string;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  timeConstraint?: string;
}): Promise<{
  recommendations: Array<{
    templateId: string;
    templateName: string;
    matchScore: number;
    reason: string;
    adaptations: string[];
  }>;
  customization: {
    suggestedModifications: string[];
    additionalFeatures: string[];
  };
}> {
  const { description, preferredCategory, skillLevel, timeConstraint } = userInput;

  const prompt = `You are an AI assistant helping users find the perfect template for their tool-building needs.

User Requirements:
- Description: "${description}"
- Preferred Category: ${preferredCategory || 'any'}
- Skill Level: ${skillLevel || 'intermediate'}
- Time Constraint: ${timeConstraint || 'moderate'}

Available Template Categories: calculator, converter, productivity, finance, security, utility

Based on the user's needs, recommend the best templates and suggest customizations. Consider:
- Functional alignment with requirements
- Appropriate complexity for skill level
- Time to customize vs building from scratch
- Potential for expansion and enhancement

Respond with JSON in this exact format:
{
  "recommendations": [
    {
      "templateId": "template-id",
      "templateName": "Template Name",
      "matchScore": 85,
      "reason": "Why this template fits well",
      "adaptations": ["Change this", "Add that", "Modify other"]
    }
  ],
  "customization": {
    "suggestedModifications": ["Specific modification 1", "Specific modification 2"],
    "additionalFeatures": ["Feature to add 1", "Feature to add 2"]
  }
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert template recommendation engine. Provide highly relevant, actionable template suggestions with specific customization guidance."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    const tokensUsed = response.usage?.total_tokens || 0;

    await trackAiUsage(userId, 'ai_template_recommendations', tokensUsed, userInput, result);
    
    console.log(`✅ AI template recommendations generated: ${result.recommendations?.length || 0} suggestions`);
    return result;
  } catch (error) {
    console.error('AI template recommendations error:', error);
    throw new Error('Failed to generate template recommendations');
  }
}

// AI Tool Analysis - Review and optimize existing tools
export async function analyzeToolPerformance(userId: string, toolData: {
  name: string;
  description: string;
  code: string;
  inputSchema: any;
  outputSchema: any;
  usageStats?: {
    totalRuns: number;
    averageExecutionTime: number;
    errorRate: number;
    userFeedback?: number; // 1-5 rating
  };
}): Promise<{
  analysis: {
    codeQuality: { score: number; issues: string[]; strengths: string[] };
    performance: { score: number; optimizations: string[] };
    usability: { score: number; improvements: string[] };
    security: { score: number; vulnerabilities: string[]; recommendations: string[] };
  };
  improvements: {
    immediate: string[];
    longTerm: string[];
    codeRefactoring: string;
  };
  insights: string[];
}> {
  const { name, description, code, inputSchema, outputSchema, usageStats } = toolData;

  const prompt = `You are an expert code reviewer and tool optimization specialist. Analyze this micro-tool for quality, performance, and user experience.

Tool Details:
Name: "${name}"
Description: "${description}"

Code:
\`\`\`javascript
${code}
\`\`\`

Input Schema: ${JSON.stringify(inputSchema, null, 2)}
Output Schema: ${JSON.stringify(outputSchema, null, 2)}

${usageStats ? `Usage Statistics:
- Total Runs: ${usageStats.totalRuns}
- Average Execution Time: ${usageStats.averageExecutionTime}ms
- Error Rate: ${usageStats.errorRate}%
- User Rating: ${usageStats.userFeedback || 'N/A'}/5` : 'No usage statistics available'}

Provide a comprehensive analysis covering:
1. Code quality and maintainability
2. Performance and efficiency
3. User experience and usability
4. Security considerations
5. Specific improvement recommendations

Respond with JSON in this exact format:
{
  "analysis": {
    "codeQuality": {
      "score": 85,
      "issues": ["Issue 1", "Issue 2"],
      "strengths": ["Strength 1", "Strength 2"]
    },
    "performance": {
      "score": 75,
      "optimizations": ["Optimization 1", "Optimization 2"]
    },
    "usability": {
      "score": 90,
      "improvements": ["UX improvement 1", "UX improvement 2"]
    },
    "security": {
      "score": 80,
      "vulnerabilities": ["Vulnerability 1"],
      "recommendations": ["Security rec 1", "Security rec 2"]
    }
  },
  "improvements": {
    "immediate": ["Quick fix 1", "Quick fix 2"],
    "longTerm": ["Long-term improvement 1", "Long-term improvement 2"],
    "codeRefactoring": "// Improved version of the code here"
  },
  "insights": ["Key insight 1", "Key insight 2", "Key insight 3"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are a senior software engineer and product optimization expert. Provide detailed, actionable analysis with specific recommendations for improvement."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    const tokensUsed = response.usage?.total_tokens || 0;

    await trackAiUsage(userId, 'ai_tool_analysis', tokensUsed, toolData, result);
    
    console.log(`✅ AI tool analysis completed for: ${name}`);
    return result;
  } catch (error) {
    console.error('AI tool analysis error:', error);
    throw new Error('Failed to analyze tool performance');
  }
}

// Zod schema for workflow validation
const workflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['trigger', 'action', 'condition', 'transform', 'api', 'ai', 'loop']),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.object({
    label: z.string().min(1),
  }),
});

const workflowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.literal('smoothstep'),
});

const workflowGenerationResponseSchema = z.object({
  nodes: z.array(workflowNodeSchema).min(1),
  edges: z.array(workflowEdgeSchema),
});

export async function generateWorkflowFromPrompt(userId: string, prompt: string): Promise<{
  nodes: Array<{
    id: string;
    type: 'trigger' | 'action' | 'condition' | 'transform' | 'api' | 'ai' | 'loop';
    position: { x: number; y: number };
    data: { label: string };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: 'smoothstep';
  }>;
}> {
  const systemPrompt = `You are an AI workflow automation expert. Your task is to analyze user requirements and generate a workflow structure.

Available Node Types:
- trigger: Starts the workflow (e.g., "Email Received", "Schedule", "Webhook", "Form Submit")
- action: Performs an action (e.g., "Send Email", "Save to Database", "Create File", "API Call")
- condition: Makes a decision (e.g., "Check Value", "Validate Data", "If/Else")
- transform: Transforms data (e.g., "Parse JSON", "Format Text", "Calculate", "Map Fields")
- api: External API call (e.g., "HTTP Request", "GraphQL Query", "REST API")
- ai: AI processing (e.g., "Analyze Text", "Generate Content", "Classify Data")
- loop: Iterate over data (e.g., "For Each Item", "While Condition", "Repeat")

CRITICAL REQUIREMENTS:
- MUST generate at least one node (preferably starting with a trigger)
- ALL node IDs must be unique strings
- ALL edge source/target IDs must match existing node IDs
- Position nodes left-to-right with 300px horizontal spacing
- Use 150px vertical spacing for parallel branches
- Create clear, descriptive labels for each node
- Connect nodes logically with edges
- Keep workflows simple and understandable

Example workflow structure:
{
  "nodes": [
    {
      "id": "trigger-1",
      "type": "trigger",
      "position": { "x": 100, "y": 150 },
      "data": { "label": "Email Received" }
    },
    {
      "id": "condition-1",
      "type": "condition",
      "position": { "x": 400, "y": 150 },
      "data": { "label": "Check Subject Contains Invoice" }
    },
    {
      "id": "action-1",
      "type": "action",
      "position": { "x": 700, "y": 150 },
      "data": { "label": "Save Attachment to Drive" }
    }
  ],
  "edges": [
    {
      "id": "e-trigger-1-condition-1",
      "source": "trigger-1",
      "target": "condition-1",
      "type": "smoothstep"
    },
    {
      "id": "e-condition-1-action-1",
      "source": "condition-1",
      "target": "action-1",
      "type": "smoothstep"
    }
  ]
}`;

  const userPrompt = `Create a workflow for the following requirement:

"${prompt}"

Respond with a JSON object containing nodes and edges arrays. Each node must have a unique id, type, position (x, y coordinates), and data (with label). Each edge must connect nodes with source, target, and type 'smoothstep'.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    const tokensUsed = response.usage?.total_tokens || 0;

    // Validate the GPT response structure
    const validationResult = workflowGenerationResponseSchema.safeParse(result);
    
    if (!validationResult.success) {
      console.error("Invalid workflow structure from GPT:", validationResult.error);
      throw new Error("The AI generated an invalid workflow structure. Please try rephrasing your request.");
    }

    const { nodes, edges } = validationResult.data;

    // Validate that all edge references point to existing nodes
    const nodeIds = new Set(nodes.map(n => n.id));
    const invalidEdges = edges.filter(e => !nodeIds.has(e.source) || !nodeIds.has(e.target));
    
    if (invalidEdges.length > 0) {
      console.error("Invalid edge references:", invalidEdges);
      throw new Error("The AI generated invalid node connections. Please try again.");
    }

    // Check for duplicate node IDs
    const uniqueIds = new Set(nodes.map(n => n.id));
    if (uniqueIds.size !== nodes.length) {
      console.error("Duplicate node IDs detected");
      throw new Error("The AI generated duplicate node IDs. Please try again.");
    }

    await trackAiUsage(userId, "ai_workflow_generation", tokensUsed, { prompt }, { nodes, edges });

    console.log(`✅ AI workflow generated for user ${userId}: ${nodes.length} nodes, ${edges.length} edges`);
    
    return { nodes, edges };
  } catch (error) {
    console.error("Workflow generation error:", error);
    
    // Provide user-friendly error messages
    if (error instanceof Error) {
      throw error; // Re-throw our validation errors with clear messages
    }
    
    throw new Error("Failed to generate workflow. Please try rephrasing your request or try again later.");
  }
}