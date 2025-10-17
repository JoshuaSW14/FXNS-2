import { tipCalculatorResolver, tipCalculatorInputSchema, tipCalculatorOutputSchema } from './tip-calculator';
import { unitConverterResolver, unitConverterInputSchema, unitConverterOutputSchema } from './unit-converter';
import { loanPaymentResolver, loanPaymentInputSchema, loanPaymentOutputSchema } from './loan-payment';
import { jsonFormatterResolver, jsonFormatterInputSchema, jsonFormatterOutputSchema } from './json-formatter';
import { regexTesterResolver, regexTesterInputSchema, regexTesterOutputSchema } from './regex-tester';
import { workoutGeneratorResolver, workoutGeneratorInputSchema, workoutGeneratorOutputSchema } from './workout-generator';
import { passwordGenerator, passwordGeneratorInputSchema, passwordGeneratorOutputSchema } from './password-generator';
import { colorConverter, colorConverterInputSchema, colorConverterOutputSchema } from './color-converter';
import { textAnalyzer, textAnalyzerInputSchema, textAnalyzerOutputSchema } from './text-analyzer';
import { qrCodeGenerator, qrCodeGeneratorInputSchema, qrCodeGeneratorOutputSchema } from './qr-code-generator';
import { hashGenerator, hashGeneratorInputSchema, hashGeneratorOutputSchema } from './hash-generator';
import { urlShortener, urlShortenerInputSchema, urlShortenerOutputSchema } from './url-shortener';
import { aiTaskPrioritizerResolver, aiTaskPrioritizerInputSchema, aiTaskPrioritizerOutputSchema } from './ai-task-prioritizer';
import { meetingTranscriptAnalyzerResolver, meetingTranscriptAnalyzerInputSchema, meetingTranscriptAnalyzerOutputSchema } from './meeting-transcript-analyzer';
import { smartSchedulerResolver, smartSchedulerInputSchema, smartSchedulerOutputSchema } from './smart-scheduler';
import { markdownConverterResolver, markdownConverterInputSchema, markdownConverterOutputSchema } from './markdown-converter';
import { base64ConverterResolver, base64ConverterInputSchema, base64ConverterOutputSchema } from './base64-converter';
import { readingTimeCalculatorResolver, readingTimeCalculatorInputSchema, readingTimeCalculatorOutputSchema } from './reading-time-calculator';
import { textCaseConverterResolver, textCaseConverterInputSchema, textCaseConverterOutputSchema } from './text-case-converter';

export const resolvers = {
  'tip-calculator': {
    resolver: tipCalculatorResolver,
    inputSchema: tipCalculatorInputSchema,
    outputSchema: tipCalculatorOutputSchema,
  },
  'unit-converter': {
    resolver: unitConverterResolver,
    inputSchema: unitConverterInputSchema,
    outputSchema: unitConverterOutputSchema,
  },
  'loan-payment': {
    resolver: loanPaymentResolver,
    inputSchema: loanPaymentInputSchema,
    outputSchema: loanPaymentOutputSchema,
  },
  'json-formatter': {
    resolver: jsonFormatterResolver,
    inputSchema: jsonFormatterInputSchema,
    outputSchema: jsonFormatterOutputSchema,
  },
  'regex-tester': {
    resolver: regexTesterResolver,
    inputSchema: regexTesterInputSchema,
    outputSchema: regexTesterOutputSchema,
  },
  'workout-generator': {
    resolver: workoutGeneratorResolver,
    inputSchema: workoutGeneratorInputSchema,
    outputSchema: workoutGeneratorOutputSchema,
  },
  'password-generator': {
    resolver: passwordGenerator,
    inputSchema: passwordGeneratorInputSchema,
    outputSchema: passwordGeneratorOutputSchema,
  },
  'color-converter': {
    resolver: colorConverter,
    inputSchema: colorConverterInputSchema,
    outputSchema: colorConverterOutputSchema,
  },
  'text-analyzer': {
    resolver: textAnalyzer,
    inputSchema: textAnalyzerInputSchema,
    outputSchema: textAnalyzerOutputSchema,
  },
  'qr-code-generator': {
    resolver: qrCodeGenerator,
    inputSchema: qrCodeGeneratorInputSchema,
    outputSchema: qrCodeGeneratorOutputSchema,
  },
  'hash-generator': {
    resolver: hashGenerator,
    inputSchema: hashGeneratorInputSchema,
    outputSchema: hashGeneratorOutputSchema,
  },
  'url-shortener': {
    resolver: urlShortener,
    inputSchema: urlShortenerInputSchema,
    outputSchema: urlShortenerOutputSchema,
  },
  'ai-task-prioritizer': {
    resolver: aiTaskPrioritizerResolver,
    inputSchema: aiTaskPrioritizerInputSchema,
    outputSchema: aiTaskPrioritizerOutputSchema,
  },
  'meeting-transcript-analyzer': {
    resolver: meetingTranscriptAnalyzerResolver,
    inputSchema: meetingTranscriptAnalyzerInputSchema,
    outputSchema: meetingTranscriptAnalyzerOutputSchema,
  },
  'smart-scheduler': {
    resolver: smartSchedulerResolver,
    inputSchema: smartSchedulerInputSchema,
    outputSchema: smartSchedulerOutputSchema,
  },
  'markdown-converter': {
    resolver: markdownConverterResolver,
    inputSchema: markdownConverterInputSchema,
    outputSchema: markdownConverterOutputSchema,
  },
  'base64-converter': {
    resolver: base64ConverterResolver,
    inputSchema: base64ConverterInputSchema,
    outputSchema: base64ConverterOutputSchema,
  },
  'reading-time-calculator': {
    resolver: readingTimeCalculatorResolver,
    inputSchema: readingTimeCalculatorInputSchema,
    outputSchema: readingTimeCalculatorOutputSchema,
  },
  'text-case-converter': {
    resolver: textCaseConverterResolver,
    inputSchema: textCaseConverterInputSchema,
    outputSchema: textCaseConverterOutputSchema,
  },
};

export type ResolverKey = keyof typeof resolvers;
