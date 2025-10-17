import { Router, Request, Response } from 'express';
import { z } from 'zod';
import OpenAI from 'openai';
import { asyncHandler, createValidationError, createUnauthorizedError } from '../middleware/error-handler.js';
import rateLimit from 'express-rate-limit';

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Rate limiting for AI preview endpoint
const previewRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    error: 'Too many AI preview requests. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to preview endpoint
router.use('/preview', previewRateLimit);

// Schema for AI preview request
const AIPreviewRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  outputFormat: z.enum(['text', 'json', 'markdown']).default('text'),
  model: z.string().optional().default('gpt-3.5-turbo')
});

// AI Preview endpoint for testing prompts in tool builder
router.post('/preview', asyncHandler(async (req: Request, res: Response) => {
  // Check if user is authenticated
  if (!req.user) {
    throw createUnauthorizedError('Authentication required for AI preview');
  }

  // Validate request body
  const validationResult = AIPreviewRequestSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw createValidationError('Invalid preview request', validationResult.error.errors);
  }

  const { prompt, outputFormat, model } = validationResult.data;

  try {
    console.log(`🤖 AI Preview: Running preview for user ${req.user.id}`);
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`📊 Output format: ${outputFormat}`);

    // Make OpenAI API call with preview settings
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant providing preview results for a tool builder. Be concise but informative in your responses.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: outputFormat === 'json' ? 1000 : 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    console.log(`✅ AI Preview successful: ${tokensUsed} tokens used`);

    // Format response based on output format
    let result: any;
    switch (outputFormat) {
      case 'json':
        try {
          // Try to parse as JSON, fallback to structured response
          const parsedJson = JSON.parse(aiResponse);
          result = parsedJson;
        } catch (e) {
          // If not valid JSON, wrap in a structured format
          result = { 
            text: aiResponse, 
            _note: 'AI response was not valid JSON, wrapped in text field' 
          };
        }
        break;
      case 'markdown':
        result = { markdown: aiResponse };
        break;
      default:
        result = { text: aiResponse };
    }

    // Add metadata for the preview
    result._preview = {
      tokensUsed,
      model,
      outputFormat,
      timestamp: new Date().toISOString()
    };

    res.json(result);

  } catch (error: any) {
    console.error('🚨 AI Preview error:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 401) {
      throw createValidationError('OpenAI API key is invalid or missing');
    } else if (error.status === 429) {
      throw createValidationError('OpenAI rate limit exceeded. Please try again later.');
    } else if (error.status === 400) {
      throw createValidationError('Invalid prompt or request to OpenAI API');
    } else {
      throw createValidationError('AI preview failed. Please try again.');
    }
  }
}));

// Token estimation endpoint
router.post('/estimate-tokens', asyncHandler(async (req: Request, res: Response) => {
  const { prompt, inputText = '' } = req.body;
  
  if (!prompt) {
    throw createValidationError('Prompt is required for token estimation');
  }

  // Simple token estimation (roughly 4 characters per token for English)
  const combinedText = prompt + inputText;
  const estimatedTokens = Math.ceil(combinedText.length / 4);
  
  // Estimate cost (in cents)
  const costPerThousandTokens = 0.15; // gpt-3.5-turbo pricing
  const estimatedCost = Math.ceil((estimatedTokens / 1000) * costPerThousandTokens * 100);
  
  res.json({
    estimatedTokens,
    estimatedCost, // in cents
    costFormatted: estimatedCost < 1 ? '< $0.01' : `$${(estimatedCost / 100).toFixed(2)}`
  });
}));

export default router;