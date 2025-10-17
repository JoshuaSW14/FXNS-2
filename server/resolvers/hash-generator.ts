import { z } from "zod";
import { createHash } from "crypto";

export const hashGeneratorInputSchema = z.object({
  text: z.string().min(1, "Text is required"),
  algorithm: z.enum(["md5", "sha1", "sha256", "sha512"]).default("sha256"),
});

export const hashGeneratorOutputSchema = z.object({
  hash: z.string(),
  algorithm: z.string(),
  length: z.number(),
  uppercase: z.string(),
});

export type HashGeneratorInput = z.infer<typeof hashGeneratorInputSchema>;
export type HashGeneratorOutput = z.infer<typeof hashGeneratorOutputSchema>;

export function hashGenerator(input: HashGeneratorInput): HashGeneratorOutput {
  const { text, algorithm } = input;
  
  const hash = createHash(algorithm).update(text, 'utf8').digest('hex');
  
  return {
    hash,
    algorithm,
    length: hash.length,
    uppercase: hash.toUpperCase(),
  };
}