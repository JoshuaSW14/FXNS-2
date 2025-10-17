import { z } from "zod";

export const tipCalculatorInputSchema = z.object({
  subtotal: z.number().min(0),
  tipPercentage: z.number().min(0).max(100),
  taxPercentage: z.number().min(0).max(100).default(0),
  numberOfPeople: z.number().int().min(1).default(1),
});

export const tipCalculatorOutputSchema = z.object({
  subtotal: z.number(),
  tipAmount: z.number(),
  taxAmount: z.number(),
  total: z.number(),
  perPerson: z.number(),
  breakdown: z.object({
    subtotal: z.number(),
    tip: z.number(),
    tax: z.number(),
    total: z.number(),
  }),
});

export type TipCalculatorInput = z.infer<typeof tipCalculatorInputSchema>;
export type TipCalculatorOutput = z.infer<typeof tipCalculatorOutputSchema>;

export function tipCalculatorResolver(input: TipCalculatorInput): TipCalculatorOutput {
  const { subtotal, tipPercentage, taxPercentage = 0, numberOfPeople = 1 } = input;
  
  const tipAmount = (subtotal * tipPercentage) / 100;
  const taxAmount = (subtotal * taxPercentage) / 100;
  const total = subtotal + tipAmount + taxAmount;
  const perPerson = total / numberOfPeople;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tipAmount: Math.round(tipAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    perPerson: Math.round(perPerson * 100) / 100,
    breakdown: {
      subtotal: Math.round(subtotal * 100) / 100,
      tip: Math.round(tipAmount * 100) / 100,
      tax: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    },
  };
}
