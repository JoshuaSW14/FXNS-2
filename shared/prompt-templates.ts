// AI Prompt Templates for Enhanced UX
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  prompt: string;
  suggestedInputFields: string[];
  outputFormat: 'text' | 'json' | 'markdown';
  estimatedTokens: number;
  variables: Array<{
    name: string;
    description: string;
    required: boolean;
    example?: string;
  }>;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // Content Analysis Templates
  {
    id: 'sentiment_analysis',
    name: 'Sentiment Analysis',
    description: 'Analyze the emotional tone and sentiment of text input',
    category: 'Analysis',
    prompt: `Analyze the sentiment of the following text and provide a detailed breakdown:

Text to analyze: {text}

Provide the analysis in the following JSON format:
{
  "overall_sentiment": "positive|negative|neutral",
  "confidence": 0.85,
  "emotions": ["joy", "trust"],
  "reasoning": "Brief explanation of the sentiment analysis",
  "score": 7.5
}`,
    suggestedInputFields: ['text'],
    outputFormat: 'json',
    estimatedTokens: 150,
    variables: [
      {
        name: 'text',
        description: 'The text content to analyze for sentiment',
        required: true,
        example: 'I love this new product! It works perfectly.'
      }
    ]
  },
  {
    id: 'content_summarization',
    name: 'Content Summarization',
    description: 'Create concise summaries of longer text content',
    category: 'Content',
    prompt: `Summarize the following content in a clear and concise manner:

Content to summarize: {content}

Please provide:
1. A one-sentence summary
2. Key points (3-5 bullet points)
3. Main takeaway

Keep the summary focused and informative.`,
    suggestedInputFields: ['content'],
    outputFormat: 'markdown',
    estimatedTokens: 200,
    variables: [
      {
        name: 'content',
        description: 'The content to be summarized',
        required: true,
        example: 'Long article or document text...'
      }
    ]
  },
  {
    id: 'grammar_check',
    name: 'Grammar & Style Check',
    description: 'Check grammar, spelling, and writing style',
    category: 'Content',
    prompt: `Review the following text for grammar, spelling, and style improvements:

Original text: {text}

Please provide:
1. Corrected version
2. List of issues found
3. Style suggestions for improvement

Format your response clearly with sections for each type of feedback.`,
    suggestedInputFields: ['text'],
    outputFormat: 'markdown',
    estimatedTokens: 180,
    variables: [
      {
        name: 'text',
        description: 'Text to review for grammar and style',
        required: true,
        example: 'The quick brown fox jumps over the lazy dog.'
      }
    ]
  },

  // Business & Analysis Templates
  {
    id: 'business_analysis',
    name: 'Business Idea Analysis',
    description: 'Analyze business ideas and provide structured feedback',
    category: 'Business',
    prompt: `Analyze the following business idea and provide structured feedback:

Business Idea: {idea}
Target Market: {market}
Budget: {budget}

Please analyze and provide feedback in JSON format:
{
  "viability_score": 7.5,
  "strengths": ["list of strengths"],
  "weaknesses": ["list of potential issues"],
  "market_analysis": "brief market assessment",
  "recommendations": ["actionable suggestions"],
  "next_steps": ["immediate actions to take"]
}`,
    suggestedInputFields: ['idea', 'market', 'budget'],
    outputFormat: 'json',
    estimatedTokens: 300,
    variables: [
      {
        name: 'idea',
        description: 'Description of the business idea',
        required: true,
        example: 'A mobile app that helps people find local farmers markets'
      },
      {
        name: 'market',
        description: 'Target market or audience',
        required: false,
        example: 'Health-conscious consumers aged 25-45'
      },
      {
        name: 'budget',
        description: 'Available budget for the project',
        required: false,
        example: '$10,000'
      }
    ]
  },
  {
    id: 'competitor_analysis',
    name: 'Competitor Analysis',
    description: 'Analyze competitors and market positioning',
    category: 'Business',
    prompt: `Analyze the competitive landscape for the following:

Company/Product: {product}
Industry: {industry}
Key Competitors: {competitors}

Provide a comprehensive analysis covering:
- Competitive strengths and weaknesses
- Market positioning opportunities
- Differentiation strategies
- Pricing insights
- Recommendations for competitive advantage`,
    suggestedInputFields: ['product', 'industry', 'competitors'],
    outputFormat: 'markdown',
    estimatedTokens: 400,
    variables: [
      {
        name: 'product',
        description: 'Your product or service',
        required: true,
        example: 'Email marketing software for small businesses'
      },
      {
        name: 'industry',
        description: 'Industry or market sector',
        required: true,
        example: 'SaaS marketing tools'
      },
      {
        name: 'competitors',
        description: 'Known competitors',
        required: false,
        example: 'Mailchimp, Constant Contact, ConvertKit'
      }
    ]
  },

  // Technical Templates
  {
    id: 'code_review',
    name: 'Code Review',
    description: 'Review code for best practices and improvements',
    category: 'Technical',
    prompt: `Review the following code and provide feedback:

Code Language: {language}
Code to review:
{code}

Please provide:
1. Overall assessment
2. Specific issues found
3. Best practice recommendations
4. Security considerations (if applicable)
5. Performance optimization suggestions

Focus on clarity, maintainability, and best practices.`,
    suggestedInputFields: ['language', 'code'],
    outputFormat: 'markdown',
    estimatedTokens: 350,
    variables: [
      {
        name: 'language',
        description: 'Programming language used',
        required: true,
        example: 'JavaScript'
      },
      {
        name: 'code',
        description: 'Code to be reviewed',
        required: true,
        example: 'function calculateTotal(items) { ... }'
      }
    ]
  },
  {
    id: 'api_documentation',
    name: 'API Documentation Generator',
    description: 'Generate comprehensive API documentation',
    category: 'Technical',
    prompt: `Generate comprehensive API documentation for the following endpoint:

Endpoint: {endpoint}
Method: {method}
Description: {description}
Parameters: {parameters}

Please create documentation that includes:
- Endpoint overview
- Request/response examples
- Parameter descriptions
- Error codes and handling
- Usage examples in multiple languages

Format as clear, professional API documentation.`,
    suggestedInputFields: ['endpoint', 'method', 'description', 'parameters'],
    outputFormat: 'markdown',
    estimatedTokens: 400,
    variables: [
      {
        name: 'endpoint',
        description: 'API endpoint URL',
        required: true,
        example: '/api/users'
      },
      {
        name: 'method',
        description: 'HTTP method',
        required: true,
        example: 'POST'
      },
      {
        name: 'description',
        description: 'Brief description of what the endpoint does',
        required: true,
        example: 'Creates a new user account'
      },
      {
        name: 'parameters',
        description: 'Request parameters and their types',
        required: false,
        example: 'name (string), email (string), password (string)'
      }
    ]
  },

  // Creative Templates
  {
    id: 'creative_writing',
    name: 'Creative Writing Assistant',
    description: 'Help with creative writing projects',
    category: 'Creative',
    prompt: `Help me with my creative writing project:

Genre: {genre}
Setting: {setting}
Main Character: {character}
Plot Idea: {plot}

Please provide:
1. Character development suggestions
2. Plot enhancement ideas
3. Dialogue examples
4. Scene descriptions
5. Next chapter outline

Be creative and inspiring while maintaining consistency with the provided elements.`,
    suggestedInputFields: ['genre', 'setting', 'character', 'plot'],
    outputFormat: 'markdown',
    estimatedTokens: 500,
    variables: [
      {
        name: 'genre',
        description: 'Literary genre',
        required: true,
        example: 'Science Fiction'
      },
      {
        name: 'setting',
        description: 'Story setting',
        required: false,
        example: 'Mars colony in 2150'
      },
      {
        name: 'character',
        description: 'Main character description',
        required: false,
        example: 'Dr. Sarah Chen, a biologist studying Martian ecosystems'
      },
      {
        name: 'plot',
        description: 'Basic plot idea',
        required: false,
        example: 'Discovery of mysterious life forms beneath the Martian surface'
      }
    ]
  },
  {
    id: 'blog_post_ideas',
    name: 'Blog Post Ideas Generator',
    description: 'Generate blog post ideas and outlines',
    category: 'Creative',
    prompt: `Generate blog post ideas for the following topic:

Main Topic: {topic}
Target Audience: {audience}
Content Goals: {goals}

Please provide:
1. 5 compelling blog post titles
2. Brief outline for the most promising idea
3. SEO keyword suggestions
4. Call-to-action recommendations
5. Content format suggestions (list, how-to, case study, etc.)

Focus on engaging, valuable content that resonates with the target audience.`,
    suggestedInputFields: ['topic', 'audience', 'goals'],
    outputFormat: 'markdown',
    estimatedTokens: 300,
    variables: [
      {
        name: 'topic',
        description: 'Main topic or theme',
        required: true,
        example: 'Remote work productivity'
      },
      {
        name: 'audience',
        description: 'Target audience',
        required: false,
        example: 'Remote workers and digital nomads'
      },
      {
        name: 'goals',
        description: 'Content marketing goals',
        required: false,
        example: 'Increase newsletter signups and build thought leadership'
      }
    ]
  },

  // Communication Templates
  {
    id: 'email_composer',
    name: 'Professional Email Composer',
    description: 'Compose professional emails for various purposes',
    category: 'Communication',
    prompt: `Compose a professional email with the following details:

Email Type: {type}
Recipient: {recipient}
Main Message: {message}
Tone: {tone}

Please write a complete, professional email including:
- Appropriate subject line
- Professional greeting
- Clear, well-structured body
- Appropriate closing
- Professional signature placeholder

Ensure the tone matches the specified style and the message is clear and actionable.`,
    suggestedInputFields: ['type', 'recipient', 'message', 'tone'],
    outputFormat: 'text',
    estimatedTokens: 250,
    variables: [
      {
        name: 'type',
        description: 'Type of email',
        required: true,
        example: 'Follow-up after meeting'
      },
      {
        name: 'recipient',
        description: 'Who you\'re emailing',
        required: true,
        example: 'John Smith, Marketing Director'
      },
      {
        name: 'message',
        description: 'Main message or purpose',
        required: true,
        example: 'Thank them for the meeting and confirm next steps'
      },
      {
        name: 'tone',
        description: 'Desired tone',
        required: false,
        example: 'Professional and friendly'
      }
    ]
  },
  {
    id: 'meeting_notes_summary',
    name: 'Meeting Notes Summarizer',
    description: 'Transform raw meeting notes into structured summaries',
    category: 'Communication',
    prompt: `Summarize these meeting notes into a professional format:

Meeting Topic: {topic}
Date: {date}
Raw Notes: {notes}

Create a structured summary with:
1. Meeting Overview
2. Key Decisions Made
3. Action Items (with responsible parties if mentioned)
4. Next Steps
5. Follow-up Requirements

Format as a clear, professional meeting summary.`,
    suggestedInputFields: ['topic', 'date', 'notes'],
    outputFormat: 'markdown',
    estimatedTokens: 300,
    variables: [
      {
        name: 'topic',
        description: 'Meeting topic or subject',
        required: true,
        example: 'Q4 Marketing Strategy Review'
      },
      {
        name: 'date',
        description: 'Meeting date',
        required: false,
        example: '2024-03-15'
      },
      {
        name: 'notes',
        description: 'Raw meeting notes',
        required: true,
        example: 'Discussed budget allocation, John mentioned increased social media spend...'
      }
    ]
  },

  // Additional Analysis Templates
  {
    id: 'data_insights',
    name: 'Data Analysis & Insights',
    description: 'Extract insights and patterns from data descriptions',
    category: 'Analysis',
    prompt: `Analyze the following data and provide actionable insights:

Data Description: {data}
Context: {context}
Objectives: {objectives}

Please provide:
1. Key patterns and trends identified
2. Statistical observations
3. Actionable recommendations
4. Potential risks or opportunities
5. Suggested next steps for further analysis

Focus on practical insights that can drive decision-making.`,
    suggestedInputFields: ['data', 'context', 'objectives'],
    outputFormat: 'json',
    estimatedTokens: 400,
    variables: [
      {
        name: 'data',
        description: 'Description of the data being analyzed',
        required: true,
        example: 'Monthly sales figures for the past 12 months showing seasonal variations'
      },
      {
        name: 'context',
        description: 'Business or research context',
        required: false,
        example: 'E-commerce retail business looking to optimize inventory'
      },
      {
        name: 'objectives',
        description: 'Analysis objectives',
        required: false,
        example: 'Identify peak sales periods and optimize stock levels'
      }
    ]
  },

  // Additional Technical Template
  {
    id: 'system_architecture',
    name: 'System Architecture Review',
    description: 'Review and provide feedback on system architecture designs',
    category: 'Technical',
    prompt: `Review this system architecture and provide comprehensive feedback:

System Description: {system}
Technology Stack: {stack}
Scale Requirements: {scale}
Current Challenges: {challenges}

Please evaluate:
1. Architecture strengths and weaknesses
2. Scalability considerations
3. Security implications
4. Performance bottlenecks
5. Recommended improvements
6. Alternative approaches to consider

Provide specific, actionable recommendations for improvement.`,
    suggestedInputFields: ['system', 'stack', 'scale', 'challenges'],
    outputFormat: 'markdown',
    estimatedTokens: 500,
    variables: [
      {
        name: 'system',
        description: 'System architecture description',
        required: true,
        example: 'Microservices architecture with API gateway, multiple databases, and message queues'
      },
      {
        name: 'stack',
        description: 'Technology stack used',
        required: false,
        example: 'Node.js, PostgreSQL, Redis, Docker, Kubernetes'
      },
      {
        name: 'scale',
        description: 'Expected scale and load',
        required: false,
        example: '100k daily active users, 1M API calls per day'
      },
      {
        name: 'challenges',
        description: 'Current challenges or concerns',
        required: false,
        example: 'High latency during peak hours, difficult deployment process'
      }
    ]
  }
];

