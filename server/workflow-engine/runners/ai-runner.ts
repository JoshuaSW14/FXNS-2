import { Node } from 'reactflow';
import { ExecutionContext, NodeExecutionResult, NodeRunner } from '../types';
import OpenAI from 'openai';

export class AiRunner implements NodeRunner {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI API key not configured');
      }

      const taskType = node.data?.taskType || 'text_generation';
      const config = node.data?.config || {};

      let result: any;

      switch (taskType) {
        case 'Text Generation':
          result = await this.generateText(config, context);
          break;
        
        case 'Sentiment Analysis':
          result = await this.analyzeSentiment(config, context);
          break;
        
        case 'Summarization':
          result = await this.summarize(config, context);
          break;
        
        case 'Classification':
          result = await this.classify(config, context);
          break;
        
        case 'Data Extraction':
          result = await this.extractData(config, context);
          break;
        
        default:
          result = await this.generateText(config, context);
      }

      return {
        success: true,
        output: result,
        shouldContinue: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        shouldContinue: false,
      };
    }
  }

  private async generateText(config: any, context: ExecutionContext): Promise<any> {
    const { prompt, model = 'gpt-4o-mini', maxTokens = 500 } = config;
    const resolvedPrompt = this.resolveValue(prompt, context);

    const completion = await this.openai!.chat.completions.create({
      model,
      messages: [{ role: 'user', content: resolvedPrompt }],
      max_tokens: maxTokens,
    });

    return {
      text: completion.choices[0].message.content,
      model,
      usage: completion.usage,
    };
  }

  private async analyzeSentiment(config: any, context: ExecutionContext): Promise<any> {
    const { text } = config;
    const resolvedText = this.resolveValue(text, context);

    const completion = await this.openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Analyze the sentiment of this text and respond with only one word (positive, negative, or neutral): ${resolvedText}`,
      }],
      max_tokens: 10,
    });

    const sentiment = completion.choices[0].message.content?.toLowerCase().trim() || 'neutral';

    return {
      sentiment,
      text: resolvedText,
    };
  }

  private async summarize(config: any, context: ExecutionContext): Promise<any> {
    const { text, maxLength = 100 } = config;
    const resolvedText = this.resolveValue(text, context);

    const completion = await this.openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Summarize the following text in ${maxLength} words or less:\n\n${resolvedText}`,
      }],
      max_tokens: maxLength * 2,
    });

    return {
      summary: completion.choices[0].message.content,
      originalLength: resolvedText.length,
    };
  }

  private async classify(config: any, context: ExecutionContext): Promise<any> {
    const { text, categories } = config;
    const resolvedText = this.resolveValue(text, context);
    const categoryList = Array.isArray(categories) ? categories.join(', ') : 'general categories';

    const completion = await this.openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Classify this text into one of these categories (${categoryList}):\n\n${resolvedText}\n\nRespond with only the category name.`,
      }],
      max_tokens: 50,
    });

    return {
      category: completion.choices[0].message.content?.trim(),
      text: resolvedText,
      categories,
    };
  }

  private async extractData(config: any, context: ExecutionContext): Promise<any> {
    const { text, fields } = config;
    const resolvedText = this.resolveValue(text, context);
    const fieldList = Array.isArray(fields) ? fields.join(', ') : 'relevant information';

    const completion = await this.openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Extract the following information from this text (${fieldList}):\n\n${resolvedText}\n\nRespond in JSON format.`,
      }],
      max_tokens: 500,
    });

    const content = completion.choices[0].message.content || '{}';
    
    try {
      const extracted = JSON.parse(content);
      return {
        extracted,
        text: resolvedText,
      };
    } catch {
      return {
        extracted: { raw: content },
        text: resolvedText,
      };
    }
  }

  private resolveValue(value: string, context: ExecutionContext): string {
    if (!value) return '';
    
    let resolved = value;
    const variableRegex = /\{\{([^}]+)\}\}/g;
    
    resolved = resolved.replace(variableRegex, (match, varName) => {
      const trimmed = varName.trim();
      
      if (trimmed.startsWith('step.')) {
        const stepRef = trimmed.substring(5);
        const [stepId, ...path] = stepRef.split('.');
        const stepOutput = context.stepOutputs.get(stepId);
        
        if (stepOutput && path.length > 0) {
          return this.getNestedValue(stepOutput, path);
        }
        return JSON.stringify(stepOutput) || match;
      }
      
      const varValue = context.variables.get(trimmed);
      return varValue !== undefined ? String(varValue) : match;
    });
    
    return resolved;
  }

  private getNestedValue(obj: any, path: string[]): any {
    return path.reduce((current, key) => current?.[key], obj);
  }
}
