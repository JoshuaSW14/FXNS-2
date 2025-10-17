import { z } from "zod";

export const loanPaymentInputSchema = z.object({
  principal: z.number().min(0),
  annualInterestRate: z.number().min(0).max(100),
  termYears: z.number().int().min(1),
  paymentFrequency: z.enum(['monthly', 'weekly', 'biweekly']).default('monthly'),
});

export const loanPaymentOutputSchema = z.object({
  monthlyPayment: z.number(),
  totalPayments: z.number(),
  totalInterest: z.number(),
  totalAmount: z.number(),
  paymentSchedule: z.array(z.object({
    payment: z.number(),
    principal: z.number(),
    interest: z.number(),
    balance: z.number(),
    paymentNumber: z.number(),
  })).max(12), // First 12 payments only
});

export type LoanPaymentInput = z.infer<typeof loanPaymentInputSchema>;
export type LoanPaymentOutput = z.infer<typeof loanPaymentOutputSchema>;

export function loanPaymentResolver(input: LoanPaymentInput): LoanPaymentOutput {
  const { principal, annualInterestRate, termYears, paymentFrequency = 'monthly' } = input;
  
  // Calculate payment frequency
  const paymentsPerYear = paymentFrequency === 'monthly' ? 12 : 
                         paymentFrequency === 'weekly' ? 52 : 26;
  
  const totalPayments = termYears * paymentsPerYear;
  const periodicInterestRate = (annualInterestRate / 100) / paymentsPerYear;
  
  // Calculate monthly payment using the standard loan payment formula
  let monthlyPayment: number;
  if (periodicInterestRate === 0) {
    monthlyPayment = principal / totalPayments;
  } else {
    monthlyPayment = principal * (
      periodicInterestRate * Math.pow(1 + periodicInterestRate, totalPayments)
    ) / (
      Math.pow(1 + periodicInterestRate, totalPayments) - 1
    );
  }
  
  const totalAmount = monthlyPayment * totalPayments;
  const totalInterest = totalAmount - principal;
  
  // Generate payment schedule for first 12 payments
  const paymentSchedule = [];
  let remainingBalance = principal;
  
  for (let i = 1; i <= Math.min(12, totalPayments); i++) {
    const interestPayment = remainingBalance * periodicInterestRate;
    const principalPayment = monthlyPayment - interestPayment;
    remainingBalance -= principalPayment;
    
    paymentSchedule.push({
      payment: Math.round(monthlyPayment * 100) / 100,
      principal: Math.round(principalPayment * 100) / 100,
      interest: Math.round(interestPayment * 100) / 100,
      balance: Math.round(Math.max(0, remainingBalance) * 100) / 100,
      paymentNumber: i,
    });
  }
  
  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalPayments,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    paymentSchedule,
  };
}