export const PROMPT_CATEGORIES = [
  'Analysis',
  'Business', 
  'Content',
  'Technical',
  'Creative',
  'Communication'
];

// Utility functions for prompt templates
export function getTemplatesByCategory(category: string): PromptTemplate[] {
  return PROMPT_TEMPLATES.filter(template => template.category === category);
}

export function getTemplateById(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find(template => template.id === id);
}

export function searchTemplates(query: string): PromptTemplate[] {
  const lowercaseQuery = query.toLowerCase();
  return PROMPT_TEMPLATES.filter(template => 
    template.name.toLowerCase().includes(lowercaseQuery) ||
    template.description.toLowerCase().includes(lowercaseQuery) ||
    template.category.toLowerCase().includes(lowercaseQuery)
  );
}

// Token estimation utilities
export function estimateTokensForPrompt(prompt: string, inputText: string = ''): number {
  // Rough estimation: ~4 characters per token for English text
  const combinedText = prompt + inputText;
  return Math.ceil(combinedText.length / 4);
}

export function estimateCost(tokens: number, model: string = 'gpt-3.5-turbo'): number {
  // Cost estimation in cents based on OpenAI pricing
  const pricing: Record<string, number> = {
    'gpt-3.5-turbo': 0.0015, // per 1k tokens
    'gpt-4': 0.03, // per 1k tokens
    'gpt-4-turbo': 0.01 // per 1k tokens
  };
  
  const costPerToken = (pricing[model] || pricing['gpt-3.5-turbo']) / 1000;
  return Math.ceil(tokens * costPerToken * 100); // in cents
}

export function formatCost(costInCents: number): string {
  if (costInCents < 1) return '< $0.01';
  return `$${(costInCents / 100).toFixed(2)}`;
}