import { z } from "zod";

export const textCaseConverterInputSchema = z.object({
  text: z.string(),
  targetCase: z.enum([
    "uppercase",
    "lowercase",
    "titlecase",
    "sentencecase",
    "camelcase",
    "pascalcase",
    "snakecase",
    "kebabcase",
  ]),
});

export const textCaseConverterOutputSchema = z.object({
  original: z.string(),
  converted: z.string(),
  targetCase: z.string(),
  characterCount: z.number(),
});

export type TextCaseConverterInput = z.infer<typeof textCaseConverterInputSchema>;
export type TextCaseConverterOutput = z.infer<typeof textCaseConverterOutputSchema>;

export function textCaseConverterResolver(input: TextCaseConverterInput): TextCaseConverterOutput {
  const { text, targetCase } = input;

  let converted: string;

  switch (targetCase) {
    case "uppercase":
      converted = text.toUpperCase();
      break;

    case "lowercase":
      converted = text.toLowerCase();
      break;

    case "titlecase":
      converted = text
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      break;

    case "sentencecase":
      converted = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      break;

    case "camelcase":
      converted = text
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
        .replace(/^[A-Z]/, (char) => char.toLowerCase());
      break;

    case "pascalcase":
      converted = text
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
        .replace(/^[a-z]/, (char) => char.toUpperCase());
      break;

    case "snakecase":
      converted = text
        .trim()
        .replace(/([A-Z])/g, '_$1')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
      break;

    case "kebabcase":
      converted = text
        .trim()
        .replace(/([A-Z])/g, '-$1')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
      break;

    default:
      converted = text;
  }

  return {
    original: text,
    converted,
    targetCase,
    characterCount: text.length,
  };
}
