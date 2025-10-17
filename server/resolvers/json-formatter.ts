import { z } from "zod";

export const jsonFormatterInputSchema = z.object({
  jsonString: z.string(),
  action: z.enum(['format', 'minify', 'validate']).default('format'),
  indentSize: z.number().int().min(1).max(8).default(2),
});

export const jsonFormatterOutputSchema = z.object({
  isValid: z.boolean(),
  formatted: z.string().optional(),
  errors: z.array(z.string()).optional(),
  stats: z.object({
    characters: z.number(),
    lines: z.number(),
    size: z.string(),
  }).optional(),
});

export type JsonFormatterInput = z.infer<typeof jsonFormatterInputSchema>;
export type JsonFormatterOutput = z.infer<typeof jsonFormatterOutputSchema>;

export function jsonFormatterResolver(input: JsonFormatterInput): JsonFormatterOutput {
  const { jsonString, action = 'format', indentSize = 2 } = input;
  
  try {
    // First, try to parse the JSON to validate it
    const parsed = JSON.parse(jsonString);
    
    let formatted: string;
    
    switch (action) {
      case 'format':
        formatted = JSON.stringify(parsed, null, indentSize);
        break;
      case 'minify':
        formatted = JSON.stringify(parsed);
        break;
      case 'validate':
        formatted = jsonString; // Return original if just validating
        break;
      default:
        formatted = JSON.stringify(parsed, null, indentSize);
    }
    
    const stats = {
      characters: formatted.length,
      lines: formatted.split('\n').length,
      size: formatBytes(new Blob([formatted]).size),
    };
    
    return {
      isValid: true,
      formatted,
      stats,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown JSON parsing error';
    
    return {
      isValid: false,
      errors: [errorMessage],
    };
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
