import { z } from "zod";

export const readingTimeCalculatorInputSchema = z.object({
  text: z.string(),
  wordsPerMinute: z.number().min(100).max(300).default(200),
});

export const readingTimeCalculatorOutputSchema = z.object({
  wordCount: z.number(),
  characterCount: z.number(),
  readingTimeMinutes: z.number(),
  readingTimeSeconds: z.number(),
  readingTimeDisplay: z.string(),
  wordsPerMinute: z.number(),
});

export type ReadingTimeCalculatorInput = z.infer<typeof readingTimeCalculatorInputSchema>;
export type ReadingTimeCalculatorOutput = z.infer<typeof readingTimeCalculatorOutputSchema>;

export function readingTimeCalculatorResolver(input: ReadingTimeCalculatorInput): ReadingTimeCalculatorOutput {
  const { text, wordsPerMinute } = input;

  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  const characterCount = text.length;

  const totalSeconds = Math.ceil((wordCount * 60) / wordsPerMinute);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const readingTimeMinutes = wordCount / wordsPerMinute;

  let readingTimeDisplay: string;
  if (minutes === 0) {
    readingTimeDisplay = `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  } else if (seconds === 0) {
    readingTimeDisplay = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  } else {
    readingTimeDisplay = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}, ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  }

  return {
    wordCount,
    characterCount,
    readingTimeMinutes: Math.round(readingTimeMinutes * 100) / 100,
    readingTimeSeconds: totalSeconds,
    readingTimeDisplay,
    wordsPerMinute,
  };
}
