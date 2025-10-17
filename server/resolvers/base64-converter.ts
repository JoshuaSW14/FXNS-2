import { z } from "zod";

export const base64ConverterInputSchema = z.object({
  text: z.string(),
  operation: z.enum(["encode", "decode"]),
});

export const base64ConverterOutputSchema = z.object({
  result: z.string(),
  operation: z.enum(["encode", "decode"]),
  originalLength: z.number(),
  resultLength: z.number(),
});

export type Base64ConverterInput = z.infer<typeof base64ConverterInputSchema>;
export type Base64ConverterOutput = z.infer<typeof base64ConverterOutputSchema>;

export function base64ConverterResolver(input: Base64ConverterInput): Base64ConverterOutput {
  const { text, operation } = input;

  let result: string;
  
  if (operation === "encode") {
    result = Buffer.from(text, 'utf-8').toString('base64');
  } else {
    const normalized = text.replace(/\s/g, '');
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(normalized)) {
      throw new Error("Invalid base64 string: contains invalid characters");
    }
    try {
      result = Buffer.from(normalized, 'base64').toString('utf-8');
      const roundTrip = Buffer.from(result, 'utf-8').toString('base64');
      if (normalized.replace(/=/g, '') !== roundTrip.replace(/=/g, '')) {
        throw new Error("Invalid base64 string: failed round-trip validation");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Invalid base64 string provided for decoding");
    }
  }

  return {
    result,
    operation,
    originalLength: text.length,
    resultLength: result.length,
  };
}
