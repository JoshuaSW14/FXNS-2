import { z } from "zod";

export const textAnalyzerInputSchema = z.object({
  text: z.string().min(1, "Text is required"),
});

export const textAnalyzerOutputSchema = z.object({
  characterCount: z.number(),
  characterCountNoSpaces: z.number(),
  wordCount: z.number(),
  sentenceCount: z.number(),
  paragraphCount: z.number(),
  lineCount: z.number(),
  averageWordsPerSentence: z.number(),
  averageCharactersPerWord: z.number(),
  readingTimeMinutes: z.number(),
  mostUsedWords: z.array(z.object({
    word: z.string(),
    count: z.number(),
  })).max(10),
});

export type TextAnalyzerInput = z.infer<typeof textAnalyzerInputSchema>;
export type TextAnalyzerOutput = z.infer<typeof textAnalyzerOutputSchema>;

export function textAnalyzer(input: TextAnalyzerInput): TextAnalyzerOutput {
  const { text } = input;

  // Basic counts
  const characterCount = text.length;
  const characterCountNoSpaces = text.replace(/\s/g, "").length;
  
  // Word count
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  
  // Sentence count (split by sentence-ending punctuation)
  const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
  const sentenceCount = sentences.length;
  
  // Paragraph count (split by double newlines or more)
  const paragraphs = text.split(/\n\s*\n/).filter(paragraph => paragraph.trim().length > 0);
  const paragraphCount = paragraphs.length;
  
  // Line count
  const lines = text.split('\n');
  const lineCount = lines.length;
  
  // Averages
  const averageWordsPerSentence = sentenceCount > 0 ? Math.round((wordCount / sentenceCount) * 100) / 100 : 0;
  const averageCharactersPerWord = wordCount > 0 ? Math.round((characterCountNoSpaces / wordCount) * 100) / 100 : 0;
  
  // Reading time (average 200 words per minute)
  const readingTimeMinutes = Math.ceil(wordCount / 200);
  
  // Most used words
  const wordFrequency: { [key: string]: number } = {};
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they']);
  
  words.forEach(word => {
    const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
    if (cleanWord.length > 2 && !commonWords.has(cleanWord)) {
      wordFrequency[cleanWord] = (wordFrequency[cleanWord] || 0) + 1;
    }
  });
  
  const mostUsedWords = Object.entries(wordFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  return {
    characterCount,
    characterCountNoSpaces,
    wordCount,
    sentenceCount,
    paragraphCount,
    lineCount,
    averageWordsPerSentence,
    averageCharactersPerWord,
    readingTimeMinutes,
    mostUsedWords,
  };
}