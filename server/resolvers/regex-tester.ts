import { z } from "zod";

export const regexTesterInputSchema = z.object({
  pattern: z.string(),
  flags: z.string().default('g'),
  testString: z.string(),
  operation: z.enum(['test', 'match', 'replace']).default('match'),
  replacement: z.string().optional(),
});

export const regexTesterOutputSchema = z.object({
  isValidRegex: z.boolean(),
  matches: z.array(z.object({
    match: z.string(),
    index: z.number(),
    groups: z.array(z.string()).optional(),
  })).optional(),
  result: z.string().optional(),
  error: z.string().optional(),
  stats: z.object({
    matchCount: z.number(),
    pattern: z.string(),
    flags: z.string(),
  }).optional(),
});

export type RegexTesterInput = z.infer<typeof regexTesterInputSchema>;
export type RegexTesterOutput = z.infer<typeof regexTesterOutputSchema>;

export function regexTesterResolver(input: RegexTesterInput): RegexTesterOutput {
  const { pattern, flags = 'g', testString, operation = 'match', replacement } = input;
  
  try {
    const regex = new RegExp(pattern, flags);
    
    switch (operation) {
      case 'test': {
        const result = regex.test(testString);
        return {
          isValidRegex: true,
          result: result.toString(),
          stats: {
            matchCount: result ? 1 : 0,
            pattern,
            flags,
          },
        };
      }
      
      case 'match': {
        const matches = [];
        let match;
        
        if (flags.includes('g')) {
          // Global search
          while ((match = regex.exec(testString)) !== null) {
            matches.push({
              match: match[0],
              index: match.index,
              groups: match.slice(1),
            });
            
            // Prevent infinite loop
            if (regex.lastIndex === match.index) {
              regex.lastIndex++;
            }
          }
        } else {
          // Single match
          match = regex.exec(testString);
          if (match) {
            matches.push({
              match: match[0],
              index: match.index,
              groups: match.slice(1),
            });
          }
        }
        
        return {
          isValidRegex: true,
          matches,
          stats: {
            matchCount: matches.length,
            pattern,
            flags,
          },
        };
      }
      
      case 'replace': {
        if (replacement === undefined) {
          return {
            isValidRegex: false,
            error: 'Replacement string is required for replace operation',
          };
        }
        
        const result = testString.replace(regex, replacement);
        const matchCount = (testString.match(regex) || []).length;
        
        return {
          isValidRegex: true,
          result,
          stats: {
            matchCount,
            pattern,
            flags,
          },
        };
      }
      
      default:
        return {
          isValidRegex: false,
          error: 'Unknown operation',
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid regular expression';
    
    return {
      isValidRegex: false,
      error: errorMessage,
    };
  }
}
