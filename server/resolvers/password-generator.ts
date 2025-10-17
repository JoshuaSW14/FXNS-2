import { z } from "zod";

export const passwordGeneratorInputSchema = z.object({
  length: z.number().min(4).max(128).default(12),
  includeUppercase: z.boolean().default(true),
  includeLowercase: z.boolean().default(true),
  includeNumbers: z.boolean().default(true),
  includeSymbols: z.boolean().default(false),
  excludeSimilar: z.boolean().default(false),
});

export const passwordGeneratorOutputSchema = z.object({
  password: z.string(),
  strength: z.enum(["weak", "fair", "good", "strong"]),
  strengthScore: z.number(),
});

export type PasswordGeneratorInput = z.infer<typeof passwordGeneratorInputSchema>;
export type PasswordGeneratorOutput = z.infer<typeof passwordGeneratorOutputSchema>;

export function passwordGenerator(input: PasswordGeneratorInput): PasswordGeneratorOutput {
  const { 
    length, 
    includeUppercase, 
    includeLowercase, 
    includeNumbers, 
    includeSymbols,
    excludeSimilar 
  } = input;

  let charset = "";
  
  if (includeLowercase) {
    charset += excludeSimilar ? "abcdefghjkmnpqrstuvwxyz" : "abcdefghijklmnopqrstuvwxyz";
  }
  if (includeUppercase) {
    charset += excludeSimilar ? "ABCDEFGHJKMNPQRSTUVWXYZ" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  }
  if (includeNumbers) {
    charset += excludeSimilar ? "23456789" : "0123456789";
  }
  if (includeSymbols) {
    charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";
  }

  if (charset === "") {
    throw new Error("At least one character type must be selected");
  }

  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  // Calculate strength score
  let strengthScore = 0;
  if (length >= 8) strengthScore += 25;
  if (length >= 12) strengthScore += 25;
  if (includeUppercase && includeLowercase) strengthScore += 20;
  if (includeNumbers) strengthScore += 15;
  if (includeSymbols) strengthScore += 15;

  let strength: "weak" | "fair" | "good" | "strong";
  if (strengthScore >= 80) strength = "strong";
  else if (strengthScore >= 60) strength = "good";
  else if (strengthScore >= 40) strength = "fair";
  else strength = "weak";

  return {
    password,
    strength,
    strengthScore,
  };
}